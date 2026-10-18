import { Router } from 'express';
import { handleAdminPlaceholder } from '../controllers/admin.controller.js';

const router = Router();

// Placeholder routes for admin operations
router.all('*', handleAdminPlaceholder);

export default router;
