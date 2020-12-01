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

import {
  IWebsessionManager,
  IVirtualBox,
  connect,
  ISession
} from "virtualbox-soap";
import { URL, format } from "url";
import { LogFunction } from "../../logging";

const KEEP_ALIVE_TIMEOUT = 90000;

export class VirtualBoxConnection {
  websessionManager?: IWebsessionManager;
  virtualbox?: IVirtualBox;
  keepAliveRef?: NodeJS.Timeout;

  constructor(public log: LogFunction) {}

  keepAlive = async (): Promise<void> => {
    if (this.virtualbox) {
      const version = await this.virtualbox.getAPIVersion();
      this.log({
        level: "debug",
        message: "keepalive",
        version
      });
      this.keepAliveRef = setTimeout(this.keepAlive, KEEP_ALIVE_TIMEOUT);
    }
  };

  async connect(url: string): Promise<void> {
    const parsedURL = new URL(url);
    const urlWithoutAuth = format(parsedURL, {
      auth: false
    });
    this.websessionManager = await connect(urlWithoutAuth);
    this.virtualbox = await this.websessionManager.logon(
      parsedURL.username,
      parsedURL.password
    );
    this.keepAlive();
  }

  async disconnect(): Promise<void> {
    if (!this.websessionManager) {
      return;
    }
    if (this.keepAliveRef) {
      clearTimeout(this.keepAliveRef);
      this.keepAliveRef = undefined;
    }
    if (this.virtualbox) {
      const virtualbox = this.virtualbox;
      this.virtualbox = undefined;
      await this.websessionManager.logoff(virtualbox);
    }
  }

  async createSession(): Promise<ISession> {
    return await this.websessionManager!.getSessionObject(this.virtualbox!);
  }
}
