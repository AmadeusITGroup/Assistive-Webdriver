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

import { createServer as createTcpServer, Server as TcpServer } from "net";
import { Server } from "ws";

export const createScreenReaderServer = (): {
  wsServer: Server;
  tcpServer: TcpServer;
} => {
  const wsServer = new Server({ noServer: true });

  const sendData = (data: string) => {
    console.log(`screen-reader> ${data}`);
    wsServer.clients.forEach(client => {
      client.send(data);
    });
  };

  const tcpServer = createTcpServer(function (socket) {
    let text = "";
    socket.on("data", data => {
      text += data.toString();
      const array = text.split(/\r\n|\n\r|\r|\n/);
      text = array.pop()!;
      array.forEach(sendData);
    });
    socket.on("error", error => {
      socket.end();
    });
    socket.on("close", () => {
      if (text) {
        sendData(text);
        text = "";
      }
    });
  });

  return { wsServer, tcpServer };
};
