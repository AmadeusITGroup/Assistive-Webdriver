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
import { warn, error, info, configure, format, transports } from "winston";
import { Builder, By, Browser, until, Key } from "selenium-webdriver";
import { findPublicIP } from "./findPublicIP";
import { AddressInfo } from "net";
import { untilElementHasFocus } from "./untilElementHasFocus";
import { TesterSession } from "./testerSession";
import { testAllKeys } from "./tests/testKeys";
import { testMouseButtons } from "./tests/testMouseButtons";
import {
  refreshScreenReaderText,
  forScreenReaderToSay,
  addScreenReaderTextListener,
  clearCachedScreenReaderText
} from "../client";
import { sigintWin32 } from "../server/sigintWin32";

(async function () {
  const defaultPublicIp = findPublicIP();
  const argv = await yargs.options({
    server: {
      type: "string",
      alias: "s",
      default: "http://localhost:3000"
    },
    browser: {
      type: "string",
      alias: "b",
      default: Browser.CHROME
    },
    capabilities: {
      type: "string",
      default: "{}"
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
    "vm-config": {
      type: "string",
      alias: "m"
    },
    "skip-keys": {
      type: "array",
      alias: "k"
    }
  }).argv;
  configure({
    level: argv["log-level"],
    format: format.combine(format.colorize(), format.simple()),
    transports: [new transports.Console()]
  });

  const capabilities = JSON.parse(argv.capabilities);
  if (argv["vm-config"]) {
    capabilities["awd:vm-config"] = argv["vm-config"];
  }
  info(`Connecting to webdriver server at ${argv.server}`, {
    capabilities,
    browser: argv.browser
  });

  const driver = await new Builder()
    .withCapabilities(capabilities)
    .forBrowser(argv.browser)
    .usingServer(argv.server)
    .build();

  process.on("SIGINT", async () => {
    warn("Closing the session...");
    await driver.quit();
    error("Tests were interrupted.");
    process.exit(2);
  });
  sigintWin32();

  const testerSession = new TesterSession(driver);
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
    try {
      await refreshScreenReaderText(testerSession.driver);
      info("Screen reader testing is ENABLED.");
      addScreenReaderTextListener(testerSession.driver, message =>
        info(`Screen reader said: ${message}`)
      );
      testerSession.screenReader = true;
    } catch (error) {
      info("Screen reader testing is DISABLED.");
    }
    info(`Loading test page from ${eventsServerPublicAddress}`);
    await driver.get(eventsServerPublicAddress);
    const body = await driver.findElement(By.css("body"));
    await driver.wait(until.elementTextContains(body, "ready"));
    info(`Test page was successfully loaded`);

    const testInput = await driver.findElement(By.css("#testInput"));

    await driver.actions().click(testInput).perform();

    await driver.wait(untilElementHasFocus(testInput), 10000);

    if (testerSession.screenReader) {
      await clearCachedScreenReaderText(testerSession.driver);
    }

    await driver.actions().keyDown(Key.TAB).keyUp(Key.TAB).perform();

    if (testerSession.screenReader) {
      try {
        await testerSession.driver.wait(
          forScreenReaderToSay("mysupertestlabeltocheck"),
          5000
        );
      } catch (e) {
        testerSession.reportError(`Screen reader test failed: ${e}`);
      }
    }

    const testDiv = await driver.findElement(By.css("#testDiv"));
    await driver.wait(untilElementHasFocus(testDiv), 10000);

    await testerSession.eventsQueue.getAllWaitingValues();

    await testAllKeys(testerSession, argv["skip-keys"] as any);
    await testMouseButtons(testerSession);

    if (testerSession.errorsNumber === 0) {
      info("All tests were successful!");
    } else {
      throw new Error("Some tests failed!");
    }
  } finally {
    testerSession.reportMeasures();
    await driver.quit();
    testerSession.eventsServer.close();
  }
})().catch(e => {
  error(`${e}`);
  process.exit(1);
});
