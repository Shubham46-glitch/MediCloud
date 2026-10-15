import { Router } from 'express';
import { handleAppointmentsPlaceholder } from '../controllers/appointments.controller.js';

const router = Router();

// Placeholder routes for appointment operations
router.all('*', handleAppointmentsPlaceholder);

export default router;
