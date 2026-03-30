/**
 * PivotTable — Renders a PivotResult as an HTML table with sticky headers.
 */

import type { PivotResult, PivotRow } from '@analytix/core';

export interface PivotTableProps {
  result: PivotResult;
  maxRows?: number;
  /** Whether to highlight cells on hover */
  highlightOnHover?: boolean;
  className?: string;
}

export function PivotTable({
  result,
  maxRows = 500,
  highlightOnHover = true,
  className,
}: PivotTableProps) {
  const visibleRows = result.rows.slice(0, maxRows);
  const truncated = result.rows.length > maxRows;

  return (
    <div className={`pivot-table-wrapper ${className ?? ''}`.trim()}>
      <div className="pivot-table-meta">
        <span>{result.rowCount.toLocaleString()} rows × {result.columnCount} columns</span>
        <span className="pivot-duration">{result.durationMs.toFixed(1)}ms</span>
      </div>

      <div className="pivot-table-scroll">
        <table className={`pivot-table ${highlightOnHover ? 'pivot-table--hover' : ''}`}>
          <thead>
            <tr>
              {/* Row dimension headers */}
              <th className="pivot-th pivot-th--row-key">
                {/* Empty corner cell */}
              </th>
              {result.flatColumns.map((col) => (
                <th
                  key={col.key}
                  className={`pivot-th ${col.isTotal ? 'pivot-th--total' : ''}`}
                  title={col.label}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {visibleRows.map((row) => (
              <PivotRowComponent
                key={row.key}
                row={row}
                columns={result.flatColumns.map((c) => c.key)}
                valueCount={result.flatColumns.length}
              />
            ))}

            {result.grandTotalRow && (
              <tr className="pivot-row pivot-row--total">
                <td className="pivot-td pivot-td--label pivot-td--total">Grand Total</td>
                {result.flatColumns.map((col) => {
                  const cell = result.grandTotalRow!.cells[col.key];
                  return (
                    <td key={col.key} className="pivot-td pivot-td--value pivot-td--total">
                      {cell?.formatted ?? '—'}
                    </td>
                  );
                })}
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {truncated && (
        <div className="pivot-truncated">
          Showing {maxRows.toLocaleString()} of {result.rowCount.toLocaleString()} rows
        </div>
      )}
    </div>
  );
}

interface PivotRowComponentProps {
  row: PivotRow;
  columns: string[];
  valueCount: number;
}

function PivotRowComponent({ row, columns, valueCount: _valueCount }: PivotRowComponentProps) {
  const label = Object.values(row.dimensions).join(' › ') || '(empty)';

  return (
    <tr
      className={`pivot-row ${row.isSubtotal ? 'pivot-row--subtotal' : ''}`}
      style={{ paddingLeft: `${row.depth * 16}px` }}
    >
      <td className="pivot-td pivot-td--label" title={label}>
        {row.depth > 0 && (
          <span
            className="pivot-indent"
            style={{ display: 'inline-block', width: `${row.depth * 16}px` }}
          />
        )}
        {label}
      </td>
      {columns.map((colKey) => {
        const cell = row.cells[colKey];
        const isNull = cell?.value === null;
        return (
          <td
            key={colKey}
            className={`pivot-td pivot-td--value ${isNull ? 'pivot-td--null' : ''}`}
            data-value={cell?.value ?? ''}
          >
            {cell?.formatted ?? '—'}
          </td>
        );
      })}
    </tr>
  );
}
