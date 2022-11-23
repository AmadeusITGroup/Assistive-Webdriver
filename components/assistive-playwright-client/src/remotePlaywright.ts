/*
 * Copyright 2020 Amadeus s.a.s.
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

import { ChildProcess } from "child_process";
import fetch from "node-fetch";
import type {
  Browser,
  BrowserServer,
  BrowserType,
  ChromiumBrowser,
  FirefoxBrowser,
  LaunchOptions,
  WebKitBrowser
} from "playwright-core";

class RemotePlaywrightBrowserServer implements BrowserServer {
  constructor(private _url: string) {}
  on(event: "close", listener: () => void): this {
    return this;
  }
  once(event: "close", listener: () => void): this {
    return this;
  }
  prependListener(event: "close", listener: () => void): this {
    return this;
  }
  addListener(event: "close", listener: () => void): this {
    return this;
  }
  removeListener(event: "close", listener: () => void): this {
    return this;
  }
  off(event: "close", listener: () => void): this {
    return this;
  }

  async close(): Promise<void> {
    await fetch(this._url, {
      method: "DELETE"
    });
  }

  kill(): Promise<void> {
    return this.close();
  }

  process(): ChildProcess {
    throw new Error("process() is not implemented.");
  }

  wsEndpoint(): string {
    const wsEndpoint = new URL(this._url);
    wsEndpoint.protocol = "ws";
    return wsEndpoint.toString();
  }
}

const remotePlaywrightBrowserType = (
  url: URL,
  baseBrowserType: BrowserType
) => {
  const replacements: Partial<BrowserType> = {
    launchServer: async function (
      this: BrowserType,
      {
        handleSIGHUP,
        handleSIGINT,
        handleSIGTERM,
        logger,
        ...remoteOptions
      }: LaunchOptions = (this as any)._defaultLaunchOptions || {}
    ): Promise<BrowserServer> {
      const response = await fetch(url.toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          options: remoteOptions,
          browser: this.name()
        })
      });
      if (response.ok) {
        const json = (await response.json()) as any;
        return new RemotePlaywrightBrowserServer(
          new URL(`./browser/${encodeURIComponent(json.id)}`, url).href
        );
      } else {
        let errorDetails = `Status: ${response.status} ${response.statusText}`;
        try {
          const errorJson = (await response.json()) as any;
          errorDetails = `Message: ${errorJson.message}\n${errorDetails}`;
        } catch (e) {
          // ignore errors when getting error details
        }
        throw new Error(`The server returned an error:\n${errorDetails}`);
      }
    },
    launch: async function (
      this: BrowserType,
      options: LaunchOptions
    ): Promise<Browser> {
      const server = await this.launchServer(options);
      const browser = await this.connect(server.wsEndpoint());
      browser.close = async () => {
        await server.close();
      };
      return browser;
    }
  };

  return new Proxy(baseBrowserType, {
    get(target, prop, receiver) {
      return (replacements as any)[prop] ?? Reflect.get(target, prop, receiver);
    }
  });
};

/**
 * Reference to objects implementing the {@link https://playwright.dev/docs/api/class-browsertype | BrowserType}
 * interface from playwright and allowing to start and control instances of
 * chromium, firefox and webkit.
 * This interface is returned from {@link connectRemotePlaywright}
 * and allows to remotely control those browsers with the Playwright API.
 * @public
 */
export interface RemotePlaywright {
  /**
   * Reference to an object implementing the {@link https://playwright.dev/docs/api/class-browsertype | BrowserType}
   * interface from playwright allowing to control chromium.
   */
  chromium: BrowserType<ChromiumBrowser>;
  /**
   * Reference to an object implementing the {@link https://playwright.dev/docs/api/class-browsertype | BrowserType}
   * interface from playwright allowing to control firefox.
   */
  firefox: BrowserType<FirefoxBrowser>;
  /**
   * Reference to an object implementing the {@link https://playwright.dev/docs/api/class-browsertype | BrowserType}
   * interface from playwright allowing to control webkit.
   */
  webkit: BrowserType<WebKitBrowser>;
}

const getLocalPlaywright = () => require("playwright-core");

/**
 * Connects to a remote assistive-playwright-server running at the given URL
 * and returns the chromium, firefox and webkit playwright browser type objects
 * allowing to start and control those browsers remotely.
 * @param url - URL at which assistive-playwright-server is running.
 * @param localPlaywright - reference to the playwright, playwright-core or \@playwright/test local package.
 *
 * @remarks
 * This function is used internally by {@link createVM} to give access to
 * the browsers in the virtual machine through the playwright API.
 *
 * @public
 */
export function connectRemotePlaywright<T extends RemotePlaywright>(
  url: string | URL,
  localPlaywright: T = getLocalPlaywright()
): T {
  const parsedURL = new URL("./browser", url);
  if (!/^https?:$/.test(parsedURL.protocol)) {
    throw new Error(`Unexpected protocol: ${parsedURL.protocol}`);
  }
  const storedObjects = new Map();
  return new Proxy(localPlaywright, {
    get(target, prop, receiver) {
      const res = Reflect.get(target, prop, receiver);
      if (
        res &&
        (prop === "chromium" || prop === "firefox" || prop === "webkit")
      ) {
        let replacement = storedObjects.get(res);
        if (!replacement) {
          replacement = remotePlaywrightBrowserType(parsedURL, res as any);
          storedObjects.set(res, replacement);
        }
        return replacement;
      }
      return res;
    }
  });
}
