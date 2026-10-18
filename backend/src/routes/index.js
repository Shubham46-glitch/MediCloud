import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import doctorsRoutes from './doctors.routes.js';
import appointmentsRoutes from './appointments.routes.js';
import adminRoutes from './admin.routes.js';
import documentsRoutes from './documents.routes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/doctors', doctorsRoutes);
router.use('/appointments', appointmentsRoutes);
router.use('/admin', adminRoutes);
router.use('/documents', documentsRoutes);

export default router;
