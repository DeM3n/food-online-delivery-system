const crypto = require('crypto');
const { Op } = require('sequelize');
const {
  User,
  Customer,
  Restaurant,
  DeliveryPartner,
  Admin,
  CustomerSupport,
  Address,
  AuthSession,
  AuthOtp
} = require('../models');
const jwt = require('jsonwebtoken');
const { sendMail, buildOtpEmail } = require('../services/mailService');
const {
  authError,
  invalidInput,
  invalidCredentials,
  inactiveAccount,
  otpInvalid,
  otpExpired,
  otpUsed,
  otpResendBlocked,
  otpResendLimitReached,
  handleAuthCatch
} = require('../utils/authErrorUtils');
// ===== Add these imports at the top of authController.js =====
const { writeAuthAuditLog } = require('../utils/authAuditLog');

// ===== Ensure these helpers exist in authController.js =====
// generateRefreshToken
// hashRefreshToken
// getRefreshTokenExpiryDate
// getClientIp
// resolveRoleClaims
// resolveProfile
// issueAuthPayload

const loadUserWithProfileById = async (userId) => {
  return User.findByPk(userId, {
    attributes: { exclude: ['password_hash'] },
    include: [
      { model: Customer, include: [Address] },
      { model: Restaurant },
      { model: DeliveryPartner },
      { model: Admin },
      { model: CustomerSupport }
    ]
  });
};

// ===== GET /api/auth/me =====
exports.me = async (req, res) => {
  try {
    const user = await loadUserWithProfileById(req.user.id);

    if (!user) {
      return authError(res, 404, 'User not found', 'AUTH_USER_NOT_FOUND');
    }

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        phone_number: user.phone_number,
        is_active: user.is_active,
        claims: resolveRoleClaims(user.role),
        profile: resolveProfile(user),
        sessionId: req.auth?.sid || null
      }
    });
  } catch (error) {
    return handleAuthCatch(res, error, 'Get me');
  }
};

// ===== POST /api/auth/refresh =====
exports.refreshAccessToken = async (req, res) => {
  try {
    const refreshToken = (req.body.refreshToken || '').trim();

    if (!refreshToken) {
      return invalidInput(res, 'Refresh token is required', ['refreshToken']);
    }

    const tokenHash = hashRefreshToken(refreshToken);

    const session = await AuthSession.findOne({
      where: {
        refresh_token_hash: tokenHash,
        revoked_at: null,
        expires_at: { [Op.gt]: new Date() }
      },
      include: [
        {
          model: User,
          include: [
            { model: Customer, include: [Address] },
            { model: Restaurant },
            { model: DeliveryPartner },
            { model: Admin },
            { model: CustomerSupport }
          ]
        }
      ]
    });

    if (!session || !session.User) {
      return authError(res, 401, 'Invalid or expired refresh token', 'AUTH_REFRESH_INVALID');
    }

    const user = session.User;

    if (!user.is_active) {
      return inactiveAccount(res);
    }

    const newRawRefreshToken = generateRefreshToken();

    session.refresh_token_hash = hashRefreshToken(newRawRefreshToken);
    session.last_used_at = new Date();
    session.expires_at = getRefreshTokenExpiryDate();
    session.user_agent = req.get('user-agent') || session.user_agent;
    session.ip_address = getClientIp(req) || session.ip_address;
    await session.save();

    await writeAuthAuditLog({
      action: 'refresh',
      status: 'success',
      userId: user.id,
      email: user.email,
      ip: getClientIp(req),
      userAgent: req.get('user-agent') || null,
      metadata: { sessionId: session.id }
    });

    return res.status(200).json({
      success: true,
      data: {
        accessToken: generateAccessToken(user, session.id),
        refreshToken: newRawRefreshToken,
        sessionId: session.id,
        claims: resolveRoleClaims(user.role),
        profile: resolveProfile(user)
      }
    });
  } catch (error) {
    return handleAuthCatch(res, error, 'Refresh token');
  }
};

