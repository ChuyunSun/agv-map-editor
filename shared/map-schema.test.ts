import { describe, expect, it } from 'vitest';
import { agvMapSchema } from './map-schema.js';

describe('AGV map schema', () => {
  it('allows code zero and negative integer coordinates', () => {
    const result = agvMapSchema.safeParse({
      map: {
        maxNeighborDistance: 1500,
        nodes: [{ x: -10, y: 0, code: 0 }],
      },
    });

    expect(result.success).toBe(true);
  });

  it('rejects fractional coordinates and unknown directions', () => {
    const result = agvMapSchema.safeParse({
      map: {
        maxNeighborDistance: 1500,
        nodes: [{ x: 1.5, y: 0, code: 10, directions: ['Up'] }],
      },
    });

    expect(result.success).toBe(false);
  });

  it('requires a positive integer neighbor distance', () => {
    expect(
      agvMapSchema.safeParse({
        map: { maxNeighborDistance: 0, nodes: [] },
      }).success,
    ).toBe(false);
  });
});
