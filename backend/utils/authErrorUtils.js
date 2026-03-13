const isSequelizeConnectionError = (error) => {
  const name = error?.name || '';
  return [
    'SequelizeConnectionError',
    'SequelizeConnectionRefusedError',
    'SequelizeHostNotFoundError',
    'SequelizeHostNotReachableError',
    'SequelizeInvalidConnectionError',
    'SequelizeConnectionAcquireTimeoutError',
    'ConnectionError'
  ].includes(name);
};

const isMailServiceError = (error) => {
  const code = error?.code || '';
  return [
    'EAUTH',
    'ECONNECTION',
    'ETIMEDOUT',
    'ESOCKET',
    'ECONNRESET',
    'ENOTFOUND'
  ].includes(code);
};

const authError = (res, status, message, code, extra = {}) => {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...extra
    }
  });
};

const invalidInput = (res, message = 'Invalid input', fields = []) =>
  authError(res, 400, message, 'AUTH_INVALID_INPUT', fields.length ? { fields } : {});

const invalidCredentials = (res) =>
  authError(res, 401, 'Invalid email/username or password', 'AUTH_INVALID_CREDENTIALS');

const inactiveAccount = (res) =>
  authError(res, 403, 'Account is inactive', 'AUTH_ACCOUNT_INACTIVE');

const otpInvalid = (res, attemptsRemaining = null) =>
  authError(
    res,
    401,
    attemptsRemaining !== null && attemptsRemaining <= 0
      ? 'Too many invalid OTP attempts. Please request a new OTP.'
      : 'Invalid OTP',
    'AUTH_OTP_INVALID',
    attemptsRemaining !== null ? { attemptsRemaining } : {}
  );

const otpExpired = (res) =>
  authError(res, 410, 'OTP has expired', 'AUTH_OTP_EXPIRED');

const otpUsed = (res) =>
  authError(res, 400, 'OTP has already been used', 'AUTH_OTP_ALREADY_USED');

const otpResendBlocked = (res, retryAfter) =>
  authError(res, 429, 'OTP resend is temporarily blocked', 'AUTH_OTP_RESEND_BLOCKED', { retryAfter });

const otpResendLimitReached = (res) =>
  authError(res, 429, 'Maximum OTP resend limit reached', 'AUTH_OTP_RESEND_LIMIT');

const serviceUnavailable = (res, service = 'auth service') =>
  authError(res, 503, `${service} is temporarily unavailable`, 'AUTH_SERVICE_UNAVAILABLE', { service });

const dbUnavailable = (res) =>
  authError(res, 503, 'Authentication database is temporarily unavailable', 'AUTH_DATABASE_UNAVAILABLE');

const handleAuthCatch = (res, error, context = 'Auth') => {
  console.error(`${context} error:`, error);

  if (isSequelizeConnectionError(error)) {
    return dbUnavailable(res);
  }

  if (isMailServiceError(error)) {
    return serviceUnavailable(res, 'mail service');
  }

  return authError(res, 500, 'Server Error', 'AUTH_INTERNAL_ERROR');
};

module.exports = {
  authError,
  invalidInput,
  invalidCredentials,
  inactiveAccount,
  otpInvalid,
  otpExpired,
  otpUsed,
  otpResendBlocked,
  otpResendLimitReached,
  serviceUnavailable,
  dbUnavailable,
  handleAuthCatch,
  isSequelizeConnectionError,
  isMailServiceError
};
