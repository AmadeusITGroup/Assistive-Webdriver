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
  IVirtualBox,
  CloneMode,
  CloneOptions,
  IMachine,
  VBOX_E_INVALID_OBJECT_STATE,
  IMedium,
  CleanupMode
} from "virtualbox-soap";
import { wait } from "../../wait";

export async function cloneMachine(
  virtualbox: IVirtualBox,
  name: string,
  originalName: string,
  originalSnapshot?: string
): Promise<IMachine> {
  let originalMachine = await virtualbox.findMachine(originalName);
  if (originalSnapshot) {
    const snapshotObject = await originalMachine.findSnapshot(originalSnapshot);
    originalMachine = await snapshotObject.getMachine();
  }
  const machine = await virtualbox.createMachine("", name, [], "", "");
  try {
    const cloneProgress = await originalMachine.cloneTo(
      machine,
      CloneMode.MachineState,
      [CloneOptions.Link]
    );
    await cloneProgress.waitForCompletion(-1);
    await virtualbox.registerMachine(machine);
    return machine;
  } catch (e) {
    await deleteMachine(machine);
    throw e;
  }
}

export async function deleteMachine(machine: IMachine): Promise<void> {
  let media: IMedium[];
  let error;
  for (let retries = 10; retries > 0; retries--) {
    try {
      media = await machine.unregister(
        CleanupMode.DetachAllReturnHardDisksOnly
      );
      error = null;
      break;
    } catch (e: any) {
      error = e;
      // retry to unregister the machine only if the failure is due to the machine being locked
      if (e.code !== VBOX_E_INVALID_OBJECT_STATE) {
        break;
      }
      await wait(500);
    }
  }
  if (error) {
    throw error;
  }
  const unregisterProgress = await machine.deleteConfig(media!);
  await unregisterProgress.waitForCompletion(-1);
}
