import { expect, it } from 'vitest';
import { screenDeltaToMap } from './canvas-coordinates';

it('uses equal scale on both axes with vertical letterboxing', () => {
  expect(screenDeltaToMap(10, 10, 10000, 2000, 1000, 500)).toEqual({ x: 100, y: 100 });
});
it('handles horizontal letterboxing and zoom', () => {
  expect(screenDeltaToMap(10, 10, 2000, 10000, 1000, 500, 2)).toEqual({ x: 100, y: 100 });
});
it('inverts rotation before converting a drag into physical coordinates', () => {
  const delta = screenDeltaToMap(10, 0, 10000, 2000, 1000, 500, 2, 90);
  expect(delta.x).toBeCloseTo(0);
  expect(delta.y).toBeCloseTo(-50);
});
