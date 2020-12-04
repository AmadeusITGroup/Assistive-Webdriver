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

import { warn, info } from "winston";
import { keyProperties, skipKeys } from "../keyProperties";
import { TesterSession } from "../testerSession";
import { keysMap, isShiftedKey, wait } from "vm-providers";

export const checkFocus = async (testerSession: TesterSession) => {
  const result = await testerSession.driver.executeScript(function () {
    return (
      document.hasFocus() && (document.activeElement || {}).id === "testDiv"
    );
  });
  if (!result) {
    throw new Error("The focus left the element that should have it!");
  }
};

export const testKey = async (
  testerSession: TesterSession,
  keyName: string,
  keyChar: string
) => {
  const extraKeyDowns: any[] = [];
  const props = keyProperties(keyName, keyChar);
  const filterOutExtraKeydown = (event: any) => {
    const isExtraKeyDown = event.type === "keydown" && event.key === props.key;
    if (isExtraKeyDown) {
      extraKeyDowns.push(event);
    }
    return !isExtraKeyDown;
  };
  await checkFocus(testerSession);
  await testerSession.waitAndCheckEvent(keyName, "keydown", props, () =>
    testerSession.driver.actions().keyDown(keyChar).perform()
  );
  await wait(5);
  await checkFocus(testerSession);
  const earlyKeyup = (
    await testerSession.assertQueueEmpty(filterOutExtraKeydown)
  ).find(item => item.type === "keyup" && item.key === props.key);
  if (earlyKeyup) {
    warn(
      `keyup for ${keyName} received before key was released (${JSON.stringify(
        earlyKeyup
      )})`
    );
    // just send the keyup, but it is useless to wait for the corresponding keyup event in this case
    // as there was one already
    await testerSession.driver.actions().keyUp(keyChar).perform();
    return;
  }
  await testerSession.waitAndCheckEvent(
    keyName,
    "keyup",
    props,
    () => testerSession.driver.actions().keyUp(keyChar).perform(),
    filterOutExtraKeydown
  );
  if (extraKeyDowns.length > 0) {
    warn(
      `received extra keydown event(s) for ${keyName} before the key was released (${JSON.stringify(
        extraKeyDowns
      )})`
    );
  }
};

export const testAllKeys = async (
  testerSession: TesterSession,
  userSkipKeys: string[] = []
) => {
  info(`Testing key events`);
  const userSkipKeysMap = new Set(userSkipKeys);
  for (const key of keysMap.entries()) {
    const keyName = key[1];
    const keyChar = key[0];
    const skipKey = isShiftedKey(keyChar) || skipKeys.has(keyName);
    if (!skipKey) {
      if (userSkipKeysMap.has(keyName)) {
        warn(`Skipping test for ${keyName}`);
      } else {
        await testKey(testerSession, keyName, keyChar);
      }
    }
  }
};
