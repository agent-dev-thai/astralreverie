import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const rootUrl = new URL("../", import.meta.url);
const vendorUrl = new URL("assets/vendor/", rootUrl);

await mkdir(fileURLToPath(vendorUrl), { recursive: true });
await Promise.all([
  copyFile(
    fileURLToPath(new URL("node_modules/motion/dist/motion.js", rootUrl)),
    fileURLToPath(new URL("motion-12.42.2.js", vendorUrl)),
  ),
  copyFile(
    fileURLToPath(new URL("node_modules/motion/LICENSE.md", rootUrl)),
    fileURLToPath(new URL("MOTION-LICENSE.md", vendorUrl)),
  ),
]);
