const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const authenticateToken = require('../middleware/auth');
const { optionalAuth } = require('../middleware/auth');
const { N8N_BASE_URL, JWT_SECRET } = require('../config/constants');

// robots.txt
router.get('/robots.txt', (req, res) => {
    const base = `${req.protocol}://${req.get('host')}`;
    res.type('text/plain');
    res.send(`User-agent: *\nDisallow: /admin\nDisallow: /api/\nDisallow: /user\nDisallow: /login\nDisallow: /reset\n\nSitemap: ${base}/sitemap.xml`);
});

// sitemap.xml
router.get('/sitemap.xml', (req, res) => {
    const base = `${req.protocol}://${req.get('host')}`;
    res.type('application/xml');
    res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/0.9">
  <url>
    <loc>${base}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${base}/privacy</loc>
    <changefreq>monthly</changefreq>
    <priority>0.3</priority>
  </url>
</urlset>`);
});

// 1. 根目录：定制主页（公开访问，可选登录）
router.get('/', optionalAuth, (req, res) => {
    res.render('custom', {
        title: req.t('pageTitle.home'),
        user: req.user,
        googleClientId: process.env.GOOGLE_CLIENT_ID || '',
        baseUrl: `${req.protocol}://${req.get('host')}`
    });
});

// 向后兼容：/home 重定向到 /
router.get('/home', (req, res) => {
    res.redirect('/');
});

// 1a. 隐私政策页面（公开访问）
router.get('/privacy', (req, res) => {
    res.render('privacy', { 
        title: req.t ? req.t('pageTitle.privacy') || 'Privacy Policy' : 'Privacy Policy',
        currentDate: 'April 8, 2026'
    });
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

// 3. 登录页面：重定向到根目录弹窗
router.get('/login', (req, res) => {
    if (req.cookies.auth_token) {
        return res.redirect('/');
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
