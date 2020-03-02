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

import { json as jsonBody } from "co-body";
import { post, get } from "koa-route";
import { join } from "path";
import {
  createWebdriverProxy,
  CTX_SESSION_DATA,
  CTX_SERVER_SESSION_URL,
  CTX_SESSION_ID
} from "./webdriverProxy";
import { ScreenReaderClient } from "./screenReaderClient";
import {
  executeNativeEvents,
  NativeEventsConfig,
  DEFAULT_NATIVE_EVENTS_CONFIG
} from "./nativeEvents";
import { webdriverCalibrate } from "./calibration/index";
import { createPositionGetter } from "./positionGetter";
import {
  VM,
  PortRedirection,
  VMFactory,
  ScreenPosition,
  SimplePosition
} from "./vm/vmInterface";
import { genericFactory } from "./vm/generic";
import { createSubLogFunction, LogFunction } from "./logging";
import { UnknownCommandError } from "./publicError";

export interface Configuration<T> {
  vmSettings: T;
  vmPortWebDriver: number;
  vmPortScreenReader: number;
  vmHttpWebDriverPath: string;
  vmHttpScreenReaderPath: string;
  nativeEvents: boolean;
  nativeEventsConfig: NativeEventsConfig;
  screenReader: boolean;
  failedCalibrationsFolder?: string;
}

interface SessionData<T> extends Configuration<T> {
  mousePosition: SimplePosition;
  vm?: VM;
  calibration?: ScreenPosition;
  screenReaderClient?: ScreenReaderClient;
}

async function deleteSession<T>(id: string, data: SessionData<T>) {
  const screenReaderClient = data.screenReaderClient;
  if (screenReaderClient) {
    data.screenReaderClient = undefined;
    screenReaderClient.disconnect();
  }
  const vm = data.vm;
  if (vm) {
    data.vm = undefined;
    await vm.destroy();
  }
}

export const DEFAULT_VM_PORT_WEBDRIVER = 4444;
export const DEFAULT_WEBDRIVER_PATH = "/wd/hub";
export const DEFAULT_VM_PORT_SCREENREADER = 7779;
export const DEFAULT_SCREENREADER_PATH = "/live/websocket";

export interface WebdriverVMProxyConfig<T> {
  log?: LogFunction;
  sessionTimeout?: number;
  defaultConfiguration?: Partial<Configuration<T>>;
  processCapabilities?: (
    capabilities: any
  ) => Promise<Partial<Configuration<T>>>;
  vmFactory?: VMFactory<T>;
}

function findRedirection(redirections: PortRedirection[], vmPort: number) {
  const res = redirections.find(redirection => redirection.vmPort === vmPort);
  if (!res) {
    throw new Error(`Missing redirection for port ${vmPort}!`);
  }
  return res;
}

const createSessionData = <T>(
  defaultConfiguration: Partial<Configuration<T>>,
  specificConfiguration: Partial<Configuration<T>>
): SessionData<T> =>
  Object.assign(
    {
      nativeEvents: true,
      screenReader: false,
      vmHttpWebDriverPath: DEFAULT_WEBDRIVER_PATH,
      vmHttpScreenReaderPath: DEFAULT_SCREENREADER_PATH,
      vmPortWebDriver: DEFAULT_VM_PORT_WEBDRIVER,
      vmPortScreenReader: DEFAULT_VM_PORT_SCREENREADER
    },
    defaultConfiguration,
    specificConfiguration,
    {
      mousePosition: { x: 0, y: 0 },
      vm: undefined,
      calibration: undefined,
      screenReaderClient: undefined,
      nativeEventsConfig: Object.assign(
        {},
        DEFAULT_NATIVE_EVENTS_CONFIG,
        defaultConfiguration.nativeEventsConfig,
        specificConfiguration.nativeEventsConfig
      ),
      vmSettings: Object.assign(
        {},
        defaultConfiguration.vmSettings,
        specificConfiguration.vmSettings
      )
    }
  );

export function createWebdriverVMProxy<T>({
  log,
  sessionTimeout,
  processCapabilities = async () => ({}),
  defaultConfiguration = {},
  vmFactory = genericFactory
}: WebdriverVMProxyConfig<T>) {
  log = createSubLogFunction(log, { category: "vmproxy" });
  return createWebdriverProxy({
    log,
    sessionTimeout,
    async createSession(id: string, params: any) {
      delete params.desiredCapabilities;
      const capabilities = params.capabilities.alwaysMatch;
      const data = createSessionData(
        defaultConfiguration,
        await processCapabilities(capabilities)
      );
      try {
        const redirectTCPPorts: number[] = [data.vmPortWebDriver];
        if (data.screenReader) {
          redirectTCPPorts.push(data.vmPortScreenReader);
        }
        const sessionLog = createSubLogFunction(log, { sessionId: id });
        data.vm = await vmFactory({
          id,
          vmSettings: data.vmSettings,
          redirectTCPPorts,
          log: sessionLog
        });
        const webdriverRedirection = findRedirection(
          data.vm.tcpRedirections,
          data.vmPortWebDriver
        );
        if (data.screenReader) {
          const screenReaderRedirection = findRedirection(
            data.vm.tcpRedirections,
            data.vmPortScreenReader
          );
          data.screenReaderClient = new ScreenReaderClient(
            screenReaderRedirection.hostAddress,
            screenReaderRedirection.hostPort,
            sessionLog,
            data.vmHttpScreenReaderPath
          );
          data.screenReaderClient.connect();
        }
        return {
          data,
          serverUrl: `http://${webdriverRedirection.hostAddress}:${webdriverRedirection.hostPort}${data.vmHttpWebDriverPath}`
        };
      } catch (error) {
        deleteSession(id, data);
        throw error;
      }
    },
    async sessionCreated(
      id: string,
      data: SessionData<T>,
      serverSessionUrl: string
    ) {
      if (data.nativeEvents) {
        data.calibration = await webdriverCalibrate(
          data.vm!,
          serverSessionUrl,
          data.failedCalibrationsFolder
            ? join(data.failedCalibrationsFolder, `${id}.png`)
            : undefined,
          createSubLogFunction(log, { sessionId: id })
        );
      }
    },
    deleteSession,
    registerActions(app) {
      app.use(
        post("/session/:sessionid/actions", async (ctx, next) => {
          const data: SessionData<T> = ctx[CTX_SESSION_DATA];
          if (data.nativeEvents) {
            const sessionLog = createSubLogFunction(log, {
              sessionId: ctx[CTX_SESSION_ID]
            });
            const executionResult = await executeNativeEvents(
              data.vm!,
              data.nativeEventsConfig,
              data.mousePosition,
              createPositionGetter(
                ctx[CTX_SERVER_SESSION_URL],
                data.calibration!,
                data.mousePosition!,
                sessionLog
              ),
              await jsonBody(ctx),
              sessionLog
            );
            ctx.status = 200;
            ctx.body = executionResult;
          } else {
            await next();
          }
        })
      );
      app.use(
        get("/session/:sessionid/screenReaderText", ctx => {
          const data: SessionData<T> = ctx[CTX_SESSION_DATA];
          if (!data.screenReaderClient) {
            throw new UnknownCommandError(
              "This command is not available as the screenReader feature is not enabled."
            );
          }
          const messages = data.screenReaderClient.messages;
          data.screenReaderClient.messages = [];
          ctx.body = {
            value: messages
          };
        })
      );
    }
  });
}
