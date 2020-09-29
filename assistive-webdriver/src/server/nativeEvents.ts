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

import { wait } from "./wait";
import { InvalidArgumentValueError } from "./publicError";
import { VM, ScreenPosition, SimplePosition } from "./vm/vmInterface";
import { LogFunction, createSubLogFunction } from "./logging";

export type PositionGetter = (origin: any) => Promise<ScreenPosition>;

export interface NativeEventsConfig {
  pointerDownTime: number;
  pointerUpTime: number;
  pointerMoveTime: number;
  keyDownTime: number;
  keyUpTime: number;
}

export const DEFAULT_NATIVE_EVENTS_CONFIG: NativeEventsConfig = {
  pointerDownTime: 5,
  pointerUpTime: 5,
  pointerMoveTime: 5,
  keyDownTime: 20,
  keyUpTime: 100
};

class NullInputSource {
  constructor(
    public vm: VM,
    public nativeEventsConfig: NativeEventsConfig,
    public mousePosition: SimplePosition,
    public getPosition: PositionGetter,
    public config: any,
    public log: LogFunction
  ) {}

  async execute_pause(action: any) {
    if (action.duration > 0) {
      await wait(action.duration);
    }
  }

  async execute(index: any) {
    const action = this.config.actions[index];
    if (action) {
      const handler = (this as any)[`execute_${action.type}`];
      if (!handler) {
        throw new InvalidArgumentValueError(`Invalid action type`, action.type);
      }
      this.log({ level: "debug", message: "execute", action });
      await handler.call(this, action);
      const time = (this.nativeEventsConfig as any)[`${action.type}Time`];
      if (time) {
        this.log({ level: "debug", message: "wait", time });
        await wait(time);
      }
    }
  }
}

class KeyboardInputSource extends NullInputSource {
  async execute_keyDown(action: any) {
    await this.vm.sendKeyDownEvent(action.value);
  }

  async execute_keyUp(action: any) {
    await this.vm.sendKeyUpEvent(action.value);
  }
}

const STEP_DELAY = 50;

class PointerInputSource extends NullInputSource {
  async execute_pointerMove(action: any) {
    const originPosition = await this.getPosition(action.origin);
    const duration = action.duration || 0;
    const mousePosition = this.mousePosition;
    const from = {
      x: mousePosition.x,
      y: mousePosition.y
    };
    const to: ScreenPosition = {
      ...originPosition,
      x: Math.round(originPosition.x + action.x),
      y: Math.round(originPosition.y + action.y)
    };
    const endTime = Date.now() + duration;
    let remainingTime = duration;
    while (remainingTime > 0) {
      const howCloseToEnd = remainingTime / duration;
      mousePosition.x = Math.round(
        howCloseToEnd * from.x + (1 - howCloseToEnd) * to.x
      );
      mousePosition.y = Math.round(
        howCloseToEnd * from.y + (1 - howCloseToEnd) * to.y
      );
      await this.vm.sendMouseMoveEvent({
        ...to,
        ...mousePosition
      });
      remainingTime = endTime - Date.now();
      if (remainingTime <= STEP_DELAY) {
        await wait(remainingTime);
        break;
      } else {
        await wait(STEP_DELAY);
        remainingTime = endTime - Date.now();
      }
    }
    mousePosition.x = to.x;
    mousePosition.y = to.y;
    await this.vm.sendMouseMoveEvent(to);
  }

  async execute_pointerDown(action: any) {
    await this.vm.sendMouseDownEvent(action.button);
  }

  async execute_pointerUp(action: any) {
    await this.vm.sendMouseUpEvent(action.button);
  }
}

const inputSources: { [type: string]: typeof NullInputSource } = {
  none: NullInputSource,
  key: KeyboardInputSource,
  pointer: PointerInputSource
};

export async function executeNativeEvents(
  vm: VM,
  nativeEventsConfig: NativeEventsConfig,
  mousePosition: SimplePosition,
  positionGetter: PositionGetter,
  body: any,
  log: LogFunction
) {
  log = createSubLogFunction(log, { category: "nativeEvents" });
  const actions = body.actions;
  const sources: NullInputSource[] = [];
  let actionsLength = -1;
  for (const action of actions) {
    const inputSourceType = action.type;
    const SourceConstructor = inputSources[inputSourceType];
    if (!SourceConstructor) {
      throw new InvalidArgumentValueError(
        `Unknown input source type`,
        inputSourceType
      );
    }
    sources.push(
      new SourceConstructor(
        vm,
        nativeEventsConfig,
        mousePosition,
        positionGetter,
        action,
        log
      )
    );
    const length = action.actions.length;
    if (length > actionsLength) {
      actionsLength = length;
    }
  }
  for (let i = 0; i < actionsLength; i++) {
    const currentTick: Promise<void>[] = [];
    for (const source of sources) {
      currentTick.push(source.execute(i));
    }
    await Promise.all(currentTick);
  }
}
