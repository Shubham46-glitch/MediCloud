import { Router } from 'express';
import { handleDoctorsPlaceholder } from '../controllers/doctors.controller.js';

const router = Router();

// Placeholder routes for doctor operations
router.all('*', handleDoctorsPlaceholder);

export default router;
