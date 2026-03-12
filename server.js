const express = require('express');
const path = require('path');

const app = express();
// Coolify 部署时会自动注入 PORT 环境变量，默认一般为 3000
const PORT = process.env.PORT || 3000;

// 配置中间件，用于解析后续可能发送给 n8n 的 JSON 数据
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 配置 EJS 作为模板引擎
app.set('view engine', 'ejs');
// 指定 views 文件夹路径
app.set('views', path.join(__dirname, 'views'));

// 配置静态文件目录 (CSS, JS, 图片等存放在 public 文件夹)
app.use(express.static(path.join(__dirname, 'public')));

// 主页面路由
app.get('/', (req, res) => {
    // 渲染 views/custom.ejs 并传递基础数据
    res.render('custom', { 
        title: 'Custom System',
        message: '前端部署成功！准备好连接 n8n 啦！'
    });
});

// [预留位置]：未来用于触发 n8n webhook 的本地 API 路由
app.post('/api/trigger', async (req, res) => {
    // 以后可以在这里写 fetch 请求去调用 n8n.yiswim.cloud 的 Webhook
    res.json({ success: true, message: '收到请求，准备转发给 n8n' });
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`Frontend server is running on port ${PORT}`);
});
