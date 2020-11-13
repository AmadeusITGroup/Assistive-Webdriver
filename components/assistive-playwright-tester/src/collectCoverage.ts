import fetch from "node-fetch";
import { join } from "path";
import { promises } from "fs";
import { v4 as createUUID } from "uuid";
import { info, warn } from "winston";

export async function collectCoverage(url: string) {
  if (process.env.ENABLE_COVERAGE === "1") {
    try {
      const response = await fetch(`${url}/__coverage__`);
      if (response.ok) {
        const json = await response.buffer();
        const nycFolder = join(process.cwd(), ".nyc_output");
        await promises.mkdir(nycFolder, { recursive: true });
        const fileName = join(nycFolder, `${createUUID()}.json`);
        await promises.writeFile(fileName, json);
        info(`Successfully saved code coverage from the VM in ${fileName}.`);
      } else {
        warn(`Code coverage does not seem to be enabled in the VM.`);
      }
    } catch (error) {
      warn(`Failed to collect/save code coverage from the VM`, error);
    }
  }
}
