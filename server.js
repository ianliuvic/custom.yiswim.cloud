const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// 【重要】设置一个 JWT 密钥，建议在 Coolify 环境变量中设置，这里先写死用于测试
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-123456';

// 配置 n8n 内部地址
const N8N_BASE_URL = 'http://n8n-ywock00sw4ko80c4w4ogs8so:5678/webhook-test';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // 启用 cookie 解析
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// 中间件：验证用户是否已登录
// ==========================================
const authenticateToken = (req, res, next) => {
    const token = req.cookies.auth_token; // 从 cookie 中获取 token

    if (!token) {
        return res.redirect('/login'); // 没 token，跳转到登录页
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            res.clearCookie('auth_token');
            return res.redirect('/login'); // token 无效，清理并跳转
        }
        req.user = user; // 将用户信息挂载到请求对象
        next();
    });
};

// ==========================================
// 页面路由
// ==========================================

// 1. 根目录：受保护，登录后才能看
app.get('/', authenticateToken, (req, res) => {
    // 渲染 custom.ejs，并把用户名传过去
    res.render('custom', { title: '控制台主页', user: req.user });
});

// 2. 登录页面
app.get('/login', (req, res) => {
    // 如果已经登录了，直接去主页，别再看登录页了
    if (req.cookies.auth_token) {
        return res.redirect('/');
    }
    res.render('login', { title: '用户验证' });
});

// 3. 退出登录
app.get('/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.redirect('/login');
});

// ==========================================
// API 接口
// ==========================================

// 注册逻辑
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
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
        res.status(500).json({ success: false, message: '后端服务异常' });
    }
});

// 登录逻辑
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        const n8nResponse = await fetch(`${N8N_BASE_URL}/custom-user-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username })
        });

        const data = await n8nResponse.json();

        if (!data.success || !data.user) {
            return res.status(401).json({ success: false, message: '用户名或密码错误' });
        }

        const validPassword = await bcrypt.compare(password, data.user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: '用户名或密码错误' });
        }

        // --- 核心修改：签发 JWT ---
        const token = jwt.sign(
            { username: data.user.username, email: data.user.email },
            JWT_SECRET,
            { expiresIn: '24h' } // 有效期24小时
        );

        // 将 JWT 写入 Cookie
        res.cookie('auth_token', token, {
            httpOnly: true,  // 安全：前端 JS 无法读取 cookie，防 XSS
            secure: false,   // 如果你的 custom.yiswim.cloud 是 https，设为 true
            maxAge: 24 * 60 * 60 * 1000 // 1天
        });

        res.json({ success: true, message: '登录成功！' });

    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ success: false, message: '后端服务异常' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
