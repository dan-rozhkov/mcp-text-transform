import test from "node:test";
import assert from "node:assert/strict";
import {
  CallToolResultSchema,
  ErrorCode,
  ListToolsResultSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import {
  callTool,
  getPort,
  getTransportMode,
  listTools,
  startHttpServer,
} from "./index.js";

async function textFor(name, text) {
  const result = await callTool({ name, arguments: { text } });
  return result.content[0].text;
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
    if (error?.code === "EPERM") {
      t.skip("environment does not permit opening a local HTTP listener");
      return;
    }

    throw error;
  }

  try {
    const { port } = httpServer.address();
    const response = await fetch(`http://127.0.0.1:${port}/health`);

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: "ok" });
  } finally {
    await new Promise((resolve, reject) => {
      httpServer.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
