#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

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

// Register tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "uppercase",
      description: "Convert text to UPPERCASE",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The text to convert",
          },
        },
        required: ["text"],
      },
    },
    {
      name: "lowercase",
      description: "Convert text to lowercase",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The text to convert",
          },
        },
        required: ["text"],
      },
    },
    {
      name: "reverse",
      description: "Reverse the text",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The text to reverse",
          },
        },
        required: ["text"],
      },
    },
    {
      name: "count",
      description: "Count characters, words, and lines in text",
      inputSchema: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The text to analyze",
          },
        },
        required: ["text"],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "uppercase": {
      const result = String(args.text).toUpperCase();
      return {
        content: [{ type: "text", text: result }],
      };
    }

    case "lowercase": {
      const result = String(args.text).toLowerCase();
      return {
        content: [{ type: "text", text: result }],
      };
    }

    case "reverse": {
      const result = String(args.text).split("").reverse().join("");
      return {
        content: [{ type: "text", text: result }],
      };
    }

    case "count": {
      const text = String(args.text);
      const chars = text.length;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const lines = text ? text.split("\n").length : 0;
      const result = JSON.stringify({ characters: chars, words, lines }, null, 2);
      return {
        content: [{ type: "text", text: result }],
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

// Start server via stdio
const transport = new StdioServerTransport();
await server.connect(transport);
