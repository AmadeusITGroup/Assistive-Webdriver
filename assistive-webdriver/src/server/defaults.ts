import { NativeEventsConfig } from "./config";
import schema from "../../config-schema.json";

const properties = schema.additionalProperties.properties;
const nativeEventsProperties = properties.nativeEventsConfig.properties;

export const DEFAULT_NATIVE_EVENTS_CONFIG: NativeEventsConfig = {
  pointerDownTime: nativeEventsProperties.pointerDownTime.default,
  pointerUpTime: nativeEventsProperties.pointerUpTime.default,
  pointerMoveTime: nativeEventsProperties.pointerMoveTime.default,
  keyDownTime: nativeEventsProperties.keyDownTime.default,
  keyUpTime: nativeEventsProperties.keyUpTime.default
};

export const DEFAULT_VM_PORT_WEBDRIVER = properties.vmPortWebDriver.default;
export const DEFAULT_WEBDRIVER_PATH = properties.vmHttpWebDriverPath.default;
export const DEFAULT_VM_PORT_SCREENREADER =
  properties.vmPortScreenReader.default;
export const DEFAULT_SCREENREADER_PATH =
  properties.vmHttpScreenReaderPath.default;
