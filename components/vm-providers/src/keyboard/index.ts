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

import { keysMap, shiftedKeys, Key } from "./keys";
import { keyDown, keyUp } from "./scanCodes";

const getScanCode = (scanCodesMap: Map<Key, number[]>) => (
  value: string | Key
) => {
  const code = keysMap.get(value) ?? (value as Key);
  const scanCode = scanCodesMap.get(code);
  if (!scanCode) {
    throw new Error(`Unknown keyboard key ${value}`);
  }
  return scanCode;
};

export { Key, keysMap };
export const getKeyDownScanCode = getScanCode(keyDown);
export const getKeyUpScanCode = getScanCode(keyUp);

/**
 * Returns whether it is necessary to have the `Shift` key pressed
 * to type the given character (with the US keyboard layout).
 * @param char - character produced by typing a key on the keyboard
 * @returns true if it is needed to press the `Shift` key to type the character
 * @public
 */
export const isShiftedKey = (char: string): boolean => shiftedKeys.has(char);
