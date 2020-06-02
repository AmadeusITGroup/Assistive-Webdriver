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
import { writeFileSync, unlinkSync } from "fs";
import { resolve } from "path";
import {
  createWebdriverVMProxy,
  WebdriverVMProxyConfig
} from "./webdriverVMProxy";
import { InvalidArgumentError } from "./publicError";
import { defaultLogFunction, defaultLogger } from "./logging";
import { DEFAULT_SESSION_TIMEOUT } from "./webdriverProxy";

const CONFIG_CAPABILITY_NAME = "awd:vm-config";

const defaultSetLogLevel = (level: string) => (defaultLogger.level = level);

export const start = async (
  args: string[],
  env: string | boolean = false,
  { log = defaultLogFunction, setLogLevel = defaultSetLogLevel } = {}
) => {
  const argv = yargs(args)
    .env(env as any)
    .options({
      port: {
        type: "number",
        alias: "p",
        default: 3000
      },
      host: {
        type: "string",
        alias: "h",
        default: "127.0.0.1"
      },
      "session-timeout": {
        type: "number",
        default: DEFAULT_SESSION_TIMEOUT
      },
      "log-level": {
        type: "string",
        alias: "l",
        default: "info"
      },
      "failed-calibrations-folder": {
        type: "string"
      },
      "vm-configs": {
        type: "string",
        alias: "c"
      },
      "pid-file": {
        type: "string"
      }
    }).argv;

  setLogLevel(argv["log-level"]);

  const pidFile = argv["pid-file"];
  if (pidFile) {
    writeFileSync(pidFile, `${process.pid}`, {
      flag: "wx"
    });
    process.on("exit", () => {
      unlinkSync(pidFile);
    });
  }

  const vmProxyConfig: WebdriverVMProxyConfig<any> = {
    log,
    sessionTimeout: argv["session-timeout"],
    defaultConfiguration: {
      failedCalibrationsFolder: argv["failed-calibrations-folder"]
    }
  };

  if (argv["vm-configs"]) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const vmConfigs = require(resolve(argv["vm-configs"]));
    vmProxyConfig.processCapabilities = async capabilities => {
      const configName = capabilities[CONFIG_CAPABILITY_NAME];
      delete capabilities[CONFIG_CAPABILITY_NAME];
      const config = vmConfigs[configName || "default"];
      if (!config) {
        throw new InvalidArgumentError(
          `Invalid ${CONFIG_CAPABILITY_NAME} capability value: ${configName}`
        );
      }
      return config;
    };
  }

  const app = createWebdriverVMProxy(vmProxyConfig);
  const server = app.listen(argv.port, argv.host, () =>
    log({
      category: "main",
      level: "info",
      message: "listen",
      url: `http://${argv.host}:${argv.port}`
    })
  );
  await new Promise((resolve, reject) =>
    server.on("listening", resolve).on("error", reject)
  );

  return async () => {
    log({
      category: "main",
      level: "info",
      message: "stop.begin"
    });
    await new Promise(resolve => server.close(resolve));
    await app.deleteSessions();
    log({
      category: "main",
      level: "info",
      message: "stop.end"
    });
  };
};
