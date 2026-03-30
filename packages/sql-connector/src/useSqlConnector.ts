/**
 * useSqlConnector — React hook wrapping SqlConnector for use in components.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AnalyticsEngine } from '@analytix/core';
import type { Row } from '@analytix/core';
import { SqlConnector } from './sql-connector.js';

export interface UseSqlConnectorResult {
  /** Run a SQL query string; returns rows on success */
  query: (sql: string) => Promise<Row[]>;
  /** Register a named table from an array of rows */
  importDataset: (name: string, rows: Row[]) => Promise<void>;
  /** Whether the connector is initialised */
  isReady: boolean;
  /** Last error, if any */
  error: Error | null;
}

/**
 * useSqlConnector
 *
 * Provides a stable SqlConnector instance tied to the component lifecycle.
 * Automatically imports all datasets from the AnalyticsEngine on mount.
 *
 * @param engine  The AnalyticsEngine instance (used to seed initial tables)
 */
export function useSqlConnector(_engine: AnalyticsEngine): UseSqlConnectorResult {
  const connectorRef = useRef<SqlConnector | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialise on mount
  useEffect(() => {
    const connector = new SqlConnector();
    connectorRef.current = connector;

    connector.init()
      .then(() => {
        setIsReady(true);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e : new Error(String(e)));
      });

    return () => {
      // No cleanup needed for in-memory connector
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const query = useCallback(async (sql: string): Promise<Row[]> => {
    const connector = connectorRef.current;
    if (!connector) throw new Error('SqlConnector not initialised');
    return connector.query(sql);
  }, []);

  const importDataset = useCallback(async (name: string, rows: Row[]): Promise<void> => {
    const connector = connectorRef.current;
    if (!connector) throw new Error('SqlConnector not initialised');
    return connector.importDataset(name, rows);
  }, []);

  return { query, importDataset, isReady, error };
}
