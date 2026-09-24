import { useEffect, useRef, useState } from 'react';
import { inferRoutes } from '../../shared/connections';
import { mapNodeSchema, type AgvMap, type MapNode } from '../../shared/map-schema';
import { validateMapSemantics } from '../../shared/validation';
import { NodeInspector } from './NodeInspector';

interface Props {
  document: AgvMap;
  position: { x: number; y: number };
  onCreate: (node: MapNode) => void;
  onCancel: () => void;
}

export function NewNodeDialog({ document, position, onCreate, onCancel }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [fields, setFields] = useState({ x: String(position.x), y: String(position.y), code: '' });
  const [attributes, setAttributes] = useState<MapNode>({ ...position, code: 0 });
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  const validInteger = (value: string) => /^-?\d+$/.test(value) && Number.isSafeInteger(Number(value));
  const allValid = Object.values(fields).every(validInteger);
  const parsed = mapNodeSchema.safeParse({ ...attributes, x: Number(fields.x), y: Number(fields.y), code: Number(fields.code) });
  const candidate = allValid && parsed.success ? parsed.data : null;
  const index = document.map.nodes.length;
  const preview = candidate ? { map: { ...document.map, nodes: [...document.map.nodes, candidate] } } : null;
  const routes = preview ? inferRoutes(preview) : [];
  const incoming = routes.filter((route) => route.toIndex === index);
  const outgoing = routes.filter((route) => route.fromIndex === index);
  const issues = preview ? validateMapSemantics(preview).filter((issue) => issue.nodeIndexes.includes(index)) : [];
  const blocked = !candidate || issues.some((issue) => issue.severity === 'error');
  const before = inferRoutes(document);
  const replaced = preview ? before.filter((old) => !routes.some((route) => route.fromIndex === old.fromIndex && route.toIndex === old.toIndex && route.direction === old.direction)) : [];
  const label = (nodeIndex: number) => document.map.nodes[nodeIndex]?.name ?? `QR ${document.map.nodes[nodeIndex]?.code}`;

  return (
    <dialog ref={dialog} className="new-node-dialog" aria-labelledby="new-node-title"
      onCancel={(event) => { event.preventDefault(); onCancel(); }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') event.preventDefault();
      }}>
      <form onSubmit={(event) => { event.preventDefault(); if (!blocked && candidate) onCreate(candidate); }}>
        <header className="new-node-header"><p className="eyebrow">New waypoint · not yet created</p><h2 id="new-node-title">Configure node</h2><p>Verify the measured position and enter the QR code on the floor.</p></header>
        <div className="new-node-body">
          <section aria-label="New node properties">
            <div className="new-node-numbers">
              {(['x', 'y', 'code'] as const).map((field) => (
                <label className="form-field" key={field}>
                  <span>{field === 'code' ? 'QR code' : `${field.toUpperCase()} (mm)`}</span>
                  <input type="text" inputMode="numeric" required autoFocus={field === 'code'} value={fields[field]}
                    aria-label={field === 'code' ? 'QR code' : `${field.toUpperCase()} (mm)`}
                    aria-invalid={!validInteger(fields[field])} aria-describedby={`new-${field}-help`}
                    onChange={(event) => setFields({ ...fields, [field]: event.target.value })} />
                  <small id={`new-${field}-help`} className={!validInteger(fields[field]) ? 'field-error' : ''}>
                    {!validInteger(fields[field]) ? 'Enter a whole-number value.' : field === 'code' ? 'Use the actual QR value; no ID is generated.' : 'Measured position in millimeters.'}
                  </small>
                </label>
              ))}
            </div>
            <NodeInspector node={attributes} onChange={setAttributes} hideNumericFields />
          </section>
          <section className="connection-preview" aria-label="Connection preview" aria-live="polite">
            <h3>Connection preview</h3>
            {!candidate ? <p>Enter valid coordinates and a QR code to preview routes.</p> : <>
              <p><strong>{incoming.length} incoming · {outgoing.length} outgoing</strong></p>
              <p>Same axis only · nearest neighbor within {document.map.maxNeighborDistance} mm.</p>
              {incoming.length === 0 && <p className="preview-warning">No incoming route: existing nodes cannot enter this point directly. Update a neighboring node’s outgoing directions to connect it.</p>}
              {outgoing.length === 0 && <p className="preview-warning">No outgoing route: this point has no usable exit yet.</p>}
              <ul>{incoming.map((route) => <li key={`in-${route.fromIndex}`}>{label(route.fromIndex)} → New node · {route.direction} · {route.distance} mm</li>)}
                {outgoing.map((route) => <li key={`out-${route.direction}`}>New node → {label(route.toIndex)} · {route.direction} · {route.distance} mm</li>)}</ul>
              {replaced.length > 0 && <p className="preview-warning">This insertion replaces {replaced.length} existing route(s) because the nearest neighbor changes.</p>}
              {issues.filter((issue) => !['no-incoming-route', 'no-outgoing-route'].includes(issue.code)).map((issue, i) => <p className={issue.severity === 'error' ? 'field-error' : 'preview-warning'} key={i}>{issue.message}</p>)}
              <p>Warnings allow creation as a point awaiting configuration. This preview does not validate fleet-wide reachability or robot safety.</p>
            </>}
          </section>
        </div>
        <footer className="new-node-footer"><span>Creation changes the local map. Use Save map to persist it.</span><button type="button" onClick={onCancel}>Cancel</button><button type="submit" disabled={blocked}>Create node</button></footer>
      </form>
    </dialog>
  );
}
