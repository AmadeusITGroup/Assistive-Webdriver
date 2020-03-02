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

import request from "request-promise-native";
import { LogFunction, createSubLogFunction } from "./logging";

export default async (
  uri: string,
  options: request.RequestPromiseOptions,
  log: LogFunction
) => {
  const actualOptions = {
    json: true,
    method: options.body ? "POST" : "GET",
    ...options
  };
  log = createSubLogFunction(log, {
    category: "request",
    level: "debug",
    method: actualOptions.method,
    uri
  });
  try {
    log({ message: "begin" });
    const result = await request(uri, actualOptions);
    log({ message: "success" });
    return result;
  } catch (error) {
    log({ message: "error", error: `${error}` });
    throw error;
  }
};
