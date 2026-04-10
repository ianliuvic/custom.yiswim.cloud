const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/auth');
const { N8N_BASE_URL, JWT_SECRET } = require('../config/constants');

// 1. 根目录：推广着陆页（公开访问），已登录用户自动跳转到 /home
router.get('/', (req, res) => {
    const token = req.cookies.auth_token;
    if (token) {
        try {
            jwt.verify(token, JWT_SECRET);
            return res.redirect('/home');
        } catch (_) { /* token 无效，继续显示推广页 */ }
    }
    res.render('landing', { 
        title: req.t('pageTitle.landing'),
        googleClientId: process.env.GOOGLE_CLIENT_ID || '' // 提供个安全的空字符串保底
    });
});

// 1a. 隐私政策页面（公开访问）
router.get('/privacy', (req, res) => {
    // 渲染新增加的 privacy.ejs
    res.render('privacy', { 
        title: req.t ? req.t('pageTitle.privacy') || 'Privacy Policy' : '隐私权政策',
        currentDate: '2026年4月8日'
    });
});

// 1b. 定制主页：需登录
router.get('/home', authenticateToken, (req, res) => {
    res.render('custom', { title: req.t('pageTitle.home'), user: req.user });
});

// 2. 处理用户点击邮箱里的激活链接
router.get('/activate', async (req, res) => {
    const token = req.query.token;
    if (!token) return res.redirect('/?auth=login');

    try {
        const n8nResponse = await fetch(`${N8N_BASE_URL}/custom-user-activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token, schema: (process.env.DB_SCHEMA || 'public').split(',')[0] })
        });
        const data = await n8nResponse.json();

        if (data.success) {
            res.redirect('/?activated=true');
        } else {
            res.send(req.t('api.activateInvalid'));
        }
    } catch (err) {
        res.send(req.t('api.serverError'));
    }
});

// 3. 登录页面：重定向到着陆页弹窗
router.get('/login', (req, res) => {
    if (req.cookies.auth_token) {
        return res.redirect('/home');
    }
    res.redirect('/?auth=login');
});

// 4. 退出登录
router.get('/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.redirect('/');
});

// 5. 重置密码页面
router.get('/reset-password', (req, res) => {
    const token = req.query.token;
    if (!token) {
        return res.redirect('/?auth=login');
    }
    res.render('reset', { title: req.t('pageTitle.reset'), token: token });
});

// 6. 用户中心
router.get('/user', authenticateToken, (req, res) => {
    res.render('user', { title: req.t('pageTitle.user'), user: req.user });
});

module.exports = router;
