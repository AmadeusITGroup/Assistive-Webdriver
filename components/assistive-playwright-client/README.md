# assistive-playwright-client

[![npm](https://img.shields.io/npm/v/assistive-playwright-client)](https://www.npmjs.com/package/assistive-playwright-client)

## Presentation

This package contains a node.js library that extends [playwright](https://playwright.dev) to allow end-to-end testing of web applications with a screen reader (such as [NVDA](https://www.nvaccess.org/) or [JAWS](http://www.freedomscientific.com/products/software/jaws/)) and checking that the screen reader says what is expected.

This requires two main features that are not natively supported by playwright:

- being able to send keystrokes at a low level so that the screen reader can receive them. This is achieved by using either Virtual Box or QEMU and sending low level events with their API.
- being able to capture the text read by the screen reader. This is achieved by using [text-to-socket-engine](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/components/text-to-socket-engine).

So, assistive-playwright-client allows to easily clone and start a virtual machine (with the [vm-providers](../vm-providers) component) and it provides access to the following functions (through the [assistive-playwright-server](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/components/assistive-playwright-server) component that is supposed to be running inside the virtual machine):

- the standard [playwright API](https://playwright.dev/docs/api/class-playwright)
- an implementation of the playwright [Keyboard](https://playwright.dev/docs/api/class-keyboard) and [Mouse](https://playwright.dev/docs/api/class-mouse) interfaces that send low-level events to the virtual machine
- an [API to access screen-reader messages](https://amadeusitgroup.github.io/Assistive-Webdriver/assistive-playwright-client.screenreaderclient)

Here is a schema describing the architecture of Assistive-Playwright:

![Architecture of Assistive-Playwright](https://raw.githubusercontent.com/AmadeusITGroup/Assistive-Webdriver/master/components/assistive-playwright-client/architecture.png)

## Getting started

- Make sure you have the following software installed on the host machine:

  - [nodejs](https://nodejs.org)
  - [VirtualBox](https://www.virtualbox.org/) or [QEMU](https://www.qemu.org/)

- Make sure you have a VirtualBox or QEMU virtual machine properly configured. To configure the virtual machine, you can follow [this step-by-step guide](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/doc/vm-guide/README.md). The virtual machine should be configured with:

  - The [NVDA](https://www.nvaccess.org/download/) or [JAWS](https://support.freedomscientific.com/Downloads/JAWS) screen reader
  - [text-to-socket-engine](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/components/text-to-socket-engine) and [assistive-playwright-server](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/components/assistive-playwright-server) that are configured to work together, with assistive-playwright-server listening on http port 7779
  - A snapshot of the virtual machine should be saved in the running state with all these programs running.

- Install assistive-playwright-client in your project:

```sh
npm install assistive-playwright-client
```

- Make sure to start `vboxwebsrv` in order to be able to start virtual machines of type `virtualbox`:

```sh
vboxwebsrv --authentication null
```

- Here is an example `gettingStarted.js` file that shows how to use `assistive-playwright-client`:

```js
const { createVM } = require("assistive-playwright-client");

(async () => {
  console.log("Creating VM...");
  const {
    chromium /* can be replaced with firefox or webkit */,
    screenReader,
    calibrateMouse,
    keyboard,
    vm
  } = await createVM({
    vmSettings: {
      type: "virtualbox",
      vm: "win10-chromium-nvda",
      snapshot: "nvda"
    }
  });
  try {
    console.log("Launching browser...");
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage({ viewport: null });
    const mouse = await calibrateMouse(page);
    screenReader.on("message", msg => console.log(`sr> ${msg}`));
    await page.goto("https://duckduckgo.com/");
    await mouse.click(0, 0, { origin: await page.$("input[type=text]") });
    await screenReader.waitForMessage("Search the web");
    await keyboard.type("assistive-playwright-client");
    await keyboard.press("Enter");
    await screenReader.waitForMessage(
      "assistive playwright client at Duck Duck Go"
    );
    await keyboard.press("Tab");
    await screenReader.waitForMessage("edit");
  } finally {
    console.log("Destroying VM...");
    await vm.destroy();
    console.log("Done!");
  }
})().catch(error => {
  console.log(`Error: ${error}`);
  process.exit(1);
});
```

The API documentation is available [here](https://amadeusitgroup.github.io/Assistive-Webdriver/assistive-playwright-client)

**Note that in order to run tests with a screen reader, instead of directly depending on this package, it is easier and recommended to use the [assistive-playwright-test](../assistive-playwright-test) package along with @playwright/test.**
