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

export class Queue<T> {
  private _values: T[] = [];
  private _listeners: ((data: T) => void)[] = [];

  private _propagate() {
    while (this.hasWaitingListeners() && this.hasWaitingValues()) {
      const listener = this._listeners.shift()!;
      const value = this._values.shift()!;
      listener(value);
    }
  }

  public hasWaitingListeners() {
    return this._listeners.length > 0;
  }

  public hasWaitingValues() {
    return this._values.length > 0;
  }

  public getAllWaitingValues() {
    return this._values.splice(0, this._values.length);
  }

  public addValue(value: T) {
    this._values.push(value);
    this._propagate();
  }

  private _addListener(listener: (data: T) => void) {
    this._listeners.push(listener);
    const removeListener = () => {
      const index = this._listeners.indexOf(listener);
      if (index > -1) {
        this._listeners.splice(index, 1);
      }
    };
    this._propagate();
    return removeListener;
  }

  public waitForValue(timeout = 10000) {
    return new Promise<T>((resolve, reject) => {
      const listener = (data: T) => {
        resolve(data);
        clearTimeout(timeoutRef);
        removeListener();
      };
      const removeListener = this._addListener(listener);
      const timeoutRef = setTimeout(() => {
        reject(new Error("Timeout"));
        removeListener();
      }, timeout);
    });
  }
}
