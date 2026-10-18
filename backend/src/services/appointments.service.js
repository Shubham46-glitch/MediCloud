/**
 * Appointment Service — Business logic for appointment lifecycle.
 *
 * Enforces:
 *  - Doctor exists and is active
 *  - Requested date is one of the doctor's working days
 *  - Requested time slot is in the doctor's available slots
 *  - No existing active booking for that doctor/date/time (double-booking prevention)
 *  - Ownership: patients can only view/cancel their own appointments
 *  - Status transitions: only valid transitions are allowed
 */

import { getRepository } from '../repository/index.js';
import logger from '../utils/logger.js';
import { sendAppointmentConfirmation, sendAppointmentUpdate } from './email.service.js';
import { z } from 'zod';

// Day name lookup (Date.getDay() returns 0=Sun, 1=Mon, etc.)
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const validCalendarDate = (value) => {
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};
const appointmentDate = () => new Date().toISOString().slice(0, 10);

export const createAppointmentSchema = z.object({
  doctorId: z.string().min(1, 'Doctor ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').refine(validCalendarDate, 'Date is not a valid calendar date'),
  time: z.string().min(1, 'Time slot is required'),
  type: z.enum(['In-Person Consultation', 'Video Consultation']).default('In-Person Consultation'),
  reason: z.string().min(2, 'Reason is required').max(500),
  notes: z.string().max(1000).optional(),
  patientPhone: z.string().optional(),
});

export const rescheduleSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').refine(validCalendarDate, 'Date is not a valid calendar date'),
  time: z.string().min(1, 'Time slot is required'),
});

export async function createAppointment(input, patientUser) {
  const derivedName = typeof patientUser.name === 'string' ? patientUser.name.trim() : '';
  if (derivedName.length < 2) {
    return { success: false, status: 400, error: 'PROFILE_INCOMPLETE', message: 'Complete your account name before booking an appointment.' };
  }
  const validation = createAppointmentSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, status: 400, error: 'VALIDATION_ERROR', details: validation.error.flatten().fieldErrors };
  }

  const { doctorId, date, time, type, reason, notes, patientPhone } = validation.data;
  const repo = getRepository();

  // 1. Verify doctor exists and is active
  const doctor = await repo.getDoctorById(doctorId);
  if (!doctor) {
    return { success: false, status: 404, error: 'DOCTOR_NOT_FOUND', message: 'Doctor not found.' };
  }
  if (doctor.status !== 'active') {
    return { success: false, status: 400, error: 'DOCTOR_UNAVAILABLE', message: 'This doctor is not currently accepting appointments.' };
  }

  // 2. Validate the date is a future date (allow today)
  const today = appointmentDate();
  if (date < today) {
    return { success: false, status: 400, error: 'INVALID_DATE', message: 'Appointment date cannot be in the past.' };
  }

  // 3. Validate the date falls on one of the doctor's working days
  const [year, month, day] = date.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayName = DAY_NAMES[dateObj.getDay()];

  if (doctor.availableDays && doctor.availableDays.length > 0) {
    if (!doctor.availableDays.includes(dayName)) {
      return {
        success: false,
        status: 400,
        error: 'DOCTOR_NOT_AVAILABLE_ON_DAY',
        message: `Dr. ${doctor.name} does not work on ${dayName}s. Available days: ${doctor.availableDays.join(', ')}.`,
      };
    }
  }

  // 4. Validate the time slot is in the doctor's available slots
  if (doctor.availableSlots && doctor.availableSlots.length > 0) {
    if (!doctor.availableSlots.includes(time)) {
      return {
        success: false,
        status: 400,
        error: 'INVALID_TIME_SLOT',
        message: `"${time}" is not a valid slot. Available: ${doctor.availableSlots.join(', ')}.`,
      };
    }
  }

  // 5. Build and persist the appointment (duplicate check is inside createAppointment)
  const result = await repo.createAppointment({
    patientId: patientUser.userId,
    patientName: patientUser.name,
    patientEmail: patientUser.email,
    patientPhone: patientPhone || patientUser.phone || '',
    patientGender: patientUser.gender,
    doctorId,
    doctorName: doctor.name,
    doctorSpecialty: doctor.specialty,
    doctorImage: doctor.image,
    doctorHospital: doctor.hospital,
    date,
    time,
    type,
    status: 'pending',
    reason,
    fee: doctor.fee,
    notes: notes || '',
  });

  if (!result.success) {
    if (result.error === 'SLOT_CONFLICT') {
      return {
        success: false,
        status: 409,
        error: 'SLOT_CONFLICT',
        message: `${doctor.name} is already booked on ${date} at ${time}. Please choose another time.`,
      };
    }
    return { success: false, status: 500, error: 'BOOKING_FAILED', message: 'Failed to create appointment.' };
  }

  logger.info('Appointment created', { appointmentId: result.appointment.appointmentId, patientId: patientUser.userId, doctorId });

  // Send confirmation email asynchronously — failure does not roll back the booking
  void sendAppointmentConfirmation(result.appointment);

  return { success: true, appointment: result.appointment };
}

