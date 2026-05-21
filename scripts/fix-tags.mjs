import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

import { fileURLToPath } from "url";
const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory() && name !== "node_modules") walk(p, files);
    else if (name.endsWith(".tsx")) files.push(p);
  }
  return files;
}

const closeWrong = "</" + "motion>";
const closeRight = "</" + "div>";

for (const file of walk(join(root, "apps"))) {
  let c = readFileSync(file, "utf8");
  if (!c.includes(closeWrong)) continue;
  c = c.split(closeWrong).join(closeRight);
  writeFileSync(file, c);
  console.log("fixed", file);
}
