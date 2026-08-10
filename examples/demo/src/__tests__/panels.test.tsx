// ─── Demo panel tests — AskPanel / ConnectPanel / SentinelPanel ───────────────
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { buildDataset } from '@gridstorm/analytix-core';
import { AskPanel } from '../AskPanel';
import { ConnectPanel } from '../ConnectPanel';
import { SentinelPanel } from '../SentinelPanel';
import { liveFeed } from '../liveFeed';

// Deterministic dataset for AskPanel. Region sums: Europe 150, Asia 400, NA 600.
const ds = buildDataset('sales', 'Sales', [
  { region: 'North America', product: 'Widget', revenue: 250, units: 10 },
  { region: 'North America', product: 'Gadget', revenue: 350, units: 20 },
  { region: 'Europe',        product: 'Widget', revenue: 100, units: 5 },
  { region: 'Europe',        product: 'Gizmo',  revenue: 50,  units: 4 },
  { region: 'Asia',          product: 'Gadget', revenue: 400, units: 40 },
]);

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
});
afterEach(() => vi.restoreAllMocks());

describe('AskPanel', () => {
  it('auto-answers the default question with a rendered result', async () => {
    render(<AskPanel dataset={ds} />);
    expect(await screen.findByText(/leads with/)).toBeInTheDocument();
    expect(screen.getByText(/Offline engine/)).toBeInTheDocument();
  });

  it('generates suggestion chips from the dataset schema', async () => {
    render(<AskPanel dataset={ds} />);
    expect(await screen.findByText('total revenue by region')).toBeInTheDocument();
    expect(screen.getByText('how many records are there')).toBeInTheDocument();
  });

  it('renders the suggested chart card naming the plotted measure', async () => {
    render(<AskPanel dataset={ds} />);
    expect(await screen.findByText(/bar chart · Total Revenue/i)).toBeInTheDocument();
  });

  it('supports a follow-up refinement ("now just europe")', async () => {
    render(<AskPanel dataset={ds} />);
    await screen.findByText(/leads with/);
    const input = screen.getByLabelText('Ask a question about your data');
    // First a product breakdown, so region is free to become a filter…
    fireEvent.change(input, { target: { value: 'total revenue by product' } });
    fireEvent.submit(input.closest('form')!);
    await screen.findByText(/Total Revenue by Product/i);
    // …then the refinement.
    fireEvent.change(input, { target: { value: 'now just europe' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() =>
      expect(screen.getByText(/filtered to Region eq Europe/i)).toBeInTheDocument()
    );
    // Only Europe's two rows survive the filter.
    expect(screen.getByText(/Computed from 2 matching rows/)).toBeInTheDocument();
  });

  it('flags truncation when there are more than 20 groups', async () => {
    const wide = buildDataset('wide', 'Wide',
      Array.from({ length: 25 }, (_, i) => ({ category: `cat-${String(i).padStart(2, '0')}`, revenue: (i + 1) * 10 })));
    render(<AskPanel dataset={wide} />);
    const input = await screen.findByLabelText('Ask a question about your data');
    fireEvent.change(input, { target: { value: 'total revenue by category' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() =>
      expect(screen.getByText(/first 20 of 25 groups/i)).toBeInTheDocument()
    );
    expect(screen.getByText(/showing 20 of 25/i)).toBeInTheDocument();
  });

  it('uploads a CSV, re-registers it, and regenerates the chips', async () => {
    const onUploaded = vi.fn();
    render(<AskPanel dataset={ds} onDatasetUploaded={onUploaded} />);
    await screen.findByText(/leads with/);

    const csv = 'city,salary\nBerlin,100\nMunich,200\nBerlin,50\n';
    const file = new File([csv], 'salaries.csv', { type: 'text/csv' });
    const input = screen.getByLabelText('Upload a CSV or Excel file to ask questions about');
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText(/salaries/)).toBeInTheDocument());
    expect(onUploaded).toHaveBeenCalledTimes(1);
    expect(await screen.findByText('total salary by city')).toBeInTheDocument();
    expect(screen.getByText('✕ Back to sample data')).toBeInTheDocument();
  });

  it('rejects oversized files with a clear message', async () => {
    render(<AskPanel dataset={ds} />);
    await screen.findByText(/leads with/);
    const big = new File(['x'], 'big.csv', { type: 'text/csv' });
    Object.defineProperty(big, 'size', { value: 51 * 1024 * 1024 });
    const input = screen.getByLabelText('Upload a CSV or Excel file to ask questions about');
    fireEvent.change(input, { target: { files: [big] } });
    expect(await screen.findByRole('alert')).toHaveTextContent(/50 MB/);
  });
});

describe('ConnectPanel', () => {
  it('requires an endpoint URL before connecting', () => {
    render(<ConnectPanel />);
    fireEvent.click(screen.getByText('▶ Connect'));
    expect(screen.getByText('Enter an endpoint URL.')).toBeInTheDocument();
  });

  it('polls an HTTP endpoint, renders rows, and publishes them to the live feed', async () => {
    const received: unknown[] = [];
    const unsub = liveFeed.subscribe((rows) => received.push(...rows));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ metric: 42, host: 'api-1' }],
    }));

    const { unmount } = render(<ConnectPanel />);
    fireEvent.click(screen.getByText('HTTP poll'));
    fireEvent.change(screen.getByPlaceholderText('https://example.com/api/stream'), {
      target: { value: 'https://example.com/metrics' },
    });
    fireEvent.click(screen.getByText('▶ Connect'));

    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getAllByText('Connected').length).toBeGreaterThan(0);
    expect(received).toContainEqual({ metric: 42, host: 'api-1' });

    unmount(); // clears the poll interval
    unsub();
    vi.unstubAllGlobals();
  });

  it('explains CORS when a poll request fails with a TypeError', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    const { unmount } = render(<ConnectPanel />);
    fireEvent.click(screen.getByText('HTTP poll'));
    fireEvent.change(screen.getByPlaceholderText('https://example.com/api/stream'), {
      target: { value: 'https://blocked.example.com/data' },
    });
    fireEvent.click(screen.getByText('▶ Connect'));
    expect(await screen.findByText(/CORS/)).toBeInTheDocument();
    unmount();
    vi.unstubAllGlobals();
  });
});

describe('SentinelPanel', () => {
  it('is off by default and starts watching when toggled', async () => {
    render(<SentinelPanel />);
    expect(screen.getByText('Sentinel is off')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('checkbox', { name: /off/i }));
    expect(await screen.findByText('Watching…')).toBeInTheDocument();
  });

  it('watches the live Connect feed and reports a spike', async () => {
    render(<SentinelPanel />);
    // Switch the source to the live feed, then turn Sentinel on.
    fireEvent.change(screen.getByDisplayValue('Simulated demo stream'), { target: { value: 'live' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /off/i }));
    await screen.findByText(/Waiting for live rows/);

    // Warm-up batch establishes the watched column, then a stable baseline…
    await act(async () => {
      for (let i = 0; i < 14; i++) {
        liveFeed.publish([{ metric: 100 + (i % 3) }]);
        await Promise.resolve();
      }
    });
    // …then an unmistakable spike.
    await act(async () => {
      liveFeed.publish([{ metric: 1000 }]);
    });

    await waitFor(() => expect(screen.getByText(/spike/i)).toBeInTheDocument(), { timeout: 3000 });
  });
});
