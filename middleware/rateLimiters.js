const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: "请求过于频繁，请15分钟后再试。" },
    standardHeaders: true,
    legacyHeaders: false,
});

const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 2,
    message: { success: false, message: "该 IP 注册请求过多，请稍后再试。" },
    standardHeaders: true,
    legacyHeaders: false,
});

const globalLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 60,
    message: { success: false, message: "请求过于频繁。" }
});

module.exports = { loginLimiter, registerLimiter, globalLimiter };
