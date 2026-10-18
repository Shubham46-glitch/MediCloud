import { Router } from 'express';
import {
  handleCreateAppointment,
  handleGetMyAppointments,
  handleGetDoctorAppointments,
  handleCancelAppointment,
  handleRescheduleAppointment,
  handleUpdateStatus,
} from '../controllers/appointments.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

/** POST /api/appointments — book appointment (patient only) */
router.post('/', authenticate, requireRole('patient'), asyncHandler(handleCreateAppointment));

/** GET /api/appointments/me — patient's own appointments */
router.get('/me', authenticate, requireRole('patient'), asyncHandler(handleGetMyAppointments));

/** GET /api/appointments/doctor/:doctorId — doctor's appointments (doctor own or admin) */
router.get('/doctor/:doctorId', authenticate, requireRole('doctor', 'admin'), asyncHandler(handleGetDoctorAppointments));

/** PATCH /api/appointments/:id/cancel — cancel (patient own, doctor, admin) */
router.patch('/:id/cancel', authenticate, asyncHandler(handleCancelAppointment));

/** PATCH /api/appointments/:id/reschedule — reschedule (patient own, doctor, admin) */
router.patch('/:id/reschedule', authenticate, asyncHandler(handleRescheduleAppointment));

/** PATCH /api/appointments/:id/status — update status (doctor, admin only) */
router.patch('/:id/status', authenticate, requireRole('doctor', 'admin'), asyncHandler(handleUpdateStatus));

export default router;
