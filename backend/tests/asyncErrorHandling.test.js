import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { asyncHandler } from '../src/middleware/asyncHandler.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

describe('async route error handling', () => {
  it('forwards rejected handlers to JSON error middleware and keeps serving requests', async () => {
    const app = express();
    app.get('/failure', asyncHandler(async () => {
      throw new Error('private implementation detail');
    }));
    app.get('/healthy', (_req, res) => res.json({ success: true }));
    app.use(errorHandler);

    const failure = await request(app).get('/failure').expect(500);
    assert.deepEqual(failure.body, {
      success: false,
      status: 500,
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected internal error occurred.',
      },
    });
    assert.equal(JSON.stringify(failure.body).includes('private implementation detail'), false);
    await request(app).get('/healthy').expect(200, { success: true });
  });
});
