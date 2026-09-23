import { describe, expect, it } from 'vitest';
import type { AgvMap } from '../../shared/map-schema';
import { historyReducer, initialHistory } from './history';

const first: AgvMap = { map: { maxNeighborDistance: 100, nodes: [] } };
const second: AgvMap = { map: { maxNeighborDistance: 200, nodes: [] } };

describe('historyReducer', () => {
  it('undoes and redoes whole document changes', () => {
    const loaded = historyReducer(initialHistory, { type: 'load', document: first });
    const changed = historyReducer(loaded, { type: 'change', document: second });
    const undone = historyReducer(changed, { type: 'undo' });
    const redone = historyReducer(undone, { type: 'redo' });

    expect(undone.present).toEqual(first);
    expect(redone.present).toEqual(second);
  });

  it('clears redo history after a new branch of edits', () => {
    const changed = historyReducer(historyReducer(initialHistory, { type: 'load', document: first }), { type: 'change', document: second });
    const undone = historyReducer(changed, { type: 'undo' });
    const branched = historyReducer(undone, { type: 'change', document: { map: { maxNeighborDistance: 300, nodes: [] } } });
    expect(branched.future).toEqual([]);
  });
});
