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

import { Key } from "vm-providers";

export const skipKeys = new Set<string>();
skipKeys.add(Key.Help); // not supported
skipKeys.add(Key.NumpadComma); // not supported
skipKeys.add(Key.OSLeft); // opens menu and loose focus
skipKeys.add(Key.OSRight); // opens menu and loose focus
skipKeys.add(Key.F1); // opens help
skipKeys.add(Key.F7); // triggers a popup on Firefox
skipKeys.add(Key.AltLeft);
skipKeys.add(Key.AltRight);

// cf https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values
export const crossBrowserKeys = new Map<string, string>();
crossBrowserKeys.set("Spacebar", " ");
crossBrowserKeys.set("Del", "Delete");
crossBrowserKeys.set("Left", "ArrowLeft");
crossBrowserKeys.set("Right", "ArrowRight");
crossBrowserKeys.set("Up", "ArrowUp");
crossBrowserKeys.set("Down", "ArrowDown");
crossBrowserKeys.set("Esc", "Escape");
crossBrowserKeys.set("Add", "+");
crossBrowserKeys.set("Decimal", ".");
crossBrowserKeys.set("Multiply", "*");
crossBrowserKeys.set("Subtract", "-");
crossBrowserKeys.set("Divide", "/");

export const specialKeys = new Map<string, any>();
for (const key of [
  Key.Backspace,
  Key.Enter,
  Key.Tab,
  Key.Delete,
  Key.End,
  Key.Home,
  Key.PageDown,
  Key.PageUp,
  Key.ArrowDown,
  Key.ArrowLeft,
  Key.ArrowRight,
  Key.ArrowUp,
  Key.Insert,
  Key.Escape,
  Key.F1,
  Key.F2,
  Key.F3,
  Key.F4,
  Key.F5,
  Key.F6,
  Key.F7,
  Key.F8,
  Key.F9,
  Key.F10,
  Key.F11,
  Key.F12
]) {
  specialKeys.set(key, {
    key,
    location: 0
  });
}
specialKeys.set(Key.AltLeft, {
  key: "Alt",
  location: 1
});
specialKeys.set(Key.AltRight, {
  key: "Alt",
  location: 2
});
specialKeys.set(Key.ControlLeft, {
  key: "Control",
  location: 1
});
specialKeys.set(Key.ControlRight, {
  key: "Control",
  location: 2
});
specialKeys.set(Key.ShiftLeft, {
  key: "Shift",
  location: 1
});
specialKeys.set(Key.ShiftRight, {
  key: "Shift",
  location: 2
});
for (let i = 0; i < 10; i++) {
  specialKeys.set(`Numpad${i}`, {
    key: `${i}`,
    location: 3
  });
}
specialKeys.set(Key.NumpadDivide, {
  key: "/",
  location: 3
});
specialKeys.set(Key.NumpadMultiply, {
  key: "*",
  location: 3
});
specialKeys.set(Key.NumpadSubtract, {
  key: "-",
  location: 3
});
specialKeys.set(Key.NumpadAdd, {
  key: "+",
  location: 3
});
specialKeys.set(Key.NumpadEnter, {
  key: "Enter",
  location: 3
});
specialKeys.set(Key.NumpadDecimal, {
  key: ".",
  location: 3
});

export const keyProperties = (keyName: string, keyChar: string) => {
  return specialKeys.get(keyName) || { key: keyChar, location: 0 };
};
