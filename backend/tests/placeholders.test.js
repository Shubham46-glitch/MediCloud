/**
 * API Contract Tests
 *
 * Verifies the real API routes that replaced the Phase 1 placeholders.
 * All tests run against the mock adapters (DB_PROVIDER=mock, AUTH_PROVIDER=mock)
 * so no AWS credentials or live services are needed.
 *
 * Note: These tests use the singleton repository which is seeded with
 * seed-data.js on first access. Tests are intentionally non-destructive
 * (read-only or using data that won't collide with seeds).
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

// Override any developer .env before importing modules that initialize providers.
Object.assign(process.env, {
  NODE_ENV: 'test',
  DB_PROVIDER: 'mock',
  AUTH_PROVIDER: 'mock',
  STORAGE_PROVIDER: 'mock',
  EMAIL_PROVIDER: 'mock',
});

const [{ default: app }, { getStorageAdapter }, { getRepository }] = await Promise.all([
  import('../src/app.js'),
  import('../src/adapters/storage/index.js'),
  import('../src/repository/index.js'),
]);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Register a fresh patient and return { token, userId }.
 * Each call creates a unique email to avoid conflicts between tests.
 */
async function registerAndLogin(suffix = '') {
  const email = `test.patient.${Date.now()}${suffix}@example.com`;
  const res = await request(app)
    .post('/api/auth/register')
    .send({
      email,
      password: 'TestPassword123!',
      name: 'Test Patient',
      phone: '+1 (555) 999-0000',
    })
    .expect(201);

  return { token: res.body.token, user: res.body.user };
}

/**
 * Login as the seeded admin user (adm-1 in seed-data.js).
 * The mock auth adapter stores the seed users but without passwordHash,
 * so we register a dedicated admin. In a real test suite you'd seed a hashed
 * password; here we use the mock adapter's login directly.
 *
 * Because the seed admin (adm-1) has no passwordHash, we can only test
 * auth-gated routes by logging in as a registered patient.  Admin-only
 * paths are tested for 403 responses from a patient token.
 */
async function getPatientToken() {
  const { token } = await registerAndLogin('.auth');
  return token;
}

// ── Auth Routes ───────────────────────────────────────────────────────────────

describe('Auth Routes', () => {
  it('POST /api/auth/register — creates a new patient account', async () => {
    const email = `register.test.${Date.now()}@example.com`;
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'SecurePass99!', name: 'Alice Test', role: 'admin' })
      .expect('Content-Type', /json/)
      .expect(201);

    assert.equal(res.body.success, true);
    assert.equal(res.body.status, 201);
    assert.ok(res.body.token, 'Should return a token');
    assert.ok(res.body.user, 'Should return user object');
    assert.equal(res.body.user.role, 'patient', 'Public registration must always create patient');
    assert.ok(!res.body.user.passwordHash, 'passwordHash must not be returned to client');
  });

  it('POST /api/auth/register — rejects duplicate email with 400', async () => {
    const email = `dup.test.${Date.now()}@example.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'Pass1234!', name: 'First User' })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'Pass1234!', name: 'Second User' })
      .expect(400);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'EMAIL_ALREADY_REGISTERED');
  });

  it('POST /api/auth/register — rejects weak password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'weak@test.com', password: 'short', name: 'Weak Pass' })
      .expect(400);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('POST /api/auth/login — valid credentials return token', async () => {
    const email = `login.test.${Date.now()}@example.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'GoodPass123!', name: 'Login User' })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'GoodPass123!' })
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(res.body.token, 'Should return a token on successful login');
    assert.equal(res.body.user.email, email);
  });

  it('POST /api/auth/login — wrong password returns 401', async () => {
    const email = `badpw.test.${Date.now()}@example.com`;
    await request(app)
      .post('/api/auth/register')
      .send({ email, password: 'CorrectPass!1', name: 'BadPw User' })
      .expect(201);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'WrongPassword99!' })
      .expect(401);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  it('GET /api/auth/me — authenticated request returns user profile', async () => {
    const { token, user } = await registerAndLogin('.me');

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    assert.equal(res.body.success, true);
    assert.equal(res.body.user.email, user.email);
  });

  it('GET /api/auth/me — unauthenticated request returns 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .expect(401);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /api/auth/me — expired/invalid token returns 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.token.here')
      .expect(401);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'INVALID_TOKEN');
  });

  it('PUT /api/auth/me — updates owned fields and ignores client role escalation', async () => {
    const { token } = await registerAndLogin('.profile-update');
    const updated = await request(app)
      .put('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Synthetic Patient', address: 'Test City', role: 'admin' })
      .expect(200);
    assert.equal(updated.body.user.name, 'Updated Synthetic Patient');
    assert.equal(updated.body.user.address, 'Test City');
    assert.equal(updated.body.user.role, 'patient');
  });
});

// ── Doctors Routes ────────────────────────────────────────────────────────────

