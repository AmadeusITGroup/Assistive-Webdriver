const { readFileSync, writeFileSync } = require("fs");
const { join } = require("path");
const tag = process.argv[2];
const match = /^refs\/tags\/text-to-socket-engine\/(\d+)\.(\d+)\.(\d+)$/.exec(
  tag
);
if (!match) {
  console.log("Skipping setVersion, as this is not a version tag!");
  process.exit(0);
}
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
