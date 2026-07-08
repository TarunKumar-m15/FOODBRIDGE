import express from 'express';
import { getNGOsForVerification, verifyNGO, getDashboardAnalytics, getFraudLogs } from '../controllers/adminController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.use(protect, restrictTo('admin', 'super-admin')); // Strictly restricted to authenticated admins & super-admins

router.get('/ngo-pending', getNGOsForVerification);
router.post('/ngo-verify', verifyNGO);
router.get('/analytics', getDashboardAnalytics);
router.get('/fraud-logs', getFraudLogs);

export default router;
