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

/**
 *
 * This package contains functions to be used with selenium-webdriver in
 * order to test a web application with a screen reader.
 *
 * @packageDocumentation
 */

import { WebDriver, Condition } from "selenium-webdriver";
import { Command } from "selenium-webdriver/lib/command";

/**
 * Name of the command registered in selenium-webdriver to get
 * the text from the screen reader.
 * @public
 */
export const SCREEN_READER_TEXT_COMMAND = "screenReaderText";

/**
 * HTTP method used on the assistive-webdriver server to get
 * the text from the screen reader.
 * @public
 */
export const SCREEN_READER_TEXT_METHOD = "GET";

/**
 * HTTP path used on the assistive-webdriver server to get
 * the text from the screen reader.
 * @public
 */
export const SCREEN_READER_TEXT_PATH = "/session/:sessionId/screenReaderText";

/**
 * Direct reference to a selenium-webdriver
 * {@link https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_WebDriver.html | WebDriver}
 * instance, or to an object containing a WebDriver instance as its `driver` property.
 * @public
 */
export type WebdriverLike = WebDriver | { driver: WebDriver };

interface Listener {
  scope: any;
  fn: (message: string) => void;
}

interface ScreenReaderTextInfo {
  messages: string[];
  listeners: Listener[];
}

const screenReaderText = new WeakMap<WebDriver, ScreenReaderTextInfo>();

// The "browser" object from Protractor (>= 6) has a "driver" property
// that contains webdriver
// For convenience, let's directly accept the "browser" object from protractor
// instead of requiring to use: "browser.driver"
function getWebdriver(webdriver: WebdriverLike) {
  if (!(webdriver instanceof WebDriver)) {
    webdriver = webdriver.driver;
    if (!(webdriver instanceof WebDriver)) {
      throw new Error("Expected an instance of WebDriver!");
    }
  }
  return webdriver;
}

function getScreenReaderTextInfo(webdriver: WebdriverLike) {
  webdriver = getWebdriver(webdriver);
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

/**
 * Registers a listener function to be called each time a new message is
 * coming from the screen reader.
 *
 * @remarks
 *
 * The function may not be called immediately after the screen reader reads
 * a message. Messages are retrieved from the assistive-webdriver server
 * only when {@link refreshScreenReaderText} is called, and that is when
 * the listeners are called if new messages are retrieved.
 *
 * @param webdriver - reference to the selenium-webdriver instance
 * @param fn - function to register as a listener. The message read by
 * the screen reader is passed as the first (and only) parameter.
 * @param scope - scope to use when calling the listener
 * @returns a function to unregister the listener
 * @public
 */
export function addScreenReaderTextListener(
  webdriver: WebdriverLike,
  fn: (message: string) => void,
  scope?: any
): () => void {
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

/**
 * Calls the assistive-webdriver server to get any new text coming from
 * the screen reader, and, if there is any, synchronously calls listeners
 * registered with {@link addScreenReaderTextListener}.
 * @param webdriver - reference to the selenium-webdriver instance
 * @public
 */
export async function refreshScreenReaderText(
  webdriver: WebdriverLike
): Promise<string[]> {
  webdriver = getWebdriver(webdriver);
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

/**
 * Clears any locally cached screen reader text for the given instance
 * of selenium-webdriver.
 * @param webdriver - reference to the selenium-webdriver instance
 * @public
 */
export async function clearCachedScreenReaderText(
  webdriver: WebdriverLike
): Promise<void> {
  const info = getScreenReaderTextInfo(webdriver);
  await refreshScreenReaderText(webdriver);
  info.messages.splice(0, info.messages.length);
}

/**
 * Returns whether the text coming from the screen reader passed as the
 * first parameter matches the expected text specified as the second parameter.
 *
 * @remarks
 * `expectedText` can be:
 *
 * - a string: the text matches if `screenReaderText` contains the text in `expectedText`
 *
 * - a regular expression: the text matches if `screenReaderText` matches the regular expression
 *
 * - a function: the function is called, and should return a boolean describing whether it matches
 * or not.
 *
 * - an array: the text matches if there is a match with one of the items of the array
 * (which can be a string, a regular expression, a function or a nested array), according
 * to the rules previously mentioned
 *
 * @param screenReaderText - text coming from the screen reader
 * @param expectedText - expected text. See the remarks for more details about
 * accepted types.
 * @returns true if the text coming from the screen reader matches
 * the expected text, false otherwise.
 * @public
 */
export function isMatch(screenReaderText: string, expectedText: any): boolean {
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

/**
 * Returns a selenium-webdriver
 * {@link https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_Condition.html | Condition object}
 * usable with {@link https://www.selenium.dev/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_WebDriver.html#wait | the wait method}
 * of selenium-webdriver.
 *
 * @example
 * ```ts
 * await driver.wait(forScreenReaderToSay("Date of departure"), 5000);
 * ```
 *
 * @param expectedText - specifies the expected text, in one of the ways documented
 * for the `expectedText` parameter of {@link isMatch}.
 * @param clean - whether to clear from the cache all the screen reader messages until (and including)
 * the message matched by `expectedText`. If this is false, the messages are kept in the cache,
 * allowing them to be matched again.
 *
 * @public
 */
export function forScreenReaderToSay(
  expectedText: any,
  clean = true
): Condition<string[] | false> {
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
