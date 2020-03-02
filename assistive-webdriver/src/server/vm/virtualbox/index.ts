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

import { VirtualboxVM } from "./vm";
import { VMFactory } from "../vmInterface";

export const DEFAULT_SERVER = `http://127.0.0.1:18083`;

export interface VBoxSettings {
  server?: string;
  vm: string;
  snapshot?: string;
}

export const vboxVMFactory: VMFactory<VBoxSettings> = async ({
  log,
  redirectTCPPorts,
  id,
  vmSettings: { vm, snapshot, server }
}) => {
  const vmObject = await VirtualboxVM.create(
    server || DEFAULT_SERVER,
    id,
    vm,
    snapshot,
    log
  );
  try {
    await vmObject.vboxStart();
    for (const redirection of redirectTCPPorts) {
      await vmObject.vboxRedirectTCPPort(redirection);
    }
  } catch (error) {
    await vmObject.destroy();
    throw error;
  }
  return vmObject;
};
