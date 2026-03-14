const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Optional auth:
// - Nếu có Bearer token hợp lệ => gắn req.user, req.auth
// - Nếu không có token hoặc token lỗi => vẫn next() như guest
exports.optionalProtect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';

    if (!authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const userId = decoded.sub || decoded.id;

    if (!userId) {
      return next();
    }

    const user = await User.findByPk(userId, {
      attributes: { exclude: ['password_hash'] }
    });

    if (user) {
      req.user = user;
      req.auth = decoded;
    }

    return next();
  } catch (error) {
    // Optional auth nên không chặn request guest
    return next();
  }
};