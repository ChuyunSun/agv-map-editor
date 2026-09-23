import { describe, expect, it } from 'vitest';
import { findNeighbor, inferRoutes } from './connections.js';
import type { AgvMap, MapNode } from './map-schema.js';

const nodes: MapNode[] = [
  { x: 1000, y: 1000, code: 1, directions: ['North'] },
  { x: 1800, y: 1000, code: 2, directions: ['West'] },
  { x: 2489, y: 1000, code: 3 },
  { x: 1800, y: 1900, code: 4, directions: ['East'] },
];

describe('AGV route inference', () => {
  it('maps North to increasing X at the same Y', () => {
    expect(findNeighbor(nodes, 0, 'North', 1500)).toEqual({
      index: 1,
      distance: 800,
    });
  });

  it('maps West to increasing Y at the same X', () => {
    expect(findNeighbor(nodes, 1, 'West', 1500)).toEqual({
      index: 3,
      distance: 900,
    });
  });

  it('chooses the nearest aligned node rather than skipping over it', () => {
    expect(findNeighbor(nodes, 0, 'North', 1500)?.index).toBe(1);
  });

  it('includes a neighbor exactly at the maximum distance', () => {
    expect(findNeighbor(nodes, 1, 'North', 689)).toEqual({
      index: 2,
      distance: 689,
    });
  });

  it('does not create diagonal or over-distance routes', () => {
    expect(findNeighbor(nodes, 0, 'West', 1500)).toBeNull();
    expect(findNeighbor(nodes, 0, 'North', 799)).toBeNull();
  });

  it('creates directed routes only for declared directions', () => {
    const document: AgvMap = {
      map: { maxNeighborDistance: 1500, nodes },
    };

    expect(inferRoutes(document)).toEqual([
      { fromIndex: 0, toIndex: 1, direction: 'North', distance: 800 },
      { fromIndex: 1, toIndex: 3, direction: 'West', distance: 900 },
      { fromIndex: 3, toIndex: 1, direction: 'East', distance: 900 },
    ]);
  });
});
