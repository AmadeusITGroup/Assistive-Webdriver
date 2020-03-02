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

import { PortRedirection, VMFactory } from "../vmInterface";
import { QEMUVM } from "./qemu";
import { getPortPromise } from "../../portFinder";

export interface QEMUSettings {
  commandLine: string[];
}

async function buildRedirections(ports: number[]) {
  const hostAddress = "127.0.0.1";
  const hostPorts = await Promise.all(
    ports.map(() => getPortPromise({ host: hostAddress }))
  );
  const tcpRedirections: PortRedirection[] = ports.map((vmPort, index) => {
    const hostPort = hostPorts[index];
    return {
      hostAddress,
      hostPort,
      vmPort
    };
  });
  return {
    tcpRedirections,
    hostfwd: tcpRedirections
      .map(
        ({ hostAddress, hostPort, vmPort }) =>
          `hostfwd=tcp:${hostAddress}:${hostPort}-:${vmPort}`
      )
      .join(",")
  };
}

function insertRedirections(commandLine: string[], hostfwd: string) {
  let inserted = false;
  let inRightArg = false;
  const res = commandLine.map(line => {
    if (inRightArg && !inserted) {
      line += `,${hostfwd}`;
      inserted = true;
    }
    inRightArg = line === "-netdev" || line === "-nic";
    return line;
  });
  if (!inserted) {
    res.push(`-nic user,${hostfwd}`);
  }
  return res;
}

export const QEMUVMFactory: VMFactory<QEMUSettings> = async ({
  log,
  redirectTCPPorts,
  vmSettings: { commandLine }
}) => {
  const { tcpRedirections, hostfwd } = await buildRedirections(
    redirectTCPPorts
  );
  if (tcpRedirections.length > 0) {
    commandLine = insertRedirections(commandLine, hostfwd);
  }
  const qemu = await QEMUVM.create(commandLine, log);
  qemu.tcpRedirections = tcpRedirections;
  return qemu;
};
