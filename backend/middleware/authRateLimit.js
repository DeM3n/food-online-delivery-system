const { authError } = require('../utils/authErrorUtils');

const buckets = new Map();

const cleanupExpiredKeys = () => {
  const now = Date.now();
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
};

setInterval(cleanupExpiredKeys, 60 * 1000).unref();

const getClientIp = (req) =>
  req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
  req.connection?.remoteAddress ||
  req.socket?.remoteAddress ||
  req.ip ||
  'unknown';

const createRateLimiter = ({
  windowMs,
  max,
  errorCode,
  message,
  keyBuilder
}) => {
  return (req, res, next) => {
    const key = keyBuilder ? keyBuilder(req) : `${req.path}:${getClientIp(req)}`;
    const now = Date.now();

    let bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      bucket = {
        count: 0,
        resetAt: now + windowMs
      };
      buckets.set(key, bucket);
    }

    bucket.count += 1;

    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      return authError(res, 429, message, errorCode, { retryAfter });
    }

    return next();
  };
};

const buildKeyWithIpAndBody = (req, fieldName) => {
  const raw = (req.body?.[fieldName] || '').toString().trim().toLowerCase();
  return `${req.path}:${getClientIp(req)}:${raw || 'anonymous'}`;
};

const loginRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  errorCode: 'AUTH_RATE_LIMIT_LOGIN',
  message: 'Too many login attempts. Please try again later.',
  keyBuilder: (req) => buildKeyWithIpAndBody(req, 'email')
});

const otpVerifyRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 10,
  errorCode: 'AUTH_RATE_LIMIT_OTP_VERIFY',
  message: 'Too many OTP verification attempts. Please try again later.',
  keyBuilder: (req) => buildKeyWithIpAndBody(req, 'otp_request_id')
});

const otpResendRateLimit = createRateLimiter({
  windowMs: 10 * 60 * 1000,
  max: 8,
  errorCode: 'AUTH_RATE_LIMIT_OTP_RESEND',
  message: 'Too many OTP resend attempts. Please try again later.',
  keyBuilder: (req) => buildKeyWithIpAndBody(req, 'otp_request_id')
});

const forgotPasswordRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 6,
  errorCode: 'AUTH_RATE_LIMIT_FORGOT_PASSWORD',
  message: 'Too many forgot-password requests. Please try again later.',
  keyBuilder: (req) => buildKeyWithIpAndBody(req, 'email')
});

const resetPasswordRateLimit = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  errorCode: 'AUTH_RATE_LIMIT_RESET_PASSWORD',
  message: 'Too many password reset attempts. Please try again later.',
  keyBuilder: (req) => buildKeyWithIpAndBody(req, 'resetToken')
});

module.exports = {
  createRateLimiter,
  loginRateLimit,
  otpVerifyRateLimit,
  otpResendRateLimit,
  forgotPasswordRateLimit,
  resetPasswordRateLimit
};
