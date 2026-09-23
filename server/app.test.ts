import request from 'supertest';
import { describe, expect, it } from 'vitest';
import type { AgvMap } from '../shared/map-schema.js';
import { createApp } from './app.js';
import type { MapStore } from './storage.js';

const validMap: AgvMap = {
  map: {
    maxNeighborDistance: 1500,
    nodes: [
      { x: 1000, y: 1000, code: 1, directions: ['North'] },
      { x: 1800, y: 1000, code: 2, directions: ['South'] },
    ],
  },
};

function createMemoryStore(initial: AgvMap): MapStore & { value: AgvMap } {
  return {
    value: structuredClone(initial),
    async read() {
      return structuredClone(this.value);
    },
    async write(document) {
      this.value = structuredClone(document);
    },
  };
}

describe('map API', () => {
  it('reports health', async () => {
    const app = createApp(createMemoryStore(validMap));
    await request(app).get('/api/health').expect(200, { status: 'ok' });
  });

  it('loads the current map and its diagnostics', async () => {
    const app = createApp(createMemoryStore(validMap));
    const response = await request(app).get('/api/map').expect(200);

    expect(response.body.document).toEqual(validMap);
    expect(response.body.issues).toEqual([]);
  });

  it('saves a valid map', async () => {
    const store = createMemoryStore(validMap);
    const changedMap: AgvMap = {
      map: { ...validMap.map, maxNeighborDistance: 2000 },
    };

    await request(createApp(store)).put('/api/map').send(changedMap).expect(200);
    expect(store.value).toEqual(changedMap);
  });

  it('rejects malformed input without changing the stored map', async () => {
    const store = createMemoryStore(validMap);

    await request(createApp(store))
      .put('/api/map')
      .send({ map: { maxNeighborDistance: 0, nodes: [] } })
      .expect(400);

    expect(store.value).toEqual(validMap);
  });

  it('rejects blocking semantic errors without saving', async () => {
    const store = createMemoryStore(validMap);
    const duplicateCoordinates: AgvMap = {
      map: {
        maxNeighborDistance: 1500,
        nodes: [
          { x: 0, y: 0, code: 1 },
          { x: 0, y: 0, code: 2 },
        ],
      },
    };

    const response = await request(createApp(store))
      .put('/api/map')
      .send(duplicateCoordinates)
      .expect(422);

    expect(response.body.issues).toContainEqual(
      expect.objectContaining({ code: 'duplicate-coordinate', severity: 'error' }),
    );
    expect(store.value).toEqual(validMap);
  });
});
