# mcp-text-transform

Простой MCP-сервер на Node.js. Принимает текст → трансформирует → отдаёт результат. Совместим с QwenCode CLI и любым MCP-клиентом.

Требуется Node.js 18 или новее.

## Tools

| Tool           | Описание                                      |
|----------------|-----------------------------------------------|
| uppercase      | Переводит текст в ВЕРХНИЙ РЕГИСТР             |
| lowercase      | Переводит текст в нижний регистр              |
| reverse        | Переворачивает текст задом наперёд            |
| count          | Считает символы, слова и строки               |
| trim           | Удаляет пробелы и переводы строк по краям     |
| slugify        | Создаёт URL-friendly slug                     |
| word_frequency | Считает частоту слов и возвращает JSON        |

## Quick Start

Stdio transport (по умолчанию, обратная совместимость):

```bash
npm install
npm start
```

Streamable HTTP transport:

```bash
npm run start:http
```

По умолчанию HTTP-сервер слушает порт `3000` и MCP endpoint `http://localhost:3000/mcp`.
Порт можно изменить через `PORT`:

```bash
PORT=8787 npm run start:http
```

Также HTTP mode можно включить без npm script:

```bash
node index.js --http
MCP_TRANSPORT=http PORT=8787 node index.js
```

Health check:

```bash
curl http://localhost:3000/health
# {"status":"ok"}
```

## Tests

```bash
npm test
```

## QwenCode CLI: конфигурация

### Stdio

Добавить в `.qwen/settings.json`:

```json
{
  "mcpServers": {
    "text-transform": {
      "command": "node",
      "args": ["/absolute/path/to/prj/mcp-text-transform/index.js"]
    }
  }
}
```

Или напрямую:

```bash
qwen --mcp-server "node /path/to/mcp-text-transform/index.js"
```

### Streamable HTTP

Сначала запустить сервер:

```bash
PORT=3000 npm run start:http
```

Затем добавить HTTP MCP endpoint:

```bash
qwen mcp add --transport http text-transform http://localhost:3000/mcp
```

Или вручную в `.qwen/settings.json`:

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

Qwen Code documents `httpUrl` for Streamable HTTP servers and `qwen mcp add --transport http ...` for CLI setup:
https://qwenlm.github.io/qwen-code-docs/en/users/features/mcp/

## Hermes Agent: конфигурация

### Stdio

В `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  text-transform:
    command: "node"
    args: ["/Users/daniilrozhkov/prj/mcp-text-transform/index.js"]
```

### Streamable HTTP

Сначала запустить сервер:

```bash
PORT=3000 npm run start:http
```

Затем в `~/.hermes/config.yaml`:

```yaml
mcp_servers:
  text-transform:
    url: "http://localhost:3000/mcp"
```

Hermes documents `url` for HTTP/StreamableHTTP MCP servers:
https://hermes-agent.ru/docs/user-guide_features_mcp.html

После рестарта Hermes появятся инструменты: `mcp_text_transform_uppercase`, `mcp_text_transform_lowercase`, `mcp_text_transform_reverse`, `mcp_text_transform_count`, `mcp_text_transform_trim`, `mcp_text_transform_slugify`, `mcp_text_transform_word_frequency`.

## Gigacode CLI: конфигурация

Gigacode CLI (`@sandbox-agent/gigacode`) запускает OpenCode TUI поверх Sandbox Agent, поэтому MCP-серверы настраиваются в конфигурации OpenCode.
OpenCode читает глобальный файл `~/.config/opencode/opencode.json` и проектный файл `opencode.json` в корне репозитория.

Установка Gigacode по документации:

```bash
curl -fsSL https://releases.rivet.dev/sandbox-agent/latest/gigacode-install.sh | sh
# или
npm install -g @sandbox-agent/gigacode
```

Для этого проекта добавлен `opencode.json`:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "text-transform": {
      "type": "local",
      "command": [
        "node",
        "/Users/daniilrozhkov/prj/mcp-text-transform/index.js"
      ],
      "enabled": true,
      "timeout": 5000
    }
  }
}
```

После установки запустите Gigacode из корня проекта:

```bash
gigacode
```

OpenCode/Gigacode должен обнаружить локальный MCP-сервер `text-transform` и его инструменты `uppercase`, `lowercase`, `reverse`, `count`, `trim`, `slugify`, `word_frequency`.

Примечание для этой машины: на момент проверки установка была заблокирована DNS/network sandbox (`registry.npmjs.org` и `releases.rivet.dev` не резолвились), поэтому реальный запуск `gigacode` невозможен до восстановления сетевого доступа.
