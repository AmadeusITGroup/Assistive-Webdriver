/*
 * Copyright 2021 Amadeus s.a.s.
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

import { PNG } from "pngjs";
import { CalibrationQRCodesConfig } from "../src/qrcodes/config";
import {
  calibrationQRCodesGenerate,
  drawRectangle
} from "../src/qrcodes/generate";
import { calibrationQRCodesScan } from "../src/qrcodes/scan";
// import { createWriteStream } from "fs";

describe("qrcodes", () => {
  const randomColorComponent = () => Math.floor(Math.random() * 255);
  const randomColor = (): [number, number, number, number] => [
    randomColorComponent(),
    randomColorComponent(),
    randomColorComponent(),
    255
  ];

  const testWithConfig = (
    viewportX: number,
    viewportY: number,
    viewportWidth: number,
    viewportHeight: number,
    screenWidth: number,
    screenHeight: number,
    config?: CalibrationQRCodesConfig
  ) => {
    const viewport = calibrationQRCodesGenerate(
      viewportWidth,
      viewportHeight,
      config
    );
    const screen = new PNG({ width: screenWidth, height: screenHeight });
    drawRectangle(screen, 0, 0, screenWidth, screenHeight, randomColor());
    viewport.bitblt(
      screen,
      0,
      0,
      viewportWidth,
      viewportHeight,
      viewportX,
      viewportY
    );
    // screen.pack().pipe(createWriteStream("out.png"));
    return calibrationQRCodesScan(screen, config);
  };

  it("generate and scan with default config", () => {
    expect(testWithConfig(0, 50, 1920, 900, 1920, 1080)).toMatchObject({
      qrCode: {
        height: 29,
        width: 29,
        x: 10,
        y: 60
      },
      viewport: {
        x: 0,
        y: 50
      }
    });
  });

  it("generate and scan with scale 2", () => {
    expect(
      testWithConfig(0, 50, 1920, 900, 1920, 1080, {
        scale: 2
      })
    ).toMatchObject({
      qrCode: {
        height: 58,
        width: 58,
        x: 10,
        y: 60
      },
      viewport: {
        x: 0,
        y: 50
      }
    });
  });

  it("generate and scan with outerMargin 20", () => {
    expect(
      testWithConfig(2, 50, 1916, 900, 1920, 1080, {
        outerMargin: 20
      })
    ).toMatchObject({
      qrCode: {
        height: 29,
        width: 29,
        x: 22,
        y: 70
      },
      viewport: {
        x: 2,
        y: 50
      }
    });
  });
});
