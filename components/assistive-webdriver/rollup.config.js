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

require("../../tools/code-coverage/overrideReadFileSync");
const pkg = require("./package.json");
const dependencies = Object.keys(pkg.dependencies);
const externalDependencies = dependencies.concat([
  "path",
  "colors/safe",
  "fs",
  "stream",
  "util",
  "child_process",
  "stream-json/streamers/StreamValues",
  "selenium-webdriver",
  "selenium-webdriver/lib/command",
  "http",
  "readline",
  "os",
  "net",
  "url",
  "../../config-schema.json"
]);
const typescript = require("@rollup/plugin-typescript");
const plugins = [typescript({ module: "esnext", target: "es2017" })];

export default [
  {
    output: [
      {
        file: "./dist/client/index.js",
        format: "cjs"
      },
      {
        file: "./dist/client/index.mjs",
        format: "esm"
      }
    ],
    input: "./src/client/index.ts",
    external: externalDependencies,
    plugins
  },
  {
    output: [
      {
        file: "./dist/server/index.js",
        format: "cjs"
      },
      {
        file: "./dist/server/index.mjs",
        format: "esm"
      }
    ],
    input: "./src/server/index.ts",
    external: externalDependencies,
    plugins
  },
  {
    output: [
      {
        file: "./dist/server/bin.js",
        format: "cjs"
      }
    ],
    input: "./src/server/bin.ts",
    external: ["./index", "readline"],
    plugins
  },
  {
    output: [
      {
        file: "./dist/tester.js",
        format: "cjs"
      }
    ],
    input: "./src/tester/bin.ts",
    external: externalDependencies,
    plugins
  }
];
