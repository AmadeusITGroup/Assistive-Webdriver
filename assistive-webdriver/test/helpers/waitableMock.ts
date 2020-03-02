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

import { defaultLogFunction } from "../../src/server/logging";

export interface MockCall<T, Y extends any[]> {
  args: Y;
  result: jest.MockResult<T>;
}
export interface WaitableMock<T, Y extends any[]> extends jest.Mock<T, Y> {
  waitForCall(): Promise<MockCall<T, Y>>;
}

export const waitableMock = <T, Y extends any[]>(
  implementation: (...args: Y) => T,
  name?: string
) => {
  let currentResolve: (result: MockCall<T, Y>) => void;
  let currentPromise: Promise<MockCall<T, Y>>;
  const createPromise = () => {
    currentPromise = new Promise<MockCall<T, Y>>(
      resolve => (currentResolve = resolve)
    );
  };
  const res = jest.fn<T, Y>((...args) => {
    defaultLogFunction({
      level: "debug",
      category: "test",
      message: "Mock function call",
      name,
      args
    });
    currentResolve({
      args,
      result: res.mock.results[res.mock.results.length - 1]
    });
    createPromise();
    return implementation(...args);
  }) as WaitableMock<T, Y>;
  if (name) {
    res.mockName(name);
  }
  res.waitForCall = () => currentPromise;
  createPromise();
  return res;
};
