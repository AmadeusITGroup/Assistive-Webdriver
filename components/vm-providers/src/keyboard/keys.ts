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

// cf https://www.w3.org/TR/webdriver/#keyboard-actions

/**
 * Keyboard keys that can be sent to a virtual machine through
 * {@link VM.sendKeyDownEvent} and {@link VM.sendKeyUpEvent}.
 * @public
 */
export const enum Key {
  Backquote = "Backquote",
  Backslash = "Backslash",
  Backspace = "Backspace",
  BracketLeft = "BracketLeft",
  BracketRight = "BracketRight",
  Comma = "Comma",
  Digit0 = "Digit0",
  Digit1 = "Digit1",
  Digit2 = "Digit2",
  Digit3 = "Digit3",
  Digit4 = "Digit4",
  Digit5 = "Digit5",
  Digit6 = "Digit6",
  Digit7 = "Digit7",
  Digit8 = "Digit8",
  Digit9 = "Digit9",
  Equal = "Equal",
  IntlBackslash = "IntlBackslash",
  KeyA = "KeyA",
  KeyB = "KeyB",
  KeyC = "KeyC",
  KeyD = "KeyD",
  KeyE = "KeyE",
  KeyF = "KeyF",
  KeyG = "KeyG",
  KeyH = "KeyH",
  KeyI = "KeyI",
  KeyJ = "KeyJ",
  KeyK = "KeyK",
  KeyL = "KeyL",
  KeyM = "KeyM",
  KeyN = "KeyN",
  KeyO = "KeyO",
  KeyP = "KeyP",
  KeyQ = "KeyQ",
  KeyR = "KeyR",
  KeyS = "KeyS",
  KeyT = "KeyT",
  KeyU = "KeyU",
  KeyV = "KeyV",
  KeyW = "KeyW",
  KeyX = "KeyX",
  KeyY = "KeyY",
  KeyZ = "KeyZ",
  Minus = "Minus",
  Period = "Period",
  Quote = "Quote",
  Semicolon = "Semicolon",
  Slash = "Slash",
  AltLeft = "AltLeft",
  AltRight = "AltRight",
  ControlLeft = "ControlLeft",
  ControlRight = "ControlRight",
  Enter = "Enter",
  OSLeft = "OSLeft",
  OSRight = "OSRight",
  ShiftLeft = "ShiftLeft",
  ShiftRight = "ShiftRight",
  Space = "Space",
  Tab = "Tab",
  Delete = "Delete",
  End = "End",
  Help = "Help",
  Home = "Home",
  Insert = "Insert",
  PageDown = "PageDown",
  PageUp = "PageUp",
  ArrowDown = "ArrowDown",
  ArrowLeft = "ArrowLeft",
  ArrowRight = "ArrowRight",
  ArrowUp = "ArrowUp",
  Escape = "Escape",
  F1 = "F1",
  F2 = "F2",
  F3 = "F3",
  F4 = "F4",
  F5 = "F5",
  F6 = "F6",
  F7 = "F7",
  F8 = "F8",
  F9 = "F9",
  F10 = "F10",
  F11 = "F11",
  F12 = "F12",
  Numpad0 = "Numpad0",
  Numpad1 = "Numpad1",
  Numpad2 = "Numpad2",
  Numpad3 = "Numpad3",
  Numpad4 = "Numpad4",
  Numpad5 = "Numpad5",
  Numpad6 = "Numpad6",
  Numpad7 = "Numpad7",
  Numpad8 = "Numpad8",
  Numpad9 = "Numpad9",
  NumpadAdd = "NumpadAdd",
  NumpadComma = "NumpadComma",
  NumpadDecimal = "NumpadDecimal",
  NumpadDivide = "NumpadDivide",
  NumpadEnter = "NumpadEnter",
  NumpadMultiply = "NumpadMultiply",
  NumpadSubtract = "NumpadSubtract",

  // Missing keys in the WebDriver specifications:
  NumLock = "NumLock",
  CapsLock = "CapsLock",
  ScrollLock = "ScrollLock",
  Menu = "Menu"
}

/**
 * Map of keyboard keys.
 * The key in the map is a character produced by the key
 * (either with or without pressing `Shift`).
 * The value in the map is the key from the {@link Key} enum.
 * @public
 */
export const keysMap = new Map<string, Key>();

export const shiftedKeys = new Set<string>();

const checkNoChar = (char: string) => {
  if (keysMap.has(char)) {
    throw new Error(
      `Duplicate character: 0x${char.charCodeAt(0).toString(16)}`
    );
  }
};

const mapKey = (key: Key, char1: string, char2?: string) => {
  checkNoChar(char1);
  keysMap.set(char1, key);
  if (char2) {
    checkNoChar(char2);
    keysMap.set(char2, key);
    shiftedKeys.add(char2);
  }
};

