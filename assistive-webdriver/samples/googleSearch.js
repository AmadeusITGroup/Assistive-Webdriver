/* eslint @typescript-eslint/no-var-requires: 0 */
const fs = require("fs");
const { Builder, By, Key, Browser, until } = require("selenium-webdriver");

(async function () {
  const driver = await new Builder()
    .forBrowser(Browser.CHROME)
    .usingServer("http://localhost:3000/")
    .build();
  try {
    await driver.get("https://www.google.com");
    const input = await driver.wait(
      until.elementLocated(By.css("input[type=text]"))
    );
    await driver
      .actions()
      .click(input)
      .pause(1000)
      .sendKeys("webdriver", Key.ENTER)
      .perform();
    await driver.wait(until.titleContains("webdriver"), 5000);
    await driver.wait(until.elementLocated(By.linkText("2")));
    const screenshot = await driver.takeScreenshot();
    fs.writeFileSync("screenshot.png", Buffer.from(screenshot, "base64"));
    console.log(
      "Successfully saved screenshot of webdriver Google search in screenshot.png."
    );
  } catch (error) {
    console.error(error);
    throw error;
  } finally {
    await driver.quit();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
