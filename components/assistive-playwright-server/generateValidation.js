/*
 * Copyright 2021 Amadeus s.a.s.
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

const { writeFileSync } = require("fs");
const { join } = require("path");
const tjs = require("typescript-json-schema");
const Ajv = require("ajv").default;
const standaloneCode = require("ajv/dist/standalone").default;

const tsProgram = tjs.getProgramFromFiles(
  [require.resolve("./src/validation.d.ts")],
  require("./tsconfig.json").compilerOptions,
  {}
);

const schema = tjs.generateSchema(tsProgram, "CreateBrowserConfig", {
  noExtraProps: true,
  required: true
});

const ajv = new Ajv({ code: { source: true }, allowUnionTypes: true });
const validate = ajv.compile(schema);
const moduleCode = standaloneCode(ajv, validate).replace(
  'require("ajv/dist/compile/equal")',
  "null"
);

writeFileSync(join(__dirname, "src/validation.js"), moduleCode);
