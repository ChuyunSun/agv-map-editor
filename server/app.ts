import express, { type ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { agvMapSchema } from '../shared/map-schema.js';
import { validateMapSemantics } from '../shared/validation.js';
import type { MapStore } from './storage.js';

export function createApp(store: MapStore) {
  const app = express();

  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.get('/api/map', async (_request, response, next) => {
    try {
      const document = await store.read();
      response.json({
        document,
        issues: validateMapSemantics(document),
      });
    } catch (error) {
      next(error);
    }
  });

  app.put('/api/map', async (request, response, next) => {
    try {
      const document = agvMapSchema.parse(request.body);
      const issues = validateMapSemantics(document);
      const blockingIssues = issues.filter((issue) => issue.severity === 'error');

      if (blockingIssues.length > 0) {
        response.status(422).json({
          error: 'Map contains blocking semantic errors.',
          issues,
        });
        return;
      }

      await store.write(document);
      response.json({ document, issues });
    } catch (error) {
      if (error instanceof ZodError) {
        response.status(400).json({
          error: 'Map does not match the required file format.',
          issues: error.issues,
        });
        return;
      }

      next(error);
    }
  });

  const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({
      error: 'The map could not be read or saved.',
    });
  };

  app.use(errorHandler);
  return app;
}
