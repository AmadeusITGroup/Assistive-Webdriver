# tcp-web-listener

[![npm](https://img.shields.io/npm/v/tcp-web-listener)](https://www.npmjs.com/package/tcp-web-listener)

Small server that listens to TCP connections on a given port and forwards all the received data to a web client through [sock.js](https://github.com/sockjs/sockjs-client).

## How to use

- Make sure you have [node.js](https://nodejs.org/) installed.

- Install this package globally with:

```
npm install -g tcp-web-listener
```

- Start the server:

```
tcp-web-listener
```

Note that the default TCP port is 4449, and the default HTTP port is 7779, but they can be configured through command line options. It is possible to use `--help` to have the list of available options with their default values.

- Open http://localhost:7779 in your browser.

- Connect to the TCP port with telnet (for example):

```
telnet localhost 4449
```

- Type something in the telnet console and press ENTER. Everything that is sent by telnet through the TCP port is displayed in the browser (line by line).

## Browser API

The goal of this small server is not only to allow displaying in a small web page what is sent to a TCP port but mainly to provide a simple API to do whatever is useful in a web page when receiving data over a TCP port.

In your web application, include the following script tag:

```html
<script src="http://localhost:7779/listener.js"></script>
```

Then register a function that will be called each time the small server receives a new line on the TCP port:

```js
var removeListener = registerLiveListener(function (text) {
  console.log(text);
});

// call removeListener() to remove the listener
```

Note that the name of the register function (`registerLiveListener`) can be configured with the `--register-function` option on the command line.

There can be only one registered listener at a time. When calling `registerLiveListener`, any previous listener is overridden by the new one.

`registerLiveListener` accepts as a second argument the scope with which the listener (given as the first argument) will be called.
