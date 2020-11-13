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

import { resolve } from "path";
import { fork, ChildProcess } from "child_process";
import { createConnection } from "net";
import fetch from "node-fetch";
import waitPort from "wait-port";
import Websocket from "ws";

describe("e2e without VM", () => {
  let subProcess: ChildProcess;

  beforeAll(async () => {
    subProcess = fork(resolve(__dirname, "../assistive-playwright-server"), [
      "--http-port",
      "8883",
      "--tcp-port",
      "8884"
    ]);
    await waitPort({ port: 8883, timeout: 10000 });
  });
  afterAll(async () => {
    subProcess.kill("SIGINT");
    await new Promise(done => subProcess.once("exit", done));
  });

  it("should accept /screen-reader websocket connections", async () => {
    const socketWeb = new Websocket("ws://127.0.0.1:8883/screen-reader");
    await new Promise(
      (done, error) => ((socketWeb.onopen = done), (socketWeb.onerror = error))
    );
    const socketTCP = createConnection(8884, "127.0.0.1");
    await new Promise(done => socketTCP.on("connect", done));
    const messages: string[] = [];
    let callback: (e: void) => void;
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
    await new Promise<void>(done => socketTCP.end(done));
    socketWeb.close();
    await new Promise(done => (socketWeb.onclose = done));
  });

  it("should not accept cross-origin websocket connections", async () => {
    const socketWeb = new Websocket("ws://127.0.0.1:8883/screen-reader", {
      origin: "http://example.com"
    });
    await expect(
      new Promise(
        (done, error) => (
          (socketWeb.onopen = done), (socketWeb.onerror = error)
        )
      )
    ).rejects.toBeTruthy();
  });

  it("should not accept cross-origin POST requests", async () => {
    const request = await fetch("http://127.0.0.1:8883/browser", {
      method: "POST",
      headers: {
        Origin: "http://example.com"
      },
      body: JSON.stringify({ options: {}, browser: "chromium" })
    });
    expect(request.status).toBe(403);
    expect(request.ok).toBeFalsy();
  });

  it("should not accept cross-origin DELETE requests", async () => {
    const request = await fetch(
      "http://127.0.0.1:8883/browser/1234567890123456789012345678901234567890123456789012345678901234",
      {
        method: "DELETE",
        headers: {
          Origin: "http://example.com"
        }
      }
    );
    expect(request.status).toBe(403);
    expect(request.ok).toBeFalsy();
  });

  it("should return 404 for DELETE requests not matching an instance", async () => {
    const request = await fetch(
      "http://127.0.0.1:8883/browser/1234567890123456789012345678901234567890123456789012345678901234",
      {
        method: "DELETE"
      }
    );
    expect(request.status).toBe(404);
    expect(request.ok).toBeFalsy();
  });

  it("should accept POST and DELETE requests to create and delete browser instances", async () => {
    const postRequest = await fetch("http://127.0.0.1:8883/browser", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ options: {}, browser: "chromium" })
    });
    expect(postRequest.ok).toBeTruthy();
    const { id } = await postRequest.json();
    expect(id).toMatch(/^[0-9a-f]{64}$/i);
    const deleteRequest = await fetch(`http://127.0.0.1:8883/browser/${id}`, {
      method: "DELETE"
    });
    expect(deleteRequest.status).toBe(200);
    expect(deleteRequest.ok).toBeTruthy();
  }, 30000);

  const checkInvalid = async (object: any, error: string) => {
    const postRequest = await fetch("http://127.0.0.1:8883/browser", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(object)
    });
    expect(postRequest.ok).toBeFalsy();
    expect(postRequest.status).toBe(400);
    const json = await postRequest.text();
    expect(json).toContain(error);
  };

  it("should validate POST requests to create a browser instances", async () => {
    await checkInvalid({}, "should have required property 'browser'");
    await checkInvalid(
      { browser: "unknown", options: {} },
      "should be equal to one of the allowed values"
    );
    await checkInvalid(
      { browser: "firefox", options: {}, extraOption: {} },
      "should NOT have additional properties"
    );
    await checkInvalid(
      { browser: "firefox", options: { invalidExtraProperty: "ok" } },
      "should NOT have additional properties"
    );
  });
});
