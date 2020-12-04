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

import {
  VM,
  VMConfig,
  PortRedirection,
  ScreenPosition,
  MouseButton,
  vmFactories
} from "vm-providers";
import { asyncFnMock, AsyncFnMock } from "./asyncFnMock";

export const useVMMock = () => {
  let mock: AsyncFnMock<VM, [VMConfig<any>]>;
  beforeEach(() => {
    mock = asyncFnMock("vmFactory");
    vmFactories.mock = mock;
  });
  afterEach(() => {
    delete vmFactories.mock;
  });

  return {
    getVMFactoryMock() {
      return mock;
    }
  };
};

export interface VMMock extends VM {
  destroy: AsyncFnMock<void, []>;
  sendKeyDownEvent: AsyncFnMock<void, [string]>;
  sendKeyUpEvent: AsyncFnMock<void, [string]>;
  sendMouseMoveEvent: AsyncFnMock<void, [ScreenPosition]>;
  sendMouseDownEvent: AsyncFnMock<void, [MouseButton]>;
  sendMouseUpEvent: AsyncFnMock<void, [MouseButton]>;
  takePNGScreenshot: AsyncFnMock<import("pngjs").PNG, []>;
}

export const createVMMock = (
  tcpRedirections: PortRedirection[],
  vmName = "vm"
): VMMock => ({
  tcpRedirections,
  destroy: asyncFnMock(`${vmName}.destroy`),
  sendKeyDownEvent: asyncFnMock(`${vmName}.sendKeyDownEvent`),
  sendKeyUpEvent: asyncFnMock(`${vmName}.sendKeyUpEvent`),
  sendMouseDownEvent: asyncFnMock(`${vmName}.sendMouseDownEvent`),
  sendMouseMoveEvent: asyncFnMock(`${vmName}.sendMouseMoveEvent`),
  sendMouseUpEvent: asyncFnMock(`${vmName}.sendMouseUpEvent`),
  takePNGScreenshot: asyncFnMock(`${vmName}.takePNGScreenshot`)
});
