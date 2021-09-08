import { PNG } from "pngjs";

/**
 * Takes a png image and returns a buffer.
 * @param png - image
 * @returns a buffer containing the image in png format.
 * @public
 */
export function pngToBuffer(png: PNG): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const buffers: Buffer[] = [];
    png.on("data", data => buffers.push(data));
    png.on("error", reject);
    png.on("end", () => resolve(Buffer.concat(buffers)));
    png.pack();
  });
}

/**
 * Takes a buffer and returns the corresponding data URI with base64 encoding.
 * @param buffer - buffer
 * @param mediaType - media type to include in the data URI, can be empty
 * @returns data URI
 * @public
 */
export function bufferToDataURI(buffer: Buffer, mediaType: string): string {
  return `data:${mediaType};base64,${buffer.toString("base64")}`;
}

/**
 * Takes a png image and returns a data URI.
 * @param png - image
 * @returns data URI
 * @public
 */
export async function pngToDataURI(png: PNG): Promise<string> {
  return bufferToDataURI(await pngToBuffer(png), "image/png");
}
