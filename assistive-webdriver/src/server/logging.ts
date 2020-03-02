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

import { createLogger, format, transports, LogEntry } from "winston";
import colors from "colors/safe";
import { MESSAGES } from "./messages";

export type LogFunction = (entry: any) => void;

export const messageId = format(info => {
  const message = MESSAGES[`${info.category}.${info.message}`];
  if (message) {
    info.message = message;
  }
  return info;
});

export const defaultFormatter = format.printf(
  ({ level, category, message, timestamp, sessionId, error, ...meta }) => {
    category = category ? `${colors.yellow(category)} ` : "";
    sessionId = sessionId ? `${colors.blue(sessionId)} ` : "";
    let result = `${colors.gray(
      timestamp
    )} ${sessionId}${category}[${level}] ${colors.bold(message)} `;
    Object.keys(meta).forEach(key => {
      result += `${key}=${colors.green(JSON.stringify(meta[key]))} `;
    });
    if (error) {
      result += colors.red(error);
    }
    return result;
  }
);

export function createDefaultLogger() {
  return createLogger({
    format: format.combine(
      format.timestamp(),
      format.colorize(),
      messageId(),
      defaultFormatter
    ),
    transports: [new transports.Console()]
  });
}

export const defaultLogger = createDefaultLogger();
export const defaultLogFunction: LogFunction = entry =>
  defaultLogger.log(entry);

export const createSubLogFunction = (
  log = defaultLogFunction,
  meta: Record<string, any>
): LogFunction => (entry: LogEntry) =>
  log({
    level: "info",
    ...meta,
    ...entry
  });
