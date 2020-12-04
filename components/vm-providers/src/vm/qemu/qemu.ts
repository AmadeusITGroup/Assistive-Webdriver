/*
 * Copyright 2019 Amadeus s.a.s.
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
 * LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import { spawn, ChildProcess } from "child_process";
import {
  VM,
  MouseButton,
  PortRedirection,
  ScreenPosition
} from "../vmInterface";
import { Writable, Transform } from "stream";
import { parser } from "stream-json";
import { streamValues } from "stream-json/streamers/StreamValues";
import { wait } from "../../wait";
import {
  mkdtemp as mkdtempCb,
  readFile as readFileCb,
  rmdir as rmdirCb,
  unlink as unlinkCb
} from "fs";
import { promisify } from "util";
import { tmpdir } from "os";
import { join } from "path";
import { PNG } from "pngjs";
import { parsePPM } from "./ppmParser";
import { getKeyDownScanCode } from "../../keyboard";
import { createSubLogFunction, LogFunction } from "../../logging";

const mkdtemp = promisify(mkdtempCb);
const readFile = promisify(readFileCb);
const rmdir = promisify(rmdirCb);
const unlink = promisify(unlinkCb);

const PAUSED_STATUS = "paused";
const WAITING_STATUSES = [PAUSED_STATUS, "inmigrate"];

const BUTTONS_MAP: { [item: string]: string } = {
  [MouseButton.LEFT]: "left",
  [MouseButton.MIDDLE]: "middle",
  [MouseButton.RIGHT]: "right"
};

function getButtonName(button: MouseButton) {
  const buttonName = BUTTONS_MAP[button];
  if (!buttonName) {
    throw new Error(`Unknown button value ${button}`);
  }
  return buttonName;
}

function getQEMUScanCode(key: string) {
  const [first, second] = getKeyDownScanCode(key);
  if (first === 0xe0) {
    // special QEMU encoding of extended keys
    return second | 0x80;
  } else {
    return first;
  }
}

class LineReader extends Transform {
  _buffer: string;

  constructor() {
    super({ readableObjectMode: true });
    this._buffer = "";
  }

  _transform(chunk: Buffer, encoding: string, callback: () => void) {
    const parts = chunk.toString("utf8").split(/\r\n|\n\r|\n|\r/);
    parts[0] = this._buffer + parts[0];
    this._buffer = parts.pop()!;
    for (const part of parts) {
      if (part) {
        this.push(part);
      }
    }
    callback();
  }
  _flush(callback: () => void) {
    const buffer = this._buffer;
    if (buffer) {
      this._buffer = "";
      this.push(buffer);
    }
    callback();
  }
}

export class QEMUVM implements VM {
  static async create(
    commandLine: string[],
    log?: LogFunction
  ): Promise<QEMUVM> {
    log = createSubLogFunction(log, { category: "qemu" });
    const command = commandLine[0];
    const args = commandLine.slice(1);
    args.push("-qmp", "stdio");
    const vm = new QEMUVM(log);
    try {
      log({ message: "execute", command, args });
      const qemuProcess = spawn(command, args, {
        stdio: "pipe"
      });
      vm.qemuProcess = qemuProcess;
      const qmpIn = (streamValues() as any).on("data", (data: any) =>
        vm._onQmpData(data)
      );
      qemuProcess.stdout
        .pipe(parser({ jsonStreaming: true }))
        .pipe(qmpIn)
        .on("error", (e: any) => vm._onQmpError(e));
      qemuProcess.stderr
        .pipe(new LineReader())
        .on("data", error =>
          vm.log({ level: "error", message: "stderr", error })
        );
      qemuProcess.on("exit", (code, signal) => vm._qemuExited(code, signal));
      qemuProcess.on("error", error => vm._onQmpError(error));
      const startInfo = await new Promise<any>((resolve, reject) => {
        vm._responseQueue.push({ resolve, reject });
        qmpIn.once("data", ({ value }: any) => {
          vm._responseQueue.pop();
          resolve(value);
        });
      });
      if (
        !startInfo ||
        !startInfo.QMP ||
        !startInfo.QMP.version ||
        !startInfo.QMP.version.qemu
      ) {
        throw new Error(`Could not connect to QEMU!`);
      }
      vm.qemuQMPOut = qemuProcess.stdin;
      log({ message: "connected" });
      await vm._sendCommand({ execute: "qmp_capabilities" });
      let status: any = await vm._sendCommand({ execute: "query-status" });
      while (WAITING_STATUSES.includes(status.status)) {
        if (status.status === PAUSED_STATUS) {
          await vm._sendCommand({ execute: "cont" });
        }
        await wait(100);
        status = await vm._sendCommand({ execute: "query-status" });
      }
      if (status.status !== "running") {
        throw new Error(`Unexpected VM status: ${status.status}`);
      }
      log({ message: "running" });
    } catch (e) {
      await vm.destroy();
      throw e;
    }
    return vm;
  }

  public qemuProcess?: ChildProcess;
  public qemuQMPOut?: Writable;
  private _responseQueue: {
    resolve: (v: any) => void;
    reject: (v: any) => void;
  }[] = [];

  private constructor(public log: LogFunction) {}

  private _sendCommand(jsonCommand: any) {
    return new Promise((resolve, reject) => {
      this.log({ level: "debug", message: "send", data: jsonCommand });
      const stringCommand = JSON.stringify(jsonCommand);
      this.qemuQMPOut!.write(stringCommand);
      this._responseQueue.push({ resolve, reject });
    });
  }

  private _onQmpData({ value }: { value: any }) {
    this.log({ level: "debug", message: "receive", data: value });
    const valueReturn = value.return;
    const valueError = value.error;
    if (valueReturn || valueError) {
      const handler = this._responseQueue.pop();
      if (handler) {
        if (valueError) {
          handler.reject(valueError);
        } else {
          handler.resolve(valueReturn);
        }
      }
    }
  }

  private _onQmpError(error: any) {
    while (this._responseQueue.length) {
      const handler = this._responseQueue.pop();
      if (handler) {
        handler.reject(error);
      }
    }
  }

  private _qemuExited(code: number | null, signal: string | null) {
    this.log({ message: "exit", code, signal });
    if (this.qemuProcess) {
      this.qemuProcess = undefined;
      this.qemuQMPOut = undefined;
      if (this._responseQueue.length) {
        this._onQmpError(new Error("QEMU exited"));
      }
    }
  }

  // VM interface implementation:

  tcpRedirections: PortRedirection[] = [];

  async qemuSendKey(down: boolean, key: string) {
    const data = getQEMUScanCode(key);
    await this._sendCommand({
      execute: "input-send-event",
      arguments: {
        events: [
          {
            type: "key",
            data: {
              down,
              key: { type: "number", data }
            }
          }
        ]
      }
    });
  }

  async sendKeyDownEvent(key: string) {
    await this.qemuSendKey(true, key);
  }

  async sendKeyUpEvent(key: string) {
    await this.qemuSendKey(false, key);
  }

  async sendMouseMoveEvent({
    x,
    y,
    screenWidth,
    screenHeight
  }: ScreenPosition) {
    await this._sendCommand({
      execute: "input-send-event",
      arguments: {
        events: [
          {
            type: "abs",
            data: {
              axis: "x",
              value: Math.round((x * 0x7fff) / (screenWidth - 1))
            }
          },
          {
            type: "abs",
            data: {
              axis: "y",
              value: Math.round((y * 0x7fff) / (screenHeight - 1))
            }
          }
        ]
      }
    });
  }

  async sendMouseDownEvent(button: MouseButton) {
    await this._sendCommand({
      execute: "input-send-event",
      arguments: {
        events: [
          { type: "btn", data: { down: true, button: getButtonName(button) } }
        ]
      }
    });
  }

  async sendMouseUpEvent(button: MouseButton) {
    await this._sendCommand({
      execute: "input-send-event",
      arguments: {
        events: [
          { type: "btn", data: { down: false, button: getButtonName(button) } }
        ]
      }
    });
  }

  async takePNGScreenshot(): Promise<PNG> {
    const tempDirName = await mkdtemp(join(tmpdir(), "awd-qemu-"));
    let imageContent: Buffer;
    try {
      const filename = join(tempDirName, "screenshot.ppm");
      await this._sendCommand({
        execute: "screendump",
        arguments: { filename }
      });
      imageContent = await readFile(filename);
      await unlink(filename);
    } finally {
      await rmdir(tempDirName);
    }
    return parsePPM(imageContent);
  }

  async destroy() {
    if (this.qemuQMPOut) {
      try {
        await this._sendCommand({ execute: "quit" });
      } catch (e) {
        // ignore errors when exiting
      }
    }
    if (this.qemuProcess) {
      this.qemuProcess.kill();
    }
  }
}
