const jwt = require('jsonwebtoken');

// Protect route middleware
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];

      // Decode and verify token locally using Public Key (RS256)
      const fs = require('fs');
      const path = require('path');
      const publicKey = fs.readFileSync(path.join(__dirname, '../certs/public.key'));
      
      const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });

      // Extract user info from decoded token payload
      req.user = {
        id: decoded.id,
        email: decoded.email,
        role: decoded.role,
        full_name: decoded.full_name
      };

      next();
    } catch (error) {
      console.error('Auth middleware error:', error.message);
      return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
    }
  } else {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
};

// Role-based authorization middleware
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: `User role ${req.user.role} is not authorized to access this route` });
    }
    next();
  };
};

// Admin only middleware
exports.admin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Not authorized as an admin' });
  }
};
