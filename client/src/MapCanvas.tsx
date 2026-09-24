import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent } from 'react';
import { inferRoutes } from '../../shared/connections';
import { screenDeltaToMap } from './canvas-coordinates';
import type { AgvMap, MapNode } from '../../shared/map-schema';

interface Point {
  x: number;
  y: number;
}

interface CanvasGeometry {
  pointFor: (node: MapNode) => Point;
  viewBox: string;
  width: number;
  height: number;
  nodeRadius: number;
  labelSize: number;
}

function createGeometry(document: AgvMap): CanvasGeometry {
  const { nodes } = document.map;
  const xs = nodes.map((node) => node.x);
  const ys = nodes.map((node) => node.y);
  const minX = Math.min(...xs, 0);
  const maxX = Math.max(...xs, 1);
  const minY = Math.min(...ys, 0);
  const maxY = Math.max(...ys, 1);
  const xSpan = Math.max(maxX - minX, 1000);
  const ySpan = Math.max(maxY - minY, 1000);
  const padding = Math.max(xSpan, ySpan) * 0.06;
  const nodeRadius = Math.max(Math.min(xSpan, ySpan) * 0.019, 62);

  const width = ySpan + padding * 2;
  const height = xSpan + padding * 2;
  return {
    pointFor: (node) => ({
      x: maxY - node.y + padding,
      y: maxX - node.x + padding,
    }),
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    nodeRadius,
    labelSize: nodeRadius * 1.45,
  };
}

interface MapCanvasProps {
  document: AgvMap;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  onMove?: (index: number, x: number, y: number) => void;
  scale?: number;
  rotation?: number;
  fitToken?: number;
  onScaleChange?: (scale: number) => void;
  onAdd?: ((x: number, y: number) => void) | undefined;
  onCancelAdd?: () => void;
}

interface DragState {
  index: number;
  clientX: number;
  clientY: number;
  node: MapNode;
}

