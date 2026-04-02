# @gridstorm/analytix-data-connector

Zero-config data ingestion for [Analytics Studio](https://analytics.tekivex.com) — CSV, REST API, WebSocket streaming, and clipboard paste.

## Install

```bash
npm install @gridstorm/analytix-core @gridstorm/analytix-data-connector
```

## Quick Start

```ts
import { DataConnector } from '@gridstorm/analytix-data-connector';

const connector = new DataConnector();

// Load from CSV text
const dataset = await connector.fromCSV(csvText, { header: true });

// Load from REST API
const dataset = await connector.fromRest('https://api.example.com/data');

// Load from WebSocket
const stream = connector.fromWebSocket('wss://stream.example.com/feed');
```

## Sources

| Source | Method |
|---|---|
| CSV string/file | `fromCSV(text)` |
| JSON array | `fromJSON(rows)` |
| REST API | `fromRest(url, options)` |
| WebSocket | `fromWebSocket(url)` |
| Clipboard paste | `fromClipboard()` |

## Links

- [Live Demo](https://analytics.tekivex.com)
- [GitHub](https://github.com/007krcs/analytics-builder)

## License

MIT © [Tekivex](https://tekivex.com)
