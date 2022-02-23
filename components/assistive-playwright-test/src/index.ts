/**
 * This package contains Playwright Test fixtures allowing to easily use Playwright Test to test a web application with a screen reader.
 *
 * @packageDocumentation
 */

import { PlaywrightTestConfig, test as baseTest } from "@playwright/test";
import { v4 as createUUIDv4 } from "uuid";
import {
  VM,
  VMSettings,
  createRawVM,
  PortRedirection,
  connectRemotePlaywright,
  VMKeyboard,
  VMMouse,
  calibrateMouseFunctionFactory,
  CalibrateMouseFunction,
  CalibrationOptions,
  ScreenReaderClient
} from "assistive-playwright-client";

/**
 * Set of options provided by assistive-playwright-test at the worker level which can be specified in the Playwright configuration file.
 *
 * @public
 */
export interface WorkerOptions {
  /**
   * Port of assistive-playwright-server in the virtual machine.
   * Defaults to 7779.
   */
  vmPlaywrightPort: number;

  /**
   * Set of ports in the virtual machine to make available from the host machine.
   * It should include {@link WorkerOptions.vmPlaywrightPort | vmPlaywrightPort}.
   * Defaults to an array containing only {@link WorkerOptions.vmPlaywrightPort | vmPlaywrightPort}.
   */
  vmRedirectPorts: number[];

  /**
   * Id of the cloned virtual machine.
   * Defaults to an automatically generated UUID.
   */
  vmId: string;

  /**
   * Specifies the virtual machine to clone.
   */
  vmSettings: VMSettings;

  /**
   * URL of assistive-playwright-server to connect to.
   * Defaults to a URL built from {@link WorkerFixtures.vmPlaywrightPortRedirection | vmPlaywrightPortRedirection}.
   */
  remotePlaywrightURL: string;

  /**
   * URL of the screen reader websocket address to connect to.
   * Defaults to a URL built from {@link WorkerFixtures.vmPlaywrightPortRedirection | vmPlaywrightPortRedirection}.
   */
  screenReaderURL: string;
}

/**
 * Set of {@link https://playwright.dev/docs/test-fixtures | fixtures} provided by assistive-playwright-test at the worker level.
 *
 * @public
 */
export interface WorkerFixtures extends WorkerOptions {
  /**
   * Reference to the current virtual machine.
   */
  vm: VM;

  /**
   * Reference to the VMKeyboard object that allows to control the keyboard at the virtual machine level
   * (low-level enough so that the screen reader can catch those keyboard events).
   */
  vmKeyboard: VMKeyboard;

  /**
   * Mouse calibration function, allowing to calibrate the mouse for a specific page.
   */
  vmMouseCalibrate: CalibrateMouseFunction;

  /**
   * Specifies how the virtual machine port from the {@link WorkerOptions.vmPlaywrightPort | vmPlaywrightPort} setting
   * can be reached from the host machine.
   */
  vmPlaywrightPortRedirection: PortRedirection;

  /**
   * Reference to the ScreenReaderClient object that gives access to messages from the screen reader.
   */
  screenReader: ScreenReaderClient;
}

/**
 * Set of options provided by assistive-playwright-test at the test level which can be specified in the Playwright configuration file.
 *
 * @public
 */
export interface TestOptions {
  /**
   * Options to use when calibrating the mouse for the current page.
   */
  vmMouseCalibrationOptions: CalibrationOptions;
}

/**
 * Set of {@link https://playwright.dev/docs/test-fixtures | fixtures} provided by assistive-playwright-test at the test level.
 *
 * @public
 */
export interface TestFixtures extends TestOptions {
  /**
   * Reference to the VMMouse object that allows to control the mouse at the virtual machine level.
   * It is automatically calibrated to the current page, which means it is possible to pass coordinates relative to the viewport
   * of the current page.
   */
  vmMouse: VMMouse;
}

/**
 * Describes the type of the default export of a Playwright Test configuration file that uses assistive-playwright-test.
 *
 * @public
 */
export type AssistivePlaywrightTestConfig<
  TestArgs = unknown,
  WorkerArgs = unknown
> = PlaywrightTestConfig<TestOptions & TestArgs, WorkerOptions & WorkerArgs>;

/**
 * Test object that extends the base {@link https://playwright.dev/docs/api/class-test | Playwright Test} object to
 * provide extra {@link WorkerFixtures | worker fixtures} and {@link TestFixtures | test fixtures}.
 *
 * @public
 */
export const test = baseTest.extend<TestFixtures, WorkerFixtures>({
  headless: false,
  vmPlaywrightPort: [7779, { scope: "worker", option: true }],
  vmRedirectPorts: [
    ({ vmPlaywrightPort }, use) => use([vmPlaywrightPort]),
    { scope: "worker", option: true }
  ],
  /* eslint-disable-next-line no-empty-pattern */
  vmId: [({}, use) => use(createUUIDv4()), { scope: "worker", option: true }],
  vmSettings: [null as any, { scope: "worker", option: true }],
  vm: [
    async ({ vmSettings, vmRedirectPorts, vmId }, use) => {
      if (!vmSettings) {
        throw new Error("Please provide vmSettings");
      }
      const vm = await createRawVM({
        // TODO: improve logs handling
        log: (entry: any) => console.log(JSON.stringify(entry)),
        id: vmId,
        redirectTCPPorts: vmRedirectPorts,
        vmSettings
      });
      try {
        await use(vm);
      } finally {
        await vm.destroy();
      }
    },
    { scope: "worker" }
  ],
  vmKeyboard: [({ vm }, use) => use(new VMKeyboard(vm)), { scope: "worker" }],
  vmMouseCalibrate: [
    ({ vm }, use) => use(calibrateMouseFunctionFactory(vm)),
    { scope: "worker" }
  ],
  vmPlaywrightPortRedirection: [
    async ({ vm, vmPlaywrightPort }, use) => {
      const redirection = vm.tcpRedirections.find(
        redirection => redirection.vmPort === vmPlaywrightPort
      );
      if (!redirection) {
        throw new Error("Could not find playwright port redirection.");
      }
      await use(redirection);
    },
    { scope: "worker" }
  ],
  remotePlaywrightURL: [
    ({ vmPlaywrightPortRedirection: redir }, use) =>
      use(`http://${redir.hostAddress}:${redir.hostPort}`),
    { scope: "worker", option: true }
  ],
  screenReaderURL: [
    ({ vmPlaywrightPortRedirection: redir }, use) =>
      use(`ws://${redir!.hostAddress}:${redir!.hostPort}/screen-reader`),
    { scope: "worker", option: true }
  ],
  screenReader: [
    async ({ screenReaderURL }, use) => {
      const screenReader = await ScreenReaderClient.create(screenReaderURL);
      await use(screenReader);
      screenReader.disconnect();
    },
    { scope: "worker" }
  ],
  playwright: [
    ({ remotePlaywrightURL, playwright }, use) =>
      use(connectRemotePlaywright(remotePlaywrightURL, playwright)),
    { scope: "worker" }
  ],
  browser: [
    async ({ browser, browserName, playwright }, use) => {
      // Without the following line, playwright does not pass context options correctly
      (browser as any)._browserType = playwright[browserName];
      await use(browser);
    },
    { scope: "worker" }
  ],
  vmMouseCalibrationOptions: [{}, { option: true }],
  vmMouse: async (
    { vmMouseCalibrate, vmMouseCalibrationOptions, page },
    use
  ) => {
    const vmMouse = await vmMouseCalibrate(page, vmMouseCalibrationOptions);
    await use(vmMouse);
  }
});

export * from "assistive-playwright-client";
export * from "@playwright/test";
