const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authError } = require('../utils/authErrorUtils');

// Protect route middleware
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');

      if (decoded.type && decoded.type !== 'access') {
        return authError(res, 401, 'Invalid token type', 'AUTH_INVALID_TOKEN_TYPE');
      }

      const userId = decoded.sub || decoded.id;

      req.user = await User.findByPk(userId, {
        attributes: { exclude: ['password_hash'] }
      });

      if (!req.user) {
        return authError(res, 401, 'Not authorized, user not found', 'AUTH_USER_NOT_FOUND');
      }

      if (!req.user.is_active) {
        return authError(res, 403, 'Account is inactive', 'AUTH_ACCOUNT_INACTIVE');
      }

      req.auth = decoded;
      next();
    } catch (error) {
      console.error('Protect middleware error:', error);
      return authError(res, 401, 'Not authorized, token failed', 'AUTH_TOKEN_FAILED');
    }
  } else {
    return authError(res, 401, 'Not authorized, no token', 'AUTH_NO_TOKEN');
  }
};

exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return authError(
        res,
        403,
        `User role ${req.user.role} is not authorized to access this route`,
        'AUTH_ROLE_FORBIDDEN'
      );
    }
    next();
  };
};
