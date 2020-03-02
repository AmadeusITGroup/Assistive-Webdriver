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

import Koa from "koa";
import { PNG } from "pngjs";
import { VMMock } from "./vmMock";
import { drawRectangle } from "./drawRectangle";

export const handleCalibration = async (
  sessionUrl: string,
  seleniumAnswerRequest: (
    method: string,
    url: string,
    responseBody: ((ctx: Koa.Context) => Promise<any>) | object
  ) => Promise<void>,
  vmMock: VMMock,
  {
    screenWidth = 1280,
    screenHeight = 1024,
    screenX = 25,
    screenY = 17,
    calibrationX = 3,
    calibrationY = 50,
    viewportWidth = 1000,
    viewportHeight = 700
  } = {}
) => {
  await seleniumAnswerRequest("GET", `${sessionUrl}/url`, {
    value: "about:blank"
  });
  await seleniumAnswerRequest("POST", `${sessionUrl}/url`, {
    value: null
  });
  const border = 30;
  await seleniumAnswerRequest("POST", `${sessionUrl}/execute/sync`, {
    value: {
      width: viewportWidth - 2 * border,
      height: viewportHeight - 2 * border,
      screenX,
      screenY
    }
  });
  const takeScreenshotCall = await vmMock.takePNGScreenshot.waitForCall();
  const png = new PNG({ width: screenWidth, height: screenHeight });
  drawRectangle(png, 0, 0, screenWidth, screenHeight, [255, 255, 255, 255]); // all white, no opacity
  drawRectangle(
    png,
    screenX + calibrationX + border,
    screenY + calibrationY + border,
    viewportWidth - 2 * border,
    viewportHeight - 2 * border,
    [255, 0, 0, 255]
  ); // red rectangle
  takeScreenshotCall.result.value.mockResolve(png);
  await seleniumAnswerRequest("POST", `${sessionUrl}/execute/sync`, {
    value: null
  });
};
