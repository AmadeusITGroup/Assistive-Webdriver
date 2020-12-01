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

import { getFreePort } from "../../portFinder";
import { PNG } from "pngjs";
import { promisify } from "util";
import { getKeyDownScanCode, getKeyUpScanCode } from "../../keyboard";
import { VirtualBoxConnection } from "./connection";
import {
  VM,
  PortRedirection,
  MouseButton,
  ScreenPosition
} from "../vmInterface";
import {
  ISession,
  IMachine,
  IConsole,
  IKeyboard,
  IMouse,
  IDisplay,
  IGuest,
  INetworkAdapter,
  INATEngine,
  NATProtocol,
  BitmapFormat
} from "virtualbox-soap";
import { cloneMachine, deleteMachine } from "./createDelete";
import { wait } from "../../wait";
import { createSubLogFunction, LogFunction } from "../../logging";

const BUTTONS_MAP: { [item: string]: number } = {
  [MouseButton.LEFT]: 0x01,
  [MouseButton.MIDDLE]: 0x04,
  [MouseButton.RIGHT]: 0x02
};

function getButtonMask(button: MouseButton) {
  const buttonMask = BUTTONS_MAP[button];
  if (!buttonMask) {
    throw new Error(`Unknown button value ${button}`);
  }
  return buttonMask;
}

const GUEST_PROPERTY_IP = "/VirtualBox/GuestInfo/Net/0/V4/IP";

export class VirtualboxVM implements VM {
  static async create(
    vboxUrl: string,
    id: string,
    vmName: string,
    vmSnapshot?: string,
    log?: LogFunction
  ): Promise<VirtualboxVM> {
    log = createSubLogFunction(log, { category: "vbox" });
    const connection = new VirtualBoxConnection(log);
    await connection.connect(vboxUrl);
    try {
      const machine = await cloneMachine(
        connection.virtualbox!,
        id,
        vmName,
        vmSnapshot
      );
      return new VirtualboxVM(connection, machine, log);
    } catch (error) {
      await connection.disconnect();
      throw error;
    }
  }

  public vboxSession?: ISession;
  public vboxMutableMachine?: IMachine;
  public vboxConsole?: IConsole;
  public vboxKeyboard?: IKeyboard;
  public vboxMouse?: IMouse;
  public vboxDisplay?: IDisplay;
  public vboxGuest?: IGuest;
  public vboxNetwork?: INetworkAdapter;
  public vboxNatEngine?: INATEngine;
  public vboxIp?: string;

  public vboxMouseButtonState = 0;

  private constructor(
    public vboxConnection: VirtualBoxConnection,
    public vboxMachine: IMachine,
    public log: LogFunction
  ) {}

  async vboxStop(): Promise<void> {
    this.vboxIp = undefined;
    this.vboxNatEngine = undefined;
    this.vboxNetwork = undefined;
    this.vboxGuest = undefined;
    this.vboxDisplay = undefined;
    this.vboxMouse = undefined;
    this.vboxKeyboard = undefined;
    if (this.vboxConsole) {
      const action = await this.vboxConsole.powerDown();
      await action.waitForCompletion(-1);
      this.vboxConsole = undefined;
    }
    this.vboxMutableMachine = undefined;
    this.vboxSession = undefined;
  }

  async vboxStart(): Promise<void> {
    const machine = this.vboxMachine;
    const vboxSession = await this.vboxConnection.createSession();
    this.vboxSession = vboxSession;
    const originalIP = await machine.getGuestProperty(GUEST_PROPERTY_IP);
    const startProgress = await machine.launchVMProcess(
      vboxSession,
      "headless",
      []
    );
    await startProgress.waitForCompletion(-1);
    const vboxConsole = await vboxSession.getConsole();
    this.vboxConsole = vboxConsole;
    const keyboard = vboxConsole.getKeyboard();
    const mouse = vboxConsole.getMouse();
    const display = vboxConsole.getDisplay();
    const guest = vboxConsole.getGuest();
    this.vboxMutableMachine = await vboxSession.getMachine();
    this.vboxKeyboard = await keyboard;
    this.vboxMouse = await mouse;
    this.vboxDisplay = await display;
    this.vboxGuest = await guest;
    this.vboxNetwork = await this.vboxMutableMachine.getNetworkAdapter(0);
    this.vboxNatEngine = await this.vboxNetwork.getNATEngine();
    let newIP;
    do {
      newIP = await machine.getGuestProperty(GUEST_PROPERTY_IP);
      await wait(100);
    } while (newIP.timestamp === originalIP.timestamp);
    this.vboxIp = newIP.value;
  }

  async vboxRedirectTCPPort(vmPort: number): Promise<number> {
    // TODO: fix this method for a remote virtual box host
    const hostAddress = "127.0.0.1";
    const hostPort = await getFreePort({ host: hostAddress });
    await this.vboxNatEngine!.addRedirect(
      "",
      NATProtocol.TCP,
      hostAddress,
      hostPort,
      this.vboxIp!,
      vmPort
    );
    this.tcpRedirections.push({
      vmPort,
      hostAddress,
      hostPort
    });
    return hostPort;
  }

  // VM interface implementation:

  public tcpRedirections: PortRedirection[] = [];

  async sendKeyDownEvent(key: string): Promise<void> {
    const scanCodes = getKeyDownScanCode(key);
    await this.vboxKeyboard!.putScancodes(scanCodes);
  }

  async sendKeyUpEvent(key: string): Promise<void> {
    const scanCodes = getKeyUpScanCode(key);
    await this.vboxKeyboard!.putScancodes(scanCodes);
  }

  async sendMouseMoveEvent({ x, y }: ScreenPosition): Promise<void> {
    await this.vboxMouse!.putMouseEventAbsolute(
      x + 1,
      y + 1,
      0,
      0,
      this.vboxMouseButtonState
    );
  }

  async sendMouseDownEvent(button: MouseButton): Promise<void> {
    const buttonMask = getButtonMask(button);
    this.vboxMouseButtonState |= buttonMask;
    await this.vboxMouse!.putMouseEvent(0, 0, 0, 0, this.vboxMouseButtonState);
  }

  async sendMouseUpEvent(button: MouseButton): Promise<void> {
    const buttonMask = getButtonMask(button);
    this.vboxMouseButtonState &= ~buttonMask;
    await this.vboxMouse!.putMouseEvent(0, 0, 0, 0, this.vboxMouseButtonState);
  }

  async takePNGScreenshot(): Promise<PNG> {
    const resolution = await this.vboxDisplay!.getScreenResolution(0);
    const screenshot = await this.vboxDisplay!.takeScreenShotToArray(
      0,
      resolution.width,
      resolution.height,
      BitmapFormat.PNG
    );
    const imageBuffer = Buffer.from(screenshot, "base64");
    const image = new PNG();
    const parseImage = promisify(image.parse.bind(image));
    await parseImage(imageBuffer);
    return image;
  }

  async destroy(): Promise<void> {
    await this.vboxStop();
    await deleteMachine(this.vboxMachine);
    await this.vboxConnection.disconnect();
  }
}
