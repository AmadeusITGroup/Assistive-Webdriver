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

// cf http://netpbm.sourceforge.net/doc/ppm.html

const isWhiteSpace = (char: number) => {
  /*
    Whitespace characters are:
    0x20 Space
    0x09 TAB
    0x0a LF
    0x0b VT
    0x0c FF
    0x0d CR
  */
  return char === 0x20 /* space */ || (char >= 0x09 && char <= 0x0d);
};

export function parsePPM(fileContent: Buffer): PNG {
  const magicNumber = fileContent.readUInt16BE(0);
  if (magicNumber !== 0x5036 || !isWhiteSpace(fileContent.readUInt8(2))) {
    throw new Error("Not a PPM file!");
  }
  const byteLength = fileContent.byteLength;
  let currentIndex = 2;
  const readToNextWhitespaceChar = () => {
    while (
      currentIndex < byteLength &&
      isWhiteSpace(fileContent.readUInt8(currentIndex))
    ) {
      currentIndex++;
    }
    const startChar = currentIndex;
    for (; currentIndex < byteLength; currentIndex++) {
      const curChar = fileContent.readUInt8(currentIndex);
      if (isWhiteSpace(curChar)) {
        const strValue = fileContent
          .subarray(startChar, currentIndex)
          .toString("ascii");
        const numValue = +strValue;
        if (`${numValue}` != strValue || numValue <= 0) {
          throw new Error(`Expected a positive number and found: ${strValue}!`);
        }
        return +strValue;
      }
    }
    throw new Error(`Could not find expected whitespace char!`);
  };
  const width = +readToNextWhitespaceChar();
  const height = +readToNextWhitespaceChar();
  const maxVal = +readToNextWhitespaceChar();
  if (maxVal >= 65536) {
    throw new Error(`Expected value to be < 65536 and found: ${maxVal}`);
  }
  currentIndex++;
  let readNextValue: () => number;
  if (maxVal < 256) {
    readNextValue = () => {
      const result = fileContent.readUInt8(currentIndex);
      currentIndex++;
      return result;
    };
  } else {
    readNextValue = () => {
      const result = fileContent.readUInt16BE(currentIndex);
      currentIndex += 2;
      return result;
    };
  }
  const readAndAdaptValue = () => {
    const value = readNextValue();
    return Math.round((255 * value) / maxVal);
  };
  const res = new PNG({
    width,
    height
  });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const baseIndex = 4 * (y * width + x);
      res.data[baseIndex] = readAndAdaptValue();
      res.data[baseIndex + 1] = readAndAdaptValue();
      res.data[baseIndex + 2] = readAndAdaptValue();
      res.data[baseIndex + 3] = 255;
    }
  }
  return res;
}