exports.loginUser = async (req, res) => {
  try {
    const login = (req.body.email || req.body.username || req.body.login || '').trim();
    const password = (req.body.password || '').trim();

    if (!login || !password) {
      return invalidInput(
        res,
        'Email/username and password are required',
        ['email|username', 'password']
      );
    }

    const user = await User.findOne({
      where: { email: login },
      include: [
        { model: Customer, include: [Address] },
        { model: Restaurant },
        { model: DeliveryPartner },
        { model: Admin },
        { model: CustomerSupport }
      ]
    });

    if (!user) {
      await writeAuthAuditLog({
        action: 'login',
        status: 'failed',
        email: login,
        ip: getClientIp(req),
        userAgent: req.get('user-agent') || null,
        metadata: { reason: 'invalid_credentials' }
      });

      return invalidCredentials(res);
    }

    if (!user.is_active) {
      await writeAuthAuditLog({
        action: 'login',
        status: 'failed',
        userId: user.id,
        email: user.email,
        ip: getClientIp(req),
        userAgent: req.get('user-agent') || null,
        metadata: { reason: 'inactive_account' }
      });

      return inactiveAccount(res);
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      await writeAuthAuditLog({
        action: 'login',
        status: 'failed',
        userId: user.id,
        email: user.email,
        ip: getClientIp(req),
        userAgent: req.get('user-agent') || null,
        metadata: { reason: 'invalid_credentials' }
      });

      return invalidCredentials(res);
    }

    await writeAuthAuditLog({
      action: 'login_password_verified',
      status: 'success',
      userId: user.id,
      email: user.email,
      ip: getClientIp(req),
      userAgent: req.get('user-agent') || null
    });

    const otpRecord = await createOtpRecord({ user, purpose: 'login' });

    return res.status(200).json({
      success: true,
      message: 'OTP has been sent',
      data: {
        requiresOtp: true,
        otp_request_id: otpRecord.id,
        channel: otpRecord.channel,
        destination: maskEmail(otpRecord.destination),
        expires_in: getOtpSecondsRemaining(otpRecord.expires_at)
      }
    });
  } catch (error) {
    return handleAuthCatch(res, error, 'Login');
  }
};


// ===== Password hashing / verification note =====
// Your current User.js already does this correctly:
// - beforeCreate hashes password_hash with bcrypt
// - beforeUpdate hashes password_hash if changed
// - user.matchPassword() verifies with bcrypt.compare()
// So no extra change is required in User.js.


const OTP_TTL_MINUTES = parseInt(process.env.OTP_TTL_MINUTES || '5', 10);
const OTP_LENGTH = parseInt(process.env.OTP_LENGTH || '6', 10);
const OTP_MAX_ATTEMPTS = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);
const OTP_MAX_RESENDS = parseInt(process.env.OTP_MAX_RESENDS || '3', 10);
const OTP_RESEND_COOLDOWN_SECONDS = parseInt(process.env.OTP_RESEND_COOLDOWN_SECONDS || '60', 10);

const generateRefreshToken = () => crypto.randomBytes(64).toString('hex');
const hashRefreshToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const hashOtpCode = (code) => crypto.createHash('sha256').update(String(code)).digest('hex');

const getOtpExpiryDate = () => {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + OTP_TTL_MINUTES);
  return expiresAt;
};

const getOtpSecondsRemaining = (expiresAt) => {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
};

const getCooldownRemainingSeconds = (lastSentAt) => {
  const nextAllowedAt = new Date(lastSentAt).getTime() + (OTP_RESEND_COOLDOWN_SECONDS * 1000);
  return Math.max(0, Math.ceil((nextAllowedAt - Date.now()) / 1000));
};

const generateOtpCode = () => {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = (10 ** OTP_LENGTH) - 1;
  return String(Math.floor(min + Math.random() * (max - min + 1)));
};

const getClientIp = (req) => {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    req.ip ||
    null
  );
};

