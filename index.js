#!/usr/bin/env node
import { fileURLToPath } from "node:url";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

const textInputSchema = {
  type: "object",
  properties: {
    text: {
      type: "string",
      description: "The text to transform",
    },
  },
  required: ["text"],
  additionalProperties: false,
};

export const tools = [
  {
    name: "uppercase",
    description: "Convert text to UPPERCASE",
    inputSchema: textInputSchema,
  },
  {
    name: "lowercase",
    description: "Convert text to lowercase",
    inputSchema: textInputSchema,
  },
  {
    name: "reverse",
    description: "Reverse text by Unicode code point",
    inputSchema: textInputSchema,
  },
  {
    name: "count",
    description: "Count characters, words, and lines in text",
    inputSchema: textInputSchema,
    outputSchema: {
      type: "object",
      properties: {
        characters: { type: "number" },
        words: { type: "number" },
        lines: { type: "number" },
      },
      required: ["characters", "words", "lines"],
      additionalProperties: false,
    },
  },
  {
    name: "trim",
    description: "Remove leading and trailing whitespace",
    inputSchema: textInputSchema,
  },
  {
    name: "slugify",
    description: "Convert text into a URL-friendly slug",
    inputSchema: textInputSchema,
  },
  {
    name: "word_frequency",
    description: "Count how often each word appears, sorted by frequency",
    inputSchema: textInputSchema,
    outputSchema: {
      type: "object",
      properties: {
        totalWords: { type: "number" },
        uniqueWords: { type: "number" },
        frequencies: {
          type: "object",
          additionalProperties: { type: "number" },
        },
      },
      required: ["totalWords", "uniqueWords", "frequencies"],
      additionalProperties: false,
    },
  },
];

export async function listTools() {
  return { tools };
}

function requireText(args) {
  if (!args || typeof args !== "object" || typeof args.text !== "string") {
    throw new McpError(
      ErrorCode.InvalidParams,
      'Invalid arguments: expected object with required string property "text".'
    );
  }

  return args.text;
}

function textResult(text) {
  return {
    content: [{ type: "text", text }],
  };
}

function jsonResult(value) {
  return {
    content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
    structuredContent: value,
  };
}

function countText(text) {
  return {
    characters: Array.from(text).length,
    words: text.trim() ? text.trim().split(/\s+/u).length : 0,
    lines: text ? text.split(/\r\n|\r|\n/u).length : 0,
  };
}

function slugify(text) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "");
}

function wordFrequency(text) {
  const words =
    text.toLowerCase().match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
  const frequencies = {};

  for (const word of words) {
    frequencies[word] = (frequencies[word] ?? 0) + 1;
  }

  const sortedFrequencies = Object.fromEntries(
    Object.entries(frequencies).sort(([wordA, countA], [wordB, countB]) => {
      if (countB !== countA) {
        return countB - countA;
      }

      return wordA.localeCompare(wordB);
    })
  );

  return {
    totalWords: words.length,
    uniqueWords: Object.keys(frequencies).length,
    frequencies: sortedFrequencies,
  };
}

export async function callTool(params) {
  const { name, arguments: args } = params ?? {};

  if (!tools.some((tool) => tool.name === name)) {
    throw new McpError(ErrorCode.InvalidParams, `Unknown tool: ${name}`);
  }

  const text = requireText(args);

  switch (name) {
    case "uppercase":
      return textResult(text.toUpperCase());

    case "lowercase":
      return textResult(text.toLowerCase());

    case "reverse":
      return textResult(Array.from(text).reverse().join(""));

    case "count":
      return jsonResult(countText(text));

    case "trim":
      return textResult(text.trim());

    case "slugify":
      return textResult(slugify(text));

    case "word_frequency":
      return jsonResult(wordFrequency(text));

    default:
      throw new McpError(
        ErrorCode.InternalError,
        `Tool is listed but not implemented: ${name}`
      );
  }
}

export function createServer() {
  const server = new Server(
    {
      name: "mcp-text-transform",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, listTools);
  server.setRequestHandler(CallToolRequestSchema, async (request) =>
    callTool(request.params)
  );

  return server;
}

export async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
