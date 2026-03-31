const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../config/db');
const { JWT_SECRET, N8N_BASE_URL } = require('../config/constants');
const authenticateToken = require('../middleware/auth');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiters');

// 文件上传配置
const UPLOAD_BASE = process.env.UPLOAD_PATH || path.join(__dirname, '..', 'uploads');
const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => {
            const dir = path.join(UPLOAD_BASE, 'inquiries');
            fs.mkdirSync(dir, { recursive: true });
            cb(null, dir);
        },
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname).toLowerCase();
            cb(null, uuidv4() + ext);
        }
    }),
    limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    fileFilter: (req, file, cb) => {
        const allowed = /\.(jpg|jpeg|png|gif|webp|pdf|ai|eps|svg|doc|docx|xls|xlsx|zip|rar)$/i;
        if (allowed.test(path.extname(file.originalname))) {
            cb(null, true);
        } else {
            cb(new Error('不支持的文件格式'));
        }
    }
});

// 1. 获取业务数据 (直连 PostgreSQL 并发查询：款式、面料、包装袋)
router.get('/get-data', authenticateToken, async (req, res) => {
    try {
        console.log('当前请求数据的用户:', req.user.username);

        const stylesQuery = `
            SELECT 
                s.id,
                s.name,
                s.category,
                s.description,
                s.properties,
                COALESCE(
                    json_agg('https://files.yiswim.cloud/' || i.unique_image_id) FILTER (WHERE i.unique_image_id IS NOT NULL), 
                    '[]'
                ) as image_urls
            FROM custom_odm_styles s
            LEFT JOIN images i ON s.id = i.notion_page_id
            WHERE s.is_active = true
            GROUP BY s.id
            ORDER BY s.category ASC, s.orders ASC NULLS LAST, s.name ASC;
        `;

        const fabricsQuery = `
            SELECT 
                f.id,
                f.name,
                COALESCE(f.name_en, f.name) AS name_en,
                f.category,
                f.description,
                f.tags,
                f.swatch_pic_names,
                f.properties,
                COALESCE(
                    json_agg('https://files.yiswim.cloud/' || i.unique_image_id) FILTER (WHERE i.unique_image_id IS NOT NULL), 
                    '[]'
                ) as image_urls
            FROM custom_fabrics f
            LEFT JOIN images i ON f.id = i.notion_page_id
            WHERE f.is_active = true
            GROUP BY f.id
            ORDER BY f.category ASC, f.orders ASC NULLS LAST, f.name ASC;
        `;

        const bagsQuery = `
            SELECT 
                b.id,
                b.name,
                COALESCE(b.name_en, b.name) AS name_en,
                b.description,
                b.properties,
                COALESCE(
                    json_agg('https://files.yiswim.cloud/' || i.unique_image_id) FILTER (WHERE i.unique_image_id IS NOT NULL), 
                    '[]'
                ) as image_urls
            FROM custom_accessory_packaging b
            LEFT JOIN images i ON b.id::text = i.notion_page_id
            WHERE b.is_active = true
            GROUP BY b.id
            ORDER BY b.orders ASC NULLS LAST, b.name ASC;
        `;

        const checklistQuery = `
            SELECT 
                id, 
                content,
                COALESCE(content_en, content) AS content_en
            FROM custom_oem_checklist 
            WHERE is_active = true 
            ORDER BY orders ASC NULLS LAST;
        `;

        const [stylesResult, fabricsResult, bagsResult, checklistResult] = await Promise.all([
            db.query(stylesQuery),
            db.query(fabricsQuery),
            db.query(bagsQuery),
            db.query(checklistQuery)
        ]);

        const formattedFabrics = fabricsResult.rows.map(fabric => {
            const props = fabric.properties || {};
            return { ...fabric, ...props, properties: undefined };
        });

        const formattedBags = bagsResult.rows.map(bag => {
            const props = bag.properties || {};
            return { ...bag, ...props, properties: undefined };
        });

        res.json({
            success: true,
            data: {
                odm_styles: stylesResult.rows,
                fabrics: formattedFabrics,
                bags: formattedBags,
                oem_checklists: checklistResult.rows
            }
        });

    } catch (error) {
        console.error('获取业务数据失败:', error.message);
        res.status(500).json({ success: false, message: req.t('api.dbError') });
    }
});

// 2. 注册逻辑
router.post('/register', registerLimiter, async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!password || password.length < 8) {
            return res.status(400).json({ 
                success: false, 
                message: req.t('api.registerPasswordShort') 
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
        res.status(500).json({ success: false, message: req.t('api.backendError') });
    }
});