describe('Doctors Routes', () => {
  it('GET /api/doctors — returns doctor list (public, no auth required)', async () => {
    const res = await request(app)
      .get('/api/doctors')
      .expect('Content-Type', /json/)
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.doctors), 'Should return doctors array');
    assert.ok(res.body.doctors.length > 0, 'Should have at least one seeded doctor');
  });

  it('GET /api/doctors — filters by specialty', async () => {
    const res = await request(app)
      .get('/api/doctors?specialty=Cardiology')
      .expect(200);

    assert.equal(res.body.success, true);
    const allCardiology = res.body.doctors.every(
      (d) => d.specialty.toLowerCase() === 'cardiology',
    );
    assert.ok(allCardiology, 'All returned doctors should match the requested specialty');
  });

  it('GET /api/doctors/:id — returns a single doctor by ID', async () => {
    const res = await request(app)
      .get('/api/doctors/doc-1')
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(res.body.doctor, 'Should return a doctor object');
    assert.equal(res.body.doctor.doctorId, 'doc-1');
  });

  it('GET /api/doctors/:id — returns 404 for unknown doctor', async () => {
    const res = await request(app)
      .get('/api/doctors/doc-does-not-exist')
      .expect(404);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'DOCTOR_NOT_FOUND');
  });

  it('POST /api/doctors — returns 403 when called with patient token', async () => {
    const token = await getPatientToken();
    const res = await request(app)
      .post('/api/doctors')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Dr. Fake', title: 'MD', specialty: 'X', hospital: 'H', location: 'L', fee: 100, experience: 1 })
      .expect(403);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('GET /api/doctors/specialties — returns all specialties (public)', async () => {
    const res = await request(app)
      .get('/api/doctors/specialties')
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.specialties), 'Should return specialties array');
    assert.ok(res.body.specialties.length > 0, 'Should have at least one seeded specialty');
  });
});

// ── Appointments Routes ───────────────────────────────────────────────────────

describe('Appointments Routes', () => {
  it('POST /api/appointments — returns 401 without authentication', async () => {
    const res = await request(app)
      .post('/api/appointments')
      .send({ doctorId: 'doc-1', date: '2026-12-01', time: '09:00 AM', reason: 'Test' })
      .expect(401);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  it('POST /api/appointments — books an appointment for authenticated patient', async () => {
    const { token } = await registerAndLogin('.book');
    // Use a future date that falls on a day doc-1 works (Mon–Fri)
    // 2027-01-04 is a Monday
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        doctorId: 'doc-1',
        date: '2027-01-04',
        time: '09:00 AM',
        type: 'In-Person Consultation',
        reason: 'Routine cardiac check',
      })
      .expect(201);

    assert.equal(res.body.success, true);
    assert.ok(res.body.appointment, 'Should return the created appointment');
    assert.equal(res.body.appointment.status, 'pending');
  });

  it('POST /api/appointments — prevents double-booking the same slot', async () => {
    const { token: tokenA } = await registerAndLogin('.db1');
    const { token: tokenB } = await registerAndLogin('.db2');
    // 2027-01-05 is a Tuesday — doc-1 available
    const payload = {
      doctorId: 'doc-1',
      date: '2027-01-05',
      time: '10:00 AM',
      reason: 'First booking',
    };

    const first = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${tokenA}`)
      .send(payload)
      .expect(201);
    assert.equal(first.body.success, true);

    const second = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${tokenB}`)
      .send(payload)
      .expect(409);
    assert.equal(second.body.success, false);
    assert.equal(second.body.error.code, 'SLOT_CONFLICT');
  });

  it('POST /api/appointments — only one concurrent request reserves a slot', async () => {
    const { token: firstToken } = await registerAndLogin('.parallel-a');
    const { token: secondToken } = await registerAndLogin('.parallel-b');
    const payload = { doctorId: 'doc-1', date: '2028-01-06', time: '11:30 AM', reason: 'Synthetic race test' };
    const responses = await Promise.all([
      request(app).post('/api/appointments').set('Authorization', `Bearer ${firstToken}`).send(payload),
      request(app).post('/api/appointments').set('Authorization', `Bearer ${secondToken}`).send(payload),
    ]);
    assert.deepEqual(responses.map((response) => response.status).sort(), [201, 409]);
  });

  it('POST /api/appointments — rejects booking on doctor non-working day', async () => {
    const { token } = await registerAndLogin('.nonworkday');
    // 2027-01-03 is a Sunday — doc-1 only works Mon–Fri
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({
        doctorId: 'doc-1',
        date: '2027-01-03',
        time: '09:00 AM',
        reason: 'Should fail',
      })
      .expect(400);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'DOCTOR_NOT_AVAILABLE_ON_DAY');
  });

  it('POST /api/appointments — rejects impossible calendar dates', async () => {
    const { token } = await registerAndLogin('.badcalendar');
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${token}`)
      .send({ doctorId: 'doc-1', date: '2028-02-31', time: '09:00 AM', reason: 'Synthetic validation case' })
      .expect(400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });

  it('PATCH appointment routes enforce owner access and support cancellation and rescheduling', async () => {
    const { token: ownerToken } = await registerAndLogin('.owner');
    const { token: otherToken } = await registerAndLogin('.other');
    const booking = await request(app)
      .post('/api/appointments')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ doctorId: 'doc-1', date: '2028-01-03', time: '09:00 AM', reason: 'Synthetic appointment test' })
      .expect(201);
    const appointmentId = booking.body.appointment.appointmentId;

    await request(app)
      .patch(`/api/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ reason: 'Unauthorized synthetic attempt' })
      .expect(403);

    const moved = await request(app)
      .patch(`/api/appointments/${appointmentId}/reschedule`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ date: '2028-01-04', time: '10:00 AM' })
      .expect(200);
    assert.equal(moved.body.appointment.date, '2028-01-04');
    assert.equal(moved.body.appointment.time, '10:00 AM');

    await request(app)
      .patch(`/api/appointments/${appointmentId}/cancel`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'Synthetic cancellation test' })
      .expect(200);
  });

  it('GET /api/appointments/me — returns authenticated patient appointments', async () => {
    const { token } = await registerAndLogin('.myapts');

    const res = await request(app)
      .get('/api/appointments/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    assert.equal(res.body.success, true);
    assert.ok(Array.isArray(res.body.appointments));
  });
});

