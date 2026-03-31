const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/constants');
const db = require('../config/db');

const authenticateAdmin = async (req, res, next) => {
    const token = req.cookies.auth_token;

    if (!token) {
        return res.redirect('/login');
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        // 不信任 JWT 中的 role，从数据库实时查询
        const result = await db.query('SELECT id, username, email, role FROM custom_users WHERE id = $1', [decoded.id]);

        if (result.rows.length === 0) {
            res.clearCookie('auth_token');
            return res.redirect('/login');
        }

        const user = result.rows[0];
        if (user.role !== 'admin') {
            return res.status(403).json({ success: false, message: '无管理员权限' });
        }

        req.user = user;
        next();
    } catch (err) {
        res.clearCookie('auth_token');
        return res.redirect('/login');
    }
};

module.exports = authenticateAdmin;
