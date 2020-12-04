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

/**
 * Map of all messages that can be logged from this package.
 * The key in the map is in the format: `category`.`message`,
 * with `category` and `message` the properties from the log entry object
 * passed to the {@link LogFunction}.
 * The value in the map is the log message in English.
 * @public
 */
export const logMessages: { [key: string]: string } = {
  "qemu.connected": "Connected to QEMU!",
  "qemu.execute": "Starting QEMU",
  "qemu.exit": "QEMU exited",
  "qemu.receive": "Received from QEMU",
  "qemu.running": "The QEMU virtual machine is now running",
  "qemu.send": "Sending command to QEMU",
  "qemu.stderr": "Error output from QEMU",
  "vbox.keepalive": "Sending keep-alive request"
};
