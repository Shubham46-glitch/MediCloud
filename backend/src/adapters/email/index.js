import { env } from '../../config/env.js';
import logger from '../../utils/logger.js';
import { MockEmailAdapter } from './mock-email.adapter.js';
import { BrevoEmailAdapter } from './brevo-email.adapter.js';

let emailAdapterInstance = null;

export function getEmailAdapter() {
  if (emailAdapterInstance) return emailAdapterInstance;

  switch (env.EMAIL_PROVIDER) {
    case 'brevo':
      logger.info('Using Brevo email adapter');
      emailAdapterInstance = new BrevoEmailAdapter();
      break;
    default:
      logger.info('Using mock email adapter (development mode)');
      emailAdapterInstance = new MockEmailAdapter();
  }
  return emailAdapterInstance;
}

export function resetEmailAdapter() {
  emailAdapterInstance = null;
}

export default getEmailAdapter();
