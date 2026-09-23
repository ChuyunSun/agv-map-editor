import { useEffect, useMemo, useReducer, useState } from 'react';
import { inferRoutes } from '../../shared/connections';
import type { AgvMap, MapNode } from '../../shared/map-schema';
import { validateMapSemantics } from '../../shared/validation';
import { loadMap, saveMap } from './api';
import { historyReducer, initialHistory } from './history';
import { MapCanvas } from './MapCanvas';
import { IntegerField, NodeInspector } from './NodeInspector';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function App() {
  const [history, dispatchHistory] = useReducer(historyReducer, initialHistory);
  const [savedDocument, setSavedDocument] = useState<AgvMap | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const [issueFilter, setIssueFilter] = useState<'all' | 'error' | 'warning'>('all');
  const [canvasScale, setCanvasScale] = useState(1);
  const [canvasRotation, setCanvasRotation] = useState(0);
  const [fitToken, setFitToken] = useState(0);
  const document = history.present;
  const dirty = document !== null && savedDocument !== null && JSON.stringify(document) !== JSON.stringify(savedDocument);

  useEffect(() => {
    const controller = new AbortController();
    loadMap(controller.signal)
      .then((response) => {
        dispatchHistory({ type: 'load', document: response.document });
        setSavedDocument(response.document);
        setLoadError(null);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setLoadError('The map could not be loaded. Check that the API server is running.');
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!dirty) return;
    const warnBeforeLeaving = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warnBeforeLeaving);
    return () => window.removeEventListener('beforeunload', warnBeforeLeaving);
  }, [dirty]);

  const filteredNodeIndexes = useMemo(() => {
    if (!document) return [];
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return document.map.nodes
      .map((node, index) => ({ node, index }))
      .filter(({ node }) => !normalizedQuery || (
        node.name?.toLocaleLowerCase().includes(normalizedQuery) || String(node.code).includes(normalizedQuery)
      ))
      .map(({ index }) => index);
  }, [document, query]);

  const persistMap = async () => {
    if (!document) return;
    const blockingIssues = validateMapSemantics(document).filter((issue) => issue.severity === 'error');
    if (blockingIssues.length > 0) {
      setSaveState('error');
      setSaveMessage(`Resolve ${blockingIssues.length} blocking error${blockingIssues.length === 1 ? '' : 's'} before saving.`);
      return;
    }
    setSaveState('saving');
    setSaveMessage('Saving validated map…');
    try {
      const response = await saveMap(document);
      dispatchHistory({ type: 'replace', document: response.document });
      setSavedDocument(response.document);
      setSaveState('saved');
      setSaveMessage('Map saved to the server.');
    } catch (requestError) {
      setSaveState('error');
      setSaveMessage(requestError instanceof Error ? requestError.message : 'Map save failed.');
    }
  };

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const editingText = target?.matches('input, select, textarea');
      const command = event.ctrlKey || event.metaKey;

      if (command && event.key.toLocaleLowerCase() === 's') {
        event.preventDefault();
        if (dirty && saveState !== 'saving') void persistMap();
      } else if (command && event.key.toLocaleLowerCase() === 'z') {
        event.preventDefault();
        dispatchHistory({ type: event.shiftKey ? 'redo' : 'undo' });
      } else if (command && event.key.toLocaleLowerCase() === 'y') {
        event.preventDefault();
        dispatchHistory({ type: 'redo' });
      } else if (!editingText && event.key === 'Delete' && document && selectedIndex !== null) {
        event.preventDefault();
        dispatchHistory({ type: 'change', document: { map: { ...document.map, nodes: document.map.nodes.filter((_node, index) => index !== selectedIndex) } } });
        setSelectedIndex(null);
      } else if (event.key === 'Escape') {
        setSelectedIndex(null);
      }
    };

    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  });

  if (loadError) {
    return (
      <main className="center-state">
        <div className="state-card state-card--error">
          <p className="eyebrow">Connection error</p><h1>Map unavailable</h1><p>{loadError}</p>
          <button type="button" onClick={() => window.location.reload()}>Try again</button>
        </div>
      </main>
    );
  }

  if (!document) {
    return <main className="center-state" aria-busy="true"><div className="loading-mark" /><p>Loading AGV map…</p></main>;
  }

  const nodes = document.map.nodes;
  const routes = inferRoutes(document);
  const issues = validateMapSemantics(document);
  const selectedNode = selectedIndex === null ? null : nodes[selectedIndex] ?? null;
  const errors = issues.filter((issue) => issue.severity === 'error');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  const filteredIssues = issues.filter((issue) => issueFilter === 'all' || issue.severity === issueFilter);

  const applyDocument = (nextDocument: AgvMap) => {
    dispatchHistory({ type: 'change', document: nextDocument });
    setSaveState('idle');
    setSaveMessage('');
  };

  const updateNode = (index: number, node: MapNode) => {
    const nextNodes = [...nodes];
    nextNodes[index] = node;
    applyDocument({ map: { ...document.map, nodes: nextNodes } });
  };

  const addNode = () => {
    const step = document.map.maxNeighborDistance;
    let x = Math.max(0, ...nodes.map((node) => node.x)) + step;
    const y = selectedNode?.y ?? Math.min(0, ...nodes.map((node) => node.y));
    while (nodes.some((node) => node.x === x && node.y === y)) x += step;
    const code = Math.max(0, ...nodes.map((node) => node.code)) + 10;
    const nextNodes = [...nodes, { x, y, code }];
    applyDocument({ map: { ...document.map, nodes: nextNodes } });
    setSelectedIndex(nextNodes.length - 1);
    setQuery('');
  };

  const deleteSelectedNode = () => {
    if (selectedIndex === null) return;
    applyDocument({ map: { ...document.map, nodes: nodes.filter((_node, index) => index !== selectedIndex) } });
    setSelectedIndex(null);
  };

  return (
    <main className="workbench">
      <header className="toolbar">
        <div className="brand"><span className="brand__mark">M</span><div><strong>AGV Map Editor</strong><span>Commissioning workbench</span></div></div>
        <div className="toolbar__actions" aria-label="Map actions">
          <button type="button" onClick={addNode}>Add node</button>
          <button type="button" disabled={selectedIndex === null} onClick={deleteSelectedNode}>Delete</button>
          <span className="toolbar__separator" />
          <button type="button" disabled={history.past.length === 0} onClick={() => dispatchHistory({ type: 'undo' })} title={history.past.length === 0 ? 'Nothing to undo' : 'Undo last map change'}>Undo</button>
          <button type="button" disabled={history.future.length === 0} onClick={() => dispatchHistory({ type: 'redo' })} title={history.future.length === 0 ? 'Nothing to redo' : 'Redo last map change'}>Redo</button>
          <span className="toolbar__separator" />
          <button type="button" onClick={() => { setCanvasScale(1); setCanvasRotation(0); setFitToken((value) => value + 1); }}>Fit map</button>
          <button type="button" onClick={() => setCanvasScale((value) => Math.min(4, value * 1.25))}>Zoom in</button>
          <button type="button" onClick={() => setCanvasRotation((value) => (value + 90) % 360)}>Rotate</button>
          <span className="toolbar__separator" />
          <button type="button" className="button--primary" disabled={!dirty || saveState === 'saving'} onClick={() => void persistMap()} title={!dirty ? 'No unsaved changes' : undefined}>
            {saveState === 'saving' ? 'Saving…' : 'Save map'}
          </button>
        </div>
      </header>

      <aside className="explorer" aria-label="Map explorer">
        <div className="panel-heading"><div><p className="eyebrow">Map explorer</p><h2>Waypoints</h2></div><span className="count-badge">{nodes.length}</span></div>
        <label className="search-field"><span className="sr-only">Search by node name or QR code</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or QR…" /></label>
        <div className="node-list" role="listbox" aria-label="Map nodes">
          {filteredNodeIndexes.map((index) => {
            const node = nodes[index]!;
            return (
              <button type="button" key={`${index}-${node.code}-${node.x}-${node.y}`} className={selectedIndex === index ? 'node-row node-row--selected' : 'node-row'} onClick={() => setSelectedIndex(index)} role="option" aria-selected={selectedIndex === index}>
                <span className={`node-row__type node-row__type--${node.charger ? 'charger' : node.chute ? 'chute' : 'waypoint'}`} />
                <span><strong>{node.name ?? `QR ${node.code}`}</strong><small>{node.name ? `QR ${node.code}` : `${node.x}, ${node.y} mm`}</small></span>
              </button>
            );
          })}
        </div>
      </aside>

      <section className="canvas-panel" aria-label="Map canvas">
        <MapCanvas
          document={document}
          selectedIndex={selectedIndex}
          onSelect={setSelectedIndex}
          scale={canvasScale}
          rotation={canvasRotation}
          fitToken={fitToken}
          onScaleChange={setCanvasScale}
          onMove={(index, x, y) => updateNode(index, { ...nodes[index]!, x, y })}
        />
        <div className="legend" aria-label="Map legend">
          <span><i className="legend__dot legend__dot--waypoint" />Waypoint</span><span><i className="legend__dot legend__dot--charger" />Charger</span><span><i className="legend__dot legend__dot--chute" />Chute</span><span><i className="legend__line" />Directed route</span>
        </div>
      </section>

      <aside className="inspector" aria-label="Node inspector">
        <div className="panel-heading"><div><p className="eyebrow">Inspector</p><h2>{selectedNode?.name ?? (selectedNode ? `QR ${selectedNode.code}` : 'Map settings')}</h2></div></div>
        <div className="inspector-scroll">
          <section className="map-settings">
            <h3>Connection rule</h3>
            <IntegerField label="Maximum neighbor distance (mm)" value={document.map.maxNeighborDistance} minimum={1} onValidChange={(maxNeighborDistance) => applyDocument({ map: { ...document.map, maxNeighborDistance } })} />
          </section>
          {selectedNode ? <NodeInspector node={selectedNode} onChange={(node) => updateNode(selectedIndex!, node)} /> : (
            <div className="empty-inspector"><span className="empty-inspector__icon">◎</span><p>Select a waypoint on the map or in the explorer to edit its configuration.</p></div>
          )}
        </div>
      </aside>

      <section className="diagnostics" aria-label="Map diagnostics">
        <div className="diagnostics__summary">
          <strong>Diagnostics</strong><span>{errors.length} errors</span><span>{warnings.length} warnings</span>
          <div className="diagnostics__filters" aria-label="Diagnostic filters">
            {(['all', 'error', 'warning'] as const).map((filter) => (
              <button key={filter} type="button" aria-pressed={issueFilter === filter} onClick={() => setIssueFilter(filter)}>{filter}</button>
            ))}
          </div>
        </div>
        <div className="issue-list">
          {saveMessage && <p className={saveState === 'error' ? 'message--error' : ''}>{saveMessage}</p>}
          {!saveMessage && filteredIssues.length === 0 && <p>No {issueFilter === 'all' ? '' : `${issueFilter} `}issues.</p>}
          {!saveMessage && filteredIssues.map((issue, index) => (
            <button
              type="button"
              key={`${issue.code}-${issue.nodeIndexes.join('-')}-${index}`}
              className={`issue issue--${issue.severity}`}
              onClick={() => setSelectedIndex(issue.nodeIndexes[0] ?? null)}
              disabled={issue.nodeIndexes.length === 0}
            >
              <strong>{issue.severity === 'error' ? 'Error' : 'Warning'}</strong> {issue.message}
            </button>
          ))}
        </div>
      </section>

      <footer className="statusbar">
        <span className={`status ${dirty ? 'status--dirty' : 'status--saved'}`}>● {dirty ? 'Unsaved' : 'Saved'}</span><span>{nodes.length} nodes</span><span>{routes.length} routes</span><span>Zoom {Math.round(canvasScale * 100)}%</span><span>Rotation {canvasRotation}°</span><span>Max neighbor {document.map.maxNeighborDistance.toLocaleString()} mm</span><span className="statusbar__spacer" /><span>North +X · West +Y</span>
      </footer>
    </main>
  );
}
