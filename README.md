# mcp-text-transform

Simple Node.js MCP server for text transformations. It supports stdio and Streamable HTTP transports, works with Qwen Code CLI, and remains compatible with Hermes Agent MCP configuration.

Requires Node.js 18 or newer.

## Qwen Code Quick Start

Local checkout over stdio:

```bash
npm install
npm run build
qwen mcp add --transport stdio text-transform -- node /absolute/path/to/mcp-text-transform/index.js
```

Published package over stdio:

```bash
qwen mcp add --transport stdio text-transform -- npx mcp-text-transform
```

Streamable HTTP:

```bash
PORT=3000 npm run start:http
qwen mcp add --transport http text-transform http://localhost:3000/mcp
```

You can also write project settings directly:

```bash
node index.js --install
node index.js --install --install-dir /path/to/project
node index.js --install --server-name custom-text-transform
MCP_SERVER_NAME=custom-text-transform node index.js --install
```

`--install` writes `.qwen/settings.json` in the target directory. If the file already exists, the server is merged into `mcpServers`; existing server entries are not overwritten.

## npm and npx

Run directly from npm:

```bash
npx mcp-text-transform
```

Use it from Qwen Code without a local clone:

```bash
qwen mcp add --transport stdio text-transform -- npx mcp-text-transform
```

## Build and Development

```bash
npm install
npm run build
npm test
npm run dev
```

`npm run build` compiles TypeScript from `src/` into `dist/`. The root `index.js` is a thin compatibility wrapper for existing configs that call `node index.js`.

## Transports

Stdio is the default:

```bash
npm start
node index.js
```

Streamable HTTP:

```bash
npm run start:http
PORT=8787 npm run start:http
MCP_TRANSPORT=http PORT=8787 node index.js
```

HTTP endpoint:

```text
http://localhost:3000/mcp
```

Health check:

```bash
curl http://localhost:3000/health
```

## Tools

| Tool | Description |
| --- | --- |
| `uppercase` | Convert text to uppercase, e.g. `hello` -> `HELLO`. |
| `lowercase` | Convert text to lowercase, e.g. `HELLO` -> `hello`. |
| `reverse` | Reverse text by Unicode code point, e.g. `abc🙂` -> `🙂cba`. |
| `count` | Count characters, words, and lines. |
| `trim` | Remove leading and trailing whitespace. |
| `slugify` | Convert text into a URL-friendly slug. |
| `word_frequency` | Count word frequency and return structured JSON. |

All tools declare `inputSchema` and `outputSchema`.

## Tool Filtering

Qwen Code supports filtering tools per MCP server with `includeTools` and `excludeTools` in `.qwen/settings.json`.

```json
{
  "mcpServers": {
    "text-transform": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-text-transform/index.js"],
      "includeTools": ["uppercase", "slugify"]
    }
  }
}
```

```json
{
  "mcpServers": {
    "text-transform": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-text-transform/index.js"],
      "excludeTools": ["word_frequency"]
    }
  }
}
```

## Manual Qwen Settings

Project scope: `.qwen/settings.json`

User scope: `~/.qwen/settings.json`

Stdio:

```json
{
  "mcpServers": {
    "text-transform": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-text-transform/index.js"]
    }
  }
}
```

HTTP:

```json
{
  "mcpServers": {
    "text-transform": {
      "httpUrl": "http://localhost:3000/mcp",
      "timeout": 5000
    }
  }
}
```

## Hermes Agent

Stdio in `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  text-transform:
    command: "node"
    args: ["/Users/daniilrozhkov/prj/mcp-text-transform/index.js"]
```

Streamable HTTP in `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  text-transform:
    url: "http://localhost:3000/mcp"
```

After restarting Hermes, tools appear as `mcp_text_transform_uppercase`, `mcp_text_transform_lowercase`, `mcp_text_transform_reverse`, `mcp_text_transform_count`, `mcp_text_transform_trim`, `mcp_text_transform_slugify`, and `mcp_text_transform_word_frequency`.

## Troubleshooting

Stdio does not connect:

```bash
npm run build
node /absolute/path/to/mcp-text-transform/index.js
```

Use absolute paths in MCP config. For npx, prefer:

```bash
qwen mcp add --transport stdio text-transform -- npx mcp-text-transform
```

HTTP timeout issues:

```bash
PORT=3000 npm run start:http
curl http://localhost:3000/health
```

Increase the client timeout if startup or tool calls are slow:

```json
{
  "mcpServers": {
    "text-transform": {
      "httpUrl": "http://localhost:3000/mcp",
      "timeout": 10000
    }
  }
}
```

Environment variables differ by shell:

```bash
# bash/zsh
MCP_TRANSPORT=http PORT=8787 node index.js

# fish
env MCP_TRANSPORT=http PORT=8787 node index.js

# PowerShell
$env:MCP_TRANSPORT = "http"
$env:PORT = "8787"
node index.js
```

Server name priority:

```bash
node index.js --server-name cli-name
MCP_SERVER_NAME=env-name node index.js
```

`--server-name` takes priority over `MCP_SERVER_NAME`. The default is `text-transform`.
