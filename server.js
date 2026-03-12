const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 配置你的 n8n 基础地址
//const N8N_BASE_URL = 'http://n8n-ywock00sw4ko80c4w4ogs8so:5678/webhook-test';
const N8N_BASE_URL = 'https://n8n.yiswim.cloud/webhook-test';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// 1. 访问主页时，渲染登录页面
app.get('/', (req, res) => {
    res.render('login', { title: '欢迎 - 用户验证' });
});

// 2. 接收前端的【登录】请求，并转发给 n8n
app.post('/api/login', async (req, res) => {
    try {
        // Node.js 18 原生支持 fetch
        const n8nResponse = await fetch(`${N8N_BASE_URL}/custom-user-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body) // 包含 username 和 password
        });
        const data = await n8nResponse.json();
        res.json(data); // 将 n8n 的返回结果原样传回给前端
    } catch (error) {
        console.error('n8n 连接错误:', error);
        res.status(500).json({ success: false, message: '后端服务异常' });
    }
});

// 3. 接收前端的【注册】请求，并转发给 n8n
app.post('/api/register', async (req, res) => {
    try {
        const n8nResponse = await fetch(`${N8N_BASE_URL}/custom-user-register`, {
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

// 4. 接收前端的【忘记密码】请求，并转发给 n8n
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
