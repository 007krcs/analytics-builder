/**
 * ConnectorStatus — Connection status indicator component.
 */


export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error' | 'disconnected';

export interface ConnectorStatusProps {
  status: ConnectionStatus;
  label?: string;
  rowCount?: number;
}

const STATUS_CONFIG: Record<ConnectionStatus, { dot: string; text: string }> = {
  idle:         { dot: '#9ca3af', text: 'Idle' },
  connecting:   { dot: '#f59e0b', text: 'Connecting…' },
  connected:    { dot: '#16a34a', text: 'Connected' },
  error:        { dot: '#dc2626', text: 'Error' },
  disconnected: { dot: '#6b7280', text: 'Disconnected' },
};

export function ConnectorStatus({ status, label, rowCount }: ConnectorStatusProps) {
  const cfg = STATUS_CONFIG[status];

  return (
    <div className="connector-status" role="status" aria-live="polite">
      <span
        className="connector-status__dot"
        style={{ background: cfg.dot }}
        aria-hidden="true"
      />
      <span className="connector-status__text">
        {label ? `${label}: ` : ''}{cfg.text}
        {rowCount !== undefined && rowCount > 0 && ` (${rowCount.toLocaleString()} rows)`}
      </span>
    </div>
  );
}
