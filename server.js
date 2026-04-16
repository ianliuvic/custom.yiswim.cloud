const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const path = require('path');
const cookieParser = require('cookie-parser');
const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const i18nextBackend = require('i18next-fs-backend');
const { globalLimiter } = require('./middleware/rateLimiters');
const pageRoutes = require('./routes/pageRoutes');
const apiRoutes = require('./routes/apiRoutes');
const adminRoutes = require('./routes/adminRoutes');

// 初始化 i18next
i18next
    .use(i18nextBackend)
    .use(i18nextMiddleware.LanguageDetector)
    .init({
        backend: {
            loadPath: path.join(__dirname, 'locales/{{lng}}/{{ns}}.json'),
        },
        fallbackLng: 'en',
        supportedLngs: ['en', 'zh'],
        preload: ['en', 'zh'],
        ns: ['translation'],
        defaultNS: 'translation',
        detection: {
            order: ['querystring', 'cookie'],
            lookupQuerystring: 'lng',
            lookupCookie: 'lng',
            caches: ['cookie'],
            cookieExpirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        interpolation: {
            escapeValue: false,
        },
    });

const app = express();
const PORT = process.env.PORT || 3000;

// 因为 VPS 使用了 Coolify (反向代理)，必须开启信任代理
app.set('trust proxy', 1);

// HTTP 安全头（CSP 因大量内联脚本暂禁，其余全部启用）
app.use(helmet({
    contentSecurityPolicy: false,       // 页面含大量内联脚本/事件属性，CSP 单独维护
    crossOriginEmbedderPolicy: false,   // 防止 Chatwoot 等第三方 iframe 加载失败
    frameguard: false,                  // 允许 GTM Preview 通过 iframe 连接
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(compression());
app.use(i18nextMiddleware.handle(i18next));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '7d',
    etag: true,
    lastModified: true
}));
app.use(globalLimiter);

// 将 t 函数和当前语言注入所有 EJS 模板
app.use((req, res, next) => {
    res.locals.t = req.t;
    res.locals.lng = req.language;
    next();
});

// 语言切换接口
app.post('/api/set-language', (req, res) => {
    const { lng } = req.body;
    if (['zh', 'en'].includes(lng)) {
        res.cookie('lng', lng, { maxAge: 365 * 24 * 60 * 60 * 1000, httpOnly: false });
        res.json({ success: true });
    } else {
        res.status(400).json({ success: false, message: 'Unsupported language' });
    }
});

// 挂载路由
app.use('/', pageRoutes);
app.use('/api', apiRoutes);
app.use('/admin', adminRoutes);

// 404 处理
app.use((req, res) => {
    res.status(404).render('404');
});

// 500 处理
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('500');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
