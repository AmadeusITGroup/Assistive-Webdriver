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
 * A log function, as expected by this package.
 *
 * @remarks
 *
 * The object passed as a parameter to the log function usually contains
 * the following properties:
 *
 * - `category`: for example `vbox` or `qemu`
 *
 * - `message`: id of the message
 *
 * - `level`: for example: `debug`, `info`, `error`
 *
 * It may also contain other properties depending on the message.
 *
 * Check the {@link logMessages} for the list of messages.
 * @public
 */
export type LogFunction = (entry: Record<string, any>) => void;

/**
 * Creates a log function that, whenever it is called, calls the log function passed
 * as the first paremeter with the predefined properties passed as the second parameter,
 * (in addition to the properties it received it is called with).
 * @param log - log function
 * @param meta - predefined properties
 * @returns A log function whose parameters are predefined.
 * @public
 */
export const createSubLogFunction =
  (log: LogFunction = () => {}, meta: Record<string, any>): LogFunction =>
  (entry: any) =>
    log({
      level: "info",
      ...meta,
      ...entry
    });
