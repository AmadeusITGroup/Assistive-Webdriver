# assistive-playwright-test

[![npm](https://img.shields.io/npm/v/assistive-playwright-test)](https://www.npmjs.com/package/assistive-playwright-test)

## Presentation

This package contains a node.js library that extends [@playwright/test](https://playwright.dev) to allow end-to-end testing of web applications with a screen reader (such as [NVDA](https://www.nvaccess.org/) or [JAWS](http://www.freedomscientific.com/products/software/jaws/)) and checking that the screen reader says what is expected.

This requires two main features that are not natively supported by playwright:

- being able to send keystrokes at a low level so that the screen reader can receive them. This is achieved by using either Virtual Box or QEMU and sending low level events with their API.
- being able to capture the text read by the screen reader. This is achieved by using [text-to-socket-engine](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/components/text-to-socket-engine).

These features are implemented in the [assistive-playwright-client](../assistive-playwright-client) package. You can refer to its documentation for more information.
Here is a schema describing the architecture of Assistive-Playwright:

![Architecture of Assistive-Playwright](https://raw.githubusercontent.com/AmadeusITGroup/Assistive-Webdriver/master/components/assistive-playwright-client/architecture.png)

`assistive-playwright-test` exposes the virtual machine, screen reader and low-level keyboard and mouse APIs as [playwright test fixtures](https://playwright.dev/docs/test-fixtures) that allow you to write playwright tests like [the following one](../assistive-playwright-test-sample/test/sampleTest.spec.ts):

```ts
import { test } from "assistive-playwright-test";

test("should open simple page", async ({
  page,
  screenReader,
  vmKeyboard,
  vmMouse
}) => {
  await page.goto("/");
  await vmMouse.click(0, 0, {
    origin: await page.locator("input").first().elementHandle()
  });
  await screenReader.waitForMessage("First name");
  await vmKeyboard.press("Tab");
  await screenReader.waitForMessage("Last name");
});
```

In the previous example, `assistive-playwright-test` automatically clones and starts the configured virtual machine before starting the test, and, in addition to the classic [`page`](https://playwright.dev/docs/api/class-page) fixture from playwright, the [`screenReader`](https://amadeusitgroup.github.io/Assistive-Webdriver/assistive-playwright-client.screenreaderclient), [`vmKeyboard`](https://amadeusitgroup.github.io/Assistive-Webdriver/assistive-playwright-client.vmkeyboard.html) and [`vmMouse`](https://amadeusitgroup.github.io/Assistive-Webdriver/assistive-playwright-client.vmmouse.html) fixtures are injected and give access to the screen reader, keyboard and mouse APIs from [assistive-playwright-client](../assistive-playwright-client).

## Getting started

- Make sure you have the following software installed on the host machine:

  - [nodejs](https://nodejs.org)
  - [VirtualBox](https://www.virtualbox.org/) or [QEMU](https://www.qemu.org/)

- Make sure you have a VirtualBox or QEMU virtual machine properly configured. To configure the virtual machine, you can follow [this step-by-step guide](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/doc/vm-guide/README.md). The virtual machine should be configured with:

  - The [NVDA](https://www.nvaccess.org/download/) or [JAWS](https://support.freedomscientific.com/Downloads/JAWS) screen reader
  - [text-to-socket-engine](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/components/text-to-socket-engine) and [assistive-playwright-server](https://github.com/AmadeusITGroup/Assistive-Webdriver/tree/master/components/assistive-playwright-server) that are configured to work together, with assistive-playwright-server listening on http port 7779
  - A snapshot of the virtual machine should be saved in the running state with all these programs running.

- Install `@playwright/test` and `assistive-playwright-test` in your project:

```
npm install @playwright/test assistive-playwright-test
```

- Configure your tests in the `playwright.config.ts` file, as in the following example:

```ts
import { AssistivePlaywrightTestConfig } from "assistive-playwright-test";

const config: AssistivePlaywrightTestConfig = {
  timeout: 60000,
  forbidOnly: !!process.env.CI,
  retries: 5,
  use: {
    vmSettings: {
      // Adapt the name of the vm and snapshot if necessary:
      type: "virtualbox",
      vm: "win10-chromium-nvda",
      snapshot: "nvda"
    },
    // Adapt the baseURL:
    // Note that localhost will not work if you want to target
    // a server running on your host machine (it is resolved
    // inside the virtual machine)
    baseURL: "http://mytargeturl/",
    viewport: null
  }
};

export default config;
```

- Create a `sampleTest.spec.ts` file:

```ts
import { test } from "assistive-playwright-test";

test("should open simple page", async ({
  page,
  screenReader,
  vmKeyboard,
  vmMouse
}) => {
  await page.goto("/");
  await vmMouse.click(0, 0, {
    origin: await page.locator("input").first().elementHandle()
  });
  await screenReader.waitForMessage("First name");
  await vmKeyboard.press("Tab");
  await screenReader.waitForMessage("Last name");
});
```

- Make sure to start `vboxwebsrv` in order to be able to start virtual machines of type `virtualbox`:

```sh
vboxwebsrv --authentication null
```

- Run your test with `npx @playwright/test test`.

The API documentation is available [here](https://amadeusitgroup.github.io/Assistive-Webdriver/assistive-playwright-test)
