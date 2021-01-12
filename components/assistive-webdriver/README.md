# Assistive-Webdriver

[![npm](https://img.shields.io/npm/v/assistive-webdriver)](https://www.npmjs.com/package/assistive-webdriver)

## Presentation

This package contains the implementation of a webdriver server that allows testing web applications with a screen reader (such as [NVDA](https://www.nvaccess.org/) or [JAWS](http://www.freedomscientific.com/products/software/jaws/)) and checking that the screen reader says what is expected.

This requires two main features that are not natively supported by webdriver:

- being able to send keystrokes at a low level so that the screen reader can receive them. This is achieved by using either Virtual Box or QEMU and sending low level events with their API.
- being able to capture the text read by the screen reader. This is achieved by using [text-to-socket-engine](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/components/text-to-socket-engine) and [tcp-web-listener](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/components/tcp-web-listener) inside the virtual machine.

When a client connects to create a session, the server clones and starts the virtual machine specified in the capabilities.

Then all requests linked to that session are forwarded to the selenium server that is supposed to be running inside the virtual machine that was started for that session.

When the session is destroyed the server stops and destroys the virtual machine.

Here is a schema describing the architecture of Assistive-Webdriver:

![Architecture of Assistive-Webdriver](https://raw.githubusercontent.com/AmadeusITGroup/Assistive-Webdriver/master/components/assistive-webdriver/architecture.png)

## Getting started

- Make sure you have the following software installed on the host machine:

  - [nodejs](https://nodejs.org)
  - [VirtualBox](https://www.virtualbox.org/) or [QEMU](https://www.qemu.org/)

- Make sure you have a VirtualBox or QEMU virtual machine properly configured. To configure the virtual machine, you can follow [this step-by-step guide](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/doc/vm-guide/README.md). The virtual machine should be configured with:

  - The [selenium standalone server](https://www.selenium.dev/downloads)
    running on port 4444
  - The [NVDA](https://www.nvaccess.org/download/) or [JAWS](https://support.freedomscientific.com/Downloads/JAWS) screen reader
  - [text-to-socket-engine](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/components/text-to-socket-engine) and [tcp-web-listener](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/components/tcp-web-listener) that are configured to work together, with tcp-web-listener listening on http port 7779
  - A snapshot of the virtual machine should be saved in the running state with all these programs running.

- Install Assistive-Webdriver globally:

```sh
npm install -g assistive-webdriver
```

- Create a configuration file which, for example, describes how to create a VM with the `jaws` configuration:

```json
{
  "jaws": {
    "vmSettings": {
      "type": "virtualbox",
      "vm": "VMNameInVirtualBox",
      "snapshot": "SeleniumJaws"
    },
    "screenReader": true
  }
}
```

There can be multiple virtual machine configurations. All configuration options are [documented here](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/components/assistive-webdriver/configuration.md).

- Start the server, referencing the previous configuration file:

```
assistive-webdriver --vm-configs myConfigFile.json
```

- In another console, start vboxwebsrv (without authentication):

```sh
vboxwebsrv --authentication null
```

- Look at the samples in the [samples](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/components/assistive-webdriver/samples) directory.

- Create or adapt a test and start it. Do not forget to make sure the name of the configuration (here, it is `jaws`) is correctly specified in the test (with the `awd:vm-config` capability).

```
node ariatemplates.js
```

The `ariatemplates.js` test checks that the Aria Templates datepicker works as expected with Jaws and Internet Explorer.

The API documentation is available [here](https://amadeusitgroup.github.io/Assistive-Webdriver/assistive-webdriver)
