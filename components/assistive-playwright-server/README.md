# assistive-playwright-server

[![npm](https://img.shields.io/npm/v/assistive-playwright-server)](https://www.npmjs.com/package/assistive-playwright-server)

## Presentation

assistive-playwright-server is the server part of the assistive-playwright tool that allows end-to-end testing of web applications with a screen reader.
It is designed to run inside the virtual machine started by the [assistive-playwright-client](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/components/assistive-playwright-client) package and to give it access to the playwright API and screen-reader messages, over the network between the host and the virtual machine.

Here is a schema describing the architecture of Assistive-Playwright:

![Architecture of Assistive-Playwright](https://raw.githubusercontent.com/AmadeusITGroup/Assistive-Webdriver/master/components/assistive-playwright-client/architecture.png)

## Getting started

As mentioned before, `assistive-playwright-server` is designed to be installed in a virtual machine that is cloned and started by `assistive-playwright-client`. To configure the virtual machine, you can follow [this step-by-step guide](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/doc/vm-guide/README.md)

To install `assistive-playwright-server` globally, use the following command:

```
npm install -g assistive-playwright-server
```

Then you can start it with the following command:

```
assistive-playwright-server
```

Use the `--help` in the command line to see the available options.

`assistive-playwright-server` exposes two ports:

- one simple tcp port (by default 4449) to receive screen reader messages from [text-to-socket-engine](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/components/text-to-socket-engine).

- one http port (by default 7779) for [assistive-playwright-client](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/components/assistive-playwright-client) to connect to it. It allows to start, control and stop browsers over the network, and to transmit over a web socket the screen reader messages received.

Note that both the http and tcp ports of `assistive-playwright-server` are not designed to be exposed to an unsafe network.
