const { Pool } = require('pg');

const db = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    options: `-c search_path=${process.env.DB_SCHEMA || 'public'}`,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

db.connect((err, client, release) => {
    if (err) {
        console.error('❌ 数据库连接失败! 请检查 Coolify 环境变量配置:', err.stack);
    } else {
        console.log('✅ 成功连接到 PostgreSQL 数据库!');
        release();
    }
});

module.exports = db;
