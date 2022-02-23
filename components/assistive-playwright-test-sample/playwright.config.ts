import {
  AssistivePlaywrightTestConfig,
  VMSettings
} from "assistive-playwright-test";
import os from "os";
import path from "path";

function findPublicIP() {
  const interfaces = os.networkInterfaces();
  const interfaceNames = Object.keys(interfaces);
  const ips: os.NetworkInterfaceInfo[] = [];
  interfaceNames.forEach(interfaceName => {
    ips.push(
      ...interfaces[interfaceName]!.filter(
        address => !address.internal && address.family === "IPv4"
      )
    );
  });
  return ips.length > 0 ? ips[0].address : undefined;
}

let vmSettings: VMSettings = {
  type: "virtualbox",
  vm: "win10-chromium-nvda",
  snapshot: "nvda"
};
if (process.env.VM_SETTINGS) {
  vmSettings = JSON.parse(process.env.VM_SETTINGS);
}
const baseURL = `http://${findPublicIP()}:8080/`;

console.error("VM settings: ", vmSettings);
console.error("Base URL: ", baseURL);

const config: AssistivePlaywrightTestConfig = {
  reporter: [
    [process.env.CI ? "github" : "list"],
    ["html", { outputFolder: path.join(__dirname, "test-reports", "report") }]
  ],
  testDir: "test",
  outputDir: path.join(__dirname, "test-reports", "trace"),
  timeout: 300000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 5 : 0,
  webServer: {
    command: "npm start",
    cwd: __dirname,
    url: baseURL,
    reuseExistingServer: !process.env.CI
  },
  use: {
    baseURL,
    vmSettings,
    trace: "on",
    viewport: null,
    launchOptions: {
      args: ["--start-maximized"]
    }
  }
};

export default config;
