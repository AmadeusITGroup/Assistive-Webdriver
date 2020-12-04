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

import { vboxVMFactory } from "./virtualbox";
import { QEMUVMFactory } from "./qemu";
import { VMFactory } from "./vmInterface";
import { VMSettings } from "../config";

export const vmFactories: { [key: string]: VMFactory<any> } = Object.create(
  null
);
vmFactories.virtualbox = vboxVMFactory;
vmFactories.qemu = QEMUVMFactory;

export const createVM: VMFactory<VMSettings> = async ({
  vmSettings: { type, ...vmSettings },
  ...config
}) => {
  const factory = vmFactories[type];
  if (!factory) {
    throw new Error(`Unknown or unspecified VM type: ${type}`);
  }
  return await factory({ ...config, vmSettings });
};
