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

import { Key } from "./keys";
export const keyDown = new Map<Key, number[]>();
export const keyUp = new Map<Key, number[]>();

const checkNoKey = (keyCode: Key) => {
  if (keyDown.has(keyCode)) {
    throw new Error(`Duplicate key code: ${keyCode}`);
  }
};

const setShortCode = (keyCode: Key, scanCode: number) => {
  checkNoKey(keyCode);
  keyDown.set(keyCode, [scanCode]);
  keyUp.set(keyCode, [scanCode | 0x80]);
};

const setExtCode = (keyCode: Key, scanCode: number) => {
  checkNoKey(keyCode);
  keyDown.set(keyCode, [0xe0, scanCode]);
  keyUp.set(keyCode, [0xe0, scanCode | 0x80]);
};

// cf vboxshell.py
// see also http://www.win.tue.nl/~aeb/linux/kbd/scancodes-1.html

setShortCode(Key.Escape, 0x01);
setShortCode(Key.F1, 0x3b);
setShortCode(Key.F2, 0x3c);
setShortCode(Key.F3, 0x3d);
setShortCode(Key.F4, 0x3e);
setShortCode(Key.F5, 0x3f);
setShortCode(Key.F6, 0x40);
setShortCode(Key.F7, 0x41);
setShortCode(Key.F8, 0x42);
setShortCode(Key.F9, 0x43);
setShortCode(Key.F10, 0x44);
setShortCode(Key.F11, 0x57);
setShortCode(Key.F12, 0x58);

setShortCode(Key.Backquote, 0x29);
setShortCode(Key.Digit1, 0x02);
setShortCode(Key.Digit2, 0x03);
setShortCode(Key.Digit3, 0x04);
setShortCode(Key.Digit4, 0x05);
setShortCode(Key.Digit5, 0x06);
setShortCode(Key.Digit6, 0x07);
setShortCode(Key.Digit7, 0x08);
setShortCode(Key.Digit8, 0x09);
setShortCode(Key.Digit9, 0x0a);
setShortCode(Key.Digit0, 0x0b);
setShortCode(Key.Minus, 0x0c);
setShortCode(Key.Equal, 0x0d);
setShortCode(Key.Backspace, 0x0e);

setShortCode(Key.Tab, 0x0f);
setShortCode(Key.KeyQ, 0x10);
setShortCode(Key.KeyW, 0x11);
setShortCode(Key.KeyE, 0x12);
setShortCode(Key.KeyR, 0x13);
setShortCode(Key.KeyT, 0x14);
setShortCode(Key.KeyY, 0x15);
setShortCode(Key.KeyU, 0x16);
setShortCode(Key.KeyI, 0x17);
setShortCode(Key.KeyO, 0x18);
setShortCode(Key.KeyP, 0x19);
setShortCode(Key.BracketLeft, 0x1a);
setShortCode(Key.BracketRight, 0x1b);
setShortCode(Key.Backslash, 0x2b);
setShortCode(Key.Enter, 0x1c);

setShortCode(Key.CapsLock, 0x3a);
setShortCode(Key.KeyA, 0x1e);
setShortCode(Key.KeyS, 0x1f);
setShortCode(Key.KeyD, 0x20);
setShortCode(Key.KeyF, 0x21);
setShortCode(Key.KeyG, 0x22);
setShortCode(Key.KeyH, 0x23);
setShortCode(Key.KeyJ, 0x24);
setShortCode(Key.KeyK, 0x25);
setShortCode(Key.KeyL, 0x26);
setShortCode(Key.Semicolon, 0x27);
setShortCode(Key.Quote, 0x28);

setShortCode(Key.ShiftLeft, 0x2a);
setShortCode(Key.KeyZ, 0x2c);
setShortCode(Key.KeyX, 0x2d);
setShortCode(Key.KeyC, 0x2e);
setShortCode(Key.KeyV, 0x2f);
setShortCode(Key.KeyB, 0x30);
setShortCode(Key.KeyN, 0x31);
setShortCode(Key.KeyM, 0x32);
setShortCode(Key.Comma, 0x33);
setShortCode(Key.Period, 0x34);
setShortCode(Key.Slash, 0x35);
setShortCode(Key.ShiftRight, 0x36);

setShortCode(Key.ControlLeft, 0x1d);
setExtCode(Key.OSLeft, 0x5b);
setShortCode(Key.AltLeft, 0x38);
setShortCode(Key.Space, 0x39);
setExtCode(Key.AltRight, 0x38);
setExtCode(Key.OSRight, 0x5c);
setExtCode(Key.Menu, 0x5d);
setExtCode(Key.ControlRight, 0x1d);

setExtCode(Key.Insert, 0x52);
setExtCode(Key.Home, 0x47);
setExtCode(Key.PageUp, 0x49);
setExtCode(Key.Delete, 0x53);
setExtCode(Key.End, 0x4f);
setExtCode(Key.PageDown, 0x51);

setExtCode(Key.ArrowUp, 0x48);
setExtCode(Key.ArrowLeft, 0x4b);
setExtCode(Key.ArrowDown, 0x50);
setExtCode(Key.ArrowRight, 0x4d);

setShortCode(Key.NumLock, 0x45);
setShortCode(Key.ScrollLock, 0x46);

setExtCode(Key.NumpadDivide, 0x35);
setShortCode(Key.NumpadMultiply, 0x37);
setShortCode(Key.Numpad7, 0x47);
setShortCode(Key.Numpad8, 0x48);
setShortCode(Key.Numpad9, 0x49);
setShortCode(Key.NumpadSubtract, 0x4a);
setShortCode(Key.Numpad4, 0x4b);
setShortCode(Key.Numpad5, 0x4c);
setShortCode(Key.Numpad6, 0x4d);
setShortCode(Key.NumpadAdd, 0x4e);
setShortCode(Key.Numpad1, 0x4f);
setShortCode(Key.Numpad2, 0x50);
setShortCode(Key.Numpad3, 0x51);
setShortCode(Key.Numpad0, 0x52);
setShortCode(Key.NumpadDecimal, 0x53);
setExtCode(Key.NumpadEnter, 0x1c);
