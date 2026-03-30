const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { globalLimiter } = require('./middleware/rateLimiters');
const pageRoutes = require('./routes/pageRoutes');
const apiRoutes = require('./routes/apiRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// 因为 VPS 使用了 Coolify (反向代理)，必须开启信任代理
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(globalLimiter);

// 挂载路由
app.use('/', pageRoutes);
app.use('/api', apiRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
