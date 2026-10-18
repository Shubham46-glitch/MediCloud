import { Router } from 'express';
import {
  handleListDoctors,
  handleGetDoctor,
  handleCreateDoctor,
  handleUpdateDoctor,
  handleToggleDoctorStatus,
  handleUpdateDoctorSlots,
  handleListSpecialties,
  handleCreateSpecialty,
} from '../controllers/doctors.controller.js';
import { authenticate, requireRole, optionalAuth } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

/** GET /api/doctors/specialties — public */
router.get('/specialties', asyncHandler(handleListSpecialties));

/** POST /api/doctors/specialties — admin only */
router.post('/specialties', authenticate, requireRole('admin'), asyncHandler(handleCreateSpecialty));

/** GET /api/doctors — public (optionalAuth for future personalisation) */
router.get('/', optionalAuth, asyncHandler(handleListDoctors));

/** POST /api/doctors — admin only */
router.post('/', authenticate, requireRole('admin'), asyncHandler(handleCreateDoctor));

/** GET /api/doctors/:id — public */
router.get('/:id', asyncHandler(handleGetDoctor));

/** PUT /api/doctors/:id — admin only */
router.put('/:id', authenticate, requireRole('admin'), asyncHandler(handleUpdateDoctor));

/** PATCH /api/doctors/:id/status — admin only */
router.patch('/:id/status', authenticate, requireRole('admin'), asyncHandler(handleToggleDoctorStatus));

/** PUT /api/doctors/:id/slots — doctor (own) or admin */
router.put('/:id/slots', authenticate, requireRole('doctor', 'admin'), asyncHandler(handleUpdateDoctorSlots));

export default router;
