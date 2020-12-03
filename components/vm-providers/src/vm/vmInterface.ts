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

import type { Key } from "../keyboard";
import type { PNG } from "pngjs";
import { LogFunction } from "../logging";

/**
 * A position specified by the horizontal (x) and vertical (y) coordinates.
 * @public
 */
export interface SimplePosition {
  /** Horizontal coordinate in pixels (distance from the left) */
  x: number;
  /** Horizontal coordinate in pixels (distance from the top) */
  y: number;
}

/**
 * A position in the screen, that extends {@link SimplePosition} with
 * the size of the screen in pixels, because it is needed by some providers (i.e. qemu)
 * to compute the mouse position to send to the virtual machine.
 * @public
 */
export interface ScreenPosition extends SimplePosition {
  /** Width of the screen in pixels. */
  screenWidth: number;
  /** Height of the screen in pixels. */
  screenHeight: number;
}

/**
 * A port redirection from a port on the host to a port in the virtual machine.
 * @public
 */
export interface PortRedirection {
  /** Port number inside the virtual machine. */
  vmPort: number;
  /** Port number in the host machine. */
  hostPort: number;
  /** IP address or host name of the host machine. */
  hostAddress: string;
}

/**
 * Configuration that can be passed to {@link createVM} when cloning and
 * starting a virtual machine.
 * @public
 */
export interface VMConfig<T> {
  /** Defines the provider and the settings for the virtual machine, as available for each provider. */
  vmSettings: T;
  /** Id of the new virtual machine. If not provided, an automatically-generated UUID is used. */
  id?: string;
  /**
   * List of TCP port numbers in the virtual machine that should be accessible from the host.
   * For each redirection requested in this array, a {@link PortRedirection} object will be
   * available in the {@link VM.tcpRedirections} array.
   */
  redirectTCPPorts?: number[];
  /**
   * Log function.
   */
  log?: LogFunction;
}

/**
 * The virtual machine factory provided by each virtual machine provider.
 * It is a function that takes the configuration and
 * asynchronously returns an object that implements the {@link VM} interface.
 * @public
 */
export type VMFactory<T> = (config: VMConfig<T>) => Promise<VM>;

/**
 * Mouse buttons that can be sent to a virtual machine through
 * {@link VM.sendMouseDownEvent} and {@link VM.sendMouseUpEvent}.
 * @public
 */
export const enum MouseButton {
  LEFT = "0",
  MIDDLE = "1",
  RIGHT = "2"
}

/**
 * This interface is implemented by each virtual machine provider.
 * It specifies the set of operations that can be done on a virtual machine,
 * including sending keyboard and mouse events and destroying the virtual machine.
 * @public
 */
export interface VM {
  /**
   * Contains an array of TCP port redirections that are usable.
   * Especially, all ports specified in {@link VMConfig.redirectTCPPorts} when calling
   * the virtual machine factory should have a corresponding entry in this array.
   */
  readonly tcpRedirections: readonly PortRedirection[];

  /**
   * Sends a keydown event to the virtual machine.
   * @param key - specifies which key to press
   */
  sendKeyDownEvent(key: Key | string): Promise<void>;

  /**
   * Sends a keyup event to the virtual machine.
   * @param key - specifies which key to release
   */
  sendKeyUpEvent(key: Key | string): Promise<void>;

  /**
   * Sends an absolute mousemove event to the virtual machine.
   * @param position - specifies the new coordinates of the mouse in the screen
   */
  sendMouseMoveEvent(position: ScreenPosition): Promise<void>;

  /**
   * Sends a mousedown event to the virtual machine.
   * @param button - specifies which mouse button to press
   */
  sendMouseDownEvent(button: MouseButton): Promise<void>;

  /**
   * Sends a mouseup event to the virtual machine.
   * @param button - specifies which mouse button to release
   */
  sendMouseUpEvent(button: MouseButton): Promise<void>;

  /**
   * Takes a screenshot of the virtual machine and returns the corresponding PNG image.
   */
  takePNGScreenshot(): Promise<PNG>;

  /**
   * Stops and destroys the virtual machine.
   */
  destroy(): Promise<void>;
}