const maskEmail = (email) => {
  if (!email || !email.includes('@')) return '***';
  const [name, domain] = email.split('@');
  const visible = name.length <= 2 ? name[0] : name.slice(0, 2);
  return `${visible}***@${domain}`;
};

const sendOtpOutOfBand = async ({ user, otpCode, purpose }) => {
  const mail = buildOtpEmail({
    fullName: user.full_name,
    otpCode,
    purpose,
    ttlMinutes: OTP_TTL_MINUTES
  });

  await sendMail({
    to: user.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html
  });

  return true;
};

const createOtpRecord = async ({ user, purpose = 'login' }) => {
  const otpCode = generateOtpCode();

  await AuthOtp.destroy({
    where: {
      user_id: user.id,
      purpose,
      used_at: null
    }
  });

  const otpRecord = await AuthOtp.create({
    user_id: user.id,
    purpose,
    channel: 'email',
    destination: user.email,
    otp_hash: hashOtpCode(otpCode),
    expires_at: getOtpExpiryDate(),
    invalid_attempt_count: 0,
    max_attempts: OTP_MAX_ATTEMPTS,
    resend_count: 0,
    last_sent_at: new Date()
  });

  await sendOtpOutOfBand({ user, otpCode, purpose });

  return otpRecord;
};

// @desc    Request password reset
// @route   POST /api/auth/forgot-password
// @access  Public
exports.forgotPassword = async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ where: { email } });

    if (!user || !user.is_active) {
      return res.status(200).json({
        success: true,
        message: 'If the account exists, a reset OTP has been sent'
      });
    }

    const otpRecord = await createOtpRecord({ user, purpose: 'forgot_password' });

    await writeAuthAuditLog({
      action: 'forgot_password_request',
      status: 'success',
      userId: user.id,
      email: user.email,
      ip: getClientIp(req),
      userAgent: req.get('user-agent') || null,
      metadata: { otpRequestId: otpRecord.id }
    });

    return res.status(200).json({
      success: true,
      message: 'If the account exists, a reset OTP has been sent',
      data: {
        otp_request_id: otpRecord.id,
        purpose: otpRecord.purpose,
        channel: otpRecord.channel,
        destination: maskEmail(otpRecord.destination),
        expires_in: getOtpSecondsRemaining(otpRecord.expires_at)
      }
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Resend forgot-password OTP
// @route   POST /api/auth/resend-forgot-password-otp
// @access  Public
exports.resendForgotPasswordOtp = async (req, res) => {
  try {
    const otpRequestId = (req.body.otp_request_id || '').trim();

    if (!otpRequestId) {
      return res.status(400).json({
        success: false,
        message: 'otp_request_id is required'
      });
    }

    const otpRecord = await AuthOtp.findOne({
      where: {
        id: otpRequestId,
        purpose: 'forgot_password'
      },
      include: [{ model: User }]
    });

    if (!otpRecord || !otpRecord.User) {
      return res.status(404).json({
        success: false,
        message: 'OTP request not found'
      });
    }

    if (otpRecord.used_at) {
      return otpUsed(res);
    }

    if (!otpRecord.User.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    const cooldownRemaining = getCooldownRemainingSeconds(otpRecord.last_sent_at);
    if (cooldownRemaining > 0) {
      return otpResendBlocked(res, cooldownRemaining);
    }

    if (otpRecord.resend_count >= OTP_MAX_RESENDS) {
      return otpResendLimitReached(res);
    }

    const newOtpCode = generateOtpCode();

    otpRecord.otp_hash = hashOtpCode(newOtpCode);
    otpRecord.expires_at = getOtpExpiryDate();
    otpRecord.invalid_attempt_count = 0;
    otpRecord.resend_count += 1;
    otpRecord.last_sent_at = new Date();

    await otpRecord.save();

    await sendOtpOutOfBand({
      user: otpRecord.User,
      otpCode: newOtpCode,
      purpose: 'forgot_password'
    });

    return res.status(200).json({
      success: true,
      message: 'Reset OTP resent successfully',
      data: {
        otp_request_id: otpRecord.id,
        purpose: otpRecord.purpose,
        channel: otpRecord.channel,
        destination: maskEmail(otpRecord.destination),
        expires_in: getOtpSecondsRemaining(otpRecord.expires_at)
      }
    });
  } catch (error) {
    console.error('Resend forgot-password OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Verify forgot-password OTP
// @route   POST /api/auth/verify-forgot-password-otp
// @access  Public
exports.verifyForgotPasswordOtp = async (req, res) => {
  try {
    const otpRequestId = (req.body.otp_request_id || '').trim();
    const otpCode = (req.body.otp || '').trim();

    if (!otpRequestId || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'otp_request_id and otp are required'
      });
    }

    const otpRecord = await AuthOtp.findOne({
      where: {
        id: otpRequestId,
        purpose: 'forgot_password'
      },
      include: [{ model: User }]
    });

    if (!otpRecord || !otpRecord.User) {
      return res.status(404).json({
        success: false,
        message: 'OTP request not found'
      });
    }

    if (otpRecord.used_at) {
      return otpUsed(res);
    }

    if (new Date(otpRecord.expires_at) <= new Date()) {
      return otpExpired(res);
    }

    if (otpRecord.invalid_attempt_count >= otpRecord.max_attempts) {
      return res.status(429).json({
        success: false,
        message: 'Too many invalid OTP attempts. Please request a new reset OTP.'
      });
    }

    const isValidOtp = hashOtpCode(otpCode) === otpRecord.otp_hash;

    if (!isValidOtp) {
      otpRecord.invalid_attempt_count += 1;
      await otpRecord.save();

      const attemptsRemaining = Math.max(0, otpRecord.max_attempts - otpRecord.invalid_attempt_count);

      return otpInvalid(res, attemptsRemaining);
    }

    otpRecord.used_at = new Date();
    await otpRecord.save();

    const rawResetToken = generateRefreshToken();
    const resetSession = await AuthSession.create({
      user_id: otpRecord.User.id,
      refresh_token_hash: hashRefreshToken(rawResetToken),
      user_agent: req.get('user-agent') || null,
      ip_address: getClientIp(req),
      expires_at: getOtpExpiryDate(),
      last_used_at: new Date()
    });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        resetToken: rawResetToken,
        resetSessionId: resetSession.id,
        expires_in: getOtpSecondsRemaining(resetSession.expires_at)
      }
    });
  } catch (error) {
    console.error('Verify forgot-password OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
exports.resetPassword = async (req, res) => {
  try {
    const resetToken = (req.body.resetToken || '').trim();
    const newPassword = (req.body.newPassword || '').trim();
    const confirmPassword = (req.body.confirmPassword || '').trim();

    if (!resetToken || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'resetToken, newPassword and confirmPassword are required'
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Password confirmation does not match'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    const resetSession = await AuthSession.findOne({
      where: {
        refresh_token_hash: hashRefreshToken(resetToken),
        revoked_at: null,
        expires_at: { [Op.gt]: new Date() }
      },
      include: [{ model: User }]
    });

    if (!resetSession || !resetSession.User) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    const user = resetSession.User;

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    user.password_hash = newPassword;
    await user.save();

    await AuthSession.update(
      { revoked_at: new Date() },
      {
        where: {
          user_id: user.id,
          revoked_at: null
        }
      }
    );

    await writeAuthAuditLog({
      action: 'reset_password',
      status: 'success',
      userId: user.id,
      email: user.email,
      ip: getClientIp(req),
      userAgent: req.get('user-agent') || null,
      metadata: { resetSessionId: resetSession.id }
    });

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};


const issueAuthPayload = async (user, req) => {
  const rawRefreshToken = generateRefreshToken();

  const session = await AuthSession.create({
    user_id: user.id,
    refresh_token_hash: hashRefreshToken(rawRefreshToken),
    user_agent: req.get('user-agent') || null,
    ip_address: getClientIp(req),
    expires_at: getRefreshTokenExpiryDate(),
    last_used_at: new Date()
  });

  const accessToken = generateAccessToken(user, session.id);
  const claims = resolveRoleClaims(user.role);
  const profile = resolveProfile(user);

  return {
    accessToken,
    refreshToken: rawRefreshToken,
    sessionId: session.id,
    claims,
    profile
  };
};

const ACCESS_TOKEN_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '30', 10);

const generateAccessToken = (user, sessionId) => {
  return jwt.sign(
    {
      sub: user.id,
      role: user.role,
      sid: sessionId,
      type: 'access'
    },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: ACCESS_TOKEN_EXPIRES_IN }
  );
};


const getRefreshTokenExpiryDate = () => {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_TTL_DAYS);
  return expiresAt;
};


const resolveRoleClaims = (role) => {
  switch (role) {
    case 'customer':
      return {
        role: 'customer',
        profileType: 'customer',
        redirectTo: '/customer',
        permissions: [
          'profile.read',
          'profile.update',
          'cart.read',
          'cart.write',
          'order.read',
          'order.create',
          'address.read',
          'address.write',
          'review.create'
        ]
      };

    case 'restaurant':
      return {
        role: 'restaurant',
        profileType: 'restaurant',
        redirectTo: '/restaurant',
        permissions: [
          'profile.read',
          'profile.update',
          'restaurant.read',
          'restaurant.update',
          'menu.read',
          'menu.write',
          'order.read',
          'order.update'
        ]
      };

    case 'delivery_partner':
      return {
        role: 'delivery_partner',
        profileType: 'delivery_partner',
        redirectTo: '/delivery',
        permissions: [
          'profile.read',
          'profile.update',
          'delivery.read',
          'delivery.update',
          'order.read',
          'availability.update'
        ]
      };

    case 'admin':
      return {
        role: 'admin',
        profileType: 'admin',
        redirectTo: '/admin',
        permissions: [
          'admin.dashboard.read',
          'users.manage',
          'restaurants.manage',
          'orders.manage',
          'disputes.manage',
          'reports.read'
        ]
      };

    case 'customer_support':
      return {
        role: 'customer_support',
        profileType: 'customer_support',
        redirectTo: '/support',
        permissions: [
          'profile.read',
          'support.dashboard.read',
          'orders.read',
          'disputes.read',
          'disputes.update',
          'customers.read'
        ]
      };

    default:
      return {
        role: null,
        profileType: null,
        redirectTo: '/login',
        permissions: []
      };
  }
};

const resolveProfile = (user) => {
  if (user.Customer) return user.Customer;
  if (user.Restaurant) return user.Restaurant;
  if (user.DeliveryPartner) return user.DeliveryPartner;
  if (user.Admin) return user.Admin;
  if (user.CustomerSupport) return user.CustomerSupport;
  return null;
};

const loadUserWithProfileByEmail = async (email) => {
  return User.findOne({
    where: { email },
    include: [
      { model: Customer, include: [Address] },
      { model: Restaurant },
      { model: DeliveryPartner },
      { model: Admin },
      { model: CustomerSupport }
    ]
  });
};

// @desc    Validate login credentials and send OTP
// @route   POST /api/auth/login
// @access  Public
exports.loginUser = async (req, res) => {
  try {
    const login = (req.body.email || req.body.username || req.body.login || '').trim();
    const password = (req.body.password || '').trim();

    if (!login || !password) {
      return invalidInput(
        res,
        'Email/username and password are required',
        ['email|username', 'password']
      );
    }

    const user = await User.findOne({
      where: { email: login },
      include: [
        { model: Customer, include: [Address] },
        { model: Restaurant },
        { model: DeliveryPartner },
        { model: Admin },
        { model: CustomerSupport }
      ]
    });

    if (!user) {
      return invalidCredentials(res);
    }

    if (!user.is_active) {
      return inactiveAccount(res);
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return invalidCredentials(res);
    }

    const otpRecord = await createOtpRecord({ user, purpose: 'login' });

    return res.status(200).json({
      success: true,
      message: 'OTP has been sent',
      data: {
        requiresOtp: true,
        otp_request_id: otpRecord.id,
        channel: otpRecord.channel,
        destination: maskEmail(otpRecord.destination),
        expires_in: getOtpSecondsRemaining(otpRecord.expires_at)
      }
    });
  } catch (error) {
    return handleAuthCatch(res, error, 'Login');
  }
};

// @desc    Get user profile
// @route   GET /api/auth/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { model: Customer, include: [Address] },
        { model: Restaurant },
        { model: DeliveryPartner },
        { model: Admin },
        { model: CustomerSupport }
      ]
    });

    if (user) {
      res.json({ success: true, data: user });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const { full_name, phone_number, password, restaurant_name, location, cuisine_type, vehicle_license, address } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Update User common fields
    if (full_name) user.full_name = full_name;
    if (phone_number) user.phone_number = phone_number;
    if (password) user.password_hash = password; // Hook will hash it

    await user.save();

    // Update Specific Profile fields
    if (user.role === 'restaurant') {
      const restaurant = await Restaurant.findOne({ where: { user_id: user.id } });
      if (restaurant) {
        if (restaurant_name) restaurant.name = restaurant_name;
        if (location) restaurant.location = location;
        if (cuisine_type) restaurant.cuisine_type = cuisine_type;
        await restaurant.save();
      }
    } else if (user.role === 'delivery_partner') {
      const driver = await DeliveryPartner.findOne({ where: { user_id: user.id } });
      if (driver) {
        if (vehicle_license) driver.vehicle_license = vehicle_license;
        await driver.save();
      }
    } else if (user.role === 'customer' && address) {
      const customer = await Customer.findOne({ where: { user_id: user.id } });
      if (customer) {
        // Find existing address (try default first, then any)
        let customerAddress = await Address.findOne({ 
          where: { customer_id: customer.id },
          order: [['is_default', 'DESC'], ['created_at', 'DESC']]
        });
        
        if (customerAddress) {
          customerAddress.street = address;
          // Ensure it's marked as default if it's the only one or if we are updating from profile
          customerAddress.is_default = true; 
          await customerAddress.save();
          
          // If we just marked this as default, ensure others are NOT default
          await Address.update({ is_default: false }, {
            where: { 
              customer_id: customer.id,
              id: { [Op.ne]: customerAddress.id }
            }
          });
        } else {
          await Address.create({
            customer_id: customer.id,
            street: address,
            city: 'Food City',
            is_default: true
          });
        }
      }
    }

    // Return updated user with profile
    const updatedUser = await User.findByPk(user.id, {
      attributes: { exclude: ['password_hash'] },
      include: [
        { 
          model: Customer, 
          include: [{ 
            model: Address,
            order: [['is_default', 'DESC']]
          }] 
        },
        { model: Restaurant },
        { model: DeliveryPartner },
        { model: Admin },
        { model: CustomerSupport }
      ]
    });

    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public


// @desc    Logout user / revoke current session
// @route   POST /api/auth/logout
// @access  Private
exports.logoutUser = async (req, res) => {
  try {
    const refreshToken = (req.body.refreshToken || '').trim();
    let session = null;

    if (refreshToken) {
      session = await AuthSession.findOne({
        where: {
          user_id: req.user.id,
          refresh_token_hash: hashRefreshToken(refreshToken),
          revoked_at: null
        }
      });
    }

    if (!session && req.auth?.sid) {
      session = await AuthSession.findOne({
        where: {
          id: req.auth.sid,
          user_id: req.user.id,
          revoked_at: null
        }
      });
    }

    if (session) {
      session.revoked_at = new Date();
      await session.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Verify OTP and issue tokens
// @route   POST /api/auth/verify-otp
// @access  Public
exports.verifyOtp = async (req, res) => {
  try {
    const otpRequestId = (req.body.otp_request_id || '').trim();
    const otpCode = (req.body.otp || '').trim();

    if (!otpRequestId || !otpCode) {
      return res.status(400).json({
        success: false,
        message: 'otp_request_id and otp are required'
      });
    }

    const otpRecord = await AuthOtp.findOne({
      where: {
        id: otpRequestId,
        purpose: 'login'
      },
      include: [
        {
          model: User,
          include: [
            { model: Customer, include: [Address] },
            { model: Restaurant },
            { model: DeliveryPartner },
            { model: Admin },
            { model: CustomerSupport }
          ]
        }
      ]
    });

    if (!otpRecord || !otpRecord.User) {
      return res.status(404).json({
        success: false,
        message: 'OTP request not found'
      });
    }

    if (otpRecord.used_at) {
      return otpUsed(res);
    }

    if (new Date(otpRecord.expires_at) <= new Date()) {
      return otpExpired(res);
    }

    if (otpRecord.invalid_attempt_count >= otpRecord.max_attempts) {
      return otpInvalid(res, 0);
    }

    const isValidOtp = hashOtpCode(otpCode) === otpRecord.otp_hash;

    if (!isValidOtp) {
      otpRecord.invalid_attempt_count += 1;
      await otpRecord.save();

      const attemptsRemaining = Math.max(0, otpRecord.max_attempts - otpRecord.invalid_attempt_count);

      return res.status(401).json({
        success: false,
        message: attemptsRemaining > 0 ? 'Invalid OTP' : 'Too many invalid OTP attempts. Please resend OTP.',
        data: {
          attemptsRemaining
        }
      });
    }

    const user = otpRecord.User;

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    otpRecord.used_at = new Date();
    await otpRecord.save();

    const authPayload = await issueAuthPayload(user, req);

    await writeAuthAuditLog({
      action: 'verify_otp',
      status: 'success',
      userId: user.id,
      email: user.email,
      ip: getClientIp(req),
      userAgent: req.get('user-agent') || null,
      metadata: { otpRequestId: otpRecord.id }
    });

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
        phone_number: user.phone_number,
        is_active: user.is_active,
        ...authPayload
      }
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

// @desc    Resend OTP
// @route   POST /api/auth/resend-otp
// @access  Public
exports.resendOtp = async (req, res) => {
  try {
    const otpRequestId = (req.body.otp_request_id || '').trim();

    if (!otpRequestId) {
      return res.status(400).json({
        success: false,
        message: 'otp_request_id is required'
      });
    }

    const otpRecord = await AuthOtp.findOne({
      where: {
        id: otpRequestId,
        purpose: 'login'
      },
      include: [{ model: User }]
    });

    if (!otpRecord || !otpRecord.User) {
      return res.status(404).json({
        success: false,
        message: 'OTP request not found'
      });
    }

    if (otpRecord.used_at) {
      return otpUsed(res);
    }

    if (!otpRecord.User.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account is inactive'
      });
    }

    const cooldownRemaining = getCooldownRemainingSeconds(otpRecord.last_sent_at);
    if (cooldownRemaining > 0) {
      return otpResendBlocked(res, cooldownRemaining);
    }

    if (otpRecord.resend_count >= OTP_MAX_RESENDS) {
      return otpResendLimitReached(res);
    }

    const newOtpCode = generateOtpCode();

    otpRecord.otp_hash = hashOtpCode(newOtpCode);
    otpRecord.expires_at = getOtpExpiryDate();
    otpRecord.invalid_attempt_count = 0;
    otpRecord.resend_count += 1;
    otpRecord.last_sent_at = new Date();

    await otpRecord.save();

    await sendOtpOutOfBand({
      user: otpRecord.User,
      otpCode: newOtpCode,
      purpose: 'login'
    });

    return res.status(200).json({
      success: true,
      message: 'OTP resent successfully',
      data: {
        otp_request_id: otpRecord.id,
        channel: otpRecord.channel,
        destination: maskEmail(otpRecord.destination),
        expires_in: getOtpSecondsRemaining(otpRecord.expires_at)
      }
    });
  } catch (error) {
    console.error('Resend OTP error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server Error'
    });
  }
};

