import type { AgvMap } from '../../shared/map-schema';

export interface DocumentHistory {
  past: AgvMap[];
  present: AgvMap | null;
  future: AgvMap[];
}

export type HistoryAction =
  | { type: 'load'; document: AgvMap }
  | { type: 'change'; document: AgvMap }
  | { type: 'replace'; document: AgvMap }
  | { type: 'undo' }
  | { type: 'redo' };

export const initialHistory: DocumentHistory = { past: [], present: null, future: [] };

export function historyReducer(state: DocumentHistory, action: HistoryAction): DocumentHistory {
  if (action.type === 'load') return { past: [], present: action.document, future: [] };
  if (action.type === 'replace') return { ...state, present: action.document };

  if (action.type === 'change') {
    if (!state.present || JSON.stringify(state.present) === JSON.stringify(action.document)) return state;
    return { past: [...state.past, state.present], present: action.document, future: [] };
  }

  if (action.type === 'undo') {
    const previous = state.past.at(-1);
    if (!previous || !state.present) return state;
    return {
      past: state.past.slice(0, -1),
      present: previous,
      future: [state.present, ...state.future],
    };
  }

  const next = state.future[0];
  if (!next || !state.present) return state;
  return {
    past: [...state.past, state.present],
    present: next,
    future: state.future.slice(1),
  };
}