mapKey(Key.Backquote, "`", "~");
mapKey(Key.Backslash, "\\", "|");
mapKey(Key.Backspace, "\uE003");
mapKey(Key.BracketLeft, "[", "{");
mapKey(Key.BracketRight, "]", "}");
mapKey(Key.Comma, ",", "<");
mapKey(Key.Digit0, "0", ")");
mapKey(Key.Digit1, "1", "!");
mapKey(Key.Digit2, "2", "@");
mapKey(Key.Digit3, "3", "#");
mapKey(Key.Digit4, "4", "$");
mapKey(Key.Digit5, "5", "%");
mapKey(Key.Digit6, "6", "^");
mapKey(Key.Digit7, "7", "&");
mapKey(Key.Digit8, "8", "*");
mapKey(Key.Digit9, "9", "(");
mapKey(Key.Equal, "=", "+");
// mapKey(Key.IntlBackslash, "<", ">"); // Duplicate characters
mapKey(Key.KeyA, "a", "A");
mapKey(Key.KeyB, "b", "B");
mapKey(Key.KeyC, "c", "C");
mapKey(Key.KeyD, "d", "D");
mapKey(Key.KeyE, "e", "E");
mapKey(Key.KeyF, "f", "F");
mapKey(Key.KeyG, "g", "G");
mapKey(Key.KeyH, "h", "H");
mapKey(Key.KeyI, "i", "I");
mapKey(Key.KeyJ, "j", "J");
mapKey(Key.KeyK, "k", "K");
mapKey(Key.KeyL, "l", "L");
mapKey(Key.KeyM, "m", "M");
mapKey(Key.KeyN, "n", "N");
mapKey(Key.KeyO, "o", "O");
mapKey(Key.KeyP, "p", "P");
mapKey(Key.KeyQ, "q", "Q");
mapKey(Key.KeyR, "r", "R");
mapKey(Key.KeyS, "s", "S");
mapKey(Key.KeyT, "t", "T");
mapKey(Key.KeyU, "u", "U");
mapKey(Key.KeyV, "v", "V");
mapKey(Key.KeyW, "w", "W");
mapKey(Key.KeyX, "x", "X");
mapKey(Key.KeyY, "y", "Y");
mapKey(Key.KeyZ, "z", "Z");
mapKey(Key.Minus, "-", "_");
mapKey(Key.Period, ".", ">");
mapKey(Key.Quote, "'", '"');
mapKey(Key.Semicolon, ";", ":");
mapKey(Key.Slash, "/", "?");
mapKey(Key.AltLeft, "\uE00A");
mapKey(Key.AltRight, "\uE052");
mapKey(Key.ControlLeft, "\uE009");
mapKey(Key.ControlRight, "\uE051");
mapKey(Key.Enter, "\uE006");
mapKey(Key.OSLeft, "\uE03D");
mapKey(Key.OSRight, "\uE053");
mapKey(Key.ShiftLeft, "\uE008");
mapKey(Key.ShiftRight, "\uE050");
mapKey(Key.Space, " ", "\uE00D");
mapKey(Key.Tab, "\uE004");
mapKey(Key.Delete, "\uE017");
mapKey(Key.End, "\uE010");
mapKey(Key.Help, "\uE002");
mapKey(Key.Home, "\uE011");
mapKey(Key.Insert, "\uE016");
mapKey(Key.PageDown, "\uE00F");
mapKey(Key.PageUp, "\uE00E");
mapKey(Key.ArrowDown, "\uE015");
mapKey(Key.ArrowLeft, "\uE012");
mapKey(Key.ArrowRight, "\uE014");
mapKey(Key.ArrowUp, "\uE013");
mapKey(Key.Escape, "\uE00C");
mapKey(Key.F1, "\uE031");
mapKey(Key.F2, "\uE032");
mapKey(Key.F3, "\uE033");
mapKey(Key.F4, "\uE034");
mapKey(Key.F5, "\uE035");
mapKey(Key.F6, "\uE036");
mapKey(Key.F7, "\uE037");
mapKey(Key.F8, "\uE038");
mapKey(Key.F9, "\uE039");
mapKey(Key.F10, "\uE03A");
mapKey(Key.F11, "\uE03B");
mapKey(Key.F12, "\uE03C");
mapKey(Key.Numpad0, "\uE01A", "\uE05C");
mapKey(Key.Numpad1, "\uE01B", "\uE056");
mapKey(Key.Numpad2, "\uE01C", "\uE05B");
mapKey(Key.Numpad3, "\uE01D", "\uE055");
mapKey(Key.Numpad4, "\uE01E", "\uE058");
mapKey(Key.Numpad5, "\uE01F");
mapKey(Key.Numpad6, "\uE020", "\uE05A");
mapKey(Key.Numpad7, "\uE021", "\uE057");
mapKey(Key.Numpad8, "\uE022", "\uE059");
mapKey(Key.Numpad9, "\uE023", "\uE054");
mapKey(Key.NumpadAdd, "\uE025");
mapKey(Key.NumpadComma, "\uE026");
mapKey(Key.NumpadDecimal, "\uE028", "\uE05D");
mapKey(Key.NumpadDivide, "\uE029");
mapKey(Key.NumpadEnter, "\uE007");
mapKey(Key.NumpadMultiply, "\uE024");
mapKey(Key.NumpadSubtract, "\uE027");
