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
import { create, QRCode } from "qrcode";
import { CalibrationQRCodesConfig } from "./config";

export function drawRectangle(
  png: PNG,
  x: number,
  y: number,
  width: number,
  height: number,
  color: [number, number, number, number]
): void {
  for (let sx = 0; sx < width; sx++) {
    for (let sy = 0; sy < height; sy++) {
      const base = 4 * ((y + sy) * png.width + x + sx);
      png.data[base] = color[0];
      png.data[base + 1] = color[1];
      png.data[base + 2] = color[2];
      png.data[base + 3] = color[3];
    }
  }
}

export function drawQRCodeOnPNG(
  { modules }: QRCode,
  png: PNG,
  origX: number,
  origY: number,
  scale: number
): void {
  const size = modules.size;
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      if (modules.get(y, x)) {
        drawRectangle(
          png,
          origX + x * scale,
          origY + y * scale,
          scale,
          scale,
          [0, 0, 0, 255]
        );
      }
    }
  }
}

/**
 * Creates a calibration image containing QR codes. Each QR code encodes
 * its position inside the image, allowing to easily detect the position
 * of the whole image by reading any of its QR codes, which can be done
 * with {@link calibrationQRCodesScan}.
 *
 * @param width - width of the image
 * @param height - height of the image
 * @param config - configuration
 * @returns the calibration image
 * @public
 */
export function calibrationQRCodesGenerate(
  width: number,
  height: number,
  config: CalibrationQRCodesConfig = {}
): PNG {
  const {
    scale = 1,
    outerMargin = 10,
    innerMargin = 50 * scale,
    contentPrefix = "viewport://"
  } = config;
  const png = new PNG({
    width,
    height,
    colorType: 0
  });
  drawRectangle(png, 0, 0, width, height, [255, 255, 255, 255]);
  let y = outerMargin;
  let qrSize = 0;
  while (y + qrSize + outerMargin < height) {
    let x = outerMargin;
    while (x + qrSize + outerMargin < width) {
      const qrData = create(contentPrefix + x + "," + y, {
        errorCorrectionLevel: "H"
      });
      qrSize = qrData.modules.size * scale;
      if (qrSize > innerMargin) {
        throw new Error(
          "innerMargin should be greater than the size of the QR code."
        );
      }
      drawQRCodeOnPNG(qrData, png, x, y, scale);
      x += qrSize + innerMargin;
    }
    y += qrSize + innerMargin;
  }
  return png;
}
