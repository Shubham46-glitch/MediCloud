import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import app from '../src/app.js';

describe('Placeholder Route Modules (Deferred to Phase 2)', () => {
  it('GET /api/auth should return 501 Not Implemented', async () => {
    const res = await request(app).get('/api/auth').expect(501);
    assert.equal(res.body.success, false);
    assert.equal(res.body.status, 501);
    assert.equal(res.body.module, 'Authentication');
    assert.ok(res.body.message.includes('not implemented yet'));
  });

  it('GET /api/doctors should return 501 Not Implemented', async () => {
    const res = await request(app).get('/api/doctors').expect(501);
    assert.equal(res.body.success, false);
    assert.equal(res.body.status, 501);
    assert.equal(res.body.module, 'Doctors');
  });

  it('POST /api/appointments should return 501 Not Implemented', async () => {
    const res = await request(app).post('/api/appointments').expect(501);
    assert.equal(res.body.success, false);
    assert.equal(res.body.status, 501);
    assert.equal(res.body.module, 'Appointments');
  });

  it('GET /api/admin should return 501 Not Implemented', async () => {
    const res = await request(app).get('/api/admin').expect(501);
    assert.equal(res.body.success, false);
    assert.equal(res.body.status, 501);
    assert.equal(res.body.module, 'Admin');
  });
});
