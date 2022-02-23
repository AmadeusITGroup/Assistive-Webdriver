const { join } = require("path");
const { readFileSync, writeFileSync } = require("fs");

const filePath = join(__dirname, "build", "assistive-playwright-test.api.json");
const fileContent = readFileSync(filePath, "utf8");
// This is needed because of https://github.com/microsoft/rushstack/issues/2895
writeFileSync(filePath, fileContent.replace(/_2/g, ""));
