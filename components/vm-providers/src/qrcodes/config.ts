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

/**
 * Configuration used when {@link calibrationQRCodesGenerate|generating} or
 * {@link calibrationQRCodesGenerate|scanning} a calibration image.
 * @public
 */
export interface CalibrationQRCodesConfig {
  /**
   * Horizontal (and vertical) margin in pixels between the left (or the top) of
   * the image and the left (or the top) of the first QR code.
   * Defaults to 10.
   */
  outerMargin?: number;

  /**
   * Margin in pixels between two QR codes, both horizontally and vertically.
   * Defaults to 50 times the scale.
   */
  innerMargin?: number;

  /**
   * Scale of the QR codes, must be an integer. Defaults to 1.
   */
  scale?: number;

  /**
   * Prefix of the text to encode in the QR codes, before the position.
   * Defaults to `viewport://`. Changing its value can be useful to
   * distinguish multiple calibration images that are displayed
   * in the same full image.
   */
  contentPrefix?: string;
}
