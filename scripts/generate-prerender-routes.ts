import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildPublicRoutes } from "./route-manifest";

const scriptPath = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(scriptPath), "..");
const outputPath = path.join(projectRoot, "public", "prerender-routes.json");

const routes = buildPublicRoutes();

mkdirSync(path.dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(routes, null, 2)}\n`, "utf8");

console.log(`Generated prerender route manifest with ${routes.length} routes.`);
