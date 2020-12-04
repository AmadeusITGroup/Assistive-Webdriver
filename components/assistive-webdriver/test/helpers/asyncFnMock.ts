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

import { waitableMock, WaitableMock } from "./waitableMock";

export interface MockPromise<T> extends Promise<T> {
  mockResolve: (value: T) => void;
  mockReject: (reason: any) => void;
}
export const promiseMock = <T>() => {
  let mockResolve: any, mockReject: any;
  const promise = new Promise<T>((resolve, reject) => {
    mockResolve = resolve;
    mockReject = reject;
  }) as MockPromise<T>;
  promise.mockResolve = mockResolve;
  promise.mockReject = mockReject;
  return promise;
};

export interface AsyncFnMock<T, Y extends any[]>
  extends WaitableMock<MockPromise<T>, Y> {
  waitForCallAndReplyWith(callback: (...args: Y) => Promise<T>): Promise<T>;
}

const waitForCallAndReplyWith = async function <T, Y extends any[]>(
  this: AsyncFnMock<T, Y>,
  callback: (...args: Y) => Promise<T>
): Promise<T> {
  const call = await this.waitForCall();
  const result = await callback(...call.args);
  call.result.value.mockResolve(result);
  return result;
};

export const asyncFnMock = <T, Y extends any[]>(name?: string) => {
  const res = waitableMock<MockPromise<T>, Y>(
    () => promiseMock<T>(),
    name
  ) as AsyncFnMock<T, Y>;
  res.waitForCallAndReplyWith = waitForCallAndReplyWith;
  return res;
};
