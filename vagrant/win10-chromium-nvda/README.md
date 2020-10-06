# win10-chromium-nvda vagrant virtual machine

This directory contains a [vagrant](https://vagrantup.com) config file, and various other files that allow to automatically build a virtual machine containing:
- [Microsoft Windows 10](https://developer.microsoft.com/en-us/microsoft-edge/tools/vms/)
- [Chromium](https://www.chromium.org/)
- [NVDA](https://www.nvaccess.org/)
- [Java](https://www.java.com)
- [Selenium Server](https://www.selenium.dev/downloads/)
- [Node.js](https://nodejs.org)
- [text-to-socket-engine](../../text-to-socket-engine)
- [tcp-web-listener](../../tcp-web-listener)

The result is a virtual machine that is ready to be used with [assistive-webdriver](../../assistive-webdriver). Following [this manual step-by-step guide](../../assistive-webdriver/vm-guide/README.md) is another way to get a similar result.

This virtual machine is automatically built and used during continuous integration end-to-end tests for assistive-webdriver.

It is published on [Vagrant Cloud](https://app.vagrantup.com/assistive-webdriver/boxes/win10-chromium-nvda).

## How to build the VM

As a prerequisite, you need to have [vagrant](https://vagrantup.com), [VirtualBox](https://www.virtualbox.org/), [node.js](https://nodejs.org) and basic unix command line tools (such as bash and curl) installed on your machine.

Then, you can run the following bash [script](./download.sh) to download the required software:

```sh
./download.sh
```

Then, run the following [script](./createVM.sh) to build the virtual machine:

```
./createVM.sh
```

If everything goes well, when the build is finished, you should have a virtualbox virtual machine called "win10-chromium-nvda" with a snapshot called "nvda" that is ready to be used for testing with assistive-webdriver, with [this configuration file](./vm-config.json).
