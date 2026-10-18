/**
 * BrevoEmailAdapter — Sends transactional emails via the Brevo (formerly Sendinblue) REST API.
 *
 * Uses the Brevo v3 API directly over HTTPS (no SDK required).
 * The API key is read from BREVO_API_KEY env var and is never exposed to clients.
 *
 * Email delivery failures are caught and logged without crashing the server.
 * A booking that was already persisted to the database is NOT rolled back if
 * the confirmation email fails — the booking is real, only the notification failed.
 *
 * Before this adapter works, the sender email must be verified in Brevo's
 * "Senders & Domains" settings.
 */

import { env } from '../../config/env.js';
import logger from '../../utils/logger.js';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

export class BrevoEmailAdapter {
  constructor({ apiKey = env.BREVO_API_KEY, senderEmail = env.BREVO_SENDER_EMAIL, senderName = env.BREVO_SENDER_NAME, fetchImpl = fetch } = {}) {
    if (!apiKey || !senderEmail || !senderName) {
      throw new Error('BREVO_API_KEY is required when EMAIL_PROVIDER=brevo');
    }
    this.apiKey = apiKey;
    this.senderEmail = senderEmail;
    this.senderName = senderName;
    this.fetchImpl = fetchImpl;
    logger.info('BrevoEmailAdapter initialized');
  }

  /**
   * Send a transactional email.
   * @param {object} opts
   * @param {string}   opts.to            — Recipient email address
   * @param {string}   opts.toName        — Recipient name
   * @param {string}   opts.subject       — Email subject
   * @param {string}   opts.htmlContent   — HTML body
   * @param {string}   [opts.textContent] — Plain text fallback
   */
  async sendEmail({ to, toName, subject, htmlContent, textContent }) {
    const body = JSON.stringify({
      sender: { name: this.senderName, email: this.senderEmail },
      to: [{ email: to, name: toName || to }],
      subject,
      htmlContent,
      ...(textContent ? { textContent } : {}),
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await this.fetchImpl(BREVO_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': this.apiKey,
        },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        logger.warn('BrevoEmail: API returned non-2xx', { status: response.status });
        return { success: false, error: `Brevo API error: ${response.status}` };
      }

      const result = await response.json();
      logger.info('BrevoEmail: provider accepted message');
      return { success: true };
    } catch (err) {
      // Network or parse error — log and return failure without throwing
      logger.warn('BrevoEmail: delivery failed', { errorType: err.name || 'UnknownError' });
      return { success: false, error: 'EMAIL_DELIVERY_FAILED' };
    } finally {
      clearTimeout(timeout);
    }
  }
}
