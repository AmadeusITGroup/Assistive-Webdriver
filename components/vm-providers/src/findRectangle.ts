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

import { PNG } from "pngjs";
import { SimplePosition } from "./vm/vmInterface";

/**
 * Contains the position and size of a rectangle on the screen.
 * @public
 */
export interface Rectangle extends SimplePosition {
  /** Width (in pixels) of the rectangle. */
  width: number;
  /** Height (in pixels) of the rectangle. */
  height: number;
}

/**
 * Looks for a rectangle of the specified size, fully filled with the specified color, with the given color tolerance, in the given image.
 * @param image - image where to look for the rectangle
 * @param color - color of the rectangle to look for, expressed as an array of four numbers between 0 and 255,
 * representing the red, green, blue and alpha parts
 * @param expectedWidth - expected width of the rectangle, in pixels
 * @param expectedHeight - expected height of the rectangle, in pixels
 * @param colorTolerance - allowed difference in the color, 0 meaning no difference.
 * The difference is computed as the sum of the absolute value of the difference for each red, green, blue and alpha parts.
 * @returns The rectangle if it is found, or null otherwise.
 * @public
 */
export function findRectangle(
  image: PNG,
  color: [number, number, number, number],
  expectedWidth: number,
  expectedHeight: number,
  colorTolerance: number
): Rectangle | null {
  const data = image.data; // concatenation of r,g,b,a values
  const width = image.width;
  const height = image.height;

  const isRightColor = function (x: number, y: number) {
    const baseIndex = 4 * (y * width + x);
    const distance =
      Math.abs(data[baseIndex] - color[0]) +
      Math.abs(data[baseIndex + 1] - color[1]) +
      Math.abs(data[baseIndex + 2] - color[2]) +
      Math.abs(data[baseIndex + 3] - color[3]);
    return distance < colorTolerance;
  };

  const isCorrectX = function (x: number) {
    return x >= 0 && x < width;
  };

  const isCorrectY = function (y: number) {
    return y >= 0 && y < height;
  };

  const updateX = function (initValue: number, y: number, increment: number) {
    let value = initValue + increment;
    while (isCorrectX(value) && isRightColor(value, y)) {
      value += increment;
    }
    return value - increment;
  };

  const updateY = function (x: number, initValue: number, increment: number) {
    let value = initValue + increment;
    while (isCorrectY(value) && isRightColor(x, value)) {
      value += increment;
    }
    return value - increment;
  };

  const checkRectangle = function (rectangle: Rectangle) {
    const maxX = rectangle.x + rectangle.width;
    const maxY = rectangle.y + rectangle.height;
    for (let x = rectangle.x; x < maxX; x++) {
      for (let y = rectangle.y; y < maxY; y++) {
        if (!isRightColor(x, y)) {
          return false;
        }
      }
    }
    return true;
  };

  // this method supposes that the shape is really a rectangle
  const findRectangleFromPosition = function (initX: number, initY: number) {
    if (!isRightColor(initX, initY)) {
      return null;
    }
    const x = updateX(initX, initY, -1);
    const y = updateY(initX, initY, -1);
    const width = updateX(initX, initY, 1) + 1 - x;
    const height = updateY(initX, initY, 1) + 1 - y;
    const res = { x, y, width, height };
    if (
      res.width != expectedWidth ||
      res.height != expectedHeight ||
      !checkRectangle(res)
    ) {
      return null;
    }
    return res;
  };

  const internalFindRectangle = function () {
    for (let x = expectedWidth - 1; x < width; x += expectedWidth) {
      for (let y = expectedHeight - 1; y < height; y += expectedHeight) {
        const res = findRectangleFromPosition(x, y);
        if (res != null) {
          return res;
        }
      }
    }
    return null;
  };

  return internalFindRectangle();
}
