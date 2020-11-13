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

import Websocket from "ws";
import { EventEmitter } from "events";

/**
 * Type of an expectation from a message coming from the screen reader.
 *
 * @remarks
 * {@link isMatch} can be used to check whether a specific message `screenReaderText` from
 * the screen reader matches an expectation `expectedText` and {@link ScreenReaderClient.waitForMessage}
 * can be used to wait for a message from the screen reader that matches
 * the expectation `expectedText`.
 *
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
 * @public
 */
export type ExpectedText =
  | ExpectedText[]
  | string
  | RegExp
  | ((text: string) => boolean);

const assertNeverHappens = (message: string, value: never): never => {
  throw new Error(message);
};

/**
 * Returns whether the text coming from the screen reader passed as the
 * first parameter matches the expected text specified as the second parameter.
 *
 * @param screenReaderText - text coming from the screen reader
 * @param expectedText - expected text
 * @returns true if the text coming from the screen reader matches
 * the expected text, false otherwise.
 * @public
 */
export function isMatch(
  screenReaderText: string,
  expectedText: ExpectedText
): boolean {
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
    return assertNeverHappens("Unexpected type for isMatch!", expectedText);
  }
}

/**
 * Class giving access to messages from the screen reader.
 * It is a simple wrapper around websocket that stores each
 * incoming message and gives utility functions to wait for specific
 * messages to come.
 * @public
 */
export class ScreenReaderClient {
  private _emitter = new EventEmitter();

  /**
   * Websocket object from which messages are received.
   */
  socket: Websocket;

  /**
   * Whether the websocket object is still connected.
   */
  connected = false;

  /**
   * Array of stored messages. Messages are added to this array
   * as soon as they arrive on the websocket, and can be removed by
   * {@link ScreenReaderClient.clearMessages} and
   * {@link ScreenReaderClient.waitForMessage}.
   */
  messages: string[] = [];

  /**
   * Connects to a websocket url and returns a corresponding
   * instance of {@link ScreenReaderClient} as soon as it is
   * connected.
   * @param url - Websocket URL such as `ws://127.0.0.1:7779/screen-reader`
   */
  static async create(url: string): Promise<ScreenReaderClient> {
    const result = new ScreenReaderClient(url);
    await new Promise((resolve, reject) => {
      result._emitter.once("open", resolve);
      result._emitter.once("error", reject);
    });
    return result;
  }

  private constructor(url: string) {
    const socket = new Websocket(url);
    this.socket = socket;
    socket.onmessage = arg => {
      const data = arg.data.toString("utf8");
      this.messages.push(data);
      this._emitter.emit("message", data);
    };
    socket.onopen = () => {
      this.connected = true;
      this._emitter.emit("open");
    };
    socket.onclose = () => {
      this.connected = false;
      this._emitter.emit("close");
    };
    socket.onerror = error => {
      this._emitter.emit("error", error);
    };
  }

  /**
   * Disconnects the underlying websocket, thus preventing
   * any further message from being received.
   */
  disconnect(): void {
    if (this.connected) {
      this.socket.close();
    }
  }

  /**
   * Execute the `condition` function on each received message until it returns a
   * truthy value or the specified timeout occurs.
   * If there is a timeout, the promise returned by this function is rejected.
   * @param condition - function that is called for each message as long as it returns a falsy value. When it returns a
   * truthy value, the process is stopped and that value is returned by
   * waitForMessageCondition.
   * @param options - `includeCurrent`: if true (the default), the `condition` function
   * is first called for already received messages that are in {@link ScreenReaderClient.messages | messages}.
   * Otherwise, it is only called on new messages, not yet received at the time `waitForMessageCondition` is called.
   * `timeout`: the time in milliseconds to wait before the promise returned by
   * `waitForMessageCondition` is rejected (if the condition does not return a
   * truthy value during that time). Defaults to 10000ms (10s).
   */
  waitForMessageCondition<T>(
    condition: (
      value: string,
      index: number,
      messages: string[]
    ) => T | undefined,
    options: {
      includeCurrent?: boolean;
      timeout?: number;
    } = {}
  ): Promise<T> {
    const { includeCurrent = true, timeout = 10000 } = options;
    return new Promise<T>((resolve, reject) => {
      if (includeCurrent) {
        for (let msg = this.messages, i = 0, l = msg.length; i < l; i++) {
          const result = condition(msg[i], i, msg);
          if (result) {
            resolve(result);
            return;
          }
        }
      }
      const removeListeners = () => {
        clearTimeout(plannedTimeout);
        this.off("message", listener);
        this.off("error", errorListener);
      };
      const listener = (value: string) => {
        const msg = this.messages;
        const index = msg.length - 1;
        const result = condition(value, index, msg);
        if (result) {
          removeListeners();
          resolve(result);
        }
      };
      const errorListener = (error: any) => {
        removeListeners();
        reject(error);
      };
      this.on("message", listener);
      this.on("error", errorListener);
      const plannedTimeout = setTimeout(
        () => errorListener(new Error(`Timeout after waiting ${timeout}ms`)),
        timeout
      );
    });
  }

