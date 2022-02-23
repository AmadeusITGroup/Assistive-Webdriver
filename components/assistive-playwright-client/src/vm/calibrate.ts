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
  calibrationQRCodesGenerate,
  calibrationQRCodesScan,
  pngToDataURI,
  CalibrationQRCodesConfig,
  MouseButton
} from "vm-providers";
import type { ElementHandle, Frame, Page } from "playwright-core";
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
   */
  constructor(
    /**
     * Screenshot of the virtual machine, in which the browser viewport could not be found.
     */
    public screenshot: PNG
  ) {}

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
 * Options for the calibration, passed to {@link playwrightCalibrate}.
 * @public
 */
export interface CalibrationOptions extends CalibrationQRCodesConfig {
  /**
   * Whether to skip the click done during calibration.
   */
  skipClick?: boolean;
}

/**
 * Finds the coordinates of the viewport in the browser window.
 * There is no playwright API for this, so it is done by displaying QR codes
 * in the viewport and finding them in the screen capture.
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
  const { skipClick, ...qrCodeOptions } = options;
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
div.style.cssText = "display:block;position:fixed;left:0px;top:0px;right:0px;bottom:0px;cursor:none;z-index:999999;";
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
    const viewportImage = calibrationQRCodesGenerate(
      displayRectangleResult.width,
      displayRectangleResult.height,
      qrCodeOptions
    );
    await frame.evaluate(
      `(() => {const calibrationDIV = document.getElementById(${elementId}); calibrationDIV.style.backgroundImage = ${JSON.stringify(
        `url("${await pngToDataURI(viewportImage)}")`
      )};})()`
    );
    // moves the mouse out of the way
    await vm.sendMouseMoveEvent({
      x: displayRectangleResult.screenX,
      y: displayRectangleResult.screenY,
      screenWidth: displayRectangleResult.screenWidth,
      screenHeight: displayRectangleResult.screenHeight
    });
    await wait(1000);
    const image = await vm.takePNGScreenshot();
    try {
      const result = calibrationQRCodesScan(image, qrCodeOptions);
      if (!skipClick) {
        // click on the detected QR code:
        await vm.sendMouseMoveEvent({
          x: Math.floor(result.qrCode.x + result.qrCode.width / 2),
          y: Math.floor(result.qrCode.y + result.qrCode.height / 2),
          screenWidth: image.width,
          screenHeight: image.height
        });
        await wait(100);
        await vm.sendMouseDownEvent(MouseButton.LEFT);
        await wait(50);
        await vm.sendMouseUpEvent(MouseButton.LEFT);
        await wait(100);
        // moves again the mouse out of the way
        await vm.sendMouseMoveEvent({
          x: displayRectangleResult.screenX,
          y: displayRectangleResult.screenY,
          screenWidth: image.width,
          screenHeight: image.height
        });
        await wait(100);
      }
      return new CalibrationResult(
        result.viewport.x - displayRectangleResult.screenX,
        result.viewport.y - displayRectangleResult.screenY,
        image.width,
        image.height,
        vm,
        frame
      );
    } catch (error) {
      throw new CalibrationError(image);
    }
  } finally {
    await frame.evaluate(
      `(() => {const calibrationDIV = document.getElementById(${elementId}); calibrationDIV.parentNode.removeChild(calibrationDIV);})()`
    );
  }
}
