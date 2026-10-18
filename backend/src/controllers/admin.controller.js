/**
 * Admin Controller — Platform-wide administration endpoints.
 * All routes require authenticate + requireRole('admin').
 */

import { getAllAppointments } from '../services/appointments.service.js';
import { listDoctors, toggleDoctorStatus, createDoctor } from '../services/doctors.service.js';
import { getRepository } from '../repository/index.js';

/** GET /api/admin/appointments — all appointments across all users */
export const handleAdminGetAllAppointments = async (req, res) => {
  const result = await getAllAppointments();
  return res.status(200).json({ success: true, status: 200, ...result });
};

/** GET /api/admin/doctors — all doctors with full details */
export const handleAdminGetDoctors = async (req, res) => {
  const { status, specialty } = req.query;
  const result = await listDoctors({ status, specialty });
  return res.status(200).json({ success: true, status: 200, ...result });
};

/** POST /api/admin/doctors — create a new doctor profile */
export const handleAdminCreateDoctor = async (req, res) => {
  const result = await createDoctor(req.body);
  if (!result.success) {
    return res.status(result.status || 400).json({ success: false, status: result.status, error: { code: result.error }, ...(result.details ? { details: result.details } : {}) });
  }
  return res.status(201).json({ success: true, status: 201, message: 'Doctor profile created', doctor: result.doctor });
};

/** PATCH /api/admin/doctors/:id/status — activate or deactivate a doctor */
export const handleAdminToggleDoctorStatus = async (req, res) => {
  const result = await toggleDoctorStatus(req.params.id);
  if (!result.success) {
    return res.status(result.status || 404).json({ success: false, status: result.status, error: { code: result.error, message: result.message } });
  }
  return res.status(200).json({ success: true, status: 200, message: `Doctor status updated to ${result.doctor.status}`, doctor: result.doctor });
};

/** GET /api/admin/stats — platform-level statistics summary */
export const handleAdminStats = async (req, res) => {
  const repo = getRepository();
  const [allDoctors, allAppointmentsResult] = await Promise.all([
    repo.getAllDoctors(),
    getAllAppointments(),
  ]);

  const appointments = allAppointmentsResult.appointments || [];

  const stats = {
    totalDoctors: allDoctors.length,
    activeDoctors: allDoctors.filter((d) => d.status === 'active').length,
    totalAppointments: appointments.length,
    appointmentsByStatus: {
      pending: appointments.filter((a) => a.status === 'pending').length,
      confirmed: appointments.filter((a) => a.status === 'confirmed').length,
      completed: appointments.filter((a) => a.status === 'completed').length,
      cancelled: appointments.filter((a) => a.status === 'cancelled').length,
    },
  };

  return res.status(200).json({ success: true, status: 200, stats });
};
