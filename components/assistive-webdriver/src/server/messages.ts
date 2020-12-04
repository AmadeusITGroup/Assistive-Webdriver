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

export const MESSAGES: { [key: string]: string } = {
  "calibration.displayed": "Displaying the calibration rectangle",
  "calibration.success": "The calibration succeeded",
  "main.listen": "The http server is listening",
  "main.stop.begin": "Stopping the server and deleting any session...",
  "main.stop.end": "The server is now stopped.",
  "nativeEvents.execute": "Executing native action",
  "nativeEvents.wait": "Waiting after the native action was executed",
  "proxy.request.begin": "Received request",
  "proxy.request.end": "Request ended",
  "proxy.request.error": "Request failed",
  "proxy.request.execute": "Now executing the request",
  "proxy.session.create": "Creating session",
  "proxy.session.delete": "Deleting session",
  "proxy.timeout.check": "Checking sessions timeout",
  "proxy.timeout.nextcheck": "Planning next sessions timeout check",
  "proxy.upstream.begin": "Transmitting the request upstream",
  "proxy.upstream.end": "The upstream request finished",
  "qemu.connected": "Connected to QEMU!",
  "qemu.execute": "Starting QEMU",
  "qemu.exit": "QEMU exited",
  "qemu.receive": "Received from QEMU",
  "qemu.running": "The QEMU virtual machine is now running",
  "qemu.send": "Sending command to QEMU",
  "qemu.stderr": "Error output from QEMU",
  "request.begin": "Sending request",
  "request.error": "Error in the request",
  "request.success": "The request finished",
  "screenReader.error": "Error in the connection to the screen reader",
  "screenReader.receive": "Received message from screen reader",
  "vbox.keepalive": "Sending keep-alive request"
};
