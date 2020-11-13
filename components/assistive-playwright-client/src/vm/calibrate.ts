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

import type { PNG } from "pngjs";
import {
  wait,
  VM,
  ScreenPosition,
  SimplePosition,
  findRectangle
} from "vm-providers";
import { ElementHandle, Frame, Page } from "playwright-core";
import { createWriteStream } from "fs";
import { pipeline } from "stream";
import { v4 as createUUIDv4 } from "uuid";

/**
 * Object that is thrown by {@link playwrightCalibrate}
 * if the calibration process fails because the position of the
 * browser viewport cannot be detected on the screen of the
 * virtual machine.
 * @public
 */
export class CalibrationError {
  /**
   * Creates an instance of {@link CalibrationError},
   * containing information about why the calibration failed.
   * This is thrown by {@link playwrightCalibrate}
   * to give details allowing to understand why the calibration failed.
   *
   * @param screenshot - Cf {@link CalibrationError.screenshot | screenshot}
   * @param color - Cf {@link CalibrationError.color | color}
   * @param expectedWidth - Cf {@link CalibrationError.expectedWidth | expectedWidth}
   * @param expectedHeight - Cf {@link CalibrationError.expectedHeight | expectedHeight}
   * @param colorTolerance - Cf {@link CalibrationError.colorTolerance | colorTolerance}
   */
  constructor(
    /**
     * Screenshot of the virtual machine, in which the browser viewport could not be found.
     */
    public screenshot: PNG,
    /**
     * Color of the rectangle displayed in the viewport.
     */
    public color: Color,
    /**
     * Expected width (in pixels) of the rectangle that was looked for in the screenshot.
     */
    public expectedWidth: number,
    /**
     * Expected height (in pixels) of the rectangle that was looked for in the screenshot.
     */
    public expectedHeight: number,
    /**
     * Tolerance on the color that was used (as configured in {@link CalibrationOptions.colorTolerance}).
     */
    public colorTolerance: number
  ) {}

  /**
   * Error message.
   */
  get message(): string {
    return `Could not find the ${this.expectedWidth}x${
      this.expectedHeight
    } rectangle filled with color ${JSON.stringify(this.color)} (tolerance ${
      this.colorTolerance
    })`;
  }

  /**
   * Saves the {@link CalibrationError.screenshot | screenshot} as a file.
   * @param fileName - Full path (or path relative to the current directory) where to store the screenshot.
   * The screenshot will be stored in the PNG format.
   */
  saveScreenshot(fileName: string): Promise<void> {
    return new Promise((resolve, reject) =>
      pipeline(this.screenshot.pack(), createWriteStream(fileName), err =>
        err ? reject(err) : resolve()
      )
    );
  }
}

/**
 * Result of the calibration, returned by {@link playwrightCalibrate},
 * and allowing to translate coordinates relative to the top-left corner of the viewport,
 * or coordinates relative to the center of a DOM element into screen coordinates.
 * @public
 */
export class CalibrationResult implements ScreenPosition {
  /**
   * Creates an instance of {@link CalibrationError},
   * containing the coordinates of the viewport inside the browser window.
   * An object of this class is returned by {@link playwrightCalibrate}
   * if the calibration succeeds.
   *
   * @param x - Cf {@link CalibrationResult.x}
   * @param y - Cf {@link CalibrationResult.y}
   * @param screenWidth - Cf {@link CalibrationResult.screenWidth}
   * @param screenHeight - Cf {@link CalibrationResult.screenHeight}
   * @param vm - Cf {@link CalibrationResult.vm}
   * @param frame - Cf {@link CalibrationResult.frame}
   */
  constructor(
    /**
     * Horizontal coordinate of the viewport inside the browser window.
     */
    public x: number,
    /**
     * Vertical coordinate of the viewport inside the browser window.
     */
    public y: number,
    /**
     * Width of the screen in pixels.
     */
    public screenWidth: number,
    /**
     * Height of the screen in pixels.
     */
    public screenHeight: number,
    /**
     * Reference to the virtual machine.
     */
    public vm: VM,
    /**
     * Reference to the playwright frame object.
     */
    public frame: Page | Frame
  ) {}

  /**
   * Translates viewport coordinates or coordinates relative to the
   * center of a DOM element into screen coordinates.
   * @param position - if origin is null, coordinates in the viewport,
   * otherwise, coordinates relative to the center of the DOM element
   * whose reference is passed in origin.
   * @param origin - DOM element whose center is the origin of the
   * coordinates passed in position. If null (the default), position is relative to
   * the top-left corner of the viewport.
   */
  async translateCoordinates(
    position: SimplePosition,
    origin: ElementHandle<HTMLElement | SVGElement> | null = null
  ): Promise<ScreenPosition> {
    const { x, y }: SimplePosition = await this.frame.evaluate(
      /* istanbul ignore next */
      ({ x, y, origin }) => {
        x += window.screenX;
        y += window.screenY;
        if (origin !== null) {
          const rect = origin.getBoundingClientRect();
          x += rect.left + 0.5 * rect.width;
          y += rect.top + 0.5 * rect.height;
        }
        return { x: x, y: y };
      },
      { x: this.x, y: this.y, origin }
    );
    return {
      x: x + position.x,
      y: y + position.y,
      screenHeight: this.screenHeight,
      screenWidth: this.screenWidth
    };
  }
}

