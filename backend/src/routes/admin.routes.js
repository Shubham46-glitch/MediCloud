import { Router } from 'express';
import {
  handleAdminGetAllAppointments,
  handleAdminGetDoctors,
  handleAdminCreateDoctor,
  handleAdminToggleDoctorStatus,
  handleAdminStats,
} from '../controllers/admin.controller.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate, requireRole('admin'));

/** GET /api/admin/stats — platform statistics */
router.get('/stats', asyncHandler(handleAdminStats));

/** GET /api/admin/appointments — all appointments */
router.get('/appointments', asyncHandler(handleAdminGetAllAppointments));

/** GET /api/admin/doctors — all doctors */
router.get('/doctors', asyncHandler(handleAdminGetDoctors));

/** POST /api/admin/doctors — create doctor */
router.post('/doctors', asyncHandler(handleAdminCreateDoctor));

/** PATCH /api/admin/doctors/:id/status — toggle doctor status */
router.patch('/doctors/:id/status', asyncHandler(handleAdminToggleDoctorStatus));

export default router;
