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

import { createWriteStream } from "fs";
import { pipeline } from "stream";
import request from "./request";
import {
  VM,
  ScreenPosition,
  wait,
  calibrationQRCodesGenerate,
  calibrationQRCodesScan,
  pngToDataURI,
  createSubLogFunction,
  LogFunction,
  MouseButton
} from "vm-providers";
import { PublicError } from "./publicError";

export async function webdriverCalibrate(
  vm: VM,
  sessionUrl: string,
  failedCalibrationFileName?: string,
  log: LogFunction = () => {}
): Promise<ScreenPosition> {
  log = createSubLogFunction(log, { category: "calibration" });
  try {
    const currentUrl = await request(
      `${sessionUrl}/url`,
      { method: "GET" },
      log
    );
    if (currentUrl.value === "about:blank") {
      // on Firefox, we must navigate to a URL different than about:blank before anything can be displayed
      // (such as the calibration rectangle)
      await request(
        `${sessionUrl}/url`,
        {
          method: "POST",
          body: {
            // navigate to an empty <html><body></body></html> document
            url: "data:text/html,%3Chtml%3E%%3Cbody%3E%3C%2Fbody%3E3C%2Fhtml%3E"
          }
        },
        log
      );
    }
    const sizeInfo = await request(
      `${sessionUrl}/execute/sync`,
      {
        body: {
          script: `var div = document.createElement("div"); div.setAttribute("id", "calibrationDIV");
div.style.cssText = "display:block;position:absolute;left:0px;top:0px;right:0px;bottom:0px;cursor:none;z-index:999999;";
document.body.appendChild(div);
return {
  width: div.offsetWidth,
  height: div.offsetHeight,
  screenX: window.screenX,
  screenY: window.screenY
};`,
          args: []
        }
      },
      log
    );
    const viewportImage = calibrationQRCodesGenerate(
      sizeInfo.value.width,
      sizeInfo.value.height
    );
    await request(
      `${sessionUrl}/execute/sync`,
      {
        body: {
          script: `var calibrationDIV = document.getElementById("calibrationDIV"); calibrationDIV.style.backgroundImage = ${JSON.stringify(
            `url("${await pngToDataURI(viewportImage)}")`
          )};`,
          args: []
        }
      },
      log
    );
    log({
      message: "displayed",
      result: sizeInfo.value
    });
    await wait(1000);
    const image = await vm.takePNGScreenshot();
    let calibrationResult;
    try {
      calibrationResult = calibrationQRCodesScan(image);
    } catch (error) {
      if (failedCalibrationFileName) {
        await new Promise<void>((resolve, reject) =>
          pipeline(
            image.pack(),
            createWriteStream(failedCalibrationFileName),
            err => (err ? reject(err) : resolve())
          )
        );
        throw new Error(
          `${error}\nScreenshot recorded as ${failedCalibrationFileName}`
        );
      } else {
        throw new Error(`${error}\nScreenshot was not saved.`);
      }
    }
    log({
      message: "success",
      result: calibrationResult
    });
    // click on the detected QR code:
    await vm.sendMouseMoveEvent({
      x: Math.floor(
        calibrationResult.qrCode.x + calibrationResult.qrCode.width / 2
      ),
      y: Math.floor(
        calibrationResult.qrCode.y + calibrationResult.qrCode.height / 2
      ),
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
      x: sizeInfo.value.screenX,
      y: sizeInfo.value.screenY,
      screenWidth: image.width,
      screenHeight: image.height
    });
    await wait(100);
    await request(
      `${sessionUrl}/execute/sync`,
      {
        body: {
          script: `var calibrationDIV = document.getElementById("calibrationDIV"); calibrationDIV.parentNode.removeChild(calibrationDIV);`,
          args: []
        }
      },
      log
    );
    return {
      x: calibrationResult.viewport.x - sizeInfo.value.screenX,
      y: calibrationResult.viewport.y - sizeInfo.value.screenY,
      screenWidth: image.width,
      screenHeight: image.height
    };
  } catch (error) {
    throw new PublicError(
      500,
      "calibration failed",
      `Calibration for native events failed: ${error}`
    );
  }
}
