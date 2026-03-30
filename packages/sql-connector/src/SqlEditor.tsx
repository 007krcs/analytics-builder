/**
 * SqlEditor — Interactive SQL query editor for Analytix.
 *
 * Features:
 *  - Textarea for SQL input
 *  - Dataset import selector (import from AnalyticsEngine into SqlConnector)
 *  - Run button
 *  - Results table (first 100 rows)
 *  - Error display
 *  - All styles inline — no external CSS
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { AnalyticsEngine } from '@analytix/core';
import type { Row } from '@analytix/core';
import { SqlConnector } from './sql-connector.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SqlEditorProps {
  engine: AnalyticsEngine;
  /** Called with result rows whenever a query succeeds */
  onResult?: (rows: Row[]) => void;
  /** Optional initial SQL */
  initialSql?: string;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    fontSize: 14,
    color: '#0f172a',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap' as const,
  },
  importSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap' as const,
    padding: '8px 12px',
    background: '#f8fafc',
    borderRadius: 8,
    border: '1px solid #e2e8f0',
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  },
  select: {
    padding: '5px 10px',
    border: '1px solid #cbd5e1',
    borderRadius: 6,
    fontSize: 13,
    background: '#fff',
    color: '#1e293b',
    cursor: 'pointer',
    minWidth: 140,
  },
  importBtn: {
    padding: '5px 14px',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  },
  importBtnDisabled: {
    opacity: 0.4,
    cursor: 'not-allowed',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '2px 8px',
    background: '#dcfce7',
    border: '1px solid #86efac',
    borderRadius: 12,
    fontSize: 11,
    color: '#15803d',
    fontWeight: 600,
  },
  textarea: {
    width: '100%',
    minHeight: 120,
    padding: '12px 14px',
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
    fontSize: 13,
    lineHeight: 1.6,
    border: '1px solid #cbd5e1',
    borderRadius: 8,
    background: '#0f172a',
    color: '#e2e8f0',
    resize: 'vertical' as const,
    outline: 'none',
    boxSizing: 'border-box' as const,
    caretColor: '#818cf8',
  },
  runBtn: {
    padding: '8px 24px',
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  runBtnDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  clearBtn: {
    padding: '8px 16px',
    background: 'transparent',
    color: '#64748b',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    fontSize: 13,
    cursor: 'pointer',
  },
  errorBox: {
    padding: '12px 16px',
    background: '#fef2f2',
    border: '1px solid #fca5a5',
    borderRadius: 8,
    color: '#dc2626',
    fontSize: 13,
    fontFamily: "'JetBrains Mono', monospace",
    whiteSpace: 'pre-wrap' as const,
  },
  resultSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  resultMeta: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: 500,
  },
  tableWrapper: {
    overflowX: 'auto' as const,
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    maxHeight: 400,
    overflowY: 'auto' as const,
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: 12,
    minWidth: 400,
  },
  th: {
    padding: '8px 12px',
    textAlign: 'left' as const,
    background: '#f8fafc',
    borderBottom: '2px solid #e2e8f0',
    fontWeight: 700,
    color: '#475569',
    whiteSpace: 'nowrap' as const,
    position: 'sticky' as const,
    top: 0,
  },
  td: {
    padding: '6px 12px',
    borderBottom: '1px solid #f1f5f9',
    color: '#334155',
    fontFamily: "'JetBrains Mono', monospace",
    maxWidth: 240,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  },
  emptyState: {
    padding: '32px 16px',
    textAlign: 'center' as const,
    color: '#94a3b8',
    fontSize: 13,
  },
};

// ─── SqlEditor Component ──────────────────────────────────────────────────────

