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
import {
  Browser,
  BrowserContext,
  BrowserServer,
  BrowserType,
  chromium,
  ChromiumBrowser,
  ConnectOptions,
  firefox,
  FirefoxBrowser,
  LaunchOptions,
  webkit,
  WebKitBrowser
} from "playwright-core";

class RemotePlaywrightBrowserServer implements BrowserServer {
  constructor(private _url: URL) {}
  on(event: "close", listener: () => void): this {
    return this;
  }
  once(event: "close", listener: () => void): this {
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
    const wsEndpoint = new URL(this._url.toString());
    wsEndpoint.protocol = "ws";
    return wsEndpoint.toString();
  }
}

class RemotePlaywrightBrowserType<T extends Browser> implements BrowserType<T> {
  constructor(private _url: URL, private _baseBrowserType: BrowserType<T>) {}

  connect(options: ConnectOptions) {
    return this._baseBrowserType.connect(options);
  }

  async launchServer({
    handleSIGHUP,
    handleSIGINT,
    handleSIGTERM,
    logger,
    ...remoteOptions
  }: LaunchOptions = {}): Promise<BrowserServer> {
    const response = await fetch(this._url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        options: remoteOptions,
        browser: this._baseBrowserType.name()
      })
    });
    if (response.ok) {
      const json = await response.json();
      return new RemotePlaywrightBrowserServer(
        new URL(`./browser/${encodeURIComponent(json.id)}`, this._url)
      );
    } else {
      let errorDetails = `Status: ${response.status} ${response.statusText}`;
      try {
        const errorJson = await response.json();
        errorDetails = `Message: ${errorJson.message}\n${errorDetails}`;
      } catch (e) {
        // ignore errors when getting error details
      }
      throw new Error(`The server returned an error:\n${errorDetails}`);
    }
  }

  async launch(options: LaunchOptions): Promise<T> {
    const server = await this.launchServer(options);
    const browser = await this.connect({
      wsEndpoint: server.wsEndpoint()
    });
    browser.close = async () => {
      await server.close();
    };
    return browser;
  }

  launchPersistentContext(): Promise<BrowserContext> {
    throw new Error(`launchPersistentContext() is not implemented`);
  }

  executablePath(): string {
    throw new Error(`executablePath() is not implemented`);
  }

  name(): string {
    return this._baseBrowserType.name();
  }
}

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

/**
 * Connects to a remote assistive-playwright-server running at the given URL
 * and returns the chromium, firefox and webkit playwright browser type objects
 * allowing to start and control those browsers remotely.
 * @param url - URL at which assistive-playwright-server is running.
 *
 * @remarks
 * This function is used internally by {@link createVM} to give access to
 * the browsers in the virtual machine through the playwright API.
 *
 * @public
 */
export function connectRemotePlaywright(url: string | URL): RemotePlaywright {
  const parsedURL = new URL("./browser", url);
  if (!/^https?:$/.test(parsedURL.protocol)) {
    throw new Error(`Unexpected protocol: ${parsedURL.protocol}`);
  }
  return {
    chromium: new RemotePlaywrightBrowserType(parsedURL, chromium),
    firefox: new RemotePlaywrightBrowserType(parsedURL, firefox),
    webkit: new RemotePlaywrightBrowserType(parsedURL, webkit)
  };
}
