import type { AgvMap, Direction, MapNode } from './map-schema.js';

export interface DirectedRoute {
  fromIndex: number;
  toIndex: number;
  direction: Direction;
  distance: number;
}

function distanceInDirection(
  source: MapNode,
  target: MapNode,
  direction: Direction,
): number | null {
  switch (direction) {
    case 'North':
      return target.y === source.y && target.x > source.x
        ? target.x - source.x
        : null;
    case 'South':
      return target.y === source.y && target.x < source.x
        ? source.x - target.x
        : null;
    case 'West':
      return target.x === source.x && target.y > source.y
        ? target.y - source.y
        : null;
    case 'East':
      return target.x === source.x && target.y < source.y
        ? source.y - target.y
        : null;
  }
}

export function findNeighbor(
  nodes: readonly MapNode[],
  sourceIndex: number,
  direction: Direction,
  maxNeighborDistance: number,
): { index: number; distance: number } | null {
  const source = nodes[sourceIndex];
  if (!source) return null;

  let nearest: { index: number; distance: number } | null = null;

  nodes.forEach((target, index) => {
    if (index === sourceIndex) return;

    const distance = distanceInDirection(source, target, direction);
    if (distance === null || distance > maxNeighborDistance) return;

    if (!nearest || distance < nearest.distance) {
      nearest = { index, distance };
    }
  });

  return nearest;
}

export function inferRoutes(document: AgvMap): DirectedRoute[] {
  const { maxNeighborDistance, nodes } = document.map;
  const routes: DirectedRoute[] = [];

  nodes.forEach((node, fromIndex) => {
    for (const direction of new Set(node.directions ?? [])) {
      const neighbor = findNeighbor(
        nodes,
        fromIndex,
        direction,
        maxNeighborDistance,
      );

      if (neighbor) {
        routes.push({
          fromIndex,
          toIndex: neighbor.index,
          direction,
          distance: neighbor.distance,
        });
      }
    }
  });

  return routes;
}
