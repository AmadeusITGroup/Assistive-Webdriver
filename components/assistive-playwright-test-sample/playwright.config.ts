import {
  AssistivePlaywrightTestConfig,
  ReporterDescription,
  VMSettings
} from "assistive-playwright-test";
import os from "os";
import path from "path";
import vmConfig from "../../vagrant/win10-chromium-nvda/vm-config.json";

const baseURL = `http://${os.hostname()}:8080/`;

console.error("Base URL: ", baseURL);

const config: AssistivePlaywrightTestConfig = {
  reporter: [
    ...(process.env.CI ? [["github"] as ReporterDescription] : []),
    ["list"],
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
    trace: "on",
    viewport: null,
    launchOptions: {
      args: ["--start-maximized"]
    }
  },
  projects: [
    {
      name: "chromium-jaws",
      use: {
        browserName: "chromium",
        vmSettings: vmConfig.jaws.vmSettings as VMSettings
      }
    },
    {
      name: "firefox-jaws",
      use: {
        browserName: "firefox",
        vmSettings: vmConfig.jaws.vmSettings as VMSettings
      }
    },
    {
      name: "chromium-nvda",
      use: {
        browserName: "chromium",
        vmSettings: vmConfig.nvda.vmSettings as VMSettings
      }
    },
    {
      name: "firefox-nvda",
      use: {
        browserName: "firefox",
        vmSettings: vmConfig.nvda.vmSettings as VMSettings
      }
    }
  ]
};

export default config;
