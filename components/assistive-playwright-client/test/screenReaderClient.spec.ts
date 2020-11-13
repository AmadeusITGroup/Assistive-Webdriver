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

import { isMatch } from "../src";

describe("client", () => {
  it("isMatch should work fine", () => {
    const screenReaderText = "This is some text from the screen reader!";
    expect(isMatch(screenReaderText, screenReaderText)).toBe(true);
    expect(isMatch(screenReaderText, "some text")).toBe(true);
    expect(isMatch(screenReaderText, "some words")).toBe(false);
    expect(isMatch(screenReaderText, /some\s+[a-z]+\s+from/)).toBe(true);
    expect(isMatch(screenReaderText, /some\s+[a-z]+\s+reader/)).toBe(false);
    expect(isMatch(screenReaderText, [])).toBe(false);
    expect(isMatch(screenReaderText, ["some words"])).toBe(false);
    expect(isMatch(screenReaderText, ["some text"])).toBe(true);
    expect(isMatch(screenReaderText, ["some words", "some text"])).toBe(true);

    const mock = jest.fn().mockReturnValue(true);
    expect(isMatch(screenReaderText, mock)).toBe(true);
    expect(mock).toHaveBeenCalledWith(screenReaderText);
    mock.mockReset();
    mock.mockReturnValue(false);
    expect(isMatch(screenReaderText, mock)).toBe(false);
    expect(mock).toHaveBeenCalledWith(screenReaderText);
    mock.mockReset();

    expect(isMatch(screenReaderText, ["some words", "some text", mock])).toBe(
      true
    );
    expect(mock).not.toHaveBeenCalled();
    mock.mockReturnValue(true);
    expect(isMatch(screenReaderText, ["some words", mock])).toBe(true);
    expect(mock).toHaveBeenCalledWith(screenReaderText);

    expect(() => isMatch(screenReaderText, {} as any)).toThrowError(
      "Unexpected type"
    );
  });
});
