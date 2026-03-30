const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const i18nextBackend = require('i18next-fs-backend');
const { globalLimiter } = require('./middleware/rateLimiters');
const pageRoutes = require('./routes/pageRoutes');
const apiRoutes = require('./routes/apiRoutes');

// 初始化 i18next
i18next
    .use(i18nextBackend)
    .use(i18nextMiddleware.LanguageDetector)
    .init({
        backend: {
            loadPath: path.join(__dirname, 'locales/{{lng}}/{{ns}}.json'),
        },
        fallbackLng: 'zh',
        supportedLngs: ['zh', 'en'],
        preload: ['zh', 'en'],
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(i18nextMiddleware.handle(i18next));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
