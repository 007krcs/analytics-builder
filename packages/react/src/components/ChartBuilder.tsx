// © 2025 GridStorm / Tekivex — All Rights Reserved
// Unauthorized reproduction or distribution is prohibited.
/**
 * ChartBuilder — Configuration UI for building a chart from a dataset.
 * Renders the chart using Recharts based on the selected ChartType.
 */

import { useState, useCallback } from 'react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  ScatterChart, Scatter, ZAxis, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine,
  Treemap, FunnelChart, Funnel, LabelList,
  RadialBarChart, RadialBar,
  ComposedChart,
  Sankey,
  Brush,
} from 'recharts';
import type { AnalyticsEngine, ChartConfig, Dataset, ChartType } from '@gridstorm/analytix-core';
import { getChartMeta, getChartsByCategory, prepareChartData } from '@gridstorm/analytix-chart-engine';

const CHART_COLORS = [
  '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#3b82f6',
  '#a855f7', '#14b8a6', '#f97316', '#ec4899', '#84cc16',
];

// ─── Custom chart components ──────────────────────────────────────────────────

/** Calendar heatmap rendered as an SVG grid */
function CalendarHeatmapChart({ data, valueKey, height }: {
  data: Record<string, unknown>[];
  valueKey: string;
  height: number;
}) {
  if (data.length === 0) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No data — select a date field as X Axis</div>;

  const vals = data.map(d => Number(d[valueKey]) || 0);
  const maxVal = Math.max(...vals) || 1;

  // Group by week
  const byDate = new Map<string, number>();
  data.forEach(d => {
    const date = String(d.date ?? '');
    byDate.set(date, Number(d[valueKey]) || 0);
  });

  const dates = Array.from(byDate.keys()).sort();
  if (dates.length === 0) return null;

  const startDate = new Date(dates[0]);
  const endDate = new Date(dates[dates.length - 1]);

  // Validate that dates are actual dates
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return (
      <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6b7280', gap: 8, padding: 16, textAlign: 'center' }}>
        <span style={{ fontSize: 28 }}>📅</span>
        <strong>Calendar Heatmap needs a Date field</strong>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>Set X Axis to "Date" column to see the calendar grid</span>
      </div>
    );
  }

  const cellSize = 13;
  const gap = 2;

  // Build weeks
  const weeks: Array<Array<{ date: string; value: number } | null>> = [];
  const cur = new Date(startDate);
  // Align to Sunday
  cur.setDate(cur.getDate() - cur.getDay());

  while (cur <= endDate) {
    const week: Array<{ date: string; value: number } | null> = [];
    for (let d = 0; d < 7; d++) {
      const iso = cur.toISOString().slice(0, 10);
      if (cur < startDate || cur > endDate) {
        week.push(null);
      } else {
        week.push({ date: iso, value: byDate.get(iso) ?? 0 });
      }
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }

  const svgWidth = weeks.length * (cellSize + gap) + 30;
  const svgHeight = 7 * (cellSize + gap) + 20;

  const colorForVal = (v: number) => {
    const intensity = v / maxVal;
    if (intensity === 0) return '#f3f4f6';
    if (intensity < 0.25) return '#bbf7d0';
    if (intensity < 0.5) return '#4ade80';
    if (intensity < 0.75) return '#16a34a';
    return '#14532d';
  };

  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div style={{ overflowX: 'auto', height }}>
      <svg width={svgWidth} height={svgHeight}>
        {days.map((d, i) => (
          <text key={i} x={4} y={(i + 0.8) * (cellSize + gap) + 10} fontSize={9} fill="#9ca3af">{d}</text>
        ))}
        {weeks.map((week, wi) =>
          week.map((cell, di) =>
            cell ? (
              <rect
                key={`${wi}-${di}`}
                x={wi * (cellSize + gap) + 28}
                y={di * (cellSize + gap) + 8}
                width={cellSize}
                height={cellSize}
                rx={2}
                fill={colorForVal(cell.value)}
              >
                <title>{`${cell.date}: ${cell.value}`}</title>
              </rect>
            ) : (
              <rect
                key={`${wi}-${di}`}
                x={wi * (cellSize + gap) + 28}
                y={di * (cellSize + gap) + 8}
                width={cellSize}
                height={cellSize}
                rx={2}
                fill="#f9fafb"
              />
            )
          )
        )}
      </svg>
    </div>
  );
}

