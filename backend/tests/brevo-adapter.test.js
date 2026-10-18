import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { BrevoEmailAdapter } from '../src/adapters/email/brevo-email.adapter.js';

const config = {
  apiKey: 'synthetic-test-key',
  senderEmail: 'test@example.invalid',
  senderName: 'MediCloud Test',
};

describe('BrevoEmailAdapter (network stub; no email is sent)', () => {
  it('handles a successful provider response', async () => {
    const adapter = new BrevoEmailAdapter({
      ...config,
      fetchImpl: async (_url, options) => {
        assert.equal(options.headers['api-key'], config.apiKey);
        return { ok: true, json: async () => ({ messageId: 'synthetic-message-id' }) };
      },
    });
    const result = await adapter.sendEmail({ to: 'patient@example.invalid', subject: 'Test', htmlContent: '<p>Test</p>' });
    assert.deepEqual(result, { success: true });
  });

  it('reports provider and network failures without returning response bodies', async () => {
    const rejected = new BrevoEmailAdapter({ ...config, fetchImpl: async () => ({ ok: false, status: 503 }) });
    assert.deepEqual(await rejected.sendEmail({ to: 'patient@example.invalid', subject: 'Test', htmlContent: '' }), { success: false, error: 'Brevo API error: 503' });
    const unavailable = new BrevoEmailAdapter({ ...config, fetchImpl: async () => { throw Object.assign(new Error('synthetic private transport detail'), { name: 'TypeError' }); } });
    assert.deepEqual(await unavailable.sendEmail({ to: 'patient@example.invalid', subject: 'Test', htmlContent: '' }), { success: false, error: 'EMAIL_DELIVERY_FAILED' });
  });

  it('rejects missing credentials or sender configuration', () => {
    assert.throws(() => new BrevoEmailAdapter({ apiKey: '', senderEmail: config.senderEmail, senderName: config.senderName }), /BREVO_API_KEY/);
    assert.throws(() => new BrevoEmailAdapter({ ...config, senderEmail: '' }), /BREVO_API_KEY/);
  });
});
