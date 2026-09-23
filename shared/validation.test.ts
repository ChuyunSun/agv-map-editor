import { describe, expect, it } from 'vitest';
import type { AgvMap } from './map-schema.js';
import { validateMapSemantics } from './validation.js';

describe('semantic map validation', () => {
  it('separates blocking duplicate coordinates from warnings', () => {
    const document: AgvMap = {
      map: {
        maxNeighborDistance: 100,
        nodes: [
          { x: 0, y: 0, code: 7, name: 'Station' },
          { x: 0, y: 0, code: 7, name: 'station' },
        ],
      },
    };

    const issues = validateMapSemantics(document);

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ severity: 'error', code: 'duplicate-coordinate' }),
        expect.objectContaining({ severity: 'warning', code: 'duplicate-qr-code' }),
        expect.objectContaining({ severity: 'warning', code: 'duplicate-name' }),
      ]),
    );
  });

  it('warns when a declared direction has no reachable neighbor', () => {
    const document: AgvMap = {
      map: {
        maxNeighborDistance: 100,
        nodes: [{ x: 0, y: 0, code: 1, directions: ['North'] }],
      },
    };

    expect(validateMapSemantics(document)).toContainEqual(
      expect.objectContaining({ code: 'dangling-direction', nodeIndexes: [0] }),
    );
  });
});
