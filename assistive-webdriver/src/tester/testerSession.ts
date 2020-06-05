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

import { Queue } from "./queue";
import { WebDriver } from "selenium-webdriver";
import { Stats } from "./stats";
import { debug, info, error } from "winston";
import { crossBrowserKeys } from "./keyProperties";
import { createEventsServer } from "./eventsServer";
import { wait } from "../server/wait";

export class TesterSession {
  screenReader = false;
  errorsNumber = 0;
  measures = new Map<string, Stats>();
  eventsQueue = new Queue<any>();
  eventsServer = createEventsServer(event => {
    debug("Received input event", event);
    this.normalizeEvent(event);
    this.eventsQueue.addValue(event);
  });

  constructor(public driver: WebDriver) {}

  async measureTime(name: string, fn: () => Promise<void>) {
    const initTime = Date.now();
    await fn();
    const endTime = Date.now();
    const duration = endTime - initTime;
    if (duration > 0) {
      let measure = this.measures.get(name);
      if (!measure) {
        measure = new Stats();
        this.measures.set(name, measure);
      }
      measure.push(duration);
    }
  }

  reportMeasures() {
    this.measures.forEach((measure, key) =>
      info(`Measures for ${key}`, measure.report())
    );
  }

  async waitAndCheckEvent(
    testName: string,
    type: string,
    props: any,
    action: () => Promise<void>,
    filterEvents: (event: any) => boolean = () => true
  ) {
    await this.assertQueueEmpty(filterEvents);
    debug(`Testing ${type} event for ${testName}`);
    let actionResult;
    let event: any;
    props = { ...props, type };
    const propsKeys = Object.keys(props);
    try {
      await this.measureTime(type, async () => {
        actionResult = action();
        let maxEvents = 5;
        let foundCorrectEvent = false;
        while (!foundCorrectEvent) {
          event = await this.eventsQueue.waitForValue();
          if (!filterEvents(event)) {
            continue;
          }
          maxEvents--;
          const invalidKeys = [];
          for (const key of propsKeys) {
            if (event[key] !== props[key]) {
              invalidKeys.push(key);
            }
          }
          foundCorrectEvent = invalidKeys.length === 0;
          if (!foundCorrectEvent) {
            this.reportError(
              `Unexpected value for ${invalidKeys.join(
                ", "
              )} on event: expected ${JSON.stringify(
                props
              )} but got ${JSON.stringify(event)}`
            );
            if (maxEvents <= 0) {
              throw new Error("Too many incorrect events!");
            }
          }
        }
      });
      await actionResult;
    } catch (error) {
      this.reportError(
        `Error while testing ${type} event for ${testName}: ${error}`
      );
    }
    return event;
  }

  async assertQueueEmpty(filterEvents: (event: any) => boolean = () => true) {
    await wait(0);
    const unexpectedEvents = this.eventsQueue.getAllWaitingValues();
    if (unexpectedEvents.filter(filterEvents).length > 0) {
      this.reportError(
        `Expected no event at this time, but received: ${JSON.stringify(
          unexpectedEvents
        )}`
      );
    }
    return unexpectedEvents;
  }

  normalizeEvent(event: any) {
    if (event.key) {
      event.key = crossBrowserKeys.get(event.key) || event.key;
    }
  }

  reportError(message: string) {
    this.errorsNumber++;
    error(message);
  }
}
