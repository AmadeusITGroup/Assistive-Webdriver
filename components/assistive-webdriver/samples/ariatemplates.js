/* eslint @typescript-eslint/no-var-requires: 0 */
const fs = require("fs");
const { Builder, By, Key, Browser, until } = require("selenium-webdriver");
const {
  forScreenReaderToSay,
  addScreenReaderTextListener
} = require(".."); /* outside this repository, use: require("assistive-webdriver") */

(async function () {
  const driver = await new Builder()
    .withCapabilities({
      "awd:vm-config": "jaws"
    })
    .forBrowser(Browser.INTERNET_EXPLORER)
    .usingServer("http://localhost:3000/")
    .build();
  try {
    addScreenReaderTextListener(driver, message =>
      console.log(`Screen reader: ${message}`)
    );
    await driver
      .actions()
      .keyDown(Key.INSERT)
      .keyDown(Key.SPACE)
      .keyUp(Key.SPACE)
      .keyUp(Key.INSERT)
      .keyDown(Key.SHIFT)
      .keyDown("h")
      .keyUp("h")
      .keyUp(Key.SHIFT)
      .perform();

    await driver.wait(forScreenReaderToSay("Speech history cleared"), 2000);

    await driver.get(
      "http://snippets.ariatemplates.com/samples/github.com/ariatemplates/documentation-code/samples/widgets/datepicker/wai"
    );

    const inputs = await driver.wait(
      until.elementsLocated(By.css("input[type=text]"))
    );

    await driver.actions().click(inputs[1]).perform();

    await driver.wait(forScreenReaderToSay("Date of return"), 5000);

    await driver
      .actions()
      .keyDown(Key.SHIFT)
      .sendKeys(Key.TAB, Key.TAB)
      .keyUp(Key.SHIFT)
      .perform();

    await driver.wait(forScreenReaderToSay("Date of departure"), 5000);
    await driver.wait(
      forScreenReaderToSay(
        "Date format is Day slash  Month slash  Year, press down arrow to access the Calendar widget"
      ),
      5000
    );

    await driver.actions().sendKeys("22/4/2019").perform();

    await driver.wait(forScreenReaderToSay("Monday 22 April 2019"), 5000);

    await driver.actions().sendKeys(Key.TAB).perform();
    await driver.wait(forScreenReaderToSay("Display calendar"), 5000);

    await driver
      .actions()
      .keyDown(Key.SHIFT)
      .sendKeys(Key.TAB)
      .keyUp(Key.SHIFT)
      .sendKeys(Key.DOWN)
      .perform();

    await driver.wait(forScreenReaderToSay("Display calendar"), 5000);

    await driver.actions().sendKeys(Key.SPACE).perform();

    await driver.wait(
      forScreenReaderToSay(
        "Calendar table. Use arrow keys to navigate and space to validate."
      ),
      5000
    );

    await driver.actions().sendKeys(Key.ARROW_DOWN).perform();

    await driver.wait(forScreenReaderToSay("Monday 29 April 2019"), 5000);

    await driver.actions().sendKeys(Key.ENTER).perform();

    await driver.wait(forScreenReaderToSay("Date of departure", false), 5000);
    await driver.wait(forScreenReaderToSay("29 slash 4 slash 19"), 5000);
    await driver.wait(forScreenReaderToSay("Monday 29 April 2019"), 5000);

    const screenshot = await driver.takeScreenshot();
    fs.writeFileSync("screenshot.png", Buffer.from(screenshot, "base64"));
    console.log("Successfully saved screenshot in screenshot.png");
  } finally {
    await driver.quit();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
