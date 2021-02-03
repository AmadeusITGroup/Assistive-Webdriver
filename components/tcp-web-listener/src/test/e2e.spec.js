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

const { resolve } = require("path");
const { fork } = require("child_process");
const { createConnection } = require("net");
const waitPort = require("wait-port");
const Websocket = require("ws");

describe("e2e", () => {
  let subProcess;

  beforeAll(async () => {
    subProcess = fork(resolve(__dirname, "../../tcp-web-listener"), [
      "--http-port",
      "8881",
      "--tcp-port",
      "8882"
    ]);
    await waitPort({ port: 8881, timeout: 10000 });
  });
  afterAll(async () => {
    subProcess.kill();
    await new Promise(done => subProcess.once("exit", done));
  });

  it("should work with websocket", async () => {
    const socketWeb = new Websocket("ws://127.0.0.1:8881/live/websocket");
    await new Promise(done => (socketWeb.onopen = done));
    const socketTCP = createConnection(8882, "127.0.0.1");
    await new Promise(done => socketTCP.on("connect", done));
    let messages = [];
    let callback;
    socketWeb.onmessage = arg => {
      messages.push(arg.data.toString("utf8"));
      if (callback) callback();
    };
    const waitForMessage = async () => {
      if (messages.length === 0) {
        await new Promise(done => (callback = done));
      }
      return messages.shift();
    };
    await new Promise(done =>
      socketTCP.write("something\nsecond line\nbegin", done)
    );
    expect(await waitForMessage()).toEqual("something");
    expect(await waitForMessage()).toEqual("second line");
    await new Promise(done => socketTCP.write(" end\n", done));
    expect(await waitForMessage()).toEqual("begin end");
    await new Promise(done => socketTCP.write("other text\n", done));
    expect(await waitForMessage()).toEqual("other text");
    await new Promise(done => socketTCP.end(done));
    socketWeb.close();
    await new Promise(done => (socketWeb.onclose = done));
  });
});
