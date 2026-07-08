import express from 'express';
import { register, login, refreshToken, logout, verifyEmail, resetPassword } from '../controllers/authController.js';
import { validateRegister, validateLogin } from '../middleware/validator.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

router.post('/register', upload.single('document'), validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);
router.post('/verify-email', verifyEmail);
router.post('/reset-password', resetPassword);

export default router;