export async function getPatientAppointments(patientId) {
  const repo = getRepository();
  const appointments = await repo.getAppointmentsByPatient(patientId);
  return { success: true, appointments };
}

export async function getDoctorAppointments(doctorId) {
  const repo = getRepository();
  const appointments = await repo.getAppointmentsByDoctor(doctorId);
  return { success: true, appointments };
}

export async function getAllAppointments() {
  const repo = getRepository();
  const appointments = await repo.getAllAppointments();
  return { success: true, appointments };
}

export async function cancelAppointment(appointmentId, userId, userRole, doctorId = userId) {
  const repo = getRepository();
  const appointment = await repo.getAppointmentById(appointmentId);
  if (!appointment) {
    return { success: false, status: 404, error: 'APPOINTMENT_NOT_FOUND', message: 'Appointment not found.' };
  }

  // Authorization: patient can only cancel own appointments; doctors and admins can cancel any
  if (userRole === 'patient' && appointment.patientId !== userId) {
    return { success: false, status: 403, error: 'FORBIDDEN', message: 'You can only cancel your own appointments.' };
  }
  if (userRole === 'doctor' && appointment.doctorId !== doctorId) {
    return { success: false, status: 403, error: 'FORBIDDEN', message: 'You can only cancel appointments assigned to you.' };
  }

  // Only cancellable if not already completed or cancelled
  if (['completed', 'cancelled', 'rejected'].includes(appointment.status)) {
    return { success: false, status: 400, error: 'INVALID_STATUS_TRANSITION', message: `Cannot cancel an appointment with status "${appointment.status}".` };
  }

  const updated = await repo.updateAppointmentStatus(appointmentId, 'cancelled');
  if (!updated) return { success: false, status: 409, error: 'CONCURRENT_UPDATE', message: 'The appointment changed during cancellation. Refresh and try again.' };
  logger.info('Appointment cancelled', { appointmentId, cancelledBy: userId, role: userRole });
  void sendAppointmentUpdate(updated, 'Your appointment was cancelled.');
  return { success: true, appointment: updated };
}

