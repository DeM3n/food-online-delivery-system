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

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login user
 *     description: Validates email/username and password, then starts the OTP authentication flow.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@ofds.com
 *               username:
 *                 type: string
 *                 example: admin
 *               login:
 *                 type: string
 *                 example: admin@ofds.com
 *               password:
 *                 type: string
 *                 example: Admin@123
 *     responses:
 *       200:
 *         description: Login accepted and OTP flow triggered
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid credentials
 *       403:
 *         description: Account inactive
 *       429:
 *         description: Too many login attempts
 */
router.post('/login', loginRateLimit, loginUser);

/**
 * @openapi
 * /api/auth/verify-otp:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Verify login OTP
 *     description: Verifies OTP and issues access and refresh tokens.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp_request_id
 *               - otp
 *             properties:
 *               otp_request_id:
 *                 type: string
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid input or OTP already used
 *       401:
 *         description: Invalid OTP
 *       404:
 *         description: OTP request not found
 *       410:
 *         description: OTP expired
 *       429:
 *         description: Too many OTP verification attempts
 */
router.post('/verify-otp', otpVerifyRateLimit, verifyOtp);

/**
 * @openapi
 * /api/auth/resend-otp:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Resend login OTP
 *     description: Resends a login OTP for an existing OTP request.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp_request_id
 *             properties:
 *               otp_request_id:
 *                 type: string
 *                 example: 550e8400-e29b-41d4-a716-446655440000
 *     responses:
 *       200:
 *         description: OTP resent successfully
 *       400:
 *         description: Invalid input or OTP already used
 *       404:
 *         description: OTP request not found
 *       429:
 *         description: Too many resend attempts
 */
router.post('/resend-otp', otpResendRateLimit, resendOtp);

/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Request forgot-password OTP
 *     description: Starts the password reset flow by sending a reset OTP if the account exists.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: customer@ofds.com
 *     responses:
 *       200:
 *         description: Forgot-password flow processed
 *       400:
 *         description: Invalid input
 *       429:
 *         description: Too many forgot-password requests
 */
router.post('/forgot-password', forgotPasswordRateLimit, forgotPassword);

/**
 * @openapi
 * /api/auth/resend-forgot-password-otp:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Resend forgot-password OTP
 *     description: Resends a password reset OTP for an existing reset request.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp_request_id
 *             properties:
 *               otp_request_id:
 *                 type: string
 *     responses:
 *       200:
 *         description: Reset OTP resent successfully
 *       400:
 *         description: Invalid input or OTP already used
 *       404:
 *         description: OTP request not found
 *       429:
 *         description: Too many resend attempts
 */
router.post('/resend-forgot-password-otp', otpResendRateLimit, resendForgotPasswordOtp);

/**
 * @openapi
 * /api/auth/verify-forgot-password-otp:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Verify forgot-password OTP
 *     description: Verifies forgot-password OTP and returns a temporary reset token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - otp_request_id
 *               - otp
 *             properties:
 *               otp_request_id:
 *                 type: string
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Forgot-password OTP verified successfully
 *       400:
 *         description: Invalid input or OTP already used
 *       401:
 *         description: Invalid OTP
 *       404:
 *         description: OTP request not found
 *       410:
 *         description: OTP expired
 *       429:
 *         description: Too many OTP verification attempts
 */
router.post('/verify-forgot-password-otp', otpVerifyRateLimit, verifyForgotPasswordOtp);

/**
 * @openapi
 * /api/auth/reset-password:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Reset password
 *     description: Resets a password using a valid reset token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - resetToken
 *               - newPassword
 *               - confirmPassword
 *             properties:
 *               resetToken:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 example: NewPass@123
 *               confirmPassword:
 *                 type: string
 *                 example: NewPass@123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid input or password confirmation mismatch
 *       401:
 *         description: Invalid or expired reset token
 *       403:
 *         description: Account inactive
 *       429:
 *         description: Too many reset attempts
 */
router.post('/reset-password', resetPasswordRateLimit, resetPassword);

/**
 * @openapi
 * /api/auth/refresh:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Refresh access token
 *     description: Rotates refresh token and returns a new access token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Invalid or expired refresh token
 *       403:
 *         description: Account inactive
 */
router.post('/refresh', refreshAccessToken);

/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Logout user
 *     description: Revokes the current authenticated session.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/logout', protect, logoutUser);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get current authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/me', protect, me);

/**
 * @openapi
 * /api/auth/profile:
 *   get:
 *     tags:
 *       - Auth
 *     summary: Get current user profile
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/profile', protect, getProfile);

/**
 * @openapi
 * /api/auth/profile:
 *   put:
 *     tags:
 *       - Auth
 *     summary: Update current user profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               full_name:
 *                 type: string
 *               phone_number:
 *                 type: string
 *               password:
 *                 type: string
 *               restaurant_name:
 *                 type: string
 *               location:
 *                 type: string
 *               cuisine_type:
 *                 type: string
 *               vehicle_license:
 *                 type: string
 *               address:
 *                 type: string
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.put('/profile', protect, updateProfile);

module.exports = router;