export function MapCanvas({ document, selectedIndex, onSelect, onMove, scale = 1, rotation = 0, fitToken = 0, onScaleChange, onAdd, onCancelAdd }: MapCanvasProps) {
  const routes = useMemo(() => inferRoutes(document), [document]);
  // Document edits must not move the camera. Reframe only on explicit Fit map.
  const frame = useRef<{ token: number; geometry: CanvasGeometry } | null>(null);
  if (!frame.current || frame.current.token !== fitToken) {
    frame.current = { token: fitToken, geometry: createGeometry(document) };
  }
  const geometry = frame.current.geometry;
  const worldRef = useRef<SVGGElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewport, setViewport] = useState({ width: 800, height: 500 });
  useEffect(() => {
    const element = svgRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setViewport({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const pixelsPerUnit = Math.max(0.0001, Math.min(viewport.width / geometry.width, viewport.height / geometry.height));
  const symbolScale = 1 / (pixelsPerUnit * scale);
  const { nodes } = document.map;
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [preview, setPreview] = useState<{ index: number; node: MapNode } | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const panRef = useRef<{ clientX: number; clientY: number; start: Point } | null>(null);
  const center = { x: geometry.width / 2, y: geometry.height / 2 };
  // Keep overview labels legible; zooming reveals labels as their anchors separate.
  const labelBoxes: { x: number; y: number; halfWidth: number }[] = [];
  const visibleLabels = new Set<number>();
  const labelOrder = nodes.map((_node, index) => index).sort((a, b) => Number(b === selectedIndex) - Number(a === selectedIndex));
  for (const index of labelOrder) {
    const node = nodes[index]!;
    if (!node.name && index !== selectedIndex) continue;
    const point = geometry.pointFor(node);
    const angle = rotation * Math.PI / 180;
    const x = (point.x * Math.cos(angle) - point.y * Math.sin(angle)) / symbolScale;
    const y = (point.x * Math.sin(angle) + point.y * Math.cos(angle)) / symbolScale;
    const halfWidth = (node.name ?? `QR ${node.code}`).length * 3.2 + 5;
    if (labelBoxes.some((box) => Math.abs(box.x - x) < box.halfWidth + halfWidth && Math.abs(box.y - y) < 16)) continue;
    labelBoxes.push({ x, y, halfWidth });
    visibleLabels.add(index);
  }

  useEffect(() => setPan({ x: 0, y: 0 }), [fitToken]);

  const nodeFor = (node: MapNode, index: number) => preview?.index === index ? preview.node : node;
  const svgVector = (event: ReactPointerEvent<SVGSVGElement>, startX: number, startY: number) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return screenDeltaToMap(event.clientX - startX, event.clientY - startY,
      geometry.width, geometry.height, rect.width, rect.height, scale, rotation);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragRef.current) {
      const drag = dragRef.current;
      const delta = svgVector(event, drag.clientX, drag.clientY);
      setPreview({ index: drag.index, node: { ...drag.node, x: Math.round(drag.node.x - delta.y), y: Math.round(drag.node.y - delta.x) } });
    } else if (panRef.current) {
      const rect = event.currentTarget.getBoundingClientRect();
      const delta = screenDeltaToMap(event.clientX - panRef.current.clientX, event.clientY - panRef.current.clientY,
        geometry.width, geometry.height, rect.width, rect.height);
      setPan({
        x: panRef.current.start.x + delta.x,
        y: panRef.current.start.y + delta.y,
      });
    }
  };

  const finishPointerAction = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.type !== 'pointercancel' && dragRef.current) {
      const drag = dragRef.current;
      const delta = svgVector(event, drag.clientX, drag.clientY);
      const x = Math.round(drag.node.x - delta.y);
      const y = Math.round(drag.node.y - delta.x);
      if (x !== drag.node.x || y !== drag.node.y) onMove?.(drag.index, x, y);
    }
    dragRef.current = null;
    panRef.current = null;
    setPreview(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleWheel = (event: WheelEvent<SVGSVGElement>) => {
    if (!onScaleChange) return;
    event.preventDefault();
    onScaleChange(Math.min(4, Math.max(0.45, scale * (event.deltaY < 0 ? 1.12 : 0.89))));
  };

  return (
    <div className={`map-canvas-wrap${onAdd ? ' map-canvas-wrap--adding' : ''}`}>
      <svg
        ref={svgRef}
        className="map-canvas"
        viewBox={geometry.viewBox}
        role="img"
        aria-label={`AGV map with ${nodes.length} nodes and ${routes.length} directed routes`}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          if (onAdd) {
            const matrix = worldRef.current?.getScreenCTM();
            if (!matrix) return;
            const cursor = event.currentTarget.createSVGPoint();
            cursor.x = event.clientX;
            cursor.y = event.clientY;
            const point = cursor.matrixTransform(matrix.inverse());
            const origin = geometry.pointFor({ x: 0, y: 0, code: 0 });
            onAdd(Math.round(origin.y - point.y), Math.round(origin.x - point.x));
            return;
          }
          if ((event.target as Element).classList.contains('map-pan-surface')) {
            panRef.current = { clientX: event.clientX, clientY: event.clientY, start: pan };
            event.currentTarget.setPointerCapture(event.pointerId);
          }
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerAction}
        onPointerCancel={finishPointerAction}
        onWheel={handleWheel}
      >
        <defs>
          <pattern id="grid" width="400" height="400" patternUnits="userSpaceOnUse">
            <path d="M 400 0 L 0 0 0 400" className="grid-line" />
          </pattern>
          <marker
            id="route-arrow"
            markerWidth="5"
            markerHeight="5"
            refX="4.2"
            refY="2.5"
            orient="auto"
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L5,2.5 L0,5 z" className="route-arrow" />
          </marker>
        </defs>

        <rect className="map-pan-surface" width="100%" height="100%" fill="url(#grid)" />

        <g ref={worldRef} transform={`translate(${center.x + pan.x} ${center.y + pan.y}) rotate(${rotation}) scale(${scale}) translate(${-center.x} ${-center.y})`}>
        <g aria-label="Directed routes">
          {routes.map((route) => {
            const source = geometry.pointFor(nodes[route.fromIndex]!);
            const target = geometry.pointFor(nodes[route.toIndex]!);
            const touchesSelection =
              selectedIndex === route.fromIndex || selectedIndex === route.toIndex;

            return (
              <line
                key={`${route.fromIndex}-${route.direction}`}
                x1={source.x}
                y1={source.y}
                x2={target.x}
                y2={target.y}
                className={touchesSelection ? 'route route--selected' : 'route'}
                markerEnd="url(#route-arrow)"
              />
            );
          })}
        </g>

        <g aria-label="Map nodes">
          {nodes.map((node, index) => {
            const renderedNode = nodeFor(node, index);
            const point = geometry.pointFor(renderedNode);
            const selected = selectedIndex === index;
            const stationType = node.charger ? 'charger' : node.chute ? 'chute' : 'waypoint';

            return (
              <g
                key={`${node.code}-${node.x}-${node.y}`}
                transform={`translate(${point.x} ${point.y})`}
                className={`node node--${stationType}${selected ? ' node--selected' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`${node.name ?? 'Waypoint'} QR ${node.code}, X ${node.x}, Y ${node.y}`}
                aria-pressed={selected}
                onClick={() => onSelect(index)}
                onPointerDown={(event) => {
                  if (!onMove || onAdd || event.button !== 0) return;
                  event.stopPropagation();
                  onSelect(index);
                  dragRef.current = { index, clientX: event.clientX, clientY: event.clientY, node };
                  event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onSelect(index);
                  }
                }}
              >
                <title>{`${node.name ?? 'Waypoint'} · QR ${node.code}\nX ${node.x} mm · Y ${node.y} mm\n${node.directions?.join(', ') || 'No outgoing directions'}`}</title>
                <g transform={`rotate(${-rotation}) scale(${symbolScale})`}>
                <circle r={selected ? 8 : 3.5} className="node__halo" />
                <circle r={node.charger || node.chute ? 5 : 3} className="node__target" />
                <circle r={1} className="node__core" />
                {node.charger && (
                  <text y={3} className="node__symbol">
                    ⚡
                  </text>
                )}
                {node.chute && (
                  <text y={3} className="node__symbol">
                    ↓
                  </text>
                )}
                {visibleLabels.has(index) && (
                  <text
                    y={-10}
                    className="node__label"
                    style={{ fontSize: 10 }}
                  >
                    {node.name ?? `QR ${node.code}`}
                  </text>
                )}
                </g>
              </g>
            );
          })}
        </g>
        </g>
      </svg>

      <div className="compass" aria-label="Map coordinate orientation" style={{ transform: `rotate(${rotation}deg)` }}>
        <span className="compass__north">N · +X</span>
        <span className="compass__west">W · +Y</span>
        <span className="compass__origin">mm</span>
      </div>
      <div className="canvas-caption"><strong>Warehouse map</strong><span>Coordinates in mm · markers not to scale</span></div>
      {onAdd && <div className="placement-hint" role="status">Click the map to place a node <button type="button" onClick={onCancelAdd}>Cancel</button></div>}
      <div className="canvas-controls" aria-label="Canvas zoom controls">
        <button type="button" aria-label="Zoom out" disabled={!onScaleChange || scale <= 0.45} onClick={() => onScaleChange?.(Math.max(0.45, scale / 1.25))}>−</button>
        <span>{Math.round(scale * 100)}%</span>
        <button type="button" aria-label="Zoom in on canvas" disabled={!onScaleChange || scale >= 4} onClick={() => onScaleChange?.(Math.min(4, scale * 1.25))}>+</button>
      </div>
    </div>
  );
}
