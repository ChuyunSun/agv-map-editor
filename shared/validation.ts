import { findNeighbor, inferRoutes } from './connections.js';
import type { AgvMap } from './map-schema.js';

export type IssueSeverity = 'error' | 'warning';

export interface MapIssue {
  severity: IssueSeverity;
  code: string;
  message: string;
  nodeIndexes: number[];
}

function findDuplicates<T>(
  values: readonly T[],
  keyOf: (value: T) => string,
): Map<string, number[]> {
  const indexesByKey = new Map<string, number[]>();

  values.forEach((value, index) => {
    const key = keyOf(value);
    indexesByKey.set(key, [...(indexesByKey.get(key) ?? []), index]);
  });

  return new Map(
    [...indexesByKey.entries()].filter(([, indexes]) => indexes.length > 1),
  );
}

export function validateMapSemantics(document: AgvMap): MapIssue[] {
  const issues: MapIssue[] = [];
  const { maxNeighborDistance, nodes } = document.map;

  for (const [coordinate, nodeIndexes] of findDuplicates(
    nodes,
    (node) => `${node.x}:${node.y}`,
  )) {
    issues.push({
      severity: 'error',
      code: 'duplicate-coordinate',
      message: `Multiple nodes use coordinate ${coordinate.replace(':', ', ')} mm.`,
      nodeIndexes,
    });
  }

  for (const [code, nodeIndexes] of findDuplicates(nodes, (node) => String(node.code))) {
    issues.push({
      severity: 'warning',
      code: 'duplicate-qr-code',
      message: `QR code ${code} is used by multiple nodes.`,
      nodeIndexes,
    });
  }

  const namedNodes = nodes
    .map((node, originalIndex) => ({ node, originalIndex }))
    .filter(({ node }) => node.name);

  for (const [name, localIndexes] of findDuplicates(
    namedNodes,
    ({ node }) => node.name!.toLocaleLowerCase(),
  )) {
    issues.push({
      severity: 'warning',
      code: 'duplicate-name',
      message: `Name ${name} is used by multiple nodes.`,
      nodeIndexes: localIndexes.map((index) => namedNodes[index]!.originalIndex),
    });
  }

  nodes.forEach((node, nodeIndex) => {
    if (node.charger && node.chute) {
      issues.push({
        severity: 'warning',
        code: 'multiple-station-features',
        message: `Node ${node.name ?? node.code} is both a charger and a chute.`,
        nodeIndexes: [nodeIndex],
      });
    }

    for (const direction of new Set(node.directions ?? [])) {
      if (!findNeighbor(nodes, nodeIndex, direction, maxNeighborDistance)) {
        issues.push({
          severity: 'warning',
          code: 'dangling-direction',
          message: `${node.name ?? node.code} has no ${direction} neighbor within ${maxNeighborDistance} mm.`,
          nodeIndexes: [nodeIndex],
        });
      }
    }
  });

  const routes = inferRoutes(document);
  const incoming = new Set(routes.map((route) => route.toIndex));
  const outgoing = new Set(routes.map((route) => route.fromIndex));
  nodes.forEach((node, index) => {
    if (!incoming.has(index)) issues.push({ severity: 'warning', code: 'no-incoming-route', message: `${node.name ?? node.code} has no incoming route from another node.`, nodeIndexes: [index] });
    if (!outgoing.has(index)) issues.push({ severity: 'warning', code: 'no-outgoing-route', message: `${node.name ?? node.code} has no usable outgoing route.`, nodeIndexes: [index] });
  });
  return issues;
}
