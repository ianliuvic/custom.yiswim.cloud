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

module.exports = authenticateToken;
