/**
 * @gridstorm/analytix-data-connector
 *
 * Zero-config data ingestion:
 *  - CSV drag-drop with auto schema detection
 *  - REST API with auto-pagination
 *  - WebSocket streaming
 *  - Clipboard paste from Excel
 */

// Connectors
export { parseCsvString, parseCsvFile, streamCsvString } from './connectors/csv-connector.js';
export type { CsvParseOptions }                          from './connectors/csv-connector.js';

export { fetchRestApi }                                  from './connectors/rest-connector.js';
export type { RestConnectorOptions }                     from './connectors/rest-connector.js';

export { connectWebSocket, createCellChangeTracker }     from './connectors/websocket-connector.js';
export type {
  WebSocketConnectorOptions,
  WebSocketConnector,
  CellChangeDirection,
  CellChangeTracker,
}                                                        from './connectors/websocket-connector.js';

export {
  parseClipboardEvent,
  parseClipboardText,
  readFromClipboard,
}                                                        from './connectors/clipboard-connector.js';
export type { ClipboardConnectorOptions }                from './connectors/clipboard-connector.js';

// Schema inference & transformation
export { inferSchema, coerceValue }                      from './schema-inferrer.js';
export { transformRows }                                 from './data-transformer.js';
export type { TransformOptions }                         from './data-transformer.js';

// React components
export { DataImportPanel }                               from './react/DataImportPanel.js';
export type { DataImportPanelProps }                     from './react/DataImportPanel.js';

export { ConnectorStatus }                               from './react/ConnectorStatus.js';
export type { ConnectorStatusProps, ConnectionStatus }   from './react/ConnectorStatus.js';
