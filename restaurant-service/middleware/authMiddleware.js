const jwt = require('jsonwebtoken');

const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            
            const fs = require('fs');
            const path = require('path');
            const publicKey = fs.readFileSync(path.join(__dirname, '../certs/public.key'));

            const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
            req.user = decoded;
            next();
        } catch (error) {
            console.error('Not authorized, token failed');
            res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    }

    if (!token) {
        res.status(401).json({ success: false, message: 'Not authorized, no token' });
    }
};

const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `User role ${req.user ? req.user.role : 'Unknown'} is not authorized to access this route`
            });
        }
        next();
    };
};

module.exports = { protect, authorize };
