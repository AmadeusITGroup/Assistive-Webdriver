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

import yargs from "yargs";
import type {
  BrowserType,
  ChromiumBrowser,
  FirefoxBrowser,
  WebKitBrowser
} from "playwright-core";
import { createVM, Key } from "assistive-playwright-client";
import { warn, error, info, configure, format, transports, log } from "winston";
import { TesterSession } from "./testerSession";
import { findPublicIP } from "./findPublicIP";
import { AddressInfo } from "net";

import { collectCoverage } from "./collectCoverage";
import { sigintWin32 } from "./sigintWin32";
import { testAllKeys } from "./testKeys";
import { testMouseButtons } from "./testMouseButtons";

const hasFocus: (element: any) => boolean = element =>
  document.activeElement === element;

(async function () {
  const defaultPublicIp = findPublicIP();
  const argv = await yargs.options({
    browser: {
      array: true,
      type: "string",
      alias: "b",
      default: ["chromium"]
    },
    "log-level": {
      type: "string",
      alias: "l",
      default: "info"
    },
    "public-host": {
      type: "string",
      alias: "h",
      default: defaultPublicIp
    },
    "listen-host": {
      type: "string"
    },
    "public-port": {
      type: "number",
      alias: "p",
      default: 0
    },
    "listen-port": {
      type: "number",
      default: 0
    },
    "vm-settings": {
      type: "string",
      alias: "m",
      demandOption: true
    },
    "server-port": {
      type: "number",
      default: 7779
    },
    "skip-keys": {
      type: "array",
      alias: "k"
    },
    "screen-reader": {
      type: "boolean",
      default: true
    }
  }).argv;
  configure({
    level: argv["log-level"],
    format: format.combine(format.colorize(), format.simple()),
    transports: [new transports.Console()]
  });

  const vmSettings = JSON.parse(argv["vm-settings"]);
  info(`Starting the VM...`);
  const driver = await createVM({
    log: (entry: any) => log(entry),
    vmSettings,
    playwrightPort: argv["server-port"]
  });
  const availableBrowsers: {
    [name: string]:
      | BrowserType<ChromiumBrowser>
      | BrowserType<FirefoxBrowser>
      | BrowserType<WebKitBrowser>;
  } = {
    chromium: driver.chromium,
    firefox: driver.firefox,
    webkit: driver.webkit
  };
  const screenReader = argv["screen-reader"];
  const testerSession = new TesterSession(driver, screenReader);
  let vmDestroyed = false;

  process.on("SIGINT", async () => {
    if (!vmDestroyed) {
      warn("Stopping the VM...");
      vmDestroyed = true;
      await driver.vm.destroy();
      error("Tests were interrupted.");
      process.exit(2);
    }
  });
  sigintWin32();

  try {
    const eventsServerAddress = await new Promise<AddressInfo>(
      (resolve, reject) =>
        testerSession.eventsServer
          .listen(
            argv["listen-port"] || argv["public-port"],
            argv["listen-host"] || argv["public-host"],
            () => {
              resolve(testerSession.eventsServer.address() as AddressInfo);
            }
          )
          .once("error", reject)
    );

    const eventsServerListenAddress = `http://${eventsServerAddress.address}:${eventsServerAddress.port}`;
    const publicPort = argv["public-port"] || eventsServerAddress.port;
    const publicHost = argv["public-host"] || eventsServerAddress.address;
    const eventsServerPublicAddress = `http://${publicHost}:${publicPort}`;
    info(
      `Test page server started at ${eventsServerListenAddress}, VM will connect to ${eventsServerPublicAddress}`
    );
    if (screenReader) {
      info("Screen reader testing is ENABLED.");
      driver.screenReader.on("message", message =>
        info(`Screen reader said: ${message}`)
      );
    } else {
      info("Screen reader testing is DISABLED.");
    }

    for (const browserName of argv.browser) {
      const browser = availableBrowsers[browserName];
      if (!browser) {
        testerSession.reportError(`Unknown browser: ${browserName}`);
        continue;
      }
      info(`Testing on browser ${browserName}`);
      const browserInstance = await browser.launch({ headless: false });
      try {
        const page = await browserInstance.newPage({
          viewport: null
        });
        testerSession.page = page;
        const mouse = await driver.calibrateMouse(page);
        testerSession.mouse = mouse;
        info(`Loading test page from ${eventsServerPublicAddress}`);
        const response = await page.goto(eventsServerPublicAddress);
        if (!response?.ok) {
          testerSession.reportError(
            `Could not successfully load page ${eventsServerPublicAddress}`
          );
          continue;
        }
        info(`Test page was successfully loaded`);

        const testInput = await page.$("#testInput");
        await mouse.click(0, 0, { origin: testInput });
        await page.waitForFunction(hasFocus, testInput);

        if (screenReader) {
          await driver.screenReader.clearMessages();
        }

        await driver.keyboard.press(Key.Tab);

        if (screenReader) {
          try {
            await driver.screenReader.waitForMessage("mysupertestlabeltocheck");
          } catch (e) {
            testerSession.reportError(`Screen reader test failed: ${e}`);
          }
        }

        const testDiv = await page.$("#testDiv");
        await page.waitForFunction(hasFocus, testDiv);

        await testerSession.eventsQueue.getAllWaitingValues();

        await testAllKeys(testerSession, argv["skip-keys"] as any);
        await testMouseButtons(testerSession);
      } catch (error: any) {
        testerSession.reportError(`${error.stack || error.message || error}`);
        continue;
      } finally {
        try {
          info(`Closing browser ${browserName}...`);
          await browserInstance.close();
        } catch (e) {
          console.log(`Error in browserInstance.close()`);
        }
        info(`Tests finished for browser ${browserName}`);
      }
    }

    if (testerSession.errorsNumber === 0) {
      info("All tests were successful!");
    } else {
      throw "Some tests failed!";
    }
  } finally {
    await collectCoverage(driver.url);
    testerSession.reportMeasures();
    vmDestroyed = true;
    await driver.vm.destroy();
    testerSession.eventsServer.close();
  }
})().catch(e => {
  error(`${e.stack || e.message || e}`);
  process.exit(1);
});
