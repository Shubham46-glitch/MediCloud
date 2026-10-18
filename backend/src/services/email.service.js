/** Transactional appointment notifications. Delivery never changes a committed booking. */
import { getEmailAdapter } from '../adapters/email/index.js';
import logger from '../utils/logger.js';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

async function deliverAppointmentNotice(appointment, action) {
  if (!appointment.patientEmail) return { success: false, error: 'RECIPIENT_NOT_AVAILABLE' };
  const { appointmentId, patientName, patientEmail, doctorName, doctorHospital, date, time, type } = appointment;
  const summary = `${action}\nReference: ${appointmentId}\nClinician: ${doctorName}\nClinic: ${doctorHospital}\nDate: ${date} at ${time}\nType: ${type}`;
  try {
    const result = await getEmailAdapter().sendEmail({
      to: patientEmail,
      toName: patientName,
      subject: `MediCloud appointment update: ${action}`,
      textContent: `Hello ${patientName || 'there'},\n\n${action}\n\nSign in to MediCloud to view your appointment.`,
      htmlContent: `<p>Hello ${escapeHtml(patientName || 'there')},</p><p>${escapeHtml(action)}.</p><p>Sign in to MediCloud to view your appointment.</p>`,
    });
    if (!result.success) logger.warn('Appointment email delivery failed', { appointmentId, category: result.error || 'provider_rejected' });
    return result;
  } catch (error) {
    logger.warn('Appointment email delivery failed', { appointmentId, errorType: error.name || 'UnknownError' });
    return { success: false, error: 'EMAIL_DELIVERY_FAILED' };
  }
}

export function sendAppointmentConfirmation(appointment) {
  void deliverAppointmentNotice(appointment, 'Your appointment request has been booked.');
  return { queued: true };
}

export function sendAppointmentUpdate(appointment, action) {
  void deliverAppointmentNotice(appointment, action);
  return { queued: true };
}
