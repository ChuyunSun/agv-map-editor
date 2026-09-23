import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import type { AgvMap } from '../shared/map-schema.js';
import { JsonFileMapStore } from './storage.js';

const temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.splice(0).map((directory) =>
      rm(directory, { recursive: true, force: true }),
    ),
  );
});

describe('JSON file map storage', () => {
  it('writes and reads a validated map', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'mujin-map-test-'));
    temporaryDirectories.push(directory);
    const filePath = path.join(directory, 'nested', 'map.json');
    const store = new JsonFileMapStore(filePath);
    const document: AgvMap = {
      map: {
        maxNeighborDistance: 1500,
        nodes: [{ x: 1, y: 2, code: 0 }],
      },
    };

    await store.write(document);

    expect(await store.read()).toEqual(document);
    expect(JSON.parse(await readFile(filePath, 'utf8'))).toEqual(document);
  });

  it('rejects a malformed map already present on disk', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'mujin-map-test-'));
    temporaryDirectories.push(directory);
    const filePath = path.join(directory, 'map.json');
    const store = new JsonFileMapStore(filePath);

    await store.write({ map: { maxNeighborDistance: 10, nodes: [] } });
    const raw = JSON.parse(await readFile(filePath, 'utf8'));
    raw.map.maxNeighborDistance = 0;
    const { writeFile } = await import('node:fs/promises');
    await writeFile(filePath, JSON.stringify(raw), 'utf8');

    await expect(store.read()).rejects.toThrow();
  });
});
