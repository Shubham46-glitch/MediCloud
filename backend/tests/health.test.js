import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('GET /api/health', () => {
  it('should return 200 OK with service details and timestamp', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect('Content-Type', /json/)
      .expect(200);

    assert.equal(response.body.success, true);
    assert.equal(response.body.status, 'ok');
    assert.equal(typeof response.body.service, 'string');
    assert.match(response.body.service, /MediCloud/i);
    assert.equal(typeof response.body.timestamp, 'string');
    assert.ok(!isNaN(Date.parse(response.body.timestamp)));
  });
});