export async function rescheduleAppointment(appointmentId, input, userId, userRole, doctorId = userId) {
  const validation = rescheduleSchema.safeParse(input);
  if (!validation.success) {
    return { success: false, status: 400, error: 'VALIDATION_ERROR', details: validation.error.flatten().fieldErrors };
  }

  const { date, time } = validation.data;
  const repo = getRepository();
  const appointment = await repo.getAppointmentById(appointmentId);

  if (!appointment) {
    return { success: false, status: 404, error: 'APPOINTMENT_NOT_FOUND', message: 'Appointment not found.' };
  }

  if (userRole === 'patient' && appointment.patientId !== userId) {
    return { success: false, status: 403, error: 'FORBIDDEN', message: 'You can only reschedule your own appointments.' };
  }
  if (userRole === 'doctor' && appointment.doctorId !== doctorId) {
    return { success: false, status: 403, error: 'FORBIDDEN', message: 'You can only reschedule appointments assigned to you.' };
  }

  if (['completed', 'cancelled', 'rejected'].includes(appointment.status)) {
    return { success: false, status: 400, error: 'INVALID_STATUS_TRANSITION', message: `Cannot reschedule an appointment with status "${appointment.status}".` };
  }
  if (appointment.date === date && appointment.time === time) {
    return { success: true, appointment };
  }

  if (date < appointmentDate()) {
    return { success: false, status: 400, error: 'INVALID_DATE', message: 'Appointment date cannot be in the past.' };
  }

  // Validate day against doctor's schedule
  const doctor = await repo.getDoctorById(appointment.doctorId);
  if (!doctor || doctor.status !== 'active') {
    return { success: false, status: 404, error: 'DOCTOR_NOT_FOUND', message: 'The assigned doctor is unavailable.' };
  }
  if (doctor.availableDays && doctor.availableDays.length > 0) {
    const [year, month, day] = date.split('-').map(Number);
    const dayName = DAY_NAMES[new Date(year, month - 1, day).getDay()];
    if (!doctor.availableDays.includes(dayName)) {
      return {
        success: false, status: 400, error: 'DOCTOR_NOT_AVAILABLE_ON_DAY',
        message: `Dr. ${doctor.name} does not work on ${dayName}s.`,
      };
    }
  }
  if (doctor.availableSlots && doctor.availableSlots.length > 0 && !doctor.availableSlots.includes(time)) {
    return { success: false, status: 400, error: 'INVALID_TIME_SLOT', message: `"${time}" is not a valid slot.` };
  }

  const result = await repo.rescheduleAppointment(appointmentId, date, time);
  if (!result) {
    return { success: false, status: 404, error: 'APPOINTMENT_NOT_FOUND' };
  }
  if (!result.success) {
    return { success: false, status: 409, error: 'SLOT_CONFLICT', message: 'That slot is already booked.' };
  }

  logger.info('Appointment rescheduled', { appointmentId, newDate: date, newTime: time });
  void sendAppointmentUpdate(result.appointment, 'Your appointment was rescheduled.');
  return { success: true, appointment: result.appointment };
}

export async function updateAppointmentStatus(appointmentId, newStatus, userId, userRole) {
  const ALLOWED_TRANSITIONS = {
    doctor: { pending: ['confirmed', 'rejected'], confirmed: ['completed'] },
    admin: { pending: ['confirmed', 'rejected', 'cancelled'], confirmed: ['completed', 'cancelled'] },
  };

  const repo = getRepository();
  const statusSchema = z.enum(['confirmed', 'rejected', 'completed', 'cancelled']);
  if (!statusSchema.safeParse(newStatus).success) {
    return { success: false, status: 400, error: 'VALIDATION_ERROR', message: 'Appointment status is invalid.' };
  }
  const appointment = await repo.getAppointmentById(appointmentId);
  if (!appointment) {
    return { success: false, status: 404, error: 'APPOINTMENT_NOT_FOUND', message: 'Appointment not found.' };
  }

  // Doctors can only update appointments assigned to them
  if (userRole === 'doctor' && appointment.doctorId !== userId) {
    return { success: false, status: 403, error: 'FORBIDDEN', message: 'You can only update your own appointments.' };
  }

  const allowedForRole = ALLOWED_TRANSITIONS[userRole];
  if (!allowedForRole || !allowedForRole[appointment.status]?.includes(newStatus)) {
    return {
      success: false, status: 400, error: 'INVALID_STATUS_TRANSITION',
      message: `Cannot transition from "${appointment.status}" to "${newStatus}".`,
    };
  }

  const updated = await repo.updateAppointmentStatus(appointmentId, newStatus);
  if (!updated) return { success: false, status: 409, error: 'CONCURRENT_UPDATE', message: 'The appointment changed during this update. Refresh and try again.' };
  logger.info('Appointment status updated', { appointmentId, from: appointment.status, to: newStatus, by: userId });
  if (['confirmed', 'rejected', 'completed', 'cancelled'].includes(newStatus)) {
    void sendAppointmentUpdate(updated, `Your appointment status is now ${newStatus}`);
  }
  return { success: true, appointment: updated };
}
