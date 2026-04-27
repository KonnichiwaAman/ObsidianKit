import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..");
const assetsDir = path.join(projectRoot, "dist", "assets");

if (!existsSync(assetsDir)) {
  throw new Error("dist/assets was not found. Run a production build before bundle checks.");
}

const MAX_CHUNK_KB = 1500;
const MAX_VENDOR_CORE_KB = 350;
const MAX_ENTRY_JS_KB = 300;
const MAX_ENTRY_CSS_KB = 120;

const files = readdirSync(assetsDir)
  .map((name) => ({
    name,
    absolutePath: path.join(assetsDir, name),
  }))
  .filter((entry) => statSync(entry.absolutePath).isFile());

const byteToKb = (value) => value / 1024;
const failures = [];

for (const file of files) {
  const sizeInKb = byteToKb(statSync(file.absolutePath).size);
  const isChunk = /\.(?:js|mjs)$/i.test(file.name);

  if (isChunk && sizeInKb > MAX_CHUNK_KB) {
    failures.push(
      `${file.name} is ${sizeInKb.toFixed(2)}kB and exceeds max ${MAX_CHUNK_KB}kB`,
    );
  }

  if (file.name.startsWith("vendor-core-") && sizeInKb > MAX_VENDOR_CORE_KB) {
    failures.push(
      `${file.name} is ${sizeInKb.toFixed(2)}kB and exceeds max ${MAX_VENDOR_CORE_KB}kB`,
    );
  }

  if (file.name.startsWith("index-") && /\.js$/i.test(file.name) && sizeInKb > MAX_ENTRY_JS_KB) {
    failures.push(
      `${file.name} is ${sizeInKb.toFixed(2)}kB and exceeds max ${MAX_ENTRY_JS_KB}kB`,
    );
  }

  if (file.name.startsWith("index-") && /\.css$/i.test(file.name) && sizeInKb > MAX_ENTRY_CSS_KB) {
    failures.push(
      `${file.name} is ${sizeInKb.toFixed(2)}kB and exceeds max ${MAX_ENTRY_CSS_KB}kB`,
    );
  }
}

if (failures.length > 0) {
  console.error("Bundle budget check failed:\n");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Bundle budget check passed.");
