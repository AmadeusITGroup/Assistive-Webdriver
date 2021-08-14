/*
 * Copyright 2020 Amadeus s.a.s.
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

import type { Server as TcpServer, Socket } from "net";
import { randomBytes } from "crypto";
import type { IncomingMessage } from "http";
import { createServer as createHttpServer, Server as HttpServer } from "http";
import { json } from "co-body";
import { createProxyServer } from "http-proxy";
import {
  chromium,
  webkit,
  firefox,
  BrowserServer,
  BrowserType,
  Browser
} from "playwright";
import { promisify } from "util";
import { createScreenReaderServer } from "./screenReaderServer";
import validate from "./validation";

const createId = () => randomBytes(32).toString("hex");

const browsers: { [key: string]: BrowserType<Browser> } = {
  chromium,
  webkit,
  firefox
};

const BROWSER_REGEXP = /^\/browser\/([a-f0-9]{64})$/;

export const createPlaywrightServer = async (): Promise<{
  httpServer: HttpServer;
  screenReaderTcpServer: TcpServer;
}> => {
  const proxy = createProxyServer();
  const startedBrowsers = new Map<string, BrowserServer>();
  const screenReader = createScreenReaderServer();

  const getMatchingBrowser = (pathname: string) => {
    const browserMatch = BROWSER_REGEXP.exec(pathname);
    if (browserMatch) {
      const id = browserMatch[1];
      const browserServer = startedBrowsers.get(id);
      if (browserServer) {
        return {
          id,
          browserServer
        };
      }
    }
  };

  const checkSecurity = (req: IncomingMessage) => {
    const { host, origin, "sec-fetch-site": fetchSite } = req.headers;
    if (fetchSite === "cross-site" || (origin && origin !== `http://${host}`)) {
      return false;
    }
    return true;
  };

  const httpServer = createHttpServer(async (req, res) => {
    const remoteAddress = req.socket.remoteAddress;
    try {
      res.setHeader("Content-Type", "application/json");
      if (!checkSecurity(req)) {
        res.statusCode = 403;
        res.end("{}");
        return;
      }
      const pathname = new URL(req.url!, "http://localhost/").pathname ?? "";
      const matchingBrowser = getMatchingBrowser(pathname);
      if (req.method === "DELETE" && matchingBrowser) {
        startedBrowsers.delete(matchingBrowser.id);
        await matchingBrowser.browserServer.close();
        res.end("{}");
      } else if (req.method === "POST" && pathname === "/browser") {
        const jsonBody = await json(req, {});
        const validationResult = validate(jsonBody);
        if (!validationResult) {
          res.statusCode = 400;
          res.end(
            JSON.stringify({
              error: true,
              message: "Invalid request body.",
              details: validate.errors
            })
          );
          return;
        }
        const { browser, options } = jsonBody;
        const browserType = browsers[browser];
        const browserServer = await browserType.launchServer(options);
        const id = createId();
        startedBrowsers.set(id, browserServer);
        res.end(
          JSON.stringify({
            id
          })
        );
      } else if (req.method === "GET" && pathname === "/") {
        res.statusCode = 200;
        res.end(JSON.stringify({ server: "assistive-playwright-server" }));
      } else {
        /* istanbul ignore next */
        if (process.env.ENABLE_COVERAGE === "1") {
          const coverage = (global as any).__coverage__;
          if (
            coverage &&
            req.method === "GET" &&
            pathname === "/__coverage__"
          ) {
            res.statusCode = 200;
            res.end(JSON.stringify(coverage));
            return;
          }
        }
        res.statusCode = 404;
        res.end("{}");
      }
    } catch (error) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: true, message: `${error}` }));
    } finally {
      console.log(
        `[${remoteAddress}] ${res.statusCode} ${req.method} ${req.url!}`
      );
    }
  });
  httpServer.on("upgrade", (req, socket: Socket, head) => {
    let disconnected = false;
    const remoteAddress = socket.remoteAddress;
    try {
      if (!checkSecurity(req)) {
        disconnected = true;
        socket.destroy();
        return;
      }
      const pathname = new URL(req.url!, "http://localhost/").pathname ?? "";
      const matchingBrowser = getMatchingBrowser(pathname);
      if (matchingBrowser) {
        const target = matchingBrowser.browserServer.wsEndpoint();
        proxy.ws(req, socket, head, {
          target,
          ignorePath: true
        });
      } else if (screenReader && pathname === "/screen-reader") {
        screenReader.wsServer.handleUpgrade(
          req,
          socket,
          head,
          (/*client*/) => {}
        );
      } else {
        disconnected = true;
        socket.destroy();
      }
    } finally {
      console.log(
        `[${remoteAddress}] ${
          disconnected ? "refused" : "accepted"
        } websocket ${req.url!}`
      );
    }
  });
  const originalClose = promisify(httpServer.close.bind(httpServer));
  httpServer.close = (callback = () => {}) => {
    (async () => {
      let error = undefined;
      try {
        const promises: Promise<any>[] = [];
        promises.push(originalClose());
        startedBrowsers.forEach((browser, id) => {
          console.log(`Closing session ${id}`);
          promises.push(browser.close());
        });
        await Promise.all(promises);
      } catch (newError) {
        error = newError;
      }
      callback(error);
    })();
    return httpServer;
  };
  return {
    httpServer: httpServer,
    screenReaderTcpServer: screenReader.tcpServer
  };
};