/** Heatmap as a colored grid */
function HeatmapGrid({ data, xKey, yKey, valueKey, height }: {
  data: Record<string, unknown>[];
  xKey: string;
  yKey: string;
  valueKey: string;
  height: number;
}) {
  if (data.length === 0) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No data</div>;

  const xValues = Array.from(new Set(data.map(d => String(d[xKey] ?? ''))));
  const yValues = Array.from(new Set(data.map(d => String(d[yKey] ?? ''))));
  const vals = data.map(d => Number(d[valueKey]) || 0);
  const maxVal = Math.max(...vals) || 1;
  const minVal = Math.min(...vals);

  const colorFor = (v: number) => {
    const t = (v - minVal) / (maxVal - minVal || 1);
    const r = Math.round(255 * t);
    const b = Math.round(255 * (1 - t));
    return `rgb(${r}, 80, ${b})`;
  };

  const cellW = Math.max(40, Math.min(80, (600 - 80) / xValues.length));
  const cellH = Math.max(20, Math.min(40, (height - 40) / yValues.length));

  return (
    <div style={{ overflowX: 'auto', overflowY: 'auto', height }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ minWidth: 80, padding: '2px 6px', textAlign: 'left', fontSize: 10, color: '#6b7280' }} />
            {xValues.map(x => (
              <th key={x} style={{ minWidth: cellW, padding: '2px 4px', fontSize: 10, color: '#6b7280', fontWeight: 500, textAlign: 'center', maxWidth: cellW, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={x}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {yValues.map(y => (
            <tr key={y}>
              <td style={{ padding: '2px 6px', fontSize: 10, color: '#374151', fontWeight: 500, whiteSpace: 'nowrap' }}>{y}</td>
              {xValues.map(x => {
                const cell = data.find(d => String(d[xKey]) === x && String(d[yKey]) === y);
                const v = cell ? Number(cell[valueKey]) || 0 : 0;
                return (
                  <td
                    key={x}
                    style={{
                      background: colorFor(v),
                      width: cellW,
                      height: cellH,
                      textAlign: 'center',
                      color: '#fff',
                      fontSize: 10,
                      fontWeight: 500,
                    }}
                    title={`${y} × ${x}: ${v}`}
                  >
                    {v > 0 ? v.toLocaleString() : ''}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Box plot using custom SVG via Recharts customized bar */
function BoxPlotChart({ data, xKey, height }: {
  data: Record<string, unknown>[];
  xKey: string;
  height: number;
}) {
  if (data.length === 0) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No data</div>;

  const allVals = data.flatMap(d => [
    Number(d.min) || 0, Number(d.q1) || 0, Number(d.median) || 0,
    Number(d.q3) || 0, Number(d.max) || 0,
  ]);
  const domainMin = Math.min(...allVals) * 0.95;
  const domainMax = Math.max(...allVals) * 1.05;

  const svgPad = { top: 20, right: 20, bottom: 40, left: 50 };
  const svgW = Math.max(data.length * 80 + svgPad.left + svgPad.right, 300);
  const svgH = height;
  const chartH = svgH - svgPad.top - svgPad.bottom;
  const chartW = svgW - svgPad.left - svgPad.right;
  const range = domainMax - domainMin || 1;
  const toY = (v: number) => svgPad.top + chartH - ((v - domainMin) / range) * chartH;
  const bw = Math.min(chartW / data.length * 0.5, 50);

  // Y axis ticks
  const ticks = 5;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) => domainMin + (range / ticks) * i);

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={svgW} height={svgH}>
        {/* Y axis */}
        {yTicks.map(t => (
          <g key={t}>
            <line x1={svgPad.left} y1={toY(t)} x2={svgW - svgPad.right} y2={toY(t)} stroke="#e5e7eb" />
            <text x={svgPad.left - 4} y={toY(t) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
              {t >= 1000 ? `${(t / 1000).toFixed(0)}k` : t.toFixed(0)}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const min = Number(d.min) || 0;
          const q1 = Number(d.q1) || 0;
          const median = Number(d.median) || 0;
          const q3 = Number(d.q3) || 0;
          const max = Number(d.max) || 0;
          const cx = svgPad.left + (i + 0.5) * (chartW / data.length);
          return (
            <g key={i}>
              {/* Whisker lines */}
              <line x1={cx} y1={toY(min)} x2={cx} y2={toY(q1)} stroke="#6366f1" strokeWidth={1.5} />
              <line x1={cx - bw / 4} y1={toY(min)} x2={cx + bw / 4} y2={toY(min)} stroke="#6366f1" strokeWidth={1.5} />
              <line x1={cx} y1={toY(q3)} x2={cx} y2={toY(max)} stroke="#6366f1" strokeWidth={1.5} />
              <line x1={cx - bw / 4} y1={toY(max)} x2={cx + bw / 4} y2={toY(max)} stroke="#6366f1" strokeWidth={1.5} />
              {/* IQR Box */}
              <rect
                x={cx - bw / 2}
                y={toY(q3)}
                width={bw}
                height={Math.max(toY(q1) - toY(q3), 1)}
                fill="#6366f120"
                stroke="#6366f1"
                strokeWidth={1.5}
              />
              {/* Median line */}
              <line x1={cx - bw / 2} y1={toY(median)} x2={cx + bw / 2} y2={toY(median)} stroke="#ef4444" strokeWidth={2} />
              {/* Label */}
              <text x={cx} y={svgH - svgPad.bottom + 14} textAnchor="middle" fontSize={10} fill="#6b7280">
                {String(d[xKey] ?? '')}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Violin plot — approximated as mirrored density histogram */
function ViolinChart({ data, xKey, height }: {
  data: Record<string, unknown>[];
  xKey: string;
  height: number;
}) {
  if (data.length === 0) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>No data</div>;

  const allVals = data.flatMap(d => [Number(d.min) || 0, Number(d.max) || 0]);
  const domainMin = Math.min(...allVals) * 0.95;
  const domainMax = Math.max(...allVals) * 1.05;

  const svgPad = { top: 20, right: 20, bottom: 40, left: 50 };
  const svgW = Math.max(data.length * 100 + svgPad.left + svgPad.right, 300);
  const svgH = height;
  const chartH = svgH - svgPad.top - svgPad.bottom;
  const chartW = svgW - svgPad.left - svgPad.right;
  const range = domainMax - domainMin || 1;
  const toY = (v: number) => svgPad.top + chartH - ((v - domainMin) / range) * chartH;
  const maxHalfW = Math.min(chartW / data.length * 0.4, 35);

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={svgW} height={svgH}>
        {data.map((d, i) => {
          const min = Number(d.min) || 0;
          const q1 = Number(d.q1) || 0;
          const median = Number(d.median) || 0;
          const q3 = Number(d.q3) || 0;
          const max = Number(d.max) || 0;
          const cx = svgPad.left + (i + 0.5) * (chartW / data.length);

          // Build violin path: upper half = wide at IQR, narrow at extremes
          const pts = [
            [0, min], [maxHalfW * 0.3, (min + q1) / 2],
            [maxHalfW, q1], [maxHalfW * 1.1, median],
            [maxHalfW, q3], [maxHalfW * 0.3, (q3 + max) / 2],
            [0, max],
          ];
          const rightPath = pts.map(([w, v], idx) => `${idx === 0 ? 'M' : 'L'} ${cx + w},${toY(v)}`).join(' ');
          const leftPath = [...pts].reverse().map(([w, v]) => `L ${cx - w},${toY(v)}`).join(' ');
          const fullPath = rightPath + ' ' + leftPath + ' Z';

          return (
            <g key={i}>
              <path d={fullPath} fill="#6366f130" stroke="#6366f1" strokeWidth={1.5} />
              {/* Median dot */}
              <circle cx={cx} cy={toY(median)} r={4} fill="#ef4444" />
              <text x={cx} y={svgH - svgPad.bottom + 14} textAnchor="middle" fontSize={10} fill="#6b7280">
                {String(d[xKey] ?? '')}
              </text>
            </g>
          );
        })}
        {/* Y axis labels */}
        {[domainMin, (domainMin + domainMax) / 2, domainMax].map(t => (
          <text key={t} x={svgPad.left - 4} y={toY(t) + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
            {t >= 1000 ? `${(t / 1000).toFixed(0)}k` : t.toFixed(0)}
          </text>
        ))}
      </svg>
    </div>
  );
}

/** Sunburst using two nested Pie rings */
function SunburstChart({ data, valueKey, height, colors }: {
  data: Record<string, unknown>[];
  valueKey: string;
  height: number;
  colors: string[];
}) {
  // Inner ring = parent totals, outer ring = individual items
  const parentTotals = new Map<string, number>();
  for (const d of data) {
    const parent = String(d.parent ?? d.name ?? '');
    const v = Number(d[valueKey]) || 0;
    parentTotals.set(parent, (parentTotals.get(parent) ?? 0) + v);
  }

  const innerData = Array.from(parentTotals.entries()).map(([name, value]) => ({ name, value }));
  const outerData = data.map(d => ({ name: String(d.name ?? ''), value: Number(d[valueKey]) || 0 }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={innerData} cx="50%" cy="50%" outerRadius="35%" dataKey="value" nameKey="name">
          {innerData.map((_e, idx) => <Cell key={idx} fill={colors[idx % colors.length]} />)}
        </Pie>
        <Pie data={outerData} cx="50%" cy="50%" innerRadius="38%" outerRadius="65%" dataKey="value" nameKey="name" label={({ name }: { name: string }) => name}>
          {outerData.map((_e, idx) => <Cell key={idx} fill={colors[idx % colors.length] + 'bb'} />)}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Chart renderer ──────────────────────────────────────────────────────────

interface ChartRendererProps {
  config: ChartConfig;
  data: Record<string, unknown>[];
  domain?: { min: number; max: number };
  height?: number;
}

function ChartRenderer({ config, data, domain: _domain, height = 300 }: ChartRendererProps) {
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
      const isSmooth = config.type === 'line-smooth';
      const showBrush = data.length > 20;
      return (
        <ResponsiveContainer width="100%" height={height}>
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yKeys.map((key, i) => (
              <Line
                key={key}
                type={isSmooth ? 'monotone' : 'linear'}
                dataKey={key}
                stroke={colors[i % colors.length]}
                strokeWidth={isSmooth ? 2.5 : 1.5}
                dot={isSmooth ? false : { r: 3 }}
                activeDot={{ r: 5 }}
              />
            ))}
            {showBrush && (
              <Brush
                dataKey={xKey}
                height={24}
                stroke="#6366f1"
                fill="#f5f3ff"
                travellerWidth={8}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      );
    }

    case 'area':
    case 'area-stacked': {
      const stacked = config.type === 'area-stacked';
      const showBrush = data.length > 20;
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
            {showBrush && (
              <Brush
                dataKey={xKey}
                height={24}
                stroke="#6366f1"
                fill="#f5f3ff"
                travellerWidth={8}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    case 'scatter': {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart {...commonProps}>
            <CartesianGrid />
            <XAxis dataKey={xKey} name={xKey} type="number" />
            <YAxis dataKey={yKeys[0]} name={yKeys[0]} type="number" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name={config.title} data={data} fill={colors[0]} shape="circle" />
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    case 'bubble': {
      // Bubble uses ZAxis for size — derived from second series or magnitude of first
      const bubbleData = data.map(d => ({
        ...d,
        __z__: Number(d['__size__'] ?? d[yKeys[1] ?? yKeys[0]] ?? 1),
      }));
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart {...commonProps}>
            <CartesianGrid />
            <XAxis dataKey={xKey} name={xKey} type="number" />
            <YAxis dataKey={yKeys[0]} name={yKeys[0]} type="number" />
            <ZAxis dataKey="__z__" range={[40, 400]} name="Size" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            {colors.slice(0, Math.max(yKeys.length, 1)).map((color, i) => (
              <Scatter key={i} name={yKeys[i] ?? config.title} data={bubbleData} fill={color} fillOpacity={0.5} />
            ))}
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
              nameKey="name"
              label={({ name, percentage }: { name: string; percentage: number }) => `${name}: ${(percentage ?? 0).toFixed(1)}%`}
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

    case 'radar': {
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

    case 'polar': {
      // Nightingale Rose / Polar Area chart using RadialBarChart
      const polarData = data.slice(0, 12).map((d, i) => ({
        name: String(d.subject ?? d[xKey] ?? `Item ${i + 1}`),
        value: Number(d[yKeys[0]]) || 0,
        fill: colors[i % colors.length],
      }));
      return (
        <ResponsiveContainer width="100%" height={height}>
          <RadialBarChart
            cx="50%"
            cy="50%"
            innerRadius="15%"
            outerRadius="85%"
            startAngle={90}
            endAngle={-270}
            data={polarData}
          >
            <RadialBar
              dataKey="value"
              background={{ fill: '#f3f4f6' }}
              cornerRadius={4}
              label={{ position: 'insideStart', fill: '#fff', fontSize: 10 }}
            >
              {polarData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </RadialBar>
            <Legend
              iconSize={10}
              formatter={(value: unknown) => String(polarData[value as number]?.name ?? value)}
            />
            <Tooltip />
          </RadialBarChart>
        </ResponsiveContainer>
      );
    }

    // ── New chart types ──────────────────────────────────────────────────────

    case 'waterfall': {
      // Data: [{[xKey], [valueKey], start, isNegative}]
      const valueKey = yKeys[0];
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip
              formatter={(value: number | string, name: string) =>
                name === 'start' ? null : ([value, valueKey] as [number | string, string])
              }
            />
            <Legend />
            {/* Invisible spacer bar */}
            <Bar dataKey="start" stackId="wf" fill="transparent" stroke="none" legendType="none" />
            {/* Value bar — colored by isNegative */}
            <Bar dataKey={valueKey} stackId="wf" name={valueKey}>
              {data.map((entry, index) => (
                <Cell
                  key={index}
                  fill={entry.isNegative ? '#ef4444' : '#22c55e'}
                />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    case 'histogram': {
      return (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={commonProps.margin} barCategoryGap="1%">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="x" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill={colors[0]} name="Frequency" />
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case 'gauge': {
      // RadialBar gauge: data[0].value as % of target (use domain or config)
      const rawVal = Number(data[0]?.value) || 0;
      const target = (config as ChartConfig & { target?: number }).target ?? rawVal * 1.25;
      const pct = Math.min((rawVal / (target || 1)) * 100, 100);
      const gaugeData = [{ name: yKeys[0] ?? 'Value', value: pct }];
      return (
        <ResponsiveContainer width="100%" height={height}>
          <RadialBarChart
            cx="50%"
            cy="70%"
            innerRadius="60%"
            outerRadius="90%"
            startAngle={180}
            endAngle={0}
            data={gaugeData}
          >
            <RadialBar
              dataKey="value"
              cornerRadius={8}
              background={{ fill: '#e5e7eb' }}
              fill={pct >= 80 ? '#22c55e' : pct >= 50 ? '#f59e0b' : '#ef4444'}
              label={false}
            />
            <text x="50%" y="60%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 22, fontWeight: 700, fill: '#1f2937' }}>
              {rawVal >= 1000 ? `${(rawVal / 1000).toFixed(1)}k` : rawVal.toFixed(1)}
            </text>
            <text x="50%" y="72%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 12, fill: '#6b7280' }}>
              {yKeys[0] ?? 'Value'}
            </text>
          </RadialBarChart>
        </ResponsiveContainer>
      );
    }

    case 'treemap': {
      const treeKey = yKeys[0] ?? 'value';
      const treemapData = data.map(d => ({ name: String(d.name ?? d[xKey] ?? ''), size: Number(d[treeKey]) || 0 }));
      const treeColors = colors;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const TreemapCell = (props: any) => {
        const { x, y, width: w, height: h, name, value, index } = props as {
          x: number; y: number; width: number; height: number;
          name: string; value: number; index: number;
        };
        if (w < 20 || h < 20) return <rect x={x} y={y} width={w} height={h} fill={treeColors[index % treeColors.length]} />;
        return (
          <g>
            <rect x={x} y={y} width={w} height={h} fill={treeColors[index % treeColors.length]} stroke="#fff" strokeWidth={2} />
            {w > 50 && h > 24 && (
              <text x={x + w / 2} y={y + h / 2 - 6} textAnchor="middle" fill="#fff" fontSize={Math.min(12, w / 6)} fontWeight={600}>
                {name}
              </text>
            )}
            {w > 50 && h > 40 && (
              <text x={x + w / 2} y={y + h / 2 + 10} textAnchor="middle" fill="#ffffffbb" fontSize={10}>
                {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
              </text>
            )}
          </g>
        );
      };
      return (
        <ResponsiveContainer width="100%" height={height}>
          <Treemap
            data={treemapData}
            dataKey="size"
            nameKey="name"
            aspectRatio={4 / 3}
            content={<TreemapCell />}
          />
        </ResponsiveContainer>
      );
    }

    case 'sunburst': {
      const vKey = yKeys[0] ?? 'value';
      return (
        <SunburstChart data={data} valueKey={vKey} height={height} colors={colors} />
      );
    }

    case 'heatmap': {
      if (!config.groupField) {
        return (
          <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6b7280', gap: 8, padding: 16, textAlign: 'center' }}>
            <span style={{ fontSize: 28 }}>🌡️</span>
            <strong>Heatmap needs a Y Axis field</strong>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>Set X Axis (columns) and Group Field / Y Axis (rows)</span>
          </div>
        );
      }
      const hYKey = config.groupField;
      const hVKey = yKeys[0] ?? 'value';
      return (
        <HeatmapGrid data={data} xKey={xKey} yKey={hYKey} valueKey={hVKey} height={height} />
      );
    }

    case 'calendar-heatmap': {
      const calVKey = yKeys[0] ?? 'value';
      return (
        <CalendarHeatmapChart data={data} valueKey={calVKey} height={height} />
      );
    }

    case 'box-plot': {
      return <BoxPlotChart data={data} xKey={xKey} height={height} />;
    }

    case 'violin': {
      return <ViolinChart data={data} xKey={xKey} height={height} />;
    }

    case 'funnel': {
      const fValueKey = yKeys[0] ?? 'value';
      if (data.length === 0) {
        return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af' }}>Select X Axis and Y Axis fields</div>;
      }
      const funnelData = data.map((d, i) => ({
        name: String(d[xKey] ?? d.stage ?? `Stage ${i + 1}`),
        value: Number(d[fValueKey]) || 0,
        pct: `${d.percentage ?? 0}%`,
        fill: colors[i % colors.length],
      }));
      return (
        <ResponsiveContainer width="100%" height={height}>
          <FunnelChart margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
            <Tooltip formatter={(v: number | string) => [v, fValueKey]} />
            <Funnel dataKey="value" data={funnelData} isAnimationActive lastShapeType="rectangle">
              {funnelData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
              <LabelList position="center" fill="#fff" stroke="none" dataKey="name" style={{ fontSize: 13, fontWeight: 600 }} />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
      );
    }

    case 'sankey': {
      // Show guidance if group field not configured
      if (!config.groupField) {
        return (
          <div style={{ height, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#6b7280', gap: 8, padding: 16, textAlign: 'center' }}>
            <span style={{ fontSize: 28 }}>🔀</span>
            <strong>Sankey needs a Target Field</strong>
            <span style={{ fontSize: 12, color: '#9ca3af' }}>Set X Axis as source (e.g. Region) and Group Field as target (e.g. Category)</span>
          </div>
        );
      }

      // Convert flat [{source, target, value}] → Recharts Sankey format
      const nodeSet = new Set<string>();
      (data as Array<{ source?: string; target?: string; value?: number }>).forEach(d => {
        if (d.source) nodeSet.add(d.source);
        if (d.target) nodeSet.add(d.target);
      });
      const nodeList = Array.from(nodeSet);
      const nodeIndex = new Map(nodeList.map((n, i) => [n, i]));
      const sankeyData = {
        nodes: nodeList.map(name => ({ name })),
        links: (data as Array<{ source?: string; target?: string; value?: number }>)
          .filter(d => d.source && d.target && nodeIndex.has(d.source!) && nodeIndex.has(d.target!))
          .map(d => ({
            source: nodeIndex.get(d.source!)!,
            target: nodeIndex.get(d.target!)!,
            value: d.value ?? 1,
          })),
      };

      if (sankeyData.links.length === 0) {
        return (
          <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 13 }}>
            No flow connections found. Select distinct fields for X Axis (source) and Group Field (target).
          </div>
        );
      }

      return (
        <ResponsiveContainer width="100%" height={height}>
          <Sankey
            data={sankeyData}
            node={{ stroke: '#fff', strokeWidth: 2 }}
            link={{ stroke: '#6366f1', strokeOpacity: 0.3 }}
            margin={{ top: 10, right: 80, left: 20, bottom: 10 }}
          >
            <Tooltip />
          </Sankey>
        </ResponsiveContainer>
      );
    }

    case 'combo': {
      // First series as Bar, rest as Lines
      return (
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={xKey} />
            <YAxis />
            <Tooltip />
            <Legend />
            {yKeys.map((key, i) =>
              i === 0 ? (
                <Bar key={key} dataKey={key} fill={colors[0]} />
              ) : (
                <Line key={key} type="monotone" dataKey={key} stroke={colors[i % colors.length]} dot={false} strokeWidth={2} />
              )
            )}
          </ComposedChart>
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
  const [groupField, setGroupField] = useState(initialConfig?.groupField ?? '');
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
      groupField: groupField || undefined,
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
  }, [chartType, title, xField, yField, groupField, dataset, columns, initialConfig?.id]);

  const handleApply = () => {
    const config = buildConfig();
    onConfigChange?.(config);
  };

  // Prepare chart data for preview
  let previewData: Record<string, unknown>[] = [];
  let previewDomain: { min: number; max: number } | undefined;
  if (dataset && (xField || chartType === 'gauge') && (yField || chartType === 'histogram')) {
    try {
      const config = buildConfig();
      const prepared = prepareChartData(config, dataset.rows, dataset);
      previewData = prepared.data as Record<string, unknown>[];
      previewDomain = prepared.domain;
    } catch (_e) {
      // ignore
    }
  }

  const currentConfig = buildConfig();

  // Determine which fields are required for this chart type
  const meta = getChartMeta(chartType);
  const needsGroupField = chartType === 'sankey' || chartType === 'heatmap' || chartType === 'sunburst';

  return (
    <div className={`chart-builder ${className ?? ''}`.trim()}>
      <div className="chart-builder-controls" role="form" aria-label="Chart configuration">
        <div className="chart-control-group">
          <label className="chart-control-label" id="chart-type-label">Chart type</label>
          <div
            className="chart-type-grid"
            role="group"
            aria-labelledby="chart-type-label"
          >
            {Object.entries(chartsByCategory).map(([category, types]) => {
              const categoryId = `chart-cat-${category.replace(/\s+/g, '-').toLowerCase()}`;
              return (
                <div
                  key={category}
                  className="chart-type-category"
                  role="group"
                  aria-labelledby={categoryId}
                >
                  <div className="chart-type-category-label" id={categoryId}>{category}</div>
                  {types.map((m) => (
                    <button
                      key={m.type}
                      className={`chart-type-btn ${chartType === m.type ? 'chart-type-btn--active' : ''}`}
                      onClick={() => setChartType(m.type)}
                      title={m.description}
                      aria-label={`${m.label} chart: ${m.description}`}
                      aria-pressed={chartType === m.type}
                    >
                      <span className="chart-type-icon" aria-hidden="true">{m.icon}</span>
                      <span className="chart-type-label">{m.label}</span>
                    </button>
                  ))}
                </div>
              );
            })}
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

        {meta?.requiresXField !== false && (
          <div className="chart-control-group">
            <label className="chart-control-label">
              {chartType === 'histogram' ? 'Value Field (bins)' :
               chartType === 'sankey' ? 'Source Field (X)' :
               'X Axis'}
            </label>
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
        )}

        {chartType !== 'histogram' && (
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
        )}

        {needsGroupField && (
          <div className="chart-control-group">
            <label className="chart-control-label">
              {chartType === 'sankey' ? 'Target Field (flow to)' :
               chartType === 'heatmap' ? 'Y Axis (rows)' :
               'Group / Inner Field'}
            </label>
            <select
              className="chart-control-select"
              value={groupField}
              onChange={(e) => setGroupField(e.target.value)}
            >
              <option value="">Select field...</option>
              {allCols.map((c) => (
                <option key={c.id} value={c.id}>{c.displayName}</option>
              ))}
            </select>
          </div>
        )}

        <button
          className="chart-apply-btn"
          onClick={handleApply}
          disabled={!xField && chartType !== 'gauge'}
        >
          Apply
        </button>
      </div>

      <div
        className="chart-builder-preview"
        role="region"
        aria-label="Chart preview"
        aria-live="polite"
        aria-atomic="false"
      >
        <div className="chart-preview-title">{title}</div>
        {getChartMeta(chartType) && (
          <div className="chart-preview-desc">{getChartMeta(chartType).description}</div>
        )}
        <ChartRenderer
          config={currentConfig}
          data={previewData}
          domain={previewDomain}
          height={height}
        />
      </div>
    </div>
  );
}
