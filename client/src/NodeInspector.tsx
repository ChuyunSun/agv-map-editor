import { useEffect, useState } from 'react';
import { DIRECTIONS, type Direction, type MapNode } from '../../shared/map-schema';

interface IntegerFieldProps {
  label: string;
  value: number;
  minimum?: number;
  onValidChange: (value: number) => void;
}

function IntegerField({ label, value, minimum, onValidChange }: IntegerFieldProps) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => setDraft(String(value)), [value]);

  const parsed = Number(draft);
  const valid = /^-?\d+$/.test(draft) && Number.isSafeInteger(parsed) && (minimum === undefined || parsed >= minimum);
  const error = draft.length === 0
    ? `${label} is required.`
    : !valid
      ? `${label} must be ${minimum === 1 ? 'a positive ' : 'an '}integer.`
      : null;

  return (
    <label className="form-field">
      <span>{label}</span>
      <input
        type="number"
        step="1"
        min={minimum}
        value={draft}
        aria-invalid={Boolean(error)}
        onChange={(event) => {
          const nextDraft = event.target.value;
          setDraft(nextDraft);
          const nextValue = Number(nextDraft);
          if (/^-?\d+$/.test(nextDraft) && Number.isSafeInteger(nextValue) && (minimum === undefined || nextValue >= minimum)) {
            onValidChange(nextValue);
          }
        }}
      />
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}

interface NodeInspectorProps {
  node: MapNode;
  onChange: (node: MapNode) => void;
}

export function NodeInspector({ node, onChange }: NodeInspectorProps) {
  const update = (patch: Partial<MapNode>) => onChange({ ...node, ...patch });

  const toggleDirection = (direction: Direction, checked: boolean) => {
    const directions = new Set(node.directions ?? []);
    if (checked) directions.add(direction);
    else directions.delete(direction);
    update({ directions: directions.size > 0 ? DIRECTIONS.filter((item) => directions.has(item)) : undefined });
  };

  return (
    <div className="inspector-form">
      <label className="form-field">
        <span>Name <em>optional</em></span>
        <input
          value={node.name ?? ''}
          placeholder="e.g. READY"
          onChange={(event) => {
            const name = event.target.value.trimStart();
            if (name.trim()) update({ name });
            else {
              const { name: _removed, ...withoutName } = node;
              onChange(withoutName);
            }
          }}
        />
      </label>

      <div className="form-grid">
        <IntegerField label="QR code" value={node.code} onValidChange={(code) => update({ code })} />
        <IntegerField label="X (mm)" value={node.x} onValidChange={(x) => update({ x })} />
        <IntegerField label="Y (mm)" value={node.y} onValidChange={(y) => update({ y })} />
      </div>

      <fieldset>
        <legend>Outgoing directions</legend>
        <div className="direction-grid">
          {DIRECTIONS.map((direction) => (
            <label key={direction}>
              <input
                type="checkbox"
                checked={node.directions?.includes(direction) ?? false}
                onChange={(event) => toggleDirection(direction, event.target.checked)}
              />
              {direction}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Station features</legend>
        <FeatureEditor
          label="Charger"
          direction={node.charger?.direction}
          onChange={(direction) => update({ charger: direction ? { direction } : undefined })}
        />
        <FeatureEditor
          label="Chute"
          direction={node.chute?.direction}
          onChange={(direction) => update({ chute: direction ? { direction } : undefined })}
        />
      </fieldset>
    </div>
  );
}

interface FeatureEditorProps {
  label: string;
  direction: Direction | undefined;
  onChange: (direction: Direction | undefined) => void;
}

function FeatureEditor({ label, direction, onChange }: FeatureEditorProps) {
  return (
    <div className="feature-row">
      <label>
        <input
          type="checkbox"
          checked={Boolean(direction)}
          onChange={(event) => onChange(event.target.checked ? 'North' : undefined)}
        />
        {label}
      </label>
      <select
        aria-label={`${label} direction`}
        value={direction ?? 'North'}
        disabled={!direction}
        onChange={(event) => onChange(event.target.value as Direction)}
      >
        {DIRECTIONS.map((item) => <option key={item}>{item}</option>)}
      </select>
    </div>
  );
}

export { IntegerField };
