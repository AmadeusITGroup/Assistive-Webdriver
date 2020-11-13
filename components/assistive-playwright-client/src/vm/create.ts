/*
 * Copyright 2020 Amadeus s.a.s.
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

import {
  createVM as rawCreateVM,
  VM,
  VMConfig,
  VMSettings
} from "vm-providers";
import { v4 as createUUIDv4 } from "uuid";
import { RemotePlaywright, connectRemotePlaywright } from "../remotePlaywright";
import { ScreenReaderClient } from "../screenReaderClient";
import { VMKeyboard } from "./keyboard";
import { CalibrateMouseFunction, calibrateMouseFunctionFactory } from "./mouse";

/**
 * Virtual machine configuration.
 * @public
 */
export interface VMConfiguration extends VMConfig<VMSettings> {
  /**
   * HTTP port used by assistive-playwright-server in the virtual machine.
   * Defaults to 7779.
   * @defaultValue 7779.
   */
  playwrightPort?: number;
}

/**
 * Object allowing to control playwright inside the virtual machine,
 * send low-level keyboard and mouse events and receive messages from the screen reader.
 * @public
 */
export interface VMWithPlaywright extends RemotePlaywright {
  /**
   * Reference to the virtual machine.
   */
  vm: VM;
  /**
   * Object giving access messages from the screen reader.
   */
  screenReader: ScreenReaderClient;
  /**
   * Function allowing to create a {@link VMMouse} object that is calibrated for a
   * specific playwright frame and allowing to easily send low-level mouse events to the virtual machine,
   * using coordinates related to the browser viewport or DOM elements.
   */
  calibrateMouse: CalibrateMouseFunction;
  /**
   * Object allowing to easily send low-level keyboard events to the virtual machine.
   */
  keyboard: VMKeyboard;
  /**
   * URL of assistive-playwright-server.
   */
  url: string;
}

/**
 * Clones and starts a virtual machine that contains assistive-playwright-server,
 * and returns an object allowing to control playwright inside the virtual machine,
 * send low-level keyboard and mouse events and receive messages from the screen reader.
 * This is the main entry point of the assistive-playwright-client API.
 * @public
 */
export async function createVM(
  vmconfig: VMConfiguration
): Promise<VMWithPlaywright> {
  const { id = createUUIDv4(), playwrightPort = 7779, ...config } = vmconfig;
  const vm = await rawCreateVM({
    ...config,
    id,
    redirectTCPPorts: [...(config.redirectTCPPorts ?? []), playwrightPort]
  });
  try {
    const pwRedirection = vm.tcpRedirections.find(
      redirection => redirection.vmPort === playwrightPort
    );
    const pwURL = `http://${pwRedirection!.hostAddress}:${
      pwRedirection!.hostPort
    }`;
    const screenReader = await ScreenReaderClient.create(
      `ws://${pwRedirection!.hostAddress}:${
        pwRedirection!.hostPort
      }/screen-reader`
    );
    return {
      url: pwURL,
      ...connectRemotePlaywright(pwURL),
      vm,
      keyboard: new VMKeyboard(vm),
      calibrateMouse: calibrateMouseFunctionFactory(vm),
      screenReader
    };
  } catch (error) {
    await vm.destroy();
    throw error;
  }
}
