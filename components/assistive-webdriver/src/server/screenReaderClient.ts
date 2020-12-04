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

import Websocket from "ws";
import { createSubLogFunction, LogFunction } from "vm-providers";

export class ScreenReaderClient {
  socket?: Websocket;
  connected = false;
  messages: string[] = [];
  log: LogFunction;

  constructor(
    public host: string,
    public port: number,
    log?: LogFunction,
    public path = "/live/websocket"
  ) {
    this.log = createSubLogFunction(log, { category: "screenReader" });
  }

  connect() {
    const websocket = new Websocket(
      `ws://${this.host}:${this.port}${this.path}`
    );
    this.socket = websocket;
    websocket.onopen = () => {
      if (this.socket === websocket) {
        this.connected = true;
      }
    };
    websocket.onmessage = arg => {
      if (this.socket === websocket) {
        const data = arg.data.toString("utf8");
        this.messages.push(data);
        this.log({ message: "receive", data });
      }
    };
    websocket.onclose = () => {
      if (this.socket === websocket) {
        this.connected = false;
      }
    };
    websocket.onerror = error => {
      if (this.socket === websocket) {
        this.log({
          level: "error",
          message: "error",
          error: `${error}`
        });
        setTimeout(() => {
          if (this.socket === websocket) {
            this.connect();
          }
        }, 100);
      }
    };
  }

  disconnect() {
    const socket = this.socket;
    if (socket) {
      this.socket = undefined;
      this.connected = false;
      socket.close();
    }
  }
}
