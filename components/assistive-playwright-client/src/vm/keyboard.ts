/*
 * Copyright 2020 Amadeus s.a.s.
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

import type { Keyboard } from "playwright-core";
import { isShiftedKey, Key, VM, wait } from "vm-providers";

// For the split function:
// cf https://github.com/microsoft/playwright/blob/bf491f12cf398c247f9c4b25eb1076e4ab67b8ed/src/server/input.ts#L104
function split(keyString: string) {
  const keys: string[] = [];
  let building = "";
  for (const char of keyString) {
    if (char === "+" && building) {
      keys.push(building);
      building = "";
    } else {
      building += char;
    }
  }
  keys.push(building);
  return keys;
}

/**
 * Object implementing the {@link https://playwright.dev/docs/api/class-keyboard | Keyboard} interface
 * from playwright, it can send low-level keyboard events to the virtual machine.
 * @public
 */
export class VMKeyboard implements Keyboard {
  /**
   * Creates a {@link VMKeyboard} object.
   * @param vm - cf {@link VMKeyboard.vm}
   */
  constructor(
    /**
     * Reference to the virtual machine
     */
    public vm: VM
  ) {}

  /**
   * An alias of {@link VMKeyboard."type"}.
   * In playwright, {@link https://playwright.dev/docs/api/class-keyboard#keyboardinserttexttext | insertText} differs
   * from {@link https://playwright.dev/docs/api/class-keyboard#keyboardtypetext-options | type} by the fact
   * that `insertText` only dispatches an `input` event and no `keydown`, `keyup` or `keypress` event.
   * Here, as the goal is to use only low-level events, there is no distinction between
   * `insertText` and `type`.
   */
  async insertText(text: string): Promise<void> {
    await this.type(text);
  }

  /**
   * Sends a low-level keydown event to the virtual machine.
   * @param key - Name of the key (cf {@link vm-providers#Key}) or its corresponding character, for example `PageUp` or `a`.
   * If the character requires to press the `Shift` key to be produced,
   * a keydown and a keyup event for the `Shift` key are also sent before and after.
   */
  async down(key: string): Promise<void> {
    const shifted = isShiftedKey(key);
    if (shifted) {
      await this.vm.sendKeyDownEvent(Key.ShiftLeft);
    }
    await this.vm.sendKeyDownEvent(key);
    if (shifted) {
      await this.vm.sendKeyUpEvent(Key.ShiftLeft);
    }
  }

  /**
   * Sends a low-level keyup event to the virtual machine.
   * @param key - Name of the key (cf {@link vm-providers#Key}) or its corresponding character, for example `PageUp` or `a`.
   */
  async up(key: string): Promise<void> {
    await this.vm.sendKeyUpEvent(key);
  }

  /**
   * Shortcut for {@link VMKeyboard.down} and {@link VMKeyboard.up}.
   * @param key - Name of the key (cf {@link vm-providers#Key}) or its corresponding character, for example `PageUp` or `a`.
   * Shortcuts such as `"Control+a"` or "Control+Shift+a" can also be specified,
   * as documented in {@link https://playwright.dev/docs/api/class-keyboard#keyboardpresskey-options}
   * @param options - `delay`: delay in milliseconds between keydown and keyup events
   */
  async press(
    key: string,
    options?: { delay?: number | undefined }
  ): Promise<void> {
    const items = split(key);
    for (const item of items) {
      await this.down(item);
    }
    const delay = options?.delay ?? 0;
    if (delay > 0) {
      await wait(delay);
    }
    items.reverse();
    for (const item of items) {
      await this.up(item);
    }
  }

  /**
   * Sends a low-level keydown and keyup event for each character in the text.
   * @param text - text to type
   * @param options - `delay`: delay in milliseconds between keydown and keyup events
   */
  async type(
    text: string,
    options?: { delay?: number | undefined }
  ): Promise<void> {
    for (const char of text) {
      await this.press(char, options);
    }
  }
}
