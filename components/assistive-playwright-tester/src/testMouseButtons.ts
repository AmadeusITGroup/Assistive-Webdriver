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

import { info } from "winston";
import { TesterSession } from "./testerSession";

type Button = "left" | "middle" | "right";
const buttonValues: Button[] = [
  "left" /* = 0 */,
  "middle" /* = 1 */,
  "right" /* = 2 */
];

export async function testMouseButton(
  testerSession: TesterSession,
  button: Button,
  x: number,
  y: number
) {
  const testName = `button ${button} at position ${x}, ${y}`;
  await testerSession.mouse!.move(x, y);
  const props = {
    button: buttonValues.indexOf(button),
    pageX: x,
    pageY: y
  };
  await testerSession.waitAndCheckEvent(testName, "mousedown", props, () =>
    testerSession.mouse!.down({ button })
  );
  await testerSession.waitAndCheckEvent(testName, "mouseup", props, () =>
    testerSession.mouse!.up({ button })
  );
}

export async function testMouseButtons(testerSession: TesterSession) {
  info(`Testing mouse buttons`);
  const viewportSize: {
    width: number;
    height: number;
  } = await testerSession.page!.evaluate(function () {
    return {
      width: document.body.clientWidth,
      height: document.body.clientHeight
    };
  });
  for (const button of buttonValues) {
    const x = Math.floor(Math.random() * viewportSize.width);
    const y = Math.floor(Math.random() * viewportSize.height);
    await testMouseButton(testerSession, button, x, y);
  }
}
