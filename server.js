const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 核心配置：信任代理
// ==========================================
// 因为你的 VPS 使用了 Coolify (反向代理)，必须开启这个设置
// 否则中间件获取到的是宿主机的 IP，会导致所有用户都被封锁
app.set('trust proxy', 1); 

// ==========================================
// 定义限制规则
// ==========================================

// 1. 针对登录接口的限制：15分钟内最多尝试 5 次
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 分钟
    max: 5, // 限制 5 次
    message: { success: false, message: "请求过于频繁，请15分钟后再试。" },
    standardHeaders: true, // 在响应头中显示剩余次数
    legacyHeaders: false,
});

// 2. 针对注册接口的限制：1小时内最多注册 2 个账号（防止恶意灌水）
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 小时
    max: 2, 
    message: { success: false, message: "该 IP 注册请求过多，请稍后再试。" },
    standardHeaders: true,
    legacyHeaders: false,
});

// 3. 通用全局限制（可选）：防止恶意刷页面
const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 分钟
    max: 60, // 每分钟最多 60 次请求
    message: { success: false, message: "请求过于频繁。" }
});

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
// 页面路由 (添加到 /login 路由附近)
// ==========================================

// 重置密码页面
app.get('/reset-password', (req, res) => {
    const token = req.query.token; // 从 URL 获取 token：?token=xxxx
    
    // 如果没有 token，直接让他回登录页
    if (!token) {
        return res.redirect('/login');
    }
    
    // 将 token 传给 EJS 模板
    res.render('reset', { title: '重置密码', token: token });
});

// ==========================================
// API 接口
// ==========================================

// 注册逻辑
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // --- 新增：后端安全校验 ---
        if (!password || password.length < 8) {
            return res.status(400).json({ 
                success: false, 
                message: '注册失败：密码长度不能少于 8 位' 
            });
        }

        // 校验通过后再进行加密
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
app.post('/api/login', loginLimiter, async (req, res) => {
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

// ==========================================
// 3. 忘记密码（暂不改动）
// ==========================================
app.post('/api/forgot-password', loginLimiter, async (req, res) => {
    try {
        const n8nResponse = await fetch(`${N8N_BASE_URL}/custom-user-forgot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        const data = await n8nResponse.json();
        res.json(data);
        
    } catch (error) {
        res.status(500).json({ success: false, message: '后端服务异常' });
    }
});

// ==========================================
// API 接口 (添加到 /api/forgot-password 附近)
// ==========================================

// 提交新密码逻辑
// 建议加上频率限制，这里复用之前写的 loginLimiter
app.post('/api/reset-password', loginLimiter, async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: '参数缺失' });
        }

        // 1. 对新密码进行 Hash 加密
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 2. 将 token 和加密后的新密码发给 n8n
        // n8n 需要负责去数据库校验 token 是否存在、是否过期，然后更新密码并清空 token
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
        res.status(500).json({ success: false, message: '后端服务异常' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
