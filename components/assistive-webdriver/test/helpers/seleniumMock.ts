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

import Koa from "koa";
import { promisify } from "util";
import { Server } from "http";
import { AddressInfo } from "net";
import { PortRedirection, wait } from "vm-providers";
import { asyncFnMock, AsyncFnMock } from "./asyncFnMock";
import { DEFAULT_VM_PORT_WEBDRIVER } from "../../src/server/defaults";

const waitFor = async (
  fn: () => Promise<boolean>,
  timeout = 10000,
  checkInterval = 10
) => {
  const endTime = Date.now() + timeout;
  do {
    const success = await fn();
    if (success) {
      return;
    }
    await wait(checkInterval);
  } while (endTime > Date.now());
  throw new Error(`waitFor timeout`);
};

export const useSeleniumMock = () => {
  const host = "127.0.0.1";
  let server: Server;
  let port: number;
  let app;
  let routingFn: AsyncFnMock<void, [Koa.Context, () => Promise<any>]>;

  beforeAll(async () => {
    app = new Koa();
    app.use(async (ctx, next) => {
      if (routingFn) {
        await routingFn(ctx, next);
      } else {
        await next();
      }
    });
    server = app.listen(0, host);
    await new Promise((resolve, reject) =>
      server.on("listening", resolve).on("error", reject)
    );
    port = (server.address() as AddressInfo).port;
  });

  beforeEach(() => {
    routingFn = asyncFnMock("seleniumMock");
  });

  afterEach(async () => {
    const getConnections = promisify(server.getConnections.bind(server));
    await waitFor(async () => 0 == (await getConnections()));
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  return {
    async seleniumAnswerRequest(
      method: string,
      url: string,
      responseBody: ((ctx: Koa.Context) => Promise<any>) | Record<string, any>
    ) {
      const call = await routingFn.waitForCall();
      const ctx = call.args[0];
      expect(ctx.method).toBe(method);
      expect(ctx.url).toBe(url);
      if (typeof responseBody === "function") {
        ctx.body = await responseBody(ctx);
      } else {
        ctx.body = responseBody;
      }
      call.result.value.mockResolve();
    },
    getSeleniumTCPRedirection(
      vmPort = DEFAULT_VM_PORT_WEBDRIVER
    ): PortRedirection {
      return {
        hostAddress: host,
        hostPort: port,
        vmPort
      };
    }
  };
};
