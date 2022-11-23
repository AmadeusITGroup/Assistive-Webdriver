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

import lolex from "@sinonjs/fake-timers";
import { useServer } from "./helpers/server";
import { json as jsonBody } from "co-body";
import { Builder, Browser, Origin, Button } from "selenium-webdriver";
import http from "http";
import { useVMMock, createVMMock } from "./helpers/vmMock";
import { InvalidArgumentError } from "../src/server/publicError";
import { useSeleniumMock } from "./helpers/seleniumMock";
import { useScreenReaderMock } from "./helpers/screenReaderMock";
import {
  addScreenReaderTextListener,
  forScreenReaderToSay,
  clearCachedScreenReaderText,
  refreshScreenReaderText
} from "../src/client";
import { DEFAULT_VM_PORT_WEBDRIVER } from "../src/server/defaults";
import { handleCalibration } from "./helpers/handleCalibration";
import { wait } from "vm-providers";
import { DEFAULT_SESSION_TIMEOUT } from "../src/server/webdriverProxy";

describe("server", () => {
  const { getUrl, getVMConfigs } = useServer();
  const { getVMFactoryMock } = useVMMock();
  const { getSeleniumTCPRedirection, seleniumAnswerRequest } =
    useSeleniumMock();
  const {
    getScreenReaderTCPRedirection,
    sendScreenReaderMessage,
    getScreenReaderClients
  } = useScreenReaderMock();

  it("should raise an error when there is no matching VM configuration", async () => {
    const webdriver = new Builder()
      .usingServer(getUrl())
      .forBrowser(Browser.CHROME)
      .build();
    await expect(webdriver).rejects.toThrow("awd:vm-config");
  });

  it("should raise an error when the configuration does not specify the VM type", async () => {
    getVMConfigs().default = {};
    const webdriver = new Builder()
      .usingServer(getUrl())
      .forBrowser(Browser.CHROME)
      .build();
    await expect(webdriver).rejects.toThrow("VM type");
  });

  it("should forward argument error raised while creating a vm", async () => {
    getVMConfigs().default = { vmSettings: { type: "mock" } as any };
    const mockVM = getVMFactoryMock();
    const webdriver = new Builder()
      .usingServer(getUrl())
      .forBrowser(Browser.CHROME)
      .build();
    const call = await mockVM.waitForCall();
    call.result.value.mockReject(new InvalidArgumentError("MyProblemError"));
    expect(mockVM.mock.calls).toHaveLength(1);
    await expect(webdriver).rejects.toThrow("MyProblemError");
  });

  it("should destroy the vm when the client aborts the session creation request (case 1)", async () => {
    const requestFn = jest.spyOn(http, "request");
    getVMConfigs().default = {
      vmSettings: { type: "mock" } as any,
      nativeEvents: false,
      screenReader: false
    };
    const mockVM = getVMFactoryMock();
    const webdriver = new Builder()
      .usingServer(getUrl())
      .forBrowser(Browser.CHROME)
      .build();
    const vm = createVMMock([getSeleniumTCPRedirection()]);
    await mockVM.waitForCallAndReplyWith(async () => {
      expect(requestFn).toHaveBeenCalledTimes(1);
      const clientRequest = requestFn.mock.results[0].value;
      clientRequest.socket.destroy(new Error("Aborting request on purpose"));
      await expect(webdriver).rejects.toThrowError(
        "Aborting request on purpose"
      );
      await wait(10);
      return vm;
    });
    await vm.destroy.waitForCallAndReplyWith(async () => {});
    requestFn.mockRestore();
  });

  it("should destroy the vm when the client aborts the session creation request (case 2)", async () => {
    const requestFn = jest.spyOn(http, "request");
    getVMConfigs().default = {
      vmSettings: { type: "mock" } as any,
      nativeEvents: false,
      screenReader: false
    };
    const mockVM = getVMFactoryMock();
    const webdriver = new Builder()
      .usingServer(getUrl())
      .forBrowser(Browser.CHROME)
      .build();
    const vm = createVMMock([getSeleniumTCPRedirection()]);
    await mockVM.waitForCallAndReplyWith(async () => vm);
    await seleniumAnswerRequest("POST", "/wd/hub/session", async ctx => {
      expect(requestFn).toHaveBeenCalledTimes(2);
      const clientRequest = requestFn.mock.results[0].value;
      clientRequest.socket.destroy(new Error("Aborting request on purpose"));
      await expect(webdriver).rejects.toThrowError(
        "Aborting request on purpose"
      );
      await wait(10);
      return {
        value: {
          sessionId: "ffffffff-bbbb-cccc-dddd-eeeeeeeeeeee",
          capabilities: {
            browserName: "chrome"
          }
        }
      };
    });
    await vm.destroy.waitForCallAndReplyWith(async () => {});
    requestFn.mockRestore();
  });

  it("should destroy the vm when the client aborts the session creation request (case 3)", async () => {
    const requestFn = jest.spyOn(http, "request");
    getVMConfigs().default = {
      vmSettings: { type: "mock" } as any,
      nativeEvents: true,
      screenReader: false
    };
    const mockVM = getVMFactoryMock();
    const webdriver = new Builder()
      .usingServer(getUrl())
      .forBrowser(Browser.CHROME)
      .build();
    const vm = createVMMock([getSeleniumTCPRedirection()]);
    await mockVM.waitForCallAndReplyWith(async () => vm);
    const sessionId = "aaaaaaaa-bbbb-bbbb-dddd-eeeeeeeeeeee";
    await seleniumAnswerRequest("POST", "/wd/hub/session", async ctx => ({
      value: {
        sessionId,
        capabilities: {
          browserName: "chrome"
        }
      }
    }));
    await Promise.all([
      handleCalibration(
        `/wd/hub/session/${sessionId}`,
        seleniumAnswerRequest,
        vm
      ),
      (async () => {
        await wait(10);
        expect(requestFn).toHaveBeenCalled();
        const clientRequest = requestFn.mock.results[0].value;
        clientRequest.socket.destroy(new Error("Aborting request on purpose"));
        await expect(webdriver).rejects.toThrowError(
          "Aborting request on purpose"
        );
      })()
    ]);

    await vm.destroy.waitForCallAndReplyWith(async () => {});
    requestFn.mockRestore();
  });

  it("should automatically destroy a session after the timeout", async () => {
    const clock = lolex.install({ now: Date.now(), shouldAdvanceTime: true });
    getVMConfigs().default = {
      nativeEvents: false,
      vmSettings: { type: "mock" } as any
    };
    const mockVM = getVMFactoryMock();
    const webdriver = new Builder()
      .usingServer(getUrl())
      .forBrowser(Browser.CHROME)
      .build();
    const vm = createVMMock([getSeleniumTCPRedirection()]);
    await mockVM.waitForCallAndReplyWith(async () => vm);
    const sessionId = "aaaaaaaa-bbbb-cccc-aaaa-eeeeeeeeeeee";
    await seleniumAnswerRequest("POST", "/wd/hub/session", async () => ({
      value: {
        sessionId,
        capabilities: {
          browserName: "chrome"
        }
      }
    }));
    await webdriver;
    const destroyCall = vm.destroy.waitForCallAndReplyWith(async () => {});
    await clock.tickAsync(DEFAULT_SESSION_TIMEOUT + 1);
    await destroyCall;
    await expect(webdriver.getTitle()).rejects.toThrowError(
      "No active session with ID"
    );
    clock.uninstall();
  });

  it("should create and destroy a basic session correctly", async () => {
    const vmPortWebDriver = 4441;
    getVMConfigs().myConfig = {
      vmPortWebDriver,
      nativeEvents: false,
      screenReader: false,
      vmSettings: { type: "mock", extraParam: "abcdef" } as any
    };
    const mockVM = getVMFactoryMock();
    const webdriver = new Builder()
      .usingServer(getUrl())
      .withCapabilities({
        "xxx:something": "fghijk",
        "awd:vm-config": "myConfig"
      })
      .forBrowser(Browser.CHROME)
      .build();
    const vm = createVMMock([getSeleniumTCPRedirection(vmPortWebDriver)]);
    await mockVM.waitForCallAndReplyWith(async createVMParam => {
      expect(createVMParam.vmSettings).toEqual({ extraParam: "abcdef" });
      expect(createVMParam.redirectTCPPorts).toEqual([vmPortWebDriver]);
      return vm;
    });
    const sessionId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    await seleniumAnswerRequest("POST", "/wd/hub/session", async ctx => {
      const requestBody = await jsonBody(ctx.req);
      expect(requestBody).toEqual({
        capabilities: {
          alwaysMatch: { browserName: "chrome", "xxx:something": "fghijk" },
          firstMatch: [{}]
        }
      });
      return {
        value: {
          sessionId,
          capabilities: {
            browserName: "chrome",
            "xxx:something": "fghijk",
            "xxx:other": "lmnop"
          }
        }
      };
    });
    const capabilities = await webdriver.getCapabilities();
    expect(capabilities.get("xxx:something")).toEqual("fghijk");
    expect(capabilities.get("xxx:other")).toEqual("lmnop");
    const titlePromise = webdriver.getTitle();
    await seleniumAnswerRequest("GET", `/wd/hub/session/${sessionId}/title`, {
      value: "thisTitle"
    });
    await expect(titlePromise).resolves.toEqual("thisTitle");
    const quitPromise = webdriver.quit();
    await seleniumAnswerRequest("DELETE", `/wd/hub/session/${sessionId}`, {
      value: null
    });
    await vm.destroy.waitForCallAndReplyWith(async () => {});
    await quitPromise;
  });

  it("should create and destroy a session with screen reader correctly", async () => {
    const vmPortScreenReader = 7890;
    const vmHttpScreenReaderPath = "/messages/myScreenReaderPath";
    getVMConfigs().default = {
      nativeEvents: false,
      vmPortScreenReader,
      vmHttpScreenReaderPath,
      screenReader: true,
      vmSettings: { type: "mock" } as any
    };
    const mockVM = getVMFactoryMock();
    const webdriver = new Builder()
      .usingServer(getUrl())
      .forBrowser(Browser.CHROME)
      .build();
    const vm = createVMMock([
      getSeleniumTCPRedirection(),
      getScreenReaderTCPRedirection(vmPortScreenReader)
    ]);
    await mockVM.waitForCallAndReplyWith(async createVMParam => {
      expect(createVMParam.redirectTCPPorts).toHaveLength(2);
      expect(createVMParam.redirectTCPPorts).toContain(
        DEFAULT_VM_PORT_WEBDRIVER
      );
      expect(createVMParam.redirectTCPPorts).toContain(vmPortScreenReader);
      return vm;
    });
    const sessionId = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeef";
    await seleniumAnswerRequest("POST", "/wd/hub/session", async ctx => {
      const requestBody = await jsonBody(ctx.req);
      expect(requestBody).toEqual({
        capabilities: {
          alwaysMatch: { browserName: "chrome" },
          firstMatch: [{}]
        }
      });
      return {
        value: {
          sessionId,
          capabilities: {
            browserName: "chrome"
          }
        }
      };
    });
    await webdriver;
    expect(getScreenReaderClients()).toEqual([vmHttpScreenReaderPath]);
    const waitForSomething = webdriver.wait(forScreenReaderToSay("something"));
    const srListener = jest.fn().mockName("screen reader listener");
    const removeListener = addScreenReaderTextListener(webdriver, srListener);
    sendScreenReaderMessage("something");
    await waitForSomething;
    expect(srListener).toHaveBeenCalledWith("something");
    sendScreenReaderMessage("first message");
    sendScreenReaderMessage("second message");
    await webdriver.wait(forScreenReaderToSay("second message", false));
    await webdriver.wait(forScreenReaderToSay("first message"));
    await clearCachedScreenReaderText(webdriver);
    await expect(
      webdriver.wait(forScreenReaderToSay("second message"), 1000)
    ).rejects.toThrowError("Wait timed out");
    sendScreenReaderMessage("third message");
    sendScreenReaderMessage("fourth message");
    expect(srListener).not.toHaveBeenCalledWith("third message");
    await refreshScreenReaderText(webdriver);
    expect(srListener).toHaveBeenCalledWith("third message");
    expect(srListener).toHaveBeenCalledWith("fourth message");
    removeListener();
    sendScreenReaderMessage("fifth message");
    await webdriver.wait(forScreenReaderToSay("fifth message"));
    expect(srListener).not.toHaveBeenCalledWith("fifth message");
    const quitPromise = webdriver.quit();
    await seleniumAnswerRequest("DELETE", `/wd/hub/session/${sessionId}`, {
      value: null
    });
    await vm.destroy.waitForCallAndReplyWith(async () => {});
    await quitPromise;
    await webdriver.wait(() => getScreenReaderClients().length === 0, 1000);
    expect(getScreenReaderClients()).toEqual([]);
  });

  it("should create and destroy a session with native events correctly", async () => {
    getVMConfigs().default = {
      nativeEvents: true,
      screenReader: false,
      vmSettings: { type: "mock" } as any
    };
    const mockVM = getVMFactoryMock();
    const webdriver = new Builder()
      .usingServer(getUrl())
      .forBrowser(Browser.CHROME)
      .build();
    const vm = createVMMock([getSeleniumTCPRedirection()]);
    await mockVM.waitForCallAndReplyWith(async createVMParam => {
      expect(createVMParam.redirectTCPPorts).toEqual([
        DEFAULT_VM_PORT_WEBDRIVER
      ]);
      return vm;
    });
    const sessionId = "aaaaaaaa-bbbb-cccc-ffff-eeeeeeeeeeee";
    await seleniumAnswerRequest("POST", "/wd/hub/session", async ctx => {
      const requestBody = await jsonBody(ctx.req);
      expect(requestBody).toEqual({
        capabilities: {
          alwaysMatch: { browserName: "chrome" },
          firstMatch: [{}]
        }
      });
      return {
        value: {
          sessionId,
          capabilities: {
            browserName: "chrome"
          }
        }
      };
    });
    const screenWidth = 1280;
    const screenHeight = 1024;
    const screenX = 25;
    const screenY = 17;
    const calibrationX = 3;
    const calibrationY = 50;
    await handleCalibration(
      `/wd/hub/session/${sessionId}`,
      seleniumAnswerRequest,
      vm,
      {
        screenWidth,
        screenHeight,
        screenX,
        screenY,
        calibrationX,
        calibrationY
      }
    );
    const moveX = 17;
    const moveY = 42;
    const mouseMove = webdriver
      .actions()
      .move({
        duration: 0,
        origin: Origin.VIEWPORT,
        x: moveX,
        y: moveY
      })
      .perform();
    await seleniumAnswerRequest(
      "POST",
      `/wd/hub/session/${sessionId}/execute/sync`,
      {
        value: {
          x: screenX + calibrationX,
          y: screenY + calibrationY,
          screenWidth,
          screenHeight
        }
      }
    );
    await vm.sendMouseMoveEvent.waitForCallAndReplyWith(async position => {
      expect(position).toEqual({
        x: screenX + calibrationX + moveX,
        y: screenY + calibrationY + moveY,
        screenWidth,
        screenHeight
      });
    });
    await mouseMove;
    const moveXOffset = 38;
    const moveYOffset = -5;
    const mouseMove2 = webdriver
      .actions()
      .pause(10)
      .move({
        duration: 10,
        origin: Origin.POINTER,
        x: moveXOffset,
        y: moveYOffset
      })
      .perform();
    await vm.sendMouseMoveEvent.waitForCallAndReplyWith(async position => {
      expect(position).toEqual({
        x: screenX + calibrationX + moveX,
        y: screenY + calibrationY + moveY,
        screenWidth,
        screenHeight
      });
    });
    await vm.sendMouseMoveEvent.waitForCallAndReplyWith(async position => {
      expect(position).toEqual({
        x: screenX + calibrationX + moveX + moveXOffset,
        y: screenY + calibrationY + moveY + moveYOffset,
        screenWidth,
        screenHeight
      });
    });
    await mouseMove2;
    const keyDown = webdriver.actions().keyDown("a").perform();
    await vm.sendKeyDownEvent.waitForCallAndReplyWith(async key => {
      expect(key).toBe("a");
    });
    await keyDown;
    const keyUp = webdriver.actions().keyUp("a").perform();
    await vm.sendKeyUpEvent.waitForCallAndReplyWith(async key => {
      expect(key).toBe("a");
    });
    await keyUp;
    const mouseDown = webdriver.actions().press(Button.RIGHT).perform();
    await vm.sendMouseDownEvent.waitForCallAndReplyWith(async button => {
      expect(button).toEqual(Button.RIGHT);
    });
    await mouseDown;
    const mouseUp = webdriver.actions().release(Button.RIGHT).perform();
    await vm.sendMouseUpEvent.waitForCallAndReplyWith(async button => {
      expect(button).toEqual(Button.RIGHT);
    });
    await mouseUp;
    await webdriver;
    const quitPromise = webdriver.quit();
    await seleniumAnswerRequest("DELETE", `/wd/hub/session/${sessionId}`, {
      value: null
    });
    await vm.destroy.waitForCallAndReplyWith(async () => {});
    await quitPromise;
  });
});
