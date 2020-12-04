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

import WebSocket from "ws";
import { Server, createServer } from "http";
import { AddressInfo } from "net";
import { PortRedirection } from "../../src/server/vm/vmInterface";
import { DEFAULT_VM_PORT_SCREENREADER } from "../../src/server/defaults";

export const useScreenReaderMock = () => {
  const host = "127.0.0.1";
  let server: Server;
  let port: number;
  let app: WebSocket.Server;
  const urlMap = new WeakMap<WebSocket, string>();

  beforeAll(async () => {
    server = createServer();
    app = new WebSocket.Server({ server });
    app.on("connection", (ws, req) => urlMap.set(ws, req.url!));
    server.listen(0, host);
    await new Promise((resolve, reject) =>
      server.on("listening", resolve).on("error", reject)
    );
    port = (server.address() as AddressInfo).port;
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve));
    await new Promise(resolve => app.close(resolve));
  });

  return {
    sendScreenReaderMessage(message: string) {
      app.clients.forEach(client => client.send(message));
    },
    getScreenReaderClients() {
      const clients: string[] = [];
      app.clients.forEach(client => clients.push(urlMap.get(client)!));
      return clients;
    },
    getScreenReaderTCPRedirection(
      vmPort = DEFAULT_VM_PORT_SCREENREADER
    ): PortRedirection {
      return {
        hostAddress: host,
        hostPort: port,
        vmPort
      };
    }
  };
};
