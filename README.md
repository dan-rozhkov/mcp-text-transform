# mcp-text-transform

Простой MCP-сервер на Node.js. Принимает текст → трансформирует → отдаёт результат. Совместим с QwenCode CLI и любым MCP-клиентом.

## Tools

| Tool       | Описание                              |
|-----------|---------------------------------------|
| uppercase | Переводит текст в ВЕРХНИЙ РЕГИСТР     |
| lowercase | Переводит текст в нижний регистр       |
| reverse   | Переворачивает текст задом наперёд     |
| count     | Считает символы, слова и строки        |

## Quick Start

```bash
npm install
npm start
```

## QwenCode CLI: конфигурация

Добавить в конфиг QwenCode (.qwencode.yaml или аргументы):

```yaml
mcp_servers:
  text-transform:
    command: node
    args: ["/absolute/path/to/prj/mcp-text-transform/index.js"]
```

Или напрямую:

```bash
qwen --mcp-server "node /path/to/mcp-text-transform/index.js"
```

## Hermes Agent: конфигурация

В `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  text-transform:
    command: "node"
    args: ["/Users/daniilrozhkov/prj/mcp-text-transform/index.js"]
```

После рестарта Hermes появятся инструменты: `mcp_text_transform_uppercase`, `mcp_text_transform_lowercase`, `mcp_text_transform_reverse`, `mcp_text_transform_count`.
