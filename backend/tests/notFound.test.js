import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('404 Route Not Found', () => {
  it('should return 404 with standard JSON error payload for undefined GET route', async () => {
    const response = await request(app)
      .get('/api/undefined-endpoint-for-testing')
      .expect('Content-Type', /json/)
      .expect(404);

    assert.equal(response.body.success, false);
    assert.equal(response.body.status, 404);
    assert.equal(response.body.error.code, 'ROUTE_NOT_FOUND');
    assert.ok(response.body.error.message.includes('Route not found'));
  });

  it('should return 404 with standard JSON error payload for undefined POST route', async () => {
    const response = await request(app)
      .post('/some-random-page')
      .send({ data: 123 })
      .expect('Content-Type', /json/)
      .expect(404);

    assert.equal(response.body.success, false);
    assert.equal(response.body.status, 404);
    assert.equal(response.body.error.code, 'ROUTE_NOT_FOUND');
  });
});
