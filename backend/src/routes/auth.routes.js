import { Router } from 'express';
import { handleAuthPlaceholder } from '../controllers/auth.controller.js';

const router = Router();

// Placeholder routes for authentication operations
router.all('*', handleAuthPlaceholder);

export default router;
