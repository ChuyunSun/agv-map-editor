import type { AgvMap } from '../../shared/map-schema';
import type { MapIssue } from '../../shared/validation';

export interface MapResponse {
  document: AgvMap;
  issues: MapIssue[];
}

export async function loadMap(signal?: AbortSignal): Promise<MapResponse> {
  const response = await fetch('/api/map', signal ? { signal } : undefined);
  if (!response.ok) throw new Error(`Map request failed with status ${response.status}.`);
  return response.json() as Promise<MapResponse>;
}

export async function saveMap(document: AgvMap): Promise<MapResponse> {
  const response = await fetch('/api/map', {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(document),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? `Map save failed with status ${response.status}.`);
  }

  return response.json() as Promise<MapResponse>;
}
