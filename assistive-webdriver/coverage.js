/*
 * Copyright 2019 Amadeus s.a.s.
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
 * associated documentation files (the "Software"), to deal in the Software without restriction,
 * including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial
 * portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
 * LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
 * IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

const fs = require("fs");
const { join } = require("path");
const { transform } = require("@babel/core");

const instrumentTsCode = (code, filename) => {
  code = transform(code, {
    filename,
    plugins: ["@babel/plugin-syntax-typescript", "babel-plugin-istanbul"]
  }).code;
  code = code.replace(/function (cov_\w+)\(\)/, "var $1 = function()");
  return code;
};

const foldersToInstrument = [
  join(__dirname, "src/client/"),
  join(__dirname, "src/server/")
];
const isInFolderToInstrument = file =>
  foldersToInstrument.some(folder => file.startsWith(folder));

// override readFileSync to provide instrumented files:
const trueReadFileSync = fs.readFileSync;
fs.readFileSync = (...args) => {
  let code = trueReadFileSync(...args);
  const filename = args[0];
  if (isInFolderToInstrument(filename) && /\.ts$/.test(filename)) {
    const isBuffer = Buffer.isBuffer(code);
    if (isBuffer) {
      code = code.toString("utf8");
    }
    code = instrumentTsCode(code, filename);
    if (isBuffer) {
      code = Buffer.from(code, "utf8");
    }
  }
  return code;
};
