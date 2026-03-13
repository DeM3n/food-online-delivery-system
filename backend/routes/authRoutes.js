const express = require('express');
const router = express.Router();

const {
  loginUser,
  verifyOtp,
  resendOtp,
  forgotPassword,
  resendForgotPasswordOtp,
  verifyForgotPasswordOtp,
  resetPassword,
  refreshAccessToken,
  logoutUser,
  me,
  getProfile,
  updateProfile
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');
const {
  loginRateLimit,
  otpVerifyRateLimit,
  otpResendRateLimit,
  forgotPasswordRateLimit,
  resetPasswordRateLimit
} = require('../middleware/authRateLimit');

router.post('/login', loginRateLimit, loginUser);
router.post('/verify-otp', otpVerifyRateLimit, verifyOtp);
router.post('/resend-otp', otpResendRateLimit, resendOtp);

router.post('/forgot-password', forgotPasswordRateLimit, forgotPassword);
router.post('/resend-forgot-password-otp', otpResendRateLimit, resendForgotPasswordOtp);
router.post('/verify-forgot-password-otp', otpVerifyRateLimit, verifyForgotPasswordOtp);
router.post('/reset-password', resetPasswordRateLimit, resetPassword);

router.post('/refresh', refreshAccessToken);
router.post('/logout', protect, logoutUser);

router.get('/me', protect, me);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);

module.exports = router;
