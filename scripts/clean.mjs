/**
 * Removes the build output directory.
 *
 * Eleventy does not clear _site between runs, so renamed pages leave stale HTML
 * behind locally. Netlify always builds from scratch, which is why those files
 * never ship. Run this before verification so local checks match production.
 */

import { rmSync } from "node:fs";

rmSync("_site", { recursive: true, force: true });
console.log("Removed _site");
