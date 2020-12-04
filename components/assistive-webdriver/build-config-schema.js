require("fs").writeFileSync(
  require("path").join(__dirname, "config-schema.json"),
  JSON.stringify({
    $schema: "http://json-schema.org/draft-07/schema",
    type: "object",
    additionalProperties: {
      title: "VirtualMachineConfig",
      required: ["vmSettings"],
      properties: {
        nativeEvents: {
          type: "boolean",
          default: true,
          description:
            "Whether to enable native events. When this is true, the tool does not forward events to the selenium server running in the virtual machine, and instead uses the API of the virtual machine to send the events so that they appear as native in the virtual machine (coming from the virtual hardware)."
        },
        screenReader: {
          type: "boolean",
          default: false,
          description:
            "Whether to connect to the tcp-web-listener server in the virtual machine, that reports what the screen reader says. If this is false, the screen-reader-related API (such as webdriver.wait(forScreenReaderToSay(...))) will not be available."
        },
        vmPortWebDriver: {
          type: "number",
          default: 4444,
          description:
            "TCP port, inside the virtual machine, on which the standard standalone Selenium server is listening for connections."
        },
        vmHttpWebDriverPath: {
          type: "string",
          default: "/wd/hub",
          description:
            "HTTP path to the webdriver API on the standard standalone Selenium server (running in the virtual machine on the port configured by the vmPortWebDriver setting)."
        },
        vmPortScreenReader: {
          type: "number",
          default: 7779,
          description:
            "TCP port, inside the virtual machine, on which the tcp-web-listener server in the virtual machine is listening for connections."
        },
        vmHttpScreenReaderPath: {
          type: "string",
          default: "/live/websocket",
          description:
            "HTTP path to the websocket sending text from the screen reader on the tcp-web-listener server (running in the virtual machine on the port configured by the vmPortScreenReader setting)."
        },
        failedCalibrationsFolder: {
          type: "string",
          description:
            "Folder in which the screenshot of failed calibrations will be stored. Defaults to the value set on the command line when starting assistive-webdriver."
        },
        nativeEventsConfig: {
          title: "NativeEventsConfig",
          type: "object",
          description:
            "Object defining the minimum delay to wait when executing native events.",
          properties: {
            pointerDownTime: { type: "number", default: 5 },
            pointerUpTime: { type: "number", default: 5 },
            pointerMoveTime: { type: "number", default: 5 },
            keyDownTime: { type: "number", default: 20 },
            keyUpTime: { type: "number", default: 100 }
          },
          additionalProperties: false
        },
        vmSettings: require("vm-providers/config-schema.json")
      },
      additionalProperties: false
    }
  })
);
