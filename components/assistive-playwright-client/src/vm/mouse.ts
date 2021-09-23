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

import { ElementHandle, Frame, Mouse, Page } from "playwright-core";
import { MouseButton, SimplePosition, VM, wait } from "vm-providers";
import {
  CalibrationOptions,
  CalibrationResult,
  playwrightCalibrate
} from "./calibrate";

const InputMouseButtons = {
  left: MouseButton.LEFT,
  middle: MouseButton.MIDDLE,
  right: MouseButton.RIGHT
};

/**
 * Object implementing the {@link https://playwright.dev/docs/api/class-mouse | Mouse} interface
 * from playwright, it can send low-level mouse events to the virtual machine.
 * @public
 */
export class VMMouse implements Mouse {
  /**
   * Creates a {@link VMMouse} object.
   * @param vm - Cf {@link VMMouse.vm}
   * @param lastPosition - Cf {@link VMMouse.lastPosition}
   * @param calibration - Cf {@link VMMouse.calibration}
   */
  constructor(
    /**
     * Reference to the virtual machine
     */
    public vm: VM,
    /**
     * Reference to the object holding the last position of the mouse in the screen coordinates.
     */
    public lastPosition: SimplePosition,
    /**
     * Reference to the calibration results that are used to convert coordinates.
     */
    public calibration: CalibrationResult
  ) {}

  wheel(deltaX: number, deltaY: number): Promise<void> {
    throw new Error("Method not implemented yet.");
  }

  /**
   * Moves the mouse to the specified position, expressed either as
   * coordinates in the viewport (relative to the top-left corner),
   * or coordinates relative to the center of the DOM element passed
   * as `origin` in the `options`.
   * @param x - horizontal destination position of the mouse in pixels
   * @param y - vertical destination position of the mouse in pixels
   * @param options - `steps`: number of steps to use when moving
   * the mouse from its current position to the destination, defaults to `1`
   * `origin`: DOM element whose center is the origin of the
   * coordinates passed in `x` and `y`. If null or undefined, the coordinates
   * are relative to the top-left corner of the viewport.
   */
  async move(
    x: number,
    y: number,
    options?: {
      steps?: number | undefined;
      origin?: ElementHandle<HTMLElement | SVGElement> | null;
    }
  ): Promise<void> {
    ({ x, y } = await this.calibration.translateCoordinates(
      { x, y },
      options?.origin ?? null
    ));
    const steps = options?.steps ?? 1;
    const fromX = this.lastPosition.x;
    const fromY = this.lastPosition.y;
    for (let i = 1; i <= steps; i++) {
      this.lastPosition.x = Math.round(fromX + (x - fromX) * (i / steps));
      this.lastPosition.y = Math.round(fromY + (y - fromY) * (i / steps));
      await this.vm.sendMouseMoveEvent({
        screenWidth: this.calibration.screenWidth,
        screenHeight: this.calibration.screenHeight,
        ...this.lastPosition
      });
    }
  }

  /**
   * Sends a low-level mousedown event to the virtual machine.
   * @param options - `button`: mouse button to use, defaults to `"left"`
   * `clickCount`: ignored
   */
  async down(options?: {
    button?: "left" | "middle" | "right" | undefined;
    clickCount?: number | undefined;
  }): Promise<void> {
    const button = InputMouseButtons[options?.button ?? "left"];
    await this.vm.sendMouseDownEvent(button);
  }

  /**
   * Sends a low-level mouseup event to the virtual machine.
   * @param options - `button`: mouse button to use, defaults to `"left"`
   * `clickCount`: ignored
   */
  async up(options?: {
    button?: "left" | "middle" | "right" | undefined;
    clickCount?: number | undefined;
  }): Promise<void> {
    const button = InputMouseButtons[options?.button ?? "left"];
    await this.vm.sendMouseUpEvent(button);
  }

  /**
   * Shortcut for {@link VMMouse.move | move}, {@link VMMouse.down | down} and
   * {@link VMMouse.up | up}.
   * @param x - horizontal destination position of the mouse in pixels
   * @param y - vertical destination position of the mouse in pixels
   * @param options - `button`: mouse button to use, defaults to `"left"`
   * `clickCount`: number of `down` and `up` events to send, defaults to `1`
   * `delay`: delay in milliseconds between `down` and `up` events
   * `origin`: DOM element whose center is the origin of the
   * coordinates passed in `x` and `y`. If null or undefined, the coordinates
   * are relative to the top-left corner of the viewport.
   */
  async click(
    x: number,
    y: number,
    options?: {
      button?: "left" | "middle" | "right" | undefined;
      clickCount?: number | undefined;
      delay?: number | undefined;
      origin?: ElementHandle<HTMLElement | SVGElement> | null;
    }
  ): Promise<void> {
    const clickCount = options?.clickCount ?? 1;
    const delay = options?.delay ?? 0;
    const origin = options?.origin ?? null;
    await this.move(x, y, { origin });
    for (let i = 0; i < clickCount; i++) {
      if (delay && i > 0) {
        await wait(delay);
      }
      await this.down(options);
      if (delay) {
        await wait(delay);
      }
      await this.up(options);
    }
  }

  /**
   * Shortcut for {@link VMMouse.click} with `clickCount` option set to `2`.
   */
  async dblclick(
    x: number,
    y: number,
    options?: {
      button?: "left" | "middle" | "right" | undefined;
      delay?: number | undefined;
      origin?: ElementHandle<HTMLElement | SVGElement> | null;
    }
  ): Promise<void> {
    await this.click(x, y, { ...(options ?? {}), clickCount: 2 });
  }
}

/**
 * A mouse calibration function. This is returned by {@link createVM}
 * in the {@link VMWithPlaywright} object.
 * The {@link playwrightCalibrate | calibration process} finds where the browser viewport is located on the screen,
 * allowing to use coordinates relative to the viewport or to a DOM element instead of
 * using screen coordinates.
 * This function returns a {@link VMMouse} object that allows to easily send
 * low-level mouse events to the virtual machine.
 * @public
 */
export type CalibrateMouseFunction = (
  frame: Page | Frame,
  options?: CalibrationOptions
) => Promise<VMMouse>;

/**
 * Creates a mouse calibration function for the specified virtual machine.
 * @param vm - Reference to the virtual machine.
 * @public
 */
export function calibrateMouseFunctionFactory(vm: VM): CalibrateMouseFunction {
  const lastMousePosition = { x: 0, y: 0 };
  return async (frame: Page | Frame, options?: CalibrationOptions) => {
    const calibrationResult = await playwrightCalibrate(vm, frame, options);
    return new VMMouse(vm, lastMousePosition, calibrationResult);
  };
}
