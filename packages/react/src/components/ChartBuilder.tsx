/**
 * ChartBuilder — Configuration UI for building a chart from a dataset.
 * Renders the chart using Recharts based on the selected ChartType.
 */

import { useState, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  ScatterChart, Scatter, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { AnalyticsEngine, ChartConfig, Dataset, ChartType } from '@analytix/core';
import { getChartMeta, getChartsByCategory, prepareChartData } from '@analytix/chart-engine';

const CHART_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6',
  '#a855f7', '#14b8a6', '#f97316', '#ec4899', '#84cc16',
];

// ─── Chart renderer ──────────────────────────────────────────────────────────

interface ChartRendererProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
  height?: number;
}

function ChartRenderer({ config, data, height = 300 }: ChartRendererProps) {
  const xKey = config.xField;
  const yKeys = config.series.map((s) => s.label ?? s.columnId);
  const colors = config.colors ?? CHART_COLORS;

  if (data.length === 0) {
    return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No data</div>;
  }

  const commonProps = {
    data,
    margin: { top: 10, right: 20, left: 0, bottom: 5 },
  };

  switch (config.type) {
    case 'bar':
    case 'bar-stacked':
    case 'bar-stacked-100': {
      const stacked = config.type !== 'bar';
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={colors[i % colors.length]} stackId={stacked ? 'stack' : undefined} />
            ))}
            {config.referenceLines?.map((rl) => (
              <ReferenceLine key={rl.id} y={rl.axis === 'y' ? Number(rl.value) : undefined} x={rl.axis === 'x' ? String(rl.value) : undefined} label={rl.label} stroke={rl.color ?? '#ef4444'} strokeDasharray={rl.strokeDasharray} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'bar-horizontal': {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart {...commonProps} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis type="category" dataKey={xKey} width={120} />
            <Tooltip />
            <Legend />
            {yKeys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={colors[i % colors.length]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'line':
    case 'line-smooth': {
      const curveType = config.type === 'line-smooth' ? 'monotone' : 'linear';
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yKeys.map((key, i) => (
              <Line key={key} type={curveType} dataKey={key} stroke={colors[i % colors.length]} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    case 'area':
    case 'area-stacked': {
      const stacked = config.type === 'area-stacked';
      return (
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yKeys.map((key, i) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colors[i % colors.length]}
                fill={colors[i % colors.length]}
                fillOpacity={0.3}
                stackId={stacked ? 'stack' : undefined}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    case 'scatter':
    case 'bubble': {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart {...commonProps}>
            <CartesianGrid />
            <XAxis dataKey={xKey} name={xKey} type="number" />
            <YAxis dataKey={yKeys[0]} name={yKeys[0]} type="number" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name={config.title} data={data} fill={colors[0]} />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    case 'pie':
    case 'donut': {
      const innerRadius = config.type === 'donut' ? '55%' : 0;
      return (
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius="70%"
              dataKey={yKeys[0]}
              nameKey={xKey}
              label={({ name, percentage }: { name: string; percentage: number }) => `${name}: ${percentage}%`}
            >
              {data.map((_entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    case 'radar':
    case 'polar': {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" />
            {yKeys.map((key, i) => (
              <Radar key={key} name={key} dataKey={key} stroke={colors[i % colors.length]} fill={colors[i % colors.length]} fillOpacity={0.3} />
            ))}
            <Legend />
            <Tooltip />
          </RadarChart>
        </ResponsiveContainer>
      );
    }

    default:
      return (
        <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: 14 }}>
          Chart type "{config.type}" not yet rendered in preview
        </div>
      );
  }
}

// ─── ChartBuilder ─────────────────────────────────────────────────────────────

export interface ChartBuilderProps {
  engine: AnalyticsEngine;
  dataset: Dataset | null;
  initialConfig?: Partial<ChartConfig>;
  onConfigChange?: (config: ChartConfig) => void;
  height?: number;
  className?: string;
}

export function ChartBuilder({
  engine: _engine,
  dataset,
  initialConfig,
  onConfigChange,
  height = 350,
  className,
}: ChartBuilderProps) {
  const [chartType, setChartType] = useState<ChartType>(initialConfig?.type ?? 'bar');
  const [xField, setXField] = useState(initialConfig?.xField ?? '');
  const [yField, setYField] = useState(initialConfig?.series?.[0]?.columnId ?? '');
  const [title, setTitle] = useState(initialConfig?.title ?? 'New Chart');

  const chartsByCategory = getChartsByCategory();
  const columns = dataset?.columns ?? [];
  const numericCols = columns.filter((c) => c.aggregatable);
  const allCols = columns;

  const buildConfig = useCallback((): ChartConfig => {
    return {
      id: initialConfig?.id ?? `chart-${Date.now()}`,
      type: chartType,
      title,
      sourceId: dataset?.id ?? '',
      sourceType: 'dataset',
      xField,
      series: yField
        ? [{ id: `series-0`, columnId: yField, label: columns.find((c) => c.id === yField)?.displayName ?? yField }]
        : [],
      filters: [],
      legend: { show: true, position: 'bottom' },
      tooltip: { show: true, shared: true },
      colorPalette: 'default',
      responsive: true,
      animationDuration: 400,
      showDataLabels: false,
    };
  }, [chartType, title, xField, yField, dataset, columns, initialConfig?.id]);

  const handleApply = () => {
    const config = buildConfig();
    onConfigChange?.(config);
  };

  // Prepare chart data for preview
  let previewData: Record<string, unknown>[] = [];
  if (dataset && xField && yField) {
    try {
      const config = buildConfig();
      const prepared = prepareChartData(config, dataset.rows, dataset);
      previewData = prepared.data as Record<string, unknown>[];
    } catch (_e) {
      // ignore
    }
  }

  const currentConfig = buildConfig();

  return (
    <div className={`chart-builder ${className ?? ''}`.trim()}>
      <div className="chart-builder-controls">
        <div className="chart-control-group">
          <label className="chart-control-label">Chart type</label>
          <div className="chart-type-grid">
            {Object.entries(chartsByCategory).map(([category, types]) => (
              <div key={category} className="chart-type-category">
                <div className="chart-type-category-label">{category}</div>
                {types.map((meta) => (
                  <button
                    key={meta.type}
                    className={`chart-type-btn ${chartType === meta.type ? 'chart-type-btn--active' : ''}`}
                    onClick={() => setChartType(meta.type)}
                    title={meta.description}
                  >
                    <span className="chart-type-icon">{meta.icon}</span>
                    <span className="chart-type-label">{meta.label}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="chart-control-group">
          <label className="chart-control-label">Title</label>
          <input
            className="chart-control-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Chart title"
          />
        </div>

        <div className="chart-control-group">
          <label className="chart-control-label">X Axis</label>
          <select
            className="chart-control-select"
            value={xField}
            onChange={(e) => setXField(e.target.value)}
          >
            <option value="">Select field...</option>
            {allCols.map((c) => (
              <option key={c.id} value={c.id}>{c.displayName}</option>
            ))}
          </select>
        </div>

        <div className="chart-control-group">
          <label className="chart-control-label">Y Axis (Value)</label>
          <select
            className="chart-control-select"
            value={yField}
            onChange={(e) => setYField(e.target.value)}
          >
            <option value="">Select measure...</option>
            {numericCols.map((c) => (
              <option key={c.id} value={c.id}>{c.displayName}</option>
            ))}
          </select>
        </div>

        <button
          className="chart-apply-btn"
          onClick={handleApply}
          disabled={!xField || !yField}
        >
          Apply
        </button>
      </div>

      <div className="chart-builder-preview">
        <div className="chart-preview-title">{title}</div>
        {getChartMeta(chartType) && (
          <div className="chart-preview-desc">{getChartMeta(chartType).description}</div>
        )}
        <ChartRenderer
          config={currentConfig}
          data={previewData}
          height={height}
        />
      </div>
    </div>
  );
}
