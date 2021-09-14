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

import fetch, { RequestInit } from "node-fetch";
import { LogFunction, createSubLogFunction } from "vm-providers";

export class StatusCodeError {
  constructor(public statusCode: number, public body: string) {}
}

export default async (
  uri: string,
  options: { method?: "GET" | "POST" | "DELETE"; body?: any },
  log: LogFunction
): Promise<any> => {
  const method = options.method
    ? options.method
    : options.body
    ? "POST"
    : "GET";
  log = createSubLogFunction(log, {
    category: "request",
    level: "debug",
    method,
    uri
  });
  try {
    log({ message: "begin" });
    const request: RequestInit = {
      method
    };
    if (options.body) {
      request.body = JSON.stringify(options.body);
      request.headers = {
        "Content-Type": "application/json; charset=utf-8"
      };
    }
    const res = await fetch(uri, request);
    if (!res.ok) {
      throw new StatusCodeError(res.status, await res.text());
    }
    const result = await res.json();
    log({ message: "success" });
    return result;
  } catch (error) {
    log({ message: "error", error: `${error}` });
    throw error;
  }
};