export function SqlEditor({ engine, onResult, initialSql }: SqlEditorProps) {
  const [sql, setSql] = useState(
    initialSql ??
    'SELECT region, SUM(revenue) AS total_revenue, COUNT(*) AS deals\nFROM sales\nGROUP BY region\nORDER BY total_revenue DESC'
  );
  const [results, setResults] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [importedTables, setImportedTables] = useState<string[]>([]);
  const [selectedDataset, setSelectedDataset] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const connectorRef = useRef<SqlConnector | null>(null);

  // Initialise connector once
  useEffect(() => {
    const connector = new SqlConnector();
    connector.init().then(() => {
      connectorRef.current = connector;
    });
  }, []);

  const availableDatasets = engine.getAllDatasets?.() ?? [];

  const handleImport = useCallback(async () => {
    const connector = connectorRef.current;
    if (!connector || !selectedDataset) return;
    const dataset = engine.getDataset(selectedDataset);
    if (!dataset) return;
    setIsImporting(true);
    try {
      await connector.importDataset(dataset.id, dataset.rows as Row[]);
      setImportedTables((prev) =>
        prev.includes(dataset.id) ? prev : [...prev, dataset.id]
      );
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsImporting(false);
    }
  }, [selectedDataset, engine]);

  const handleRun = useCallback(async () => {
    const connector = connectorRef.current;
    if (!connector || !sql.trim()) return;
    setIsRunning(true);
    setError(null);
    try {
      const rows = await connector.query(sql.trim());
      setResults(rows);
      onResult?.(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setResults(null);
    } finally {
      setIsRunning(false);
    }
  }, [sql, onResult]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void handleRun();
    }
  }, [handleRun]);

  const columns = results && results.length > 0 ? Object.keys(results[0]) : [];
  const displayRows = results?.slice(0, 100) ?? [];

  return (
    <div style={styles.wrapper}>

      {/* Dataset import section */}
      <div style={styles.importSection}>
        <span style={styles.label}>Import dataset</span>
        <select
          style={styles.select}
          value={selectedDataset}
          onChange={(e) => setSelectedDataset(e.target.value)}
          aria-label="Select dataset to import"
        >
          <option value="">Select dataset…</option>
          {availableDatasets.map((ds) => (
            <option key={ds.id} value={ds.id}>
              {ds.name} ({ds.source.rowCount.toLocaleString()} rows)
            </option>
          ))}
        </select>
        <button
          style={{
            ...styles.importBtn,
            ...(isImporting || !selectedDataset ? styles.importBtnDisabled : {}),
          }}
          onClick={handleImport}
          disabled={isImporting || !selectedDataset}
          aria-label="Import selected dataset as SQL table"
        >
          {isImporting ? 'Importing…' : 'Import'}
        </button>

        {importedTables.length > 0 && (
          <span style={styles.label} aria-live="polite">
            Tables:&nbsp;
            {importedTables.map((t) => (
              <span key={t} style={styles.badge}>{t}</span>
            ))}
          </span>
        )}
      </div>

      {/* SQL textarea */}
      <div>
        <textarea
          style={styles.textarea}
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
          aria-label="SQL query editor"
          aria-describedby="sql-editor-hint"
          rows={6}
        />
        <p id="sql-editor-hint" style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
          Ctrl+Enter to run &middot; Supports SELECT, FROM, WHERE, GROUP BY, ORDER BY, LIMIT
        </p>
      </div>

      {/* Toolbar */}
      <div style={styles.toolbar}>
        <button
          style={{
            ...styles.runBtn,
            ...(isRunning ? styles.runBtnDisabled : {}),
          }}
          onClick={handleRun}
          disabled={isRunning || !sql.trim()}
          aria-busy={isRunning}
        >
          {isRunning ? 'Running…' : '▶ Run Query'}
        </button>
        <button
          style={styles.clearBtn}
          onClick={() => { setResults(null); setError(null); }}
          aria-label="Clear results"
        >
          Clear
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div style={styles.errorBox} role="alert" aria-label="Query error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results */}
      {results !== null && (
        <div style={styles.resultSection}>
          <div style={styles.resultMeta} aria-live="polite">
            {results.length === 0
              ? 'No rows returned.'
              : `${results.length.toLocaleString()} row${results.length !== 1 ? 's' : ''} returned${results.length > 100 ? ' (showing first 100)' : ''}`
            }
          </div>

          {columns.length > 0 && (
            <div style={styles.tableWrapper}>
              <table style={styles.table} aria-label="Query results">
                <thead>
                  <tr>
                    {columns.map((col) => (
                      <th key={col} style={styles.th} scope="col">{col}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayRows.map((row, ri) => (
                    <tr key={ri}>
                      {columns.map((col) => (
                        <td key={col} style={styles.td} title={String(row[col] ?? '')}>
                          {row[col] == null ? (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>null</span>
                          ) : (
                            typeof row[col] === 'number'
                              ? (row[col] as number).toLocaleString()
                              : String(row[col])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {results.length === 0 && (
            <div style={styles.emptyState}>No rows matched your query.</div>
          )}
        </div>
      )}
    </div>
  );
}
