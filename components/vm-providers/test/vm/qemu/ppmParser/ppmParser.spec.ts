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

import { readFile as readFileCb } from "fs";
import { promisify } from "util";
import { parsePPM } from "../../../../src/vm/qemu/ppmParser";
import { PNG } from "pngjs";

const readFile = promisify(readFileCb);

describe("ppmParser", () => {
  it("should correctly parse a ppm file", async () => {
    const ppmFile = await readFile(require.resolve("./file.ppm"));
    const ppmImage = parsePPM(ppmFile);
    const pngFile = await readFile(require.resolve("./file.png"));
    const pngImage = await new Promise<PNG>((resolve, reject) =>
      new PNG().parse(pngFile, (error, result) =>
        error ? reject(error) : resolve(result)
      )
    );
    expect(ppmImage.data).toEqual(pngImage.data);
  }, 20000);
});
