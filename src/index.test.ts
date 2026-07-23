import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  CallToolResultSchema,
  ErrorCode,
  ListToolsResultSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import {
  callTool,
  getPort,
  getServerName,
  getTransportMode,
  installQwenSettings,
  listTools,
  startHttpServer,
} from "./index.js";

async function textFor(name: string, text: string) {
  const result = await callTool({ name, arguments: { text } });
  return result.content[0].text;
}

async function makeTempDir() {
  return fs.mkdtemp(path.join(os.tmpdir(), "mcp-text-transform-"));
}

test("lists all supported MCP tools with schemas", async () => {
  const result = await listTools();
  assert.equal(ListToolsResultSchema.safeParse(result).success, true);

  const names = result.tools.map((tool) => tool.name);

  assert.deepEqual(names, [
    "uppercase",
    "lowercase",
    "reverse",
    "count",
    "trim",
    "slugify",
    "word_frequency",
  ]);

  for (const tool of result.tools) {
    assert.equal(tool.inputSchema.type, "object");
    assert.deepEqual(tool.inputSchema.required, ["text"]);
    assert.equal(tool.inputSchema.properties.text.type, "string");
    assert.equal(tool.outputSchema.type, "object");
  }
});

test("transforms text with simple string tools", async () => {
  assert.equal(await textFor("uppercase", "Hello, мир"), "HELLO, МИР");
  assert.equal(await textFor("lowercase", "Hello, МИР"), "hello, мир");
  assert.equal(await textFor("reverse", "abc🙂"), "🙂cba");
  assert.equal(await textFor("trim", "\n  keep me \t"), "keep me");
  assert.equal(await textFor("slugify", " Crème brûlée & Tea! "), "creme-brulee-tea");
});

test("returns count as text and structured content", async () => {
  const result = await callTool({
    name: "count",
    arguments: { text: "one two\nthree🙂" },
  });
  assert.equal(CallToolResultSchema.safeParse(result).success, true);

  assert.deepEqual(result.structuredContent, {
    characters: 14,
    words: 3,
    lines: 2,
  });
  assert.equal(result.content[0].type, "text");
  assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
});

test("returns word frequency sorted by count then word", async () => {
  const result = await callTool({
    name: "word_frequency",
    arguments: { text: "Banana apple banana. Pear apple banana!" },
  });
  assert.equal(CallToolResultSchema.safeParse(result).success, true);

  assert.deepEqual(result.structuredContent, {
    totalWords: 6,
    uniqueWords: 3,
    frequencies: {
      banana: 3,
      apple: 2,
      pear: 1,
    },
  });
  assert.deepEqual(JSON.parse(result.content[0].text), result.structuredContent);
});

test("rejects missing or non-string text arguments with MCP InvalidParams", async () => {
  await assert.rejects(
    () => callTool({ name: "uppercase", arguments: {} }),
    (error) =>
      error instanceof McpError &&
      error.code === ErrorCode.InvalidParams &&
      error.message.includes("required string property")
  );

  await assert.rejects(
    () => callTool({ name: "uppercase", arguments: { text: 42 } }),
    (error) =>
      error instanceof McpError &&
      error.code === ErrorCode.InvalidParams &&
      error.message.includes("required string property")
  );
});

test("rejects unknown tools with MCP InvalidParams", async () => {
  await assert.rejects(
    () => callTool({ name: "missing", arguments: { text: "hello" } }),
    (error) =>
      error instanceof McpError &&
      error.code === ErrorCode.InvalidParams &&
      error.message.includes("Unknown tool: missing")
  );
});

test("selects stdio by default and HTTP via CLI arg or env var", () => {
  assert.equal(getTransportMode(["node", "index.js"], {}), "stdio");
  assert.equal(getTransportMode(["node", "index.js", "--http"], {}), "http");
  assert.equal(
    getTransportMode(["node", "index.js"], { MCP_TRANSPORT: "http" }),
    "http"
  );
});

test("reads server name from CLI, env, or default", () => {
  assert.equal(getServerName(["node", "index.js"], {}), "text-transform");
  assert.equal(
    getServerName(["node", "index.js"], { MCP_SERVER_NAME: "env-transform" }),
    "env-transform"
  );
  assert.equal(
    getServerName(["node", "index.js", "--server-name", "cli-transform"], {
      MCP_SERVER_NAME: "env-transform",
    }),
    "cli-transform"
  );
  assert.equal(
    getServerName(["node", "index.js", "--server-name=equals-transform"], {}),
    "equals-transform"
  );
});

test("installs Qwen settings without overwriting existing MCP servers", async () => {
  const installDir = await makeTempDir();
  await fs.mkdir(path.join(installDir, ".qwen"), { recursive: true });
  await fs.writeFile(
    path.join(installDir, ".qwen", "settings.json"),
    JSON.stringify(
      {
        theme: "dark",
        mcpServers: {
          existing: {
            command: "node",
            args: ["/existing/index.js"],
          },
          "text-transform": {
            command: "node",
            args: ["/custom/index.js"],
          },
        },
      },
      null,
      2
    ),
    "utf8"
  );

  const result = await installQwenSettings({
    installDir,
    serverName: "text-transform",
    entrypoint: "/new/index.js",
  });
  const settings = JSON.parse(
    await fs.readFile(path.join(installDir, ".qwen", "settings.json"), "utf8")
  );

  assert.equal(result.alreadyExists, true);
  assert.equal(settings.theme, "dark");
  assert.deepEqual(settings.mcpServers.existing, {
    command: "node",
    args: ["/existing/index.js"],
  });
  assert.deepEqual(settings.mcpServers["text-transform"], {
    command: "node",
    args: ["/custom/index.js"],
  });
});

test("installs Qwen settings with a custom server name", async () => {
  const installDir = await makeTempDir();

  const result = await installQwenSettings({
    installDir,
    serverName: "custom-transform",
    entrypoint: "/repo/index.js",
  });
  const settings = JSON.parse(
    await fs.readFile(path.join(installDir, ".qwen", "settings.json"), "utf8")
  );

  assert.equal(result.alreadyExists, false);
  assert.deepEqual(settings, {
    mcpServers: {
      "custom-transform": {
        command: "node",
        args: ["/repo/index.js"],
      },
    },
  });
});

test("reads PORT from env and defaults to 3000", () => {
  assert.equal(getPort({}), 3000);
  assert.equal(getPort({ PORT: "3456" }), 3456);
  assert.throws(() => getPort({ PORT: "nope" }), /Invalid PORT value/);
  assert.throws(() => getPort({ PORT: "123abc" }), /Invalid PORT value/);
});

test("HTTP server starts and responds to health checks", async (t) => {
  let httpServer;

  try {
    httpServer = await startHttpServer({ port: 0, host: "127.0.0.1" });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "EPERM") {
      t.skip("environment does not permit opening a local HTTP listener");
      return;
    }

    throw error;
  }

  try {
    const address = httpServer.address();
    if (typeof address !== "object" || address === null) {
      throw new Error("HTTP server did not expose a TCP address");
    }
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  } finally {
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