/**
 * Color, expressed as an array of three numbers between 0 and 255,
 * representing the red, green and blue parts
 * @public
 */
export type Color = [number, number, number];
const rgb = (color: Color) => `rgb(${color[0]},${color[1]},${color[2]})`;

/**
 * Options for the calibration, passed to {@link playwrightCalibrate}.
 * @public
 */
export interface CalibrationOptions {
  /**
   * Color of the rectangle to display in the viewport.
   * Defaults to `[255, 0, 0]` (red)
   * @defaultValue [255, 0, 0]
   */
  calibrationColor?: Color;
  /**
   * Color of the border of the rectangle to be displayed in the viewport.
   * Defaults to `[100, 100, 100]`
   * @defaultValue [100, 100, 100]
   */
  borderColor?: Color;
  /**
   * Width (in pixels) of the border of the rectangle to be displayed in the viewport.
   * Defaults to `30`.
   * @defaultValue 30
   */
  borderWidth?: number;
  /**
   * Allowed difference between the color in the screenshot and {@link CalibrationOptions.calibrationColor | calibrationColor}, 0 meaning no difference.
   * The difference is computed as the sum of the absolute value of the difference for each red, green and blue parts.
   * Defaults to `[255, 0, 0]`.
   * @defaultValue [255, 0, 0]
   */
  colorTolerance?: number;
  /**
   * Extra horizontal space to add at the right of the colored rectangle.
   * Defaults to `0`.
   * @defaultValue 0
   */
  estimatedXMargin?: number;
  /**
   * Extra vertical space to add at the bottom of the colored rectangle.
   * Defaults to `0`.
   * @defaultValue 0
   */
  estimatedYMargin?: number;
}

/**
 * Finds the coordinates of the viewport in the browser window.
 * There is no playwright API for this, so it is done by
 * displaying a rectangle of a specific color in the viewport and
 * finding it in the screen capture.
 * @public
 * @param vm - Virtual machine, as returned by {@link vm-providers#createVM}
 * @param frame - Playwright page or frame
 * @param options - calibration options
 */
export async function playwrightCalibrate(
  vm: VM,
  frame: Page | Frame,
  options: CalibrationOptions = {}
): Promise<CalibrationResult> {
  const {
    calibrationColor = [255, 0, 0],
    borderColor = [100, 100, 100],
    borderWidth = 30,
    colorTolerance = 50,
    estimatedXMargin = 0,
    estimatedYMargin = 0
  } = options;
  const rgbCalibrationColor = rgb(calibrationColor);
  const rgbBorderColor = rgb(borderColor);
  const elementId = JSON.stringify(createUUIDv4());
  const displayRectangleResult: {
    width: number;
    height: number;
    screenX: number;
    screenY: number;
    screenWidth: number;
    screenHeight: number;
  } = await frame.evaluate(`(() => {
const div = document.createElement("div");
div.setAttribute("id", ${elementId});
div.style.cssText = "display:block;position:fixed;background-color:${rgbCalibrationColor};border:${borderWidth}px solid ${rgbBorderColor};left:0px;top:0px;right:0px;bottom:0px;cursor:none;z-index:999999;";
div.style.maxWidth = (screen.availWidth - window.screenX - ${estimatedXMargin}) + "px";
div.style.maxHeight = (screen.availHeight - window.screenY - ${estimatedYMargin}) + "px";
document.body.appendChild(div);
return {
  width: div.clientWidth,
  height: div.clientHeight,
  screenX: window.screenX,
  screenY: window.screenY,
  screenWidth: window.screen.width,
  screenHeight: window.screen.height
};})()`);
  try {
    // moves the mouse out of the colored zone
    await vm.sendMouseMoveEvent({
      x: displayRectangleResult.screenX,
      y: displayRectangleResult.screenY,
      screenWidth: displayRectangleResult.screenWidth,
      screenHeight: displayRectangleResult.screenHeight
    });
    await wait(1000);
    const image = await vm.takePNGScreenshot();
    const calibrationResult = findRectangle(
      image,
      [...calibrationColor, 255],
      displayRectangleResult.width,
      displayRectangleResult.height,
      colorTolerance
    );
    if (!calibrationResult) {
      throw new CalibrationError(
        image,
        calibrationColor,
        displayRectangleResult.width,
        displayRectangleResult.height,
        colorTolerance
      );
    }
    return new CalibrationResult(
      calibrationResult.x - borderWidth - displayRectangleResult.screenX,
      calibrationResult.y - borderWidth - displayRectangleResult.screenY,
      image.width,
      image.height,
      vm,
      frame
    );
  } finally {
    await frame.evaluate(
      `(() => {const calibrationDIV = document.getElementById(${elementId}); calibrationDIV.parentNode.removeChild(calibrationDIV);})()`
    );
  }
}
