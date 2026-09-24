// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AgvMap } from '../../shared/map-schema';
import { MapCanvas } from './MapCanvas';

const document: AgvMap = {
  map: {
    maxNeighborDistance: 1500,
    nodes: [
      { x: 1000, y: 1000, code: 1, directions: ['North'] },
      { x: 1800, y: 1000, code: 2, directions: ['South'], name: 'READY' },
    ],
  },
};

describe('MapCanvas', () => {
  it('preserves camera framing during edits and refits only on request', () => {
    const props = { selectedIndex: null, onSelect: () => {} };
    const { rerender } = render(<MapCanvas {...props} document={document} />);
    const initialBox = screen.getByRole('img').getAttribute('viewBox');
    const initialPosition = screen.getByRole('button', { name: /Waypoint QR 1/ }).getAttribute('transform');
    const expanded = { map: { ...document.map, nodes: [...document.map.nodes, { x: 100000, y: 1000, code: 3 }] } };
    rerender(<MapCanvas {...props} document={expanded} />);
    expect(screen.getByRole('img')).toHaveAttribute('viewBox', initialBox);
    expect(screen.getByRole('button', { name: /Waypoint QR 1/ })).toHaveAttribute('transform', initialPosition);
    rerender(<MapCanvas {...props} document={expanded} fitToken={1} />);
    expect(screen.getByRole('img').getAttribute('viewBox')).not.toBe(initialBox);
  });
  it('exposes the map and its nodes with engineering context', () => {
    render(<MapCanvas document={document} selectedIndex={null} onSelect={() => {}} />);

    expect(screen.getByRole('img')).toHaveAttribute(
      'aria-label',
      'AGV map with 2 nodes and 2 directed routes',
    );
    expect(screen.getByRole('button', { name: /Waypoint QR 1/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /READY QR 2/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Map coordinate orientation')).toHaveTextContent('N · +X');
  });

  it('supports pointer and keyboard node selection', () => {
    const onSelect = vi.fn();
    render(<MapCanvas document={document} selectedIndex={null} onSelect={onSelect} />);
    const ready = screen.getByRole('button', { name: /READY QR 2/ });

    fireEvent.click(ready);
    fireEvent.keyDown(ready, { key: 'Enter' });

    expect(onSelect).toHaveBeenNthCalledWith(1, 1);
    expect(onSelect).toHaveBeenNthCalledWith(2, 1);
  });
});
