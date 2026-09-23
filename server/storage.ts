import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseAgvMap, type AgvMap } from '../shared/map-schema.js';

export interface MapStore {
  read(): Promise<AgvMap>;
  write(document: AgvMap): Promise<void>;
}

export class JsonFileMapStore implements MapStore {
  constructor(private readonly filePath: string) {}

  async read(): Promise<AgvMap> {
    const contents = await readFile(this.filePath, 'utf8');
    return parseAgvMap(JSON.parse(contents));
  }

  async write(document: AgvMap): Promise<void> {
    const directory = dirname(this.filePath);
    const temporaryPath = `${this.filePath}.${randomUUID()}.tmp`;

    await mkdir(directory, { recursive: true });
    await writeFile(temporaryPath, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
    await rename(temporaryPath, this.filePath);
  }
}
