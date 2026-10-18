/**
 * Doctors Controller — HTTP handlers for doctor directory and specialty management.
 */

import {
  listDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  toggleDoctorStatus,
  updateDoctorSlots,
  listSpecialties,
  createSpecialty,
} from '../services/doctors.service.js';

/** GET /api/doctors — list all doctors (public, optional auth) */
export const handleListDoctors = async (req, res) => {
  const { status, specialty } = req.query;
  const result = await listDoctors({ status, specialty });
  return res.status(200).json({ success: true, status: 200, ...result });
};

/** GET /api/doctors/:id — get doctor profile (public) */
export const handleGetDoctor = async (req, res) => {
  const result = await getDoctorById(req.params.id);
  if (!result.success) {
    return res.status(result.status).json({ success: false, status: result.status, error: { code: result.error, message: result.message } });
  }
  return res.status(200).json({ success: true, status: 200, doctor: result.doctor });
};

/** POST /api/doctors — create doctor profile (admin only) */
export const handleCreateDoctor = async (req, res) => {
  const result = await createDoctor(req.body);
  if (!result.success) {
    return res.status(result.status || 400).json({ success: false, status: result.status, error: { code: result.error }, ...(result.details ? { details: result.details } : {}) });
  }
  return res.status(201).json({ success: true, status: 201, message: 'Doctor profile created', doctor: result.doctor });
};

/** PUT /api/doctors/:id — update doctor profile (admin only) */
export const handleUpdateDoctor = async (req, res) => {
  const result = await updateDoctor(req.params.id, req.body);
  if (!result.success) {
    return res.status(result.status || 400).json({ success: false, status: result.status, error: { code: result.error }, ...(result.details ? { details: result.details } : {}) });
  }
  return res.status(200).json({ success: true, status: 200, message: 'Doctor profile updated', doctor: result.doctor });
};

/** PATCH /api/doctors/:id/status — toggle doctor active/inactive (admin only) */
export const handleToggleDoctorStatus = async (req, res) => {
  const result = await toggleDoctorStatus(req.params.id);
  if (!result.success) {
    return res.status(result.status || 404).json({ success: false, status: result.status, error: { code: result.error, message: result.message } });
  }
  return res.status(200).json({ success: true, status: 200, message: `Doctor status updated to ${result.doctor.status}`, doctor: result.doctor });
};

/** PUT /api/doctors/:id/slots — update doctor availability slots (doctor own, or admin) */
export const handleUpdateDoctorSlots = async (req, res) => {
  const result = await updateDoctorSlots(req.params.id, req.body, req.user.doctorId || req.user.userId, req.user.role);
  if (!result.success) {
    return res.status(result.status || 400).json({ success: false, status: result.status, error: { code: result.error, message: result.message }, ...(result.details ? { details: result.details } : {}) });
  }
  return res.status(200).json({ success: true, status: 200, message: 'Availability updated', doctor: result.doctor });
};

/** GET /api/doctors/specialties — list all specialties (public) */
export const handleListSpecialties = async (req, res) => {
  const result = await listSpecialties();
  return res.status(200).json({ success: true, status: 200, ...result });
};

/** POST /api/doctors/specialties — create specialty (admin only) */
export const handleCreateSpecialty = async (req, res) => {
  const result = await createSpecialty(req.body);
  if (!result.success) {
    return res.status(result.status || 400).json({ success: false, status: result.status, error: { code: result.error }, ...(result.details ? { details: result.details } : {}) });
  }
  return res.status(201).json({ success: true, status: 201, message: 'Specialty created', specialty: result.specialty });
};
