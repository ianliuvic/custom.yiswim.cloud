const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 配置你的 n8n 基础地址
const N8N_BASE_URL = 'http://n8n-ywock00sw4ko80c4w4ogs8so:5678/webhook-test';
//const N8N_BASE_URL = 'https://n8n.yiswim.cloud/webhook-test';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// 1. 访问主页时，渲染登录页面
app.get('/', (req, res) => {
    res.render('login', { title: '欢迎 - 用户验证' });
});

// ==========================================
// 1. 注册逻辑（加密密码存入数据库）
// ==========================================
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 使用 bcrypt 生成盐并加密密码 (10 是加密强度，官方推荐值)
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 发送给 n8n 的是加密后的 hashedPassword，不要声明明文 password
        const n8nResponse = await fetch(`${N8N_BASE_URL}/custom-user-register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: username,
                email: email,
                password_hash: hashedPassword // 字段名与你建表的名称一致
            })
        });

        const data = await n8nResponse.json();
        res.json(data);
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ success: false, message: '后端服务异常' });
    }
});

// ==========================================
// 2. 登录逻辑（获取数据库 Hash 值并比对）
// ==========================================
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // 第 1 步：只把 username 发给 n8n，请求获取该用户的信息
        const n8nResponse = await fetch(`${N8N_BASE_URL}/custom-user-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: username })
        });

        const data = await n8nResponse.json();

        // 如果 n8n 没查到该用户
        if (!data.success || !data.user) {
            return res.status(401).json({ success: false, message: '用户名或密码错误' }); // 模糊提示，防暴力猜测
        }

        // 第 2 步：拿到数据库里的 Hash 密码，与用户提交的明文密码进行比对
        const validPassword = await bcrypt.compare(password, data.user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ success: false, message: '用户名或密码错误' });
        }

        // 第 3 步：比对成功！(未来我们在这里签发 JWT Token)
        res.json({ success: true, message: '登录成功！' });

    } catch (error) {
        console.error('登录错误:', error);
        res.status(500).json({ success: false, message: '后端服务异常' });
    }
});

// ==========================================
// 3. 忘记密码（暂不改动）
// ==========================================
app.post('/api/forgot-password', async (req, res) => {
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
