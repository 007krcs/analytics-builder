/**
 * DataImportPanel — Drag-and-drop UI for importing data.
 * Custom CSS only, no UI library dependencies.
 */

import { useCallback, useRef, useState } from 'react';
import type { Dataset, Column, ColumnType } from '@gridstorm/analytix-core';
import { parseCsvFile }        from '../connectors/csv-connector.js';
import { parseClipboardText }  from '../connectors/clipboard-connector.js';

export interface DataImportPanelProps {
  /** Called when the user confirms the import */
  onImport: (dataset: Dataset) => void;
  /** Called when the panel should close */
  onClose?: () => void;
}

type ImportTab = 'file' | 'paste' | 'api' | 'websocket';

type ParseState =
  | { phase: 'idle' }
  | { phase: 'parsing'; progress: number }
  | { phase: 'preview'; dataset: Dataset }
  | { phase: 'error'; message: string };

export function DataImportPanel({ onImport, onClose }: DataImportPanelProps) {
  const [tab,        setTab]        = useState<ImportTab>('file');
  const [dragging,   setDragging]   = useState(false);
  const [parseState, setParseState] = useState<ParseState>({ phase: 'idle' });
  const [pasteText,  setPasteText]  = useState('');
  const [apiUrl,     setApiUrl]     = useState('');
  const [wsUrl,      setWsUrl]      = useState('');
  const [colOverrides, setColOverrides] = useState<Record<string, ColumnType>>({});
  const dropRef = useRef<HTMLDivElement>(null);

  // ── File handling ──────────────────────────────────────────────

  const handleFile = useCallback(async (file: File) => {
    setParseState({ phase: 'parsing', progress: 0 });
    try {
      const dataset = await parseCsvFile(file);
      setParseState({ phase: 'preview', dataset });
    } catch (err) {
      setParseState({ phase: 'error', message: String(err) });
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // ── Paste handling ─────────────────────────────────────────────

  const handleParse = useCallback(() => {
    if (!pasteText.trim()) return;
    try {
      const dataset = parseClipboardText(pasteText, { datasetName: 'Pasted Data' });
      setParseState({ phase: 'preview', dataset });
    } catch (err) {
      setParseState({ phase: 'error', message: String(err) });
    }
  }, [pasteText]);

  // ── Column type override ───────────────────────────────────────

  const overrideType = useCallback((colId: string, type: ColumnType) => {
    setColOverrides((prev) => ({ ...prev, [colId]: type }));
  }, []);

  // ── Confirm import ─────────────────────────────────────────────

  const handleImport = useCallback(() => {
    if (parseState.phase !== 'preview') return;
    // Apply column type overrides
    const ds = parseState.dataset;
    if (Object.keys(colOverrides).length > 0) {
      const overriddenCols = ds.columns.map((c: Column) => {
        const t = colOverrides[c.id];
        if (!t) return c;
        return {
          ...c,
          type: t,
          aggregatable: ['number', 'integer', 'float', 'currency', 'percentage'].includes(t),
          dimensional:  ['string', 'boolean', 'date', 'datetime'].includes(t),
        };
      });
      onImport({ ...ds, columns: overriddenCols });
    } else {
      onImport(ds);
    }
  }, [parseState, colOverrides, onImport]);

  // ── Preview table ──────────────────────────────────────────────

  const previewDataset = parseState.phase === 'preview' ? parseState.dataset : null;
  const PREVIEW_ROWS   = 5;

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="import-panel" role="dialog" aria-label="Import Data" aria-modal="true">
      <div className="import-panel__header">
        <h2 className="import-panel__title">Import Data</h2>
        {onClose && (
          <button className="import-panel__close" onClick={onClose} aria-label="Close import panel">
            ×
          </button>
        )}
      </div>

      {/* Tab strip */}
      <div className="import-tabs" role="tablist">
        {(['file', 'paste', 'api', 'websocket'] as ImportTab[]).map((t) => (
          <button
            key={t}
            role="tab"
            className={`import-tab${tab === t ? ' import-tab--active' : ''}`}
            aria-selected={tab === t}
            onClick={() => { setTab(t); setParseState({ phase: 'idle' }); }}
          >
            {t === 'file'      ? '📁 File' :
             t === 'paste'     ? '📋 Paste' :
             t === 'api'       ? '🌐 REST API' :
                                 '📡 WebSocket'}
          </button>
        ))}
      </div>

      {/* ── File tab ── */}
      {tab === 'file' && (
        <div className="import-tab-content">
          <div
            ref={dropRef}
            className={`import-dropzone${dragging ? ' import-dropzone--active' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            role="region"
            aria-label="Drop zone for data files"
          >
            <div className="import-dropzone__icon" aria-hidden="true">📂</div>
            <p className="import-dropzone__label">
              Drag &amp; drop a file here
            </p>
            <p className="import-dropzone__sub">
              Supports CSV, TSV, or any delimited text file
            </p>
            <div className="import-file-badges">
              {['CSV', 'TSV', 'TXT'].map((ext) => (
                <span key={ext} className="import-file-badge">{ext}</span>
              ))}
            </div>
            <label className="import-browse-btn">
              Browse files
              <input type="file" accept=".csv,.tsv,.txt" onChange={onFileInput} style={{ display: 'none' }} />
            </label>
          </div>
        </div>
      )}

      {/* ── Paste tab ── */}
      {tab === 'paste' && (
        <div className="import-tab-content">
          <p className="import-hint">
            Paste data from Excel, Google Sheets, or any tab-separated source.
          </p>
          <textarea
            className="import-paste-area"
            placeholder="Paste rows here (tab-separated columns, first row as header)…"
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={8}
            aria-label="Paste data"
          />
          <button
            className="import-parse-btn"
            onClick={handleParse}
            disabled={!pasteText.trim()}
          >
            Parse Data
          </button>
        </div>
      )}

      {/* ── API tab ── */}
      {tab === 'api' && (
        <div className="import-tab-content">
          <label className="import-label" htmlFor="api-url">REST API URL</label>
          <input
            id="api-url"
            className="import-input"
            type="url"
            placeholder="https://api.example.com/data"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
          />
          <p className="import-hint">
            The connector will auto-detect the array path and paginate automatically.
          </p>
          <button
            className="import-parse-btn"
            disabled={!apiUrl.trim()}
            onClick={() => alert('REST API fetch — integrate fetchRestApi() from @gridstorm/analytix-data-connector')}
          >
            Fetch API Data
          </button>
        </div>
      )}

      {/* ── WebSocket tab ── */}
      {tab === 'websocket' && (
        <div className="import-tab-content">
          <label className="import-label" htmlFor="ws-url">WebSocket URL</label>
          <input
            id="ws-url"
            className="import-input"
            type="url"
            placeholder="wss://stream.example.com/live"
            value={wsUrl}
            onChange={(e) => setWsUrl(e.target.value)}
          />
          <p className="import-hint">
            Rows are batched every 50 messages and streamed into the dataset live.
          </p>
          <button
            className="import-parse-btn"
            disabled={!wsUrl.trim()}
            onClick={() => alert('WebSocket streaming — integrate connectWebSocket() from @gridstorm/analytix-data-connector')}
          >
            Connect Stream
          </button>
        </div>
      )}

      {/* ── Parse states ── */}
      {parseState.phase === 'parsing' && (
        <div className="import-progress">
          <div className="import-progress__bar" style={{ width: `${parseState.progress}%` }} />
          <span>Parsing data…</span>
        </div>
      )}

      {parseState.phase === 'error' && (
        <div className="import-error" role="alert">
          Parse error: {parseState.message}
        </div>
      )}

      {/* ── Preview ── */}
      {previewDataset && (
        <div className="import-preview">
          <h3 className="import-preview__title">
            Preview — {previewDataset.rows.length.toLocaleString()} rows × {previewDataset.columns.length} columns
          </h3>

          {/* Column type overrides */}
          <div className="import-col-types">
            {previewDataset.columns.slice(0, 8).map((col: Column) => (
              <div key={col.id} className="import-col-type-row">
                <span className="import-col-name">{col.displayName}</span>
                <select
                  className="import-col-select"
                  value={colOverrides[col.id] ?? col.type}
                  onChange={(e) => overrideType(col.id, e.target.value as ColumnType)}
                  aria-label={`Type for ${col.displayName}`}
                >
                  {(['string', 'integer', 'float', 'boolean', 'date', 'datetime', 'currency', 'percentage'] as ColumnType[]).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {/* Preview table */}
          <div className="import-preview-table-wrapper">
            <table className="import-preview-table" aria-label="Data preview">
              <thead>
                <tr>
                  {previewDataset.columns.map((col: Column) => (
                    <th key={col.id}>{col.displayName}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewDataset.rows.slice(0, PREVIEW_ROWS).map((row, i) => (
                  <tr key={i}>
                    {previewDataset.columns.map((col: Column) => (
                      <td key={col.id}>{String(row[col.id] ?? '')}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {previewDataset.rows.length > PREVIEW_ROWS && (
            <p className="import-preview__more">
              + {(previewDataset.rows.length - PREVIEW_ROWS).toLocaleString()} more rows…
            </p>
          )}

          <button className="import-confirm-btn" onClick={handleImport}>
            Import {previewDataset.rows.length.toLocaleString()} rows
          </button>
        </div>
      )}
    </div>
  );
}
