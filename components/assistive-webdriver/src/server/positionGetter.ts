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

import request from "./request";
import { ScreenPosition, SimplePosition, LogFunction } from "vm-providers";

export const createPositionGetter = (
  serverSessionUrl: string,
  calibration: ScreenPosition,
  mousePosition: SimplePosition,
  log: LogFunction
) => async (origin: any): Promise<ScreenPosition> => {
  if (origin === "pointer") {
    return {
      x: mousePosition.x,
      y: mousePosition.y,
      screenWidth: calibration.screenWidth,
      screenHeight: calibration.screenHeight
    };
  }
  origin = origin || "viewport";
  const result = await request(
    `${serverSessionUrl}/execute/sync`,
    {
      body: {
        args: [origin, calibration],
        script: `
var origin = arguments[0];
var calibration = arguments[1];
var x = window.screenX + calibration.x;
var y = window.screenY + calibration.y;
if (origin !== "viewport") {
  var rect = origin.getBoundingClientRect();
  x += rect.left + 0.5 * rect.width;
  y += rect.top + 0.5 * rect.height;
}
return {x: x, y: y, screenWidth: calibration.screenWidth, screenHeight: calibration.screenHeight};
      `
      }
    },
    log
  );
  return result.value;
};
