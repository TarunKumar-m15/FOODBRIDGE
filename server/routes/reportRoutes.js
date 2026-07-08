import express from 'express';
import { getImpactReport, getNgoActivityReport } from '../controllers/reportController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.use(protect); // All report routes require login

// Admin/Super-Admin can download system-wide impact reports
router.get('/impact', restrictTo('admin', 'super-admin'), getImpactReport);

// NGOs can download their own report, while Admin/Super-Admin can download any NGO report
router.get('/ngo/:ngoId?', restrictTo('admin', 'super-admin', 'ngo'), getNgoActivityReport);

export default router;
