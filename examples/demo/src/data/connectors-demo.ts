/**
 * connectors-demo.ts — Mock data for the data-connector demo.
 *
 * Provides:
 *  1. A fake REST API response (50 rows of time-series)
 *  2. A WebSocket mock that emits rows every 500ms
 */

import type { Row } from '@analytix/core';

// ── REST mock: 50 rows of monthly time-series ────────────────────────────────

const PRODUCTS   = ['Analytics Pro', 'DataSync', 'ReportHub', 'QueryMaster', 'InsightFlow'];
const CHANNELS   = ['Direct', 'Partner', 'Online', 'Enterprise'];
const REGIONS    = ['NA', 'EU', 'APAC', 'LATAM', 'MEA'];

function seedRng(seed: number) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function buildTimeSeriesRow(index: number, rng: () => number): Row {
  const year    = 2023 + Math.floor(index / 12);
  const month   = (index % 12) + 1;
  const dateStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const base    = 50_000 + index * 1_200;
  const revenue = +(base + (rng() - 0.4) * 15_000).toFixed(2);
  const cost    = +(base * 0.6 + (rng() - 0.5) * 5_000).toFixed(2);

  return {
    id:         index + 1,
    date:       dateStr,
    year,
    month,
    product:    PRODUCTS[Math.floor(rng() * PRODUCTS.length)],
    channel:    CHANNELS[Math.floor(rng() * CHANNELS.length)],
    region:     REGIONS[Math.floor(rng() * REGIONS.length)],
    revenue,
    units:      Math.floor(30 + rng() * 200),
    cost,
    profit:     +(revenue - cost).toFixed(2),
    churn_rate: +(2 + rng() * 8).toFixed(2),
    nps_score:  Math.floor(30 + rng() * 60),
  };
}

const rng = seedRng(42);

export const REST_MOCK_DATA: Row[] = Array.from({ length: 50 }, (_, i) =>
  buildTimeSeriesRow(i, rng)
);

/** Simulate a REST API response envelope */
export const REST_MOCK_RESPONSE = {
  data: REST_MOCK_DATA,
  meta: {
    total:   50,
    page:     1,
    per_page: 50,
  },
};

// ── WebSocket mock ───────────────────────────────────────────────────────────

export interface WsMockOptions {
  intervalMs?:  number;
  onRow:        (row: Row) => void;
  onClose?:     () => void;
}

export interface WsMockHandle {
  stop: () => void;
}

/**
 * Simulate a WebSocket stream that emits one new row every intervalMs.
 * The rows are time-series "live trades" with slightly random values.
 */
export function createWebSocketMock(options: WsMockOptions): WsMockHandle {
  const { intervalMs = 500, onRow, onClose } = options;
  const mockRng = seedRng(Date.now() % 100_000);
  let seq        = 0;
  let stopped    = false;

  const SYMBOLS = ['AAPL', 'MSFT', 'GOOG', 'AMZN', 'META', 'NVDA', 'TSLA'];
  let prices    = Object.fromEntries(SYMBOLS.map((s) => [s, 150 + mockRng() * 200]));

  const timer = setInterval(() => {
    if (stopped) return;
    seq++;
    const symbol   = SYMBOLS[seq % SYMBOLS.length];
    const prevPrice = prices[symbol];
    const newPrice  = +(prevPrice + (mockRng() - 0.49) * 3).toFixed(2);
    prices[symbol]  = newPrice;

    onRow({
      seq,
      timestamp:  new Date().toISOString(),
      symbol,
      price:      newPrice,
      prev_price: prevPrice,
      change:     +(newPrice - prevPrice).toFixed(2),
      change_pct: +((newPrice - prevPrice) / prevPrice * 100).toFixed(3),
      volume:     Math.floor(100 + mockRng() * 10_000),
      bid:        +(newPrice - 0.01).toFixed(2),
      ask:        +(newPrice + 0.01).toFixed(2),
    });
  }, intervalMs);

  return {
    stop() {
      stopped = true;
      clearInterval(timer);
      onClose?.();
    },
  };
}
