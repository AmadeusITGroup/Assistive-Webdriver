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

export class PublicError {
  constructor(
    public statusCode: number,
    public errorId: string,
    public message: string
  ) {}

  toString() {
    return `${this.message} (${this.errorId}, status ${this.statusCode})`;
  }
}

export class InvalidArgumentError extends PublicError {
  constructor(message: string) {
    super(400, "invalid argument", message);
  }
}

export class InvalidArgumentValueError extends InvalidArgumentError {
  constructor(message: string, invalidValue: any) {
    super(`${message}: ${JSON.stringify(invalidValue)}`);
  }
}

export class InvalidSessionError extends PublicError {
  constructor(sessionId: string) {
    super(404, "invalid session id", `No active session with ID ${sessionId}`);
  }
}

export class UnknownCommandError extends PublicError {
  constructor(message: string) {
    super(404, "unknown command", message);
  }
}

export class AbortedConnectionError extends PublicError {
  constructor() {
    super(499, "aborted connection", "Connection aborted");
  }
}
