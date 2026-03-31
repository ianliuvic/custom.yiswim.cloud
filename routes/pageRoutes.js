const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { N8N_BASE_URL } = require('../config/constants');

// 1. 根目录：受保护，登录后才能看
router.get('/', authenticateToken, (req, res) => {
    res.render('custom', { title: req.t('pageTitle.home'), user: req.user });
});

// 2. 处理用户点击邮箱里的激活链接
router.get('/activate', async (req, res) => {
    const token = req.query.token;
    if (!token) return res.redirect('/login');

    try {
        const n8nResponse = await fetch(`${N8N_BASE_URL}/custom-user-activate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: token })
        });
        const data = await n8nResponse.json();

        if (data.success) {
            res.redirect('/login?activated=true');
        } else {
            res.send(req.t('api.activateInvalid'));
        }
    } catch (err) {
        res.send(req.t('api.serverError'));
    }
});

// 3. 登录页面
router.get('/login', (req, res) => {
    if (req.cookies.auth_token) {
        return res.redirect('/');
    }
    res.render('login', { title: req.t('pageTitle.auth') });
});

// 4. 退出登录
router.get('/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.redirect('/login');
});

// 5. 重置密码页面
router.get('/reset-password', (req, res) => {
    const token = req.query.token;
    if (!token) {
        return res.redirect('/login');
    }
    res.render('reset', { title: req.t('pageTitle.reset'), token: token });
});

// 6. 用户中心
router.get('/user', authenticateToken, (req, res) => {
    res.render('user', { title: req.t('pageTitle.user'), user: req.user });
});

module.exports = router;
