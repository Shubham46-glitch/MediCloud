/**
 * MockEmailAdapter — No-op email adapter for development and testing.
 *
 * DEVELOPMENT/TEST ONLY. Simulates notifications without logging email content.
 * This prevents accidental email sends during development.
 *
 * In production, use BrevoEmailAdapter.
 */

import logger from '../../utils/logger.js';

export class MockEmailAdapter {
  constructor() {
    logger.info('MockEmailAdapter initialized (development mode — emails are logged, not sent)');
  }

  async sendEmail() {
    logger.info('MockEmail: notification simulated');
    return { success: true };
  }
}
