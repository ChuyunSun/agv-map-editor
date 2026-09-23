import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { createApp } from './app.js';
import { JsonFileMapStore } from './storage.js';

const port = Number(process.env.PORT ?? 3000);
const dataPath = process.env.MAP_DATA_PATH ?? path.resolve('data/map.json');
const app = createApp(new JsonFileMapStore(dataPath));

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const clientPath = path.resolve(currentDirectory, '../../client');

if (existsSync(clientPath)) {
  app.use(express.static(clientPath));
  app.use((_request, response) => {
    response.sendFile(path.join(clientPath, 'index.html'));
  });
}

app.listen(port, () => {
  console.log(`Mujin AGV Map Editor listening on http://localhost:${port}`);
});
