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

import { WebDriver, Condition } from "selenium-webdriver";
import { Command } from "selenium-webdriver/lib/command";

export const SCREEN_READER_TEXT_COMMAND = "screenReaderText";
export const SCREEN_READER_TEXT_METHOD = "GET";
export const SCREEN_READER_TEXT_PATH = "/session/:sessionId/screenReaderText";

interface Listener {
  scope: any;
  fn: (message: string) => void;
}

interface ScreenReaderTextInfo {
  messages: string[];
  listeners: Listener[];
}

const screenReaderText = new WeakMap<WebDriver, ScreenReaderTextInfo>();

function getScreenReaderTextInfo(webdriver: WebDriver) {
  let info = screenReaderText.get(webdriver);
  if (!info) {
    const executor = webdriver.getExecutor();
    executor.defineCommand(
      SCREEN_READER_TEXT_COMMAND,
      SCREEN_READER_TEXT_METHOD,
      SCREEN_READER_TEXT_PATH
    );
    info = {
      messages: [],
      listeners: []
    };
    screenReaderText.set(webdriver, info);
  }
  return info;
}

export function addScreenReaderTextListener(
  webdriver: WebDriver,
  fn: (message: string) => void,
  scope?: any
) {
  const listener: Listener = {
    fn,
    scope
  };
  const info = getScreenReaderTextInfo(webdriver);
  info.listeners.push(listener);
  return () => {
    const index = info.listeners.indexOf(listener);
    if (index > -1) {
      info.listeners.splice(index, 1);
    }
  };
}

export async function refreshScreenReaderText(webdriver: WebDriver) {
  const info = getScreenReaderTextInfo(webdriver);
  const command = new Command(SCREEN_READER_TEXT_COMMAND);
  const newMessages = await webdriver.execute<string[]>(
    command,
    "Get screen reader text"
  );
  const messages = info.messages;
  if (info.listeners.length > 0 && newMessages.length > 0) {
    for (const message of newMessages) {
      for (const listener of info.listeners) {
        listener.fn.call(listener.scope, message);
      }
    }
  }
  messages.push(...newMessages);
  return messages;
}

export async function clearCachedScreenReaderText(webdriver: WebDriver) {
  const info = getScreenReaderTextInfo(webdriver);
  await refreshScreenReaderText(webdriver);
  info.messages.splice(0, info.messages.length);
}

export function isMatch(screenReaderText: string, expectedText: any) {
  if (Array.isArray(expectedText)) {
    for (let i = 0, l = expectedText.length; i < l; i++) {
      if (isMatch(screenReaderText, expectedText[i])) {
        return true;
      }
    }
    return false;
  } else if (typeof expectedText === "string") {
    return screenReaderText.indexOf(expectedText) > -1;
  } else if (expectedText instanceof RegExp) {
    return expectedText.test(screenReaderText);
  } else if (typeof expectedText === "function") {
    return expectedText(screenReaderText);
  } else {
    throw new Error("Unexpected type for isMatch!");
  }
}

export function forScreenReaderToSay(expectedText: any, clean = true) {
  return new Condition(
    `for screen reader to say ${JSON.stringify(expectedText)}`,
    async webdriver => {
      const array = await refreshScreenReaderText(webdriver);
      const index = array.findIndex(value => isMatch(value, expectedText));
      if (index < 0) {
        return false;
      }
      return clean ? array.splice(0, index + 1) : array.slice(0, index + 1);
    }
  );
}
