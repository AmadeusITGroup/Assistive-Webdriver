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

/**
 * This package contains functions to clone and start a virtual machine with
 * one of the available providers (virtualbox or qemu), to send it keyboard
 * and mouse events and finally to destroy it. It also contains some utilities
 * commonly used with applications that need to control a virtual machine.
 *
 * @remarks
 * The main entry point to clone and start a virtual machine is the
 * {@link createVM | createVM function}
 *
 * @packageDocumentation
 *
 */

export {
  VM,
  VMFactory,
  MouseButton,
  PortRedirection,
  VMConfig,
  ScreenPosition,
  SimplePosition
} from "./vm/vmInterface";
export { VMSettings, QEMUSettings, VirtualBoxSettings } from "./config";
export { Key, keysMap, isShiftedKey } from "./keyboard";
export { getFreePort } from "./portFinder";
export { wait } from "./wait";
export { createVM, vmFactories } from "./vm/generic";
export { LogFunction, createSubLogFunction } from "./logging";
export { logMessages } from "./messages";
export {
  CalibrationQRCodesConfig,
  calibrationQRCodesGenerate,
  calibrationQRCodesScan,
  CalibrationQRCodesScanResult,
  Rectangle
} from "./qrcodes";
export { bufferToDataURI, pngToBuffer, pngToDataURI } from "./dataURI";