  /**
   * Waits for a specific message from the screen reader.
   *
   * @param expectedText - expectation about the message to receive
   * @param options - `clean`: if true (the default), once the expected
   * message is found, all messages up to (and including) the expected message
   * are removed from the {@link ScreenReaderClient.messages | messages} array.
   * `includeCurrent`: if true (the default), the expected message is also searched for
   * in the already received messages (in the current {@link ScreenReaderClient.messages | messages} array).
   * Otherwise, it is only searched for in the future messages.
   * `timeout`: the time in milliseconds to wait before the promise returned by
   * `waitForMessage` is rejected (if the expected message is not found during that time). Defaults to 10000ms (10s).
   *
   * @returns The array of messages up to (and including) the message matching the expectations.
   */
  waitForMessage(
    expectedText: ExpectedText,
    options: {
      clean?: boolean;
      includeCurrent?: boolean;
      timeout?: number;
    } = {}
  ): Promise<string[]> {
    const { clean = true, timeout = 10000, includeCurrent = true } = options;
    return this.waitForMessageCondition(
      (message, index, array) => {
        if (isMatch(message, expectedText)) {
          return clean ? array.splice(0, index + 1) : array.slice(0, index + 1);
        }
      },
      { timeout, includeCurrent }
    );
  }

  /**
   * Empties the {@link ScreenReaderClient.messages | messages} array
   * and returns its previous content.
   */
  clearMessages(): string[] {
    return this.messages.splice(0, this.messages.length);
  }

  /**
   * Registers a listener for the `message` event, that will be called each
   * time a message is received from the screen reader.
   * @param event - "message"
   * @param listener - function to be called with the received message
   *
   * The listener can removed with {@link ScreenReaderClient.off}.
   */
  on(event: "message", listener: (message: string) => void): this;
  /**
   * Registers a listener for the `error` event, that will be called
   * if an error happens in the connection with the screen reader.
   * @param event - `"error"`
   * @param listener - function to be called with the error
   *
   * The listener can removed with {@link ScreenReaderClient.off}.
   */
  on(event: "error", listener: (error: any) => void): this;
  /**
   * Registers a listener for the `close` event, that will be called
   * when the connection to the screen reader is closed
   * @param event - `"close"`
   * @param listener - function to be called with the error
   *
   * The listener can removed with {@link ScreenReaderClient.off}.
   */
  on(event: "close", listener: () => void): this;
  on(event: string, listener: (...args: any[]) => void): this {
    this._emitter.on(event, listener);
    return this;
  }

  /**
   * Registers a one-time listener for the `message` event, that will be called the next
   * time a message is received from the screen reader.
   * @param event - "message"
   * @param listener - function to be called with the received message
   *
   * The listener can removed with {@link ScreenReaderClient.off}.
   */
  once(event: "message", listener: (message: string) => void): this;
  /**
   * Registers a one-time listener for the `error` event, that will be called
   * if an error happens in the connection with the screen reader.
   * @param event - `"error"`
   * @param listener - function to be called with the error
   *
   * The listener can removed with {@link ScreenReaderClient.off}.
   */
  once(event: "error", listener: (error: any) => void): this;
  /**
   * Registers a one-time listener for the `close` event, that will be called
   * when the connection to the screen reader is closed
   * @param event - `"close"`
   * @param listener - function to be called with the error
   *
   * The listener can removed with {@link ScreenReaderClient.off}.
   */
  once(event: "close", listener: () => void): this;
  once(event: string, listener: (...args: any[]) => void): this {
    this._emitter.once(event, listener);
    return this;
  }

  /**
   * Unregisters a listener for the given event.
   * @param event - event name
   * @param listener - previously registered listener
   */
  off(event: string, listener: (...args: any[]) => void): this {
    this._emitter.off(event, listener);
    return this;
  }
}
