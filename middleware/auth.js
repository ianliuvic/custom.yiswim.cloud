const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');

const authenticateToken = (req, res, next) => {
    const token = req.cookies.auth_token;

    if (!token) {
        return res.redirect('/?auth=login');
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            res.clearCookie('auth_token');
            return res.redirect('/?auth=login');
        }
        req.user = user;
        next();
    });
};

// 可选认证：有 token 就解析，没有也放行（req.user 可能为 null）
const optionalAuth = (req, res, next) => {
    const token = req.cookies.auth_token;
    if (!token) { req.user = null; return next(); }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            res.clearCookie('auth_token');
            req.user = null;
        } else {
            req.user = user;
        }
        next();
    });
};

module.exports = authenticateToken;
module.exports.optionalAuth = optionalAuth;
