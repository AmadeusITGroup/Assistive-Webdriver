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

import { fork, ChildProcess } from "child_process";
import { wait } from "vm-providers";
import { createConnection } from "net";
import { connectRemotePlaywright, ScreenReaderClient } from "../src";
import waitPort from "wait-port";

describe("with server and no vm", () => {
  let subProcess: ChildProcess;

  beforeAll(async () => {
    const serverPath = require.resolve(
      "assistive-playwright-server/assistive-playwright-server"
    );
    subProcess = fork(serverPath, [
      "--http-port",
      "8885",
      "--tcp-port",
      "8886"
    ]);
    await waitPort({ port: 8885, timeout: 10000 });
  });

  afterAll(async () => {
    subProcess.kill("SIGINT");
    await new Promise(done => subProcess.once("exit", done));
  });

  it("should create a page in chromium", async () => {
    const { chromium } = connectRemotePlaywright("http://localhost:8885");
    const instance = await chromium.launch();
    try {
      const context = await instance.newContext();
      try {
        const page = await context.newPage();
        try {
          const response = await page.goto("http://localhost:8885");
          const json = await response!.json();
          expect(json).toEqual({ server: "assistive-playwright-server" });
        } finally {
          await page.close();
        }
      } finally {
        await context.close();
      }
    } finally {
      await instance.close();
    }
  });

  it("should receive messages from the screen reader", async () => {
    const screenReader = await ScreenReaderClient.create(
      "http://localhost:8885/screen-reader"
    );
    expect(screenReader.connected).toBe(true);
    const socketTCP = createConnection(8886, "127.0.0.1");
    await new Promise(done => socketTCP.on("connect", done));
    socketTCP.write("Hello world!\n");
    await wait(100);
    expect(await screenReader.waitForMessage(/Hello (\w+)!/)).toEqual([
      "Hello world!"
    ]);
    const nextMessage = screenReader.waitForMessage(/How are (\w+)?/);
    const listener = jest.fn();
    nextMessage.then(listener);
    await wait(100);
    expect(listener).not.toHaveBeenCalled();
    socketTCP.write("How are you?\n");
    expect(await nextMessage).toEqual(["How are you?"]);
    await new Promise<void>(done => socketTCP.end(done));
    screenReader.disconnect();
    await wait(100);
    expect(screenReader.connected).toBe(false);
  });
});
