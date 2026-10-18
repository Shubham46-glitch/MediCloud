/**
 * Appointments Controller — HTTP handlers for appointment lifecycle.
 */

import {
  createAppointment,
  getPatientAppointments,
  getDoctorAppointments,
  cancelAppointment,
  rescheduleAppointment,
  updateAppointmentStatus,
  getAllAppointments,
} from '../services/appointments.service.js';
import { getRepository } from '../repository/index.js';

/** POST /api/appointments — book a new appointment (patient only) */
export const handleCreateAppointment = async (req, res) => {
  // Pass full user object from repository for name/email/phone
  const repo = getRepository();
  const user = await repo.getUserById(req.user.userId) || req.user;

  const result = await createAppointment(req.body, {
    userId: req.user.userId,
    name: user.name || req.user.name,
    email: user.email || req.user.email,
    phone: user.phone,
    age: user.age,
    gender: user.gender,
  });

  if (!result.success) {
    return res.status(result.status || 400).json({
      success: false, status: result.status,
      error: { code: result.error, message: result.message },
      ...(result.details ? { details: result.details } : {}),
    });
  }

  return res.status(201).json({ success: true, status: 201, message: 'Appointment booked', appointment: result.appointment });
};

/** GET /api/appointments/me — get current patient's appointments */
export const handleGetMyAppointments = async (req, res) => {
  const result = await getPatientAppointments(req.user.userId);
  return res.status(200).json({ success: true, status: 200, ...result });
};

/** GET /api/appointments/doctor/:doctorId — get a doctor's appointments (doctor own, or admin) */
export const handleGetDoctorAppointments = async (req, res) => {
  const { doctorId } = req.params;

  if (req.user.role === 'doctor' && (req.user.doctorId || req.user.userId) !== doctorId) {
    return res.status(403).json({ success: false, status: 403, error: { code: 'FORBIDDEN', message: 'You can only view your own appointments.' } });
  }

  const result = await getDoctorAppointments(doctorId);
  return res.status(200).json({ success: true, status: 200, ...result });
};

/** PATCH /api/appointments/:id/cancel — cancel an appointment */
export const handleCancelAppointment = async (req, res) => {
  const result = await cancelAppointment(req.params.id, req.user.userId, req.user.role, req.user.doctorId || req.user.userId);
  if (!result.success) {
    return res.status(result.status || 400).json({ success: false, status: result.status, error: { code: result.error, message: result.message } });
  }
  return res.status(200).json({ success: true, status: 200, message: 'Appointment cancelled', appointment: result.appointment });
};

/** PATCH /api/appointments/:id/reschedule — reschedule an appointment */
export const handleRescheduleAppointment = async (req, res) => {
  const result = await rescheduleAppointment(req.params.id, req.body, req.user.userId, req.user.role, req.user.doctorId || req.user.userId);
  if (!result.success) {
    return res.status(result.status || 400).json({ success: false, status: result.status, error: { code: result.error, message: result.message }, ...(result.details ? { details: result.details } : {}) });
  }
  return res.status(200).json({ success: true, status: 200, message: 'Appointment rescheduled', appointment: result.appointment });
};

/** PATCH /api/appointments/:id/status — update status (doctor/admin) */
export const handleUpdateStatus = async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ success: false, status: 400, error: { code: 'VALIDATION_ERROR', message: 'status field is required.' } });
  }
  const result = await updateAppointmentStatus(req.params.id, status, req.user.doctorId || req.user.userId, req.user.role);
  if (!result.success) {
    return res.status(result.status || 400).json({ success: false, status: result.status, error: { code: result.error, message: result.message } });
  }
  return res.status(200).json({ success: true, status: 200, message: `Appointment status updated to ${status}`, appointment: result.appointment });
};
