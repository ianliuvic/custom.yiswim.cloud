const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// 使用 process.env 读取 Coolify 传过来的环境变量，确保密码绝对安全
const db = new Pool({
    host: process.env.DB_HOST,         // 例如：postgresql-xxxxxx
    port: process.env.DB_PORT || 5432, // 默认 5432
    user: process.env.DB_USER,         // 数据库用户名
    password: process.env.DB_PASSWORD, // 数据库密码
    database: process.env.DB_NAME,     // 数据库名称
    max: 20,                           // 最大并发连接数（保护数据库不被撑爆）
    idleTimeoutMillis: 30000,          // 空闲连接 30 秒后自动释放
    connectionTimeoutMillis: 2000,     // 2 秒连不上就报错，防止请求一直卡死
});

db.connect((err, client, release) => {
    if (err) {
        console.error('❌ 数据库连接失败! 请检查 Coolify 环境变量配置:', err.stack);
    } else {
        console.log('✅ 成功连接到 PostgreSQL 数据库!');
        release(); // 测试成功后，必须把连接释放回池子里
    }
});

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
    windowMs: 15 * 60 * 1000, 
    max: 5, 
    message: { success: false, message: "请求过于频繁，请15分钟后再试。" },
    standardHeaders: true, 
    legacyHeaders: false,
});

// 2. 针对注册接口的限制：1小时内最多注册 2 个账号（防止恶意灌水）
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, 
    max: 2, 
    message: { success: false, message: "该 IP 注册请求过多，请稍后再试。" },
    standardHeaders: true,
    legacyHeaders: false,
});

// 3. 通用全局限制（可选）：防止恶意刷页面
const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, 
    max: 60, 
    message: { success: false, message: "请求过于频繁。" }
});

// 【重要】设置一个 JWT 密钥
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-123456';

// 配置 n8n 内部地址
const N8N_BASE_URL = 'http://n8n-ywock00sw4ko80c4w4ogs8so:5678/webhook-test';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// 修复点 1：应用全局频率限制
app.use(globalLimiter);

// ==========================================
// 中间件：验证用户是否已登录
// ==========================================
const authenticateToken = (req, res, next) => {
    const token = req.cookies.auth_token; 

    if (!token) {
        return res.redirect('/login'); 
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            res.clearCookie('auth_token');
            return res.redirect('/login'); 
        }
        req.user = user; 
        next();
    });
};

// ==========================================
// 页面路由
// ==========================================

// 1. 根目录：受保护，登录后才能看
app.get('/', authenticateToken, (req, res) => {
    res.render('custom', { title: '定制系统主页', user: req.user });
});

// 2. 处理用户点击邮箱里的激活链接
app.get('/activate', async (req, res) => {
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
            res.send('激活链接无效或已过期，请联系客服。');
        }
    } catch (err) {
        res.send('服务器错误，请稍后再试');
    }
});

// 3. 登录页面
app.get('/login', (req, res) => {
    if (req.cookies.auth_token) {
        return res.redirect('/');
    }
    res.render('login', { title: '用户验证' });
});

// 4. 退出登录
app.get('/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.redirect('/login');
});

// 5. 重置密码页面
app.get('/reset-password', (req, res) => {
    const token = req.query.token; 
    if (!token) {
        return res.redirect('/login');
    }
    res.render('reset', { title: '重置密码', token: token });
});

// ==========================================
// API 接口
// ==========================================

// 1. 获取业务数据 (直连 PostgreSQL 查询)
app.get('/api/get-data', authenticateToken, async (req, res) => {
    try {
        console.log('当前请求数据的用户:', req.user.username);

        // 核心 SQL: 使用 LEFT JOIN 和 json_agg 将款式与图片一对多映射
        // COALESCE 和 FILTER 确保了当款式没有图片时，返回空数组 [] 而不是 [null]
        const stylesQuery = `
            SELECT 
                s.id,
                s.name,
                s.category,
                s.description,
                s.properties,
                COALESCE(
                    json_agg('https://files/yiswim.cloud/' || i.unique_image_id) FILTER (WHERE i.unique_image_id IS NOT NULL), 
                    '[]'
                ) as image_urls
            FROM custom_odm_styles s
            LEFT JOIN images i ON s.id = i.notion_page_id
            WHERE s.is_active = true
            GROUP BY s.id
            ORDER BY s.category ASC, s.name ASC;
        `;

        // 1. 执行查询
        const { rows: odmStyles } = await db.query(stylesQuery);

        // 2. 组装并返回给前端
        res.json({
            success: true,
            data: {
                odm_styles: odmStyles,
                // 下面的面料和包装袋由于还没写 SQL，先传空数组占位
                // 等后续加上对应的 SQL 后，把结果塞进来即可
                fabrics: [], 
                bags: []     
            }
        });

    } catch (error) {
        console.error('获取业务数据失败:', error.message);
        res.status(500).json({ success: false, message: '数据库查询异常' });
    }
});


// 2. 注册逻辑
// 修复点 2：加上了 registerLimiter
app.post('/api/register', registerLimiter, async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({ 
                success: false, 
                message: '注册失败：密码长度不能少于 8 位' 
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
        res.status(500).json({ success: false, message: '后端服务异常' });
    }
});

// 3. 登录逻辑
app.post('/api/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        const n8nResponse = await fetch(`${N8N_BASE_URL}/custom-user-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username })
        });

        const data = await n8nResponse.json();

        // 拦截未激活用户
        if (data.user && data.user.is_active === false) {
            return res.status(403).json({ success: false, message: '请先前往邮箱验证并激活您的账号' });
        }

        if (!data.success || !data.user) {
            return res.status(401).json({ success: false, message: '用户名或密码错误' });
        }

        const validPassword = await bcrypt.compare(password, data.user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: '用户名或密码错误' });
        }

        const token = jwt.sign(
            { username: data.user.username, email: data.user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('auth_token', token, {
            httpOnly: true,  
            secure: false,   
            maxAge: 24 * 60 * 60 * 1000 
        });

        res.json({ success: true, message: '登录成功！' });

    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ success: false, message: '后端服务异常' });
    }
});

// 4. 忘记密码
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

// 5. 提交新密码逻辑
app.post('/api/reset-password', loginLimiter, async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: '参数缺失' });
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
        res.status(500).json({ success: false, message: '后端服务异常' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
