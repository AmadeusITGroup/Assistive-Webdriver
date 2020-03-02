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

"use strict";

const fs = require("fs");
const http = require("http");
const net = require("net");
const path = require("path");
const express = require("express");
const sockjs = require("sockjs");
const urlFormat = require("url").format;
const argv = require("yargs")
  .default("http-host", "127.0.0.1")
  .default("http-port", 7779)
  .default("tcp-host", "127.0.0.1")
  .default("tcp-port", 4449)
  .default("register-function", "registerLiveListener").argv;

const formatAddress = function(address) {
  const host = address.address;
  const wrappedHost = host.indexOf(":") > -1 ? `[${host}]` : host;
  return `${wrappedHost}:${address.port}`;
};

const readSocketAddress = function(socket) {
  return {
    port: socket.remotePort,
    family: socket.remoteFamily,
    address: socket.remoteAddress
  };
};

const expressApp = express();
const clientSockJs = fs.readFileSync(
  require.resolve("sockjs-client/dist/sockjs.min.js"),
  "utf8"
);
const clientListenerJs = (() => {
  const listenerCode = fs
    .readFileSync(require.resolve("../client/listener.js"), "utf8")
    .replace(
      "LIVELISTENER_REGISTER_FUNCTION",
      JSON.stringify(argv["register-function"])
    );
  return `${clientSockJs}\n${listenerCode}`;
})();
const clientIndexJs = fs
  .readFileSync(require.resolve("../client/index.js"), "utf8")
  .replace(
    "LIVELISTENER_REGISTER_FUNCTION",
    JSON.stringify(argv["register-function"])
  );
const staticJSRoute = (url, content) => {
  expressApp.get(url, (req, res) => {
    res.type("js");
    res.send(content);
    res.end();
  });
};
const dynamicJSRouteWithURL = (url, content) => {
  expressApp.get(url, (req, res) => {
    const liveURL = urlFormat({
      protocol: "http:",
      host: req.get("host"),
      pathname: "/live"
    });
    res.type("js");
    res.send(
      content.replace("LIVELISTENER_URL_VALUE", JSON.stringify(liveURL))
    );
    res.end();
  });
};
staticJSRoute("/sockjs.js", clientSockJs);
dynamicJSRouteWithURL("/listener.js", clientListenerJs);
staticJSRoute("/index.js", clientIndexJs);
expressApp.use(express.static(path.join(__dirname, "..", "client")));
const httpServer = http.createServer(expressApp);
const sockServer = sockjs.createServer({
  prefix: "/live",
  sockjs_url: urlFormat({
    protocol: "http:",
    hostname: argv["http-host"],
    port: argv["http-port"],
    pathname: "/sockjs.js"
  })
});
sockServer.installHandlers(httpServer);

const clients = [];

const sendData = data => {
  console.log(`> ${data}`);
  clients.forEach(client => {
    client.write(data);
  });
};

sockServer.on("connection", socket => {
  const address = formatAddress(readSocketAddress(socket));
  console.log(`sockjs client connected: ${address}`);
  clients.push(socket);
  socket.on("close", () => {
    console.log(`sockjs client disconnected: ${address}`);
    const index = clients.indexOf(socket);
    if (index > -1) {
      clients.splice(index, 1);
    }
  });
});

const tcpServer = net.createServer(function(socket) {
  const address = formatAddress(readSocketAddress(socket));
  console.log(`tcp client connected: ${address}`);
  let text = "";
  socket.on("data", data => {
    text += data.toString();
    const array = text.split(/\r\n|\n\r|\r|\n/);
    text = array.pop();
    array.forEach(sendData);
  });
  socket.on("error", error => {
    console.log(`error from socket ${address}: ${error}`);
    socket.end();
  });
  socket.on("close", () => {
    if (text) {
      sendData(text);
      text = "";
    }
    console.log(`tcp client disconnected: ${address}`);
  });
});

const startListening = function(serverName, serverObject) {
  serverObject.listen(argv[`${serverName}-port`], argv[`${serverName}-host`]);
  serverObject.on("listening", function() {
    console.log(
      `${serverName} server listening on ${formatAddress(
        serverObject.address()
      )}`
    );
  });
};

startListening("tcp", tcpServer);
startListening("http", httpServer);
