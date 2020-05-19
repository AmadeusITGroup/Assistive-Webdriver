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

import { request } from "http";
import { LogFunction, createSubLogFunction } from "./logging";

export class StatusCodeError {
  constructor(public statusCode: number, public body: string) {}
}

const isStatusCodeSuccess = (code: number) => code >= 200 && code < 300;

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
    const result = await new Promise((resolve, reject) => {
      const req = request(uri, { method }, res => {
        let data = "";
        res.setEncoding("utf8");
        res.on("data", chunk => {
          data += chunk;
        });
        res.on("error", reject);
        res.on("end", () => {
          if (!isStatusCodeSuccess(res.statusCode!)) {
            reject(new StatusCodeError(res.statusCode!, data));
            return;
          }
          try {
            const parsedData = JSON.parse(data);
            resolve(parsedData);
          } catch (error) {
            reject(error);
          }
        });
      });
      req.on("error", reject);
      if (options.body) {
        req.write(JSON.stringify(options.body));
      }
      req.end();
    });
    log({ message: "success" });
    return result;
  } catch (error) {
    log({ message: "error", error: `${error}` });
    throw error;
  }
};
