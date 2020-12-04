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

import { LogFunction } from "../logging";

export interface SimplePosition {
  x: number;
  y: number;
}

export interface ScreenPosition extends SimplePosition {
  screenWidth: number;
  screenHeight: number;
}

export interface PortRedirection {
  vmPort: number;
  hostPort: number;
  hostAddress: string;
}

export interface VMConfig<T> {
  vmSettings: T;
  id?: string;
  redirectTCPPorts?: number[];
  log?: LogFunction;
}

export type VMFactory<T> = (config: VMConfig<T>) => Promise<VM>;

export const enum MouseButton {
  LEFT = "0",
  MIDDLE = "1",
  RIGHT = "2"
}

export interface VM {
  tcpRedirections: PortRedirection[];
  sendKeyDownEvent(key: string): Promise<void>;
  sendKeyUpEvent(key: string): Promise<void>;
  sendMouseMoveEvent(position: ScreenPosition): Promise<void>;
  sendMouseDownEvent(button: MouseButton): Promise<void>;
  sendMouseUpEvent(button: MouseButton): Promise<void>;
  takePNGScreenshot(): Promise<import("pngjs").PNG>;
  destroy(): Promise<void>;
}
