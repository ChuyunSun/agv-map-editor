// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { AgvMap } from '../../shared/map-schema';
import { App } from './App';

const document: AgvMap = {
  map: {
    maxNeighborDistance: 1500,
    nodes: [
      { x: 1000, y: 1000, code: 1, directions: ['North'] },
      { x: 1800, y: 1000, code: 2, directions: ['South'], name: 'READY' },
    ],
  },
};

afterEach(() => vi.unstubAllGlobals());

describe('App workbench', () => {
  it('loads, searches, selects, and inspects a node', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ document, issues: [] }),
      }),
    );

    render(<App />);
    expect(screen.getByText('Loading AGV map…')).toBeInTheDocument();

    await screen.findByRole('heading', { name: 'Waypoints' });
    fireEvent.change(screen.getByPlaceholderText('Search name or QR…'), {
      target: { value: 'READY' },
    });

    const ready = screen.getByRole('option', { name: /READY/ });
    expect(screen.queryByRole('option', { name: /QR 1/ })).not.toBeInTheDocument();
    fireEvent.click(ready);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'READY' })).toBeInTheDocument();
    });
    expect(screen.getByLabelText('X (mm)')).toHaveValue(1800);
  });

  it('edits a node and saves the updated map', async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) => {
      if (options?.method === 'PUT') {
        return { ok: true, json: async () => ({ document: JSON.parse(String(options.body)), issues: [] }) };
      }
      return { ok: true, json: async () => ({ document, issues: [] }) };
    });
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);
    await screen.findByRole('heading', { name: 'Waypoints' });
    fireEvent.click(screen.getByRole('option', { name: /READY/ }));
    fireEvent.change(screen.getByLabelText('X (mm)'), { target: { value: '2000' } });

    expect(screen.getByText(/Unsaved/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save map' }));
    expect(await screen.findByText('Map saved to the server.')).toBeInTheDocument();
    expect(screen.getByText(/Saved/)).toBeInTheDocument();

    const putOptions = fetchMock.mock.calls[1]?.[1] as RequestInit;
    const savedDocument = JSON.parse(String(putOptions.body)) as AgvMap;
    expect(savedDocument.map.nodes[1]?.x).toBe(2000);
  });

  it('adds and deletes a node without persisting automatically', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ document, issues: [] }) }));
    render(<App />);
    await screen.findByRole('heading', { name: 'Waypoints' });

    fireEvent.click(screen.getByRole('button', { name: 'Add node' }));
    expect(within(screen.getByRole('listbox', { name: 'Map nodes' })).getAllByRole('option')).toHaveLength(3);
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(within(screen.getByRole('listbox', { name: 'Map nodes' })).getAllByRole('option')).toHaveLength(2);
    expect(screen.getByText(/Saved/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(within(screen.getByRole('listbox', { name: 'Map nodes' })).getAllByRole('option')).toHaveLength(3);
    expect(screen.getByText(/Unsaved/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(within(screen.getByRole('listbox', { name: 'Map nodes' })).getAllByRole('option')).toHaveLength(2);
    expect(screen.getByText(/Saved/)).toBeInTheDocument();
  });

  it('recomputes routes immediately when a node moves', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ document, issues: [] }) }));
    render(<App />);
    await screen.findByRole('heading', { name: 'Waypoints' });
    expect(screen.getByRole('img')).toHaveAttribute('aria-label', expect.stringContaining('2 directed routes'));

    fireEvent.click(screen.getByRole('option', { name: /READY/ }));
    fireEvent.change(screen.getByLabelText('X (mm)'), { target: { value: '4000' } });

    expect(screen.getByRole('img')).toHaveAttribute('aria-label', expect.stringContaining('0 directed routes'));
  });

  it('retains unsaved work when the server rejects a save', async () => {
    const fetchMock = vi.fn().mockImplementation(async (_url: string, options?: RequestInit) => {
      if (options?.method === 'PUT') {
        return { ok: false, status: 500, json: async () => ({ error: 'Storage unavailable.' }) };
      }
      return { ok: true, json: async () => ({ document, issues: [] }) };
    });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await screen.findByRole('heading', { name: 'Waypoints' });
    fireEvent.click(screen.getByRole('option', { name: /READY/ }));
    fireEvent.change(screen.getByLabelText('X (mm)'), { target: { value: '2000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save map' }));

    expect(await screen.findByText('Storage unavailable.')).toBeInTheDocument();
    expect(screen.getByLabelText('X (mm)')).toHaveValue(2000);
    expect(screen.getByText(/Unsaved/)).toBeInTheDocument();
  });

  it('blocks saving duplicate coordinates and links the issue to its node', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ document, issues: [] }) });
    vi.stubGlobal('fetch', fetchMock);
    render(<App />);
    await screen.findByRole('heading', { name: 'Waypoints' });
    fireEvent.click(screen.getByRole('option', { name: /READY/ }));
    fireEvent.change(screen.getByLabelText('X (mm)'), { target: { value: '1000' } });

    expect(screen.getByText('1 errors')).toBeInTheDocument();
    const issue = screen.getByRole('button', { name: /Multiple nodes use coordinate 1000, 1000 mm/ });
    fireEvent.click(issue);
    expect(screen.getAllByRole('option', { selected: true })[0]).toHaveAccessibleName(/QR 1/);

    fireEvent.click(screen.getByRole('button', { name: 'Save map' }));
    expect(screen.getByText('Resolve 1 blocking error before saving.')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('zooms, rotates, and fits the canvas without dirtying map data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ document, issues: [] }) }));
    render(<App />);
    await screen.findByRole('heading', { name: 'Waypoints' });

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Rotate' }));
    expect(screen.getByText('Zoom 125%')).toBeInTheDocument();
    expect(screen.getByText('Rotation 90°')).toBeInTheDocument();
    expect(screen.getByText(/Saved/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Fit map' }));
    expect(screen.getByText('Zoom 100%')).toBeInTheDocument();
    expect(screen.getByText('Rotation 0°')).toBeInTheDocument();
  });

  it('shows a recoverable loading error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Map unavailable' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
