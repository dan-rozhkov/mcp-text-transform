#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { main } from "./dist/index.js";

export * from "./dist/index.js";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
