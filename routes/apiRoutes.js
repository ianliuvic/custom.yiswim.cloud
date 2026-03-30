const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { JWT_SECRET, N8N_BASE_URL } = require('../config/constants');
const authenticateToken = require('../middleware/auth');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiters');

// 1. 获取业务数据 (直连 PostgreSQL 并发查询：款式、面料、包装袋)
router.get('/get-data', authenticateToken, async (req, res) => {
    try {
        console.log('当前请求数据的用户:', req.user.username);

        const stylesQuery = `
            SELECT 
                s.id,
                s.name,
                s.category,
                s.description,
                s.properties,
                COALESCE(
                    json_agg('https://files.yiswim.cloud/' || i.unique_image_id) FILTER (WHERE i.unique_image_id IS NOT NULL), 
                    '[]'
                ) as image_urls
            FROM custom_odm_styles s
            LEFT JOIN images i ON s.id = i.notion_page_id
            WHERE s.is_active = true
            GROUP BY s.id
            ORDER BY s.category ASC, s.orders ASC NULLS LAST, s.name ASC;
        `;

        const fabricsQuery = `
            SELECT 
                f.id,
                f.name,
                f.category,
                f.description,
                f.tags,
                f.swatch_pic_names,
                f.properties,
                COALESCE(
                    json_agg('https://files.yiswim.cloud/' || i.unique_image_id) FILTER (WHERE i.unique_image_id IS NOT NULL), 
                    '[]'
                ) as image_urls
            FROM custom_fabrics f
            LEFT JOIN images i ON f.id = i.notion_page_id
            WHERE f.is_active = true
            GROUP BY f.id
            ORDER BY f.category ASC, f.orders ASC NULLS LAST, f.name ASC;
        `;

        const bagsQuery = `
            SELECT 
                b.id,
                b.name,
                b.description,
                b.properties,
                COALESCE(
                    json_agg('https://files.yiswim.cloud/' || i.unique_image_id) FILTER (WHERE i.unique_image_id IS NOT NULL), 
                    '[]'
                ) as image_urls
            FROM custom_accessory_packaging b
            LEFT JOIN images i ON b.id::text = i.notion_page_id
            WHERE b.is_active = true
            GROUP BY b.id
            ORDER BY b.orders ASC NULLS LAST, b.name ASC;
        `;

        const checklistQuery = `
            SELECT 
                id, 
                content 
            FROM custom_oem_checklist 
            WHERE is_active = true 
            ORDER BY orders ASC NULLS LAST;
        `;

        const [stylesResult, fabricsResult, bagsResult, checklistResult] = await Promise.all([
            db.query(stylesQuery),
            db.query(fabricsQuery),
            db.query(bagsQuery),
            db.query(checklistQuery)
        ]);

        const formattedFabrics = fabricsResult.rows.map(fabric => {
            const props = fabric.properties || {};
            return { ...fabric, ...props, properties: undefined };
        });

        const formattedBags = bagsResult.rows.map(bag => {
            const props = bag.properties || {};
            return { ...bag, ...props, properties: undefined };
        });

        res.json({
            success: true,
            data: {
                odm_styles: stylesResult.rows,
                fabrics: formattedFabrics,
                bags: formattedBags,
                oem_checklists: checklistResult.rows
            }
        });

    } catch (error) {
        console.error('获取业务数据失败:', error.message);
        res.status(500).json({ success: false, message: req.t('api.dbError') });
    }
});

// 2. 注册逻辑
router.post('/register', registerLimiter, async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({ 
                success: false, 
                message: req.t('api.registerPasswordShort') 
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const n8nResponse = await fetch(`${N8N_BASE_URL}/custom-user-register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                email: email,
                password_hash: hashedPassword
            })
        });

        const data = await n8nResponse.json();
        res.json(data);
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ success: false, message: req.t('api.backendError') });
    }
});

// 3. 登录逻辑 (直连 PostgreSQL)
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: req.t('api.loginRequired') });
        }

        const loginQuery = `SELECT * FROM custom_users WHERE username = $1 OR email = $2`;
        const result = await db.query(loginQuery, [username, username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: req.t('api.loginFailed') });
        }

        const user = result.rows[0];

        if (user.is_active === false) {
            return res.status(403).json({ success: false, message: req.t('api.activateFirst') });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: req.t('api.loginFailed') });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ success: true, message: req.t('api.loginSuccess') });

    } catch (error) {
        console.error('登录错误:', error.message);
        res.status(500).json({ success: false, message: req.t('api.serverAuthError') });
    }
});

// 4. 忘记密码
router.post('/forgot-password', loginLimiter, async (req, res) => {
    try {
        const n8nResponse = await fetch(`${N8N_BASE_URL}/custom-user-forgot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        const data = await n8nResponse.json();
        res.json(data);
        
    } catch (error) {
        res.status(500).json({ success: false, message: req.t('api.backendError') });
    }
});

// 5. 提交新密码逻辑
router.post('/reset-password', loginLimiter, async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: req.t('api.paramMissing') });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        const n8nResponse = await fetch(`${N8N_BASE_URL}/custom-user-reset-pwd`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                token: token,
                new_password_hash: hashedPassword
            })
        });

        const data = await n8nResponse.json();
        res.json(data);
    } catch (error) {
        console.error('重置密码错误:', error);
        res.status(500).json({ success: false, message: req.t('api.backendError') });
    }
});

module.exports = router;
