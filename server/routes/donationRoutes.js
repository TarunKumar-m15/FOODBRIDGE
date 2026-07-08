import express from 'express';
import { createDonation, getDonations, getDonationById, claimDonationNGO, claimPickupVolunteer, getPublicStats } from '../controllers/donationController.js';
import { protect } from '../middleware/authMiddleware.js';
import { restrictTo } from '../middleware/rbacMiddleware.js';
import { validateDonation } from '../middleware/validator.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.get('/public-stats', getPublicStats);

router.use(protect); // All donation routes require login

router.route('/')
  .post(restrictTo('donor'), upload.single('image'), validateDonation, createDonation)
  .get(getDonations);

router.route('/:id')
  .get(getDonationById);

router.patch('/:id/claim', restrictTo('ngo'), claimDonationNGO);
router.patch('/:id/pickup', restrictTo('volunteer'), claimPickupVolunteer);

export default router;
