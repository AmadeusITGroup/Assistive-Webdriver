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

import { createPlaywrightServer } from "./server";
import { sigintWin32 } from "./sigintWin32";
import { promisify } from "util";
import yargs from "yargs";

const formatAddress = function (address: any) {
  const host = address.address;
  const wrappedHost = host.indexOf(":") > -1 ? `[${host}]` : host;
  return `${wrappedHost}:${address.port}`;
};

(async () => {
  try {
    const argv = yargs
      .default("http-host", "0.0.0.0")
      .default("http-port", 7779)
      .default("tcp-host", "127.0.0.1")
      .default("tcp-port", 4449).argv;

    const startListening = function (serverName: string, serverObject: any) {
      serverObject.listen(
        argv[`${serverName}-port`],
        argv[`${serverName}-host`]
      );
      serverObject.on("listening", function () {
        console.log(
          `${serverName} server listening on ${formatAddress(
            serverObject.address()
          )}`
        );
      });
    };

    const {
      httpServer,
      screenReaderTcpServer
    } = await createPlaywrightServer();
    let closing = false;
    process.on("SIGINT", async () => {
      if (!closing) {
        closing = true;
        await promisify(httpServer.close.bind(httpServer))();
      }
      process.exit(0);
    });
    sigintWin32();
    startListening("tcp", screenReaderTcpServer);
    startListening("http", httpServer);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
})();