// ── Admin Routes ──────────────────────────────────────────────────────────────

describe('Admin Routes', () => {
  it('GET /api/admin/stats — returns 403 for patient role', async () => {
    const token = await getPatientToken();
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  it('GET /api/admin/stats — returns 401 without authentication', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .expect(401);

    assert.equal(res.body.success, false);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  it('GET /api/admin/appointments — returns 403 for patient role', async () => {
    const token = await getPatientToken();
    const res = await request(app)
      .get('/api/admin/appointments')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    assert.equal(res.body.error.code, 'FORBIDDEN');
  });
});

describe('Document Routes', () => {
  it('binds upload confirmation to its owner and hides object keys from listings', async () => {
    const { token: ownerToken } = await registerAndLogin('.document-owner');
    const { token: otherToken } = await registerAndLogin('.document-other');
    const upload = await request(app)
      .post('/api/documents/upload-url')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ fileName: 'synthetic-report.pdf', fileType: 'application/pdf', fileSizeBytes: 1024 })
      .expect(200);
    assert.ok(upload.body.uploadId);
    assert.equal(Object.hasOwn(upload.body, 'objectKey'), false);

    await request(app)
      .post('/api/documents/confirm-upload')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ uploadId: upload.body.uploadId })
      .expect(404);

    const confirmed = await request(app)
      .post('/api/documents/confirm-upload')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ uploadId: upload.body.uploadId })
      .expect(201);
    const documentId = confirmed.body.document.documentId;

    const list = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    assert.equal(list.body.documents.length, 1);
    assert.equal(Object.hasOwn(list.body.documents[0], 'objectKey'), false);

    await request(app)
      .get(`/api/documents/${documentId}/download-url`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(404);
    await request(app)
      .get(`/api/documents/${documentId}/download-url`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
  });

  it('rejects oversized and unsupported upload requests', async () => {
    const { token } = await registerAndLogin('.document-validation');
    const oversized = await request(app)
      .post('/api/documents/upload-url')
      .set('Authorization', `Bearer ${token}`)
      .send({ fileName: 'too-large.pdf', fileType: 'application/pdf', fileSizeBytes: 11 * 1024 * 1024 })
      .expect(400);
    assert.equal(oversized.body.success, false);
    await request(app)
      .post('/api/documents/upload-url')
      .set('Authorization', `Bearer ${token}`)
      .send({ fileName: 'unsupported.txt', fileType: 'text/plain', fileSizeBytes: 100 })
      .expect(400);
  });

  it('rejects missing objects and expired upload intents without saving metadata', async () => {
    const { token, user } = await registerAndLogin('.document-expired');
    const storage = getStorageAdapter();
    const repository = getRepository();
    const missing = await request(app)
      .post('/api/documents/upload-url')
      .set('Authorization', `Bearer ${token}`)
      .send({ fileName: 'missing.pdf', fileType: 'application/pdf', fileSizeBytes: 512 })
      .expect(200);
    storage.objects.clear();
    const missingConfirmation = await request(app)
      .post('/api/documents/confirm-upload')
      .set('Authorization', `Bearer ${token}`)
      .send({ uploadId: missing.body.uploadId })
      .expect(400);
    assert.equal(missingConfirmation.body.error.code, 'UPLOADED_OBJECT_NOT_FOUND');

    const expired = await request(app)
      .post('/api/documents/upload-url')
      .set('Authorization', `Bearer ${token}`)
      .send({ fileName: 'expired.pdf', fileType: 'application/pdf', fileSizeBytes: 512 })
      .expect(200);
    const intent = await repository.getUploadIntent(user.userId, expired.body.uploadId);
    const storedIntent = repository.uploadIntents.find((item) => item.uploadId === expired.body.uploadId);
    assert.ok(storedIntent);
    storedIntent.expiresAt = Math.floor(Date.now() / 1000) - 1;
    assert.ok(intent);
    await request(app)
      .post('/api/documents/confirm-upload')
      .set('Authorization', `Bearer ${token}`)
      .send({ uploadId: expired.body.uploadId })
      .expect(410);
  });
});
