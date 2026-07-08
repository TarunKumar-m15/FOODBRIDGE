import express from 'express';
import { scanPickup, scanDelivery } from '../controllers/verifyController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/rbacMiddleware.js';

const router = express.Router();

router.use(protect); // All verification endpoints require login

router.post('/scan-pickup', restrictTo('volunteer'), scanPickup);
router.post('/scan-delivery', restrictTo('ngo', 'volunteer'), scanDelivery);

export default router;
