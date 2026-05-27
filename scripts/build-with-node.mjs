import fs from "node:fs/promises";
import path from "node:path";
import { stripTypeScriptTypes } from "node:module";

const rootDir = new URL("..", import.meta.url);
const srcDir = new URL("src/", rootDir);
const distDir = new URL("dist/", rootDir);

async function listTypeScriptFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        return listTypeScriptFiles(entryPath);
      }

      return entry.isFile() && entry.name.endsWith(".ts") ? [entryPath] : [];
    })
  );

  return files.flat();
}

await fs.rm(distDir, { recursive: true, force: true });

for (const file of await listTypeScriptFiles(srcDir.pathname)) {
  const source = await fs.readFile(file, "utf8");
  const relativePath = path.relative(srcDir.pathname, file);
  const outputPath = path.join(distDir.pathname, relativePath).replace(/\.ts$/u, ".js");
  const output = stripTypeScriptTypes(source, {
    mode: "transform",
    sourceMap: false,
  });

  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, output, "utf8");
}
