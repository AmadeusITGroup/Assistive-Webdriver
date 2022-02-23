import { test } from "assistive-playwright-test";

test("should open simple page", async ({
  page,
  screenReader,
  vmKeyboard,
  vmMouse
}) => {
  await page.goto("/");
  await vmMouse.click(0, 0, {
    origin: await page.locator("input").first().elementHandle()
  });
  await screenReader.waitForMessage("First name");
  await vmKeyboard.press("Tab");
  await screenReader.waitForMessage("Last name");
});
