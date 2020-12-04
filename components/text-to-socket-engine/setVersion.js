const { readFileSync, writeFileSync } = require("fs");
const { join } = require("path");
const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(require("./package.json").version);
const version = `${match[1]},${match[2]},${match[3]},0`;
const resourceFilePath = join(__dirname, "resource.rc");
const originalFileContent = readFileSync(resourceFilePath, "utf8");
let changes = 0;
const modifiedFileContent = originalFileContent.replace(/0,0,0,0/g, () => {
  changes++;
  return version;
});
if (changes > 0) {
  writeFileSync(resourceFilePath, modifiedFileContent);
  console.log(
    `Successfully wrote resource.rc file with version ${version} (${changes} replacements)`
  );
  process.exit(0);
} else {
  console.log(`Failed to write version ${version} in resource.rc file!`);
  process.exit(1);
}
