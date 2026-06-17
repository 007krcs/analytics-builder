// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * @gridstorm/analytix-data-connector
 *
 * Zero-config data ingestion:
 *  - CSV drag-drop with auto schema detection
 *  - REST API with auto-pagination
 *  - WebSocket streaming
 *  - Clipboard paste from Excel
 *  - Google Sheets (public sheets via CSV export)
 *  - Excel / XLSX file reading (via SheetJS)
 */

// Connectors
export { parseCsvString, parseCsvFile, streamCsvString, parseCsvRecords } from './connectors/csv-connector.js';
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

export { connectSSE }                                    from './connectors/sse-connector.js';
export type {
  SseConnectorOptions,
  SseConnector,
  EventSourceLike,
}                                                        from './connectors/sse-connector.js';

export {
  parseClipboardEvent,
  parseClipboardText,
  readFromClipboard,
}                                                        from './connectors/clipboard-connector.js';
export type { ClipboardConnectorOptions }                from './connectors/clipboard-connector.js';

export {
  fetchGoogleSheet,
  extractSheetId,
  extractGid,
  buildCsvExportUrl,
}                                                        from './connectors/google-sheets-connector.js';
export type { GoogleSheetsConnectorOptions }             from './connectors/google-sheets-connector.js';

export {
  parseExcelFile,
  parseExcelBuffer,
}                                                        from './connectors/excel-connector.js';
export type { ExcelConnectorOptions }                    from './connectors/excel-connector.js';

// Schema inference & transformation
export { inferSchema, coerceValue }                      from './schema-inferrer.js';
export { transformRows }                                 from './data-transformer.js';
export type { TransformOptions }                         from './data-transformer.js';

// React components
export { DataImportPanel }                               from './react/DataImportPanel.js';
export type { DataImportPanelProps }                     from './react/DataImportPanel.js';

export { ConnectorStatus }                               from './react/ConnectorStatus.js';
export type { ConnectorStatusProps, ConnectionStatus }   from './react/ConnectorStatus.js';
