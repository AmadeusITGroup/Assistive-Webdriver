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

import {
  getKeyDownScanCode,
  getKeyUpScanCode,
  isShiftedKey
} from "../src/server/keyboard";

describe("keyboard", () => {
  it("should return correct scan codes", () => {
    expect(getKeyDownScanCode("a")).toEqual([0x1e]);
    expect(getKeyUpScanCode("a")).toEqual([0x1e | 0x80]);
    expect(getKeyDownScanCode("A")).toEqual([0x1e]);
    expect(getKeyUpScanCode("A")).toEqual([0x1e | 0x80]);
    expect(isShiftedKey("a")).toBe(false);
    expect(isShiftedKey("A")).toBe(true);
    expect(getKeyDownScanCode("\uE015")).toEqual([0xe0, 0x50]);
    expect(getKeyUpScanCode("\uE015")).toEqual([0xe0, 0x50 | 0x80]);
  });

  it("should raise an error for unknown keys", () => {
    expect(() => getKeyUpScanCode("é")).toThrowError("Unknown keyboard key");
    expect(() => getKeyDownScanCode("é")).toThrowError("Unknown keyboard key");
  });
});
