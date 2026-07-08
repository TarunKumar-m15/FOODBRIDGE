import express from 'express';
import { createReview, getReviewsForUser, getReviewsForDonation } from '../controllers/reviewController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(protect); // All review routes require authentication

router.post('/', createReview);
router.get('/user/:userId', getReviewsForUser);
router.get('/donation/:donationId', getReviewsForDonation);

export default router;