// 3. 登录逻辑 (直连 PostgreSQL)
router.post('/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ success: false, message: req.t('api.loginRequired') });
        }

        const loginQuery = `SELECT * FROM custom_users WHERE username = $1 OR email = $2`;
        const result = await db.query(loginQuery, [username, username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, message: req.t('api.loginFailed') });
        }

        const user = result.rows[0];

        if (user.is_active === false) {
            return res.status(403).json({ success: false, message: req.t('api.activateFirst') });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: req.t('api.loginFailed') });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ success: true, message: req.t('api.loginSuccess') });

    } catch (error) {
        console.error('登录错误:', error.message);
        res.status(500).json({ success: false, message: req.t('api.serverAuthError') });
    }
});

// 4. 忘记密码
router.post('/forgot-password', loginLimiter, async (req, res) => {
    try {
        const n8nResponse = await fetch(`${N8N_BASE_URL}/custom-user-forgot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        
        const data = await n8nResponse.json();
        res.json(data);
        
    } catch (error) {
        res.status(500).json({ success: false, message: req.t('api.backendError') });
    }
});

// 5. 提交新密码逻辑
router.post('/reset-password', loginLimiter, async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ success: false, message: req.t('api.paramMissing') });
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
        res.status(500).json({ success: false, message: req.t('api.backendError') });
    }
});

// 6. 提交询盘
router.post('/submit-inquiry', authenticateToken, upload.any(), async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // 解析 JSON 字段
        const d = req.body;
        // 确保 JSONB 字段传入的是 JSON 字符串（pg 会把 JS 数组转成 PG 数组语法，导致 JSONB 解析失败）
        const safeJSON = (str, fallback) => {
            if (typeof str === 'string' && str.trim()) {
                try { JSON.parse(str); return str; } catch { return JSON.stringify(fallback); }
            }
            return JSON.stringify(fallback);
        };

        // 生成询盘编号
        const seqResult = await client.query('SELECT generate_inquiry_no() AS no');
        const inquiryNo = seqResult.rows[0].no;

        // 插入主表
        const insertSQL = `
            INSERT INTO custom_inquiries (
                inquiry_no, user_id,
                odm_styles, odm_custom_data, oem_project, oem_style_count, oem_descriptions, oem_checklist, oem_remark,
                fabric_selection,
                cmt_enabled, metal_config, pad_config, bag_config, hangtag_config, label_config, hygiene_config, other_config,
                delivery_mode, sample_rows, sample_config, sample_dest, bulk_rows, bulk_logistics, bulk_dest, bulk_target_price, bulk_packing_remark,
                contact_name, contact_info, brand_name, website, final_remark,
                assign_sales, assign_pattern, assign_sewing,
                nda_agreed_at
            ) VALUES (
                $1, $2,
                $3, $4, $5, $6, $7, $8, $9,
                $10,
                $11, $12, $13, $14, $15, $16, $17, $18,
                $19, $20, $21, $22, $23, $24, $25, $26, $27,
                $28, $29, $30, $31, $32,
                $33, $34, $35,
                $36
            ) RETURNING id`;

        const values = [
            inquiryNo, req.user.id,
            // Step 1
            safeJSON(d.odm_styles, []),
            safeJSON(d.odm_custom_data, {}),
            d.oem_project || null,
            parseInt(d.oem_style_count) || 0,
            safeJSON(d.oem_descriptions, []),
            safeJSON(d.oem_checklist, []),
            d.oem_remark || null,
            // Step 2
            safeJSON(d.fabric_selection, {}),
            // Step 3
            safeJSON(d.cmt_enabled, {}),
            safeJSON(d.metal_config, {}),
            safeJSON(d.pad_config, {}),
            safeJSON(d.bag_config, {}),
            safeJSON(d.hangtag_config, {}),
            safeJSON(d.label_config, {}),
            safeJSON(d.hygiene_config, {}),
            safeJSON(d.other_config, {}),
            // Step 4
            d.delivery_mode || 'sample',
            safeJSON(d.sample_rows, []),
            safeJSON(d.sample_config, {}),
            d.sample_dest || null,
            safeJSON(d.bulk_rows, []),
            safeJSON(d.bulk_logistics, {}),
            d.bulk_dest || null,
            d.bulk_target_price || null,
            d.bulk_packing_remark || null,
            // Step 5
            d.contact_name,
            d.contact_info,
            d.brand_name,
            d.website || null,
            d.final_remark || null,
            // 分派
            d.assign_sales || null,
            d.assign_pattern || null,
            d.assign_sewing || null,
            // NDA
            d.nda_agreed ? new Date() : null
        ];

        const insertResult = await client.query(insertSQL, values);
        const inquiryId = insertResult.rows[0].id;

        // 处理上传的文件 — fieldname 格式: "files[category][sub_key]"
        if (req.files && req.files.length > 0) {
            const fileInsertSQL = `
                INSERT INTO custom_inquiry_files (inquiry_id, category, sub_key, orig_name, stored_name, mime_type, size_bytes)
                VALUES ($1, $2, $3, $4, $5, $6, $7)`;
            
            for (const file of req.files) {
                // 解析 fieldname: "files[oem][tech]" or "files[odmCustom][Style Name]"
                const match = file.fieldname.match(/^files\[([^\]]+)\](?:\[([^\]]*)\])?$/);
                const category = match ? match[1] : 'unknown';
                const subKey = match ? (match[2] || '') : '';

                await client.query(fileInsertSQL, [
                    inquiryId,
                    category,
                    subKey,
                    file.originalname,
                    file.filename,
                    file.mimetype,
                    file.size
                ]);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, inquiry_no: inquiryNo });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('提交询盘失败:', error);
        res.status(500).json({ success: false, message: req.t ? req.t('api.backendError') : '服务器错误' });
    } finally {
        client.release();
    }
});

// 7. 获取当前用户的询盘列表
router.get('/my-inquiries', authenticateToken, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = 10;
        const offset = (page - 1) * limit;

        const countResult = await db.query(
            'SELECT COUNT(*) FROM custom_inquiries WHERE user_id = $1',
            [req.user.id]
        );
        const total = parseInt(countResult.rows[0].count);

        const listResult = await db.query(`
            SELECT id, inquiry_no, status, delivery_mode,
                   odm_styles, oem_project, oem_style_count,
                   contact_name, brand_name,
                   created_at, modified_at
            FROM custom_inquiries 
            WHERE user_id = $1 
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3`,
            [req.user.id, limit, offset]
        );

        res.json({
            success: true,
            data: listResult.rows,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('获取询盘列表失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 8. 获取单条询盘详情
router.get('/inquiry/:id', authenticateToken, async (req, res) => {
    try {
        const inquiryResult = await db.query(
            'SELECT * FROM custom_inquiries WHERE id = $1 AND user_id = $2',
            [req.params.id, req.user.id]
        );
        if (inquiryResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: '询盘不存在' });
        }

        const filesResult = await db.query(
            'SELECT id, category, sub_key, orig_name, stored_name, mime_type, size_bytes, created_at FROM custom_inquiry_files WHERE inquiry_id = $1 ORDER BY category, sub_key',
            [req.params.id]
        );

        // 查询 ODM 款式图片
        const inquiry = inquiryResult.rows[0];
        let odmStyleImages = {};
        try {
            let odmNames = inquiry.odm_styles;
            if (typeof odmNames === 'string') odmNames = JSON.parse(odmNames);
            if (Array.isArray(odmNames) && odmNames.length > 0) {
                const stylesResult = await db.query(`
                    SELECT s.name,
                        COALESCE(
                            json_agg('https://files.yiswim.cloud/' || i.unique_image_id) FILTER (WHERE i.unique_image_id IS NOT NULL),
                            '[]'
                        ) as image_urls
                    FROM custom_odm_styles s
                    LEFT JOIN images i ON s.id = i.notion_page_id
                    WHERE s.name = ANY($1)
                    GROUP BY s.id`, [odmNames]);
                stylesResult.rows.forEach(r => { odmStyleImages[r.name] = r.image_urls; });
            }
        } catch (e) { /* ignore parse errors */ }

        res.json({
            success: true,
            data: { ...inquiry, files: filesResult.rows, odm_style_images: odmStyleImages }
        });
    } catch (error) {
        console.error('获取询盘详情失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 9. 修改密码
router.post('/change-password', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: '请填写完整' });
        }
        if (newPassword.length < 8) {
            return res.status(400).json({ success: false, message: '新密码至少8位' });
        }

        const userResult = await db.query(
            'SELECT password_hash FROM custom_users WHERE id = $1',
            [req.user.id]
        );
        if (userResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: '用户不存在' });
        }

        const valid = await bcrypt.compare(currentPassword, userResult.rows[0].password_hash);
        if (!valid) {
            return res.status(401).json({ success: false, message: '当前密码错误' });
        }

        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(newPassword, salt);
        await db.query(
            'UPDATE custom_users SET password_hash = $1 WHERE id = $2',
            [hash, req.user.id]
        );

        res.json({ success: true, message: '密码修改成功' });
    } catch (error) {
        console.error('修改密码失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

module.exports = router;
