#!/usr/bin/env node

const { createReadStream } = require("fs");
const { createHash } = require("crypto");

const file = process.argv[2];
const expectedChecksum = process.argv[3];

const hash = createHash("sha512");
createReadStream(file)
  .pipe(hash)
  .on("end", () => {
    const actualChecksum = hash.digest("hex");
    if (actualChecksum === expectedChecksum) {
      process.exit(0);
    } else {
      process.exit(1);
    }
  })
  .resume();
