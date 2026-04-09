const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const db = require('../config/db');
const { JWT_SECRET, N8N_BASE_URL } = require('../config/constants');
const authenticateToken = require('../middleware/auth');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiters');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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

// === 共享辅助函数 (询盘 & 草稿) ===
const safeJSON = (str, fallback) => {
    if (typeof str === 'string' && str.trim()) {
        try { JSON.parse(str); return str; } catch { return JSON.stringify(fallback); }
    }
    return JSON.stringify(fallback);
};

function parseInquiryFields(d) {
    return [
        safeJSON(d.odm_styles, []),
        safeJSON(d.odm_custom_data, {}),
        d.oem_project || null,
        d.oem_project_desc || null,
        parseInt(d.oem_style_count) || 0,
        safeJSON(d.oem_descriptions, []),
        safeJSON(d.oem_checklist, []),
        d.oem_remark || null,
        d.oem_physical_sample === '1',
        d.oem_tracking_no || null,
        safeJSON(d.fabric_selection, {}),
        safeJSON(d.cmt_enabled, {}),
        safeJSON(d.metal_config, {}),
        safeJSON(d.pad_config, {}),
        safeJSON(d.bag_config, {}),
        safeJSON(d.hangtag_config, {}),
        safeJSON(d.label_config, {}),
        safeJSON(d.hygiene_config, {}),
        safeJSON(d.other_config, {}),
        d.delivery_mode || 'sample',
        safeJSON(d.sample_rows, []),
        safeJSON(d.sample_config, {}),
        d.sample_dest || null,
        safeJSON(d.bulk_rows, []),
        safeJSON(d.bulk_logistics, {}),
        d.bulk_dest || null,
        d.bulk_target_price || null,
        d.bulk_packing_remark || null,
        d.contact_name || null,
        d.contact_info || null,
        d.brand_name || null,
        d.website || null,
        d.final_remark || null,
        d.assign_sales || null,
        d.assign_pattern || null,
        d.assign_sewing || null,
        d.nda_agreed ? new Date() : null,
        d.oem_size_remark || null
    ];
}

const INQUIRY_COLUMNS = `odm_styles, odm_custom_data, oem_project, oem_project_desc, oem_style_count, oem_descriptions, oem_checklist, oem_remark, oem_physical_sample, oem_tracking_no,
    fabric_selection,
    cmt_enabled, metal_config, pad_config, bag_config, hangtag_config, label_config, hygiene_config, other_config,
    delivery_mode, sample_rows, sample_config, sample_dest, bulk_rows, bulk_logistics, bulk_dest, bulk_target_price, bulk_packing_remark,
    contact_name, contact_info, brand_name, website, final_remark,
    assign_sales, assign_pattern, assign_sewing,
    nda_agreed_at, oem_size_remark`;

const INQUIRY_UPDATE_SET = `odm_styles=$1, odm_custom_data=$2, oem_project=$3, oem_project_desc=$4, oem_style_count=$5,
    oem_descriptions=$6, oem_checklist=$7, oem_remark=$8, oem_physical_sample=$9, oem_tracking_no=$10,
    fabric_selection=$11,
    cmt_enabled=$12, metal_config=$13, pad_config=$14, bag_config=$15, hangtag_config=$16, label_config=$17, hygiene_config=$18, other_config=$19,
    delivery_mode=$20, sample_rows=$21, sample_config=$22, sample_dest=$23,
    bulk_rows=$24, bulk_logistics=$25, bulk_dest=$26, bulk_target_price=$27, bulk_packing_remark=$28,
    contact_name=$29, contact_info=$30, brand_name=$31, website=$32, final_remark=$33,
    assign_sales=$34, assign_pattern=$35, assign_sewing=$36,
    nda_agreed_at=$37, oem_size_remark=$38`;

async function handleUploadedFiles(client, inquiryId, files) {
    if (!files || files.length === 0) return;
    const sql = `INSERT INTO custom_inquiry_files (inquiry_id, category, sub_key, orig_name, stored_name, mime_type, size_bytes) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    for (const file of files) {
        const origName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const fieldname = Buffer.from(file.fieldname, 'latin1').toString('utf8');
        const match = fieldname.match(/^files\[([^\]]+)\](?:\[([^\]]*)\])?$/);
        const category = match ? match[1] : 'unknown';
        const subKey = match ? (match[2] || '') : '';
        await client.query(sql, [inquiryId, category, subKey, origName, file.filename, file.mimetype, file.size]);
    }
}

async function handleRemoteFiles(client, inquiryId, userId, remoteJson, allowedNames) {
    if (!remoteJson) return;
    try {
        const remoteArr = JSON.parse(remoteJson);
        if (!Array.isArray(remoteArr) || remoteArr.length === 0) return;
        const uuidPat = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.\w+$/i;
        const sql = `INSERT INTO custom_inquiry_files (inquiry_id, category, sub_key, orig_name, stored_name, mime_type, size_bytes) VALUES ($1, $2, $3, $4, $5, $6, $7)`;
        for (const rf of remoteArr) {
            if (!rf.stored_name || !uuidPat.test(rf.stored_name)) continue;
            if (!allowedNames || !allowedNames.includes(rf.stored_name)) {
                const check = await client.query(
                    `SELECT 1 FROM custom_inquiry_files cif JOIN custom_inquiries ci ON ci.id = cif.inquiry_id WHERE cif.stored_name = $1 AND ci.user_id = $2 LIMIT 1`,
                    [rf.stored_name, userId]
                );
                if (check.rows.length === 0) continue;
            }
            await client.query(sql, [inquiryId, rf.category || 'unknown', rf.sub_key || '', rf.orig_name || 'unknown', rf.stored_name, rf.mime_type || 'application/octet-stream', rf.size_bytes || 0]);
        }
    } catch (e) { console.error('Failed to process remote files:', e); }
}

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

        // 查询用户最近一次询盘的联系信息，用于自动填充 Step 5
        const lastContactQuery = `
            SELECT contact_name, contact_info, brand_name, website, nda_agreed_at
            FROM custom_inquiries
            WHERE user_id = $1 AND deleted_at IS NULL
            ORDER BY created_at DESC LIMIT 1
        `;

        const [stylesResult, fabricsResult, bagsResult, checklistResult, lastContactResult] = await Promise.all([
            db.query(stylesQuery),
            db.query(fabricsQuery),
            db.query(bagsQuery),
            db.query(checklistQuery),
            db.query(lastContactQuery, [req.user.id])
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
                oem_checklists: checklistResult.rows,
                last_contact: lastContactResult.rows.length ? lastContactResult.rows[0] : null
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

        // Translate known N8N Chinese messages based on user's language
        if (data.message) {
            if (data.message.includes('已被注册')) {
                data.message = req.t('api.registerDuplicate');
            } else if (data.success && data.message.includes('注册成功')) {
                data.message = req.t('api.registerSuccess');
            }
        }

        res.json(data);
    } catch (error) {
        console.error('注册错误:', error);
        res.status(500).json({ success: false, message: req.t('api.backendError') });
    }
});

// Google 登录/注册二合一逻辑
router.post('/google-auth', async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ success: false, message: 'Missing token' });

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const googleId = payload['sub'];
        const email = payload['email'];
        const name = payload['name'];

        let result = await db.query('SELECT * FROM custom_users WHERE google_id = $1 OR email = $2', [googleId, email]);
        let user = result.rows[0];

        if (user) {
            if (!user.google_id) {
                await db.query('UPDATE custom_users SET google_id = $1 WHERE id = $2', [googleId, user.id]);
            }
        } else {
            const insertRes = await db.query(
                `INSERT INTO custom_users (username, email, google_id, is_active) 
                 VALUES ($1, $2, $3, true) RETURNING *`,
                [name || email.split('@')[0], email, googleId]
            );
            user = insertRes.rows[0];
        }

        if (user.is_active === false) {
            return res.status(403).json({ success: false, message: req.t('api.activateFirst') });
        }

        const authToken = jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: user.role || 'user' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.cookie('auth_token', authToken, {
            httpOnly: true,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000 
        });

        res.json({ success: true });

    } catch (err) {
        console.error('Google Auth Error:', err);
        res.status(401).json({ success: false, message: req.t ? req.t('api.loginFailed') : 'Google verification failed' });
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

        if (!user.password_hash) {
            return res.status(401).json({ success: false, message: req.t('api.loginFailed') });
        }

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) {
            return res.status(401).json({ success: false, message: req.t('api.loginFailed') });
        }

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: user.role || 'user' },
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

        const d = req.body;
        const fieldValues = parseInquiryFields(d);

        let inquiryId, inquiryNo;
        let oldStoredNames = [];

        // 检查是否从草稿提交
        if (d.draft_id) {
            const dc = await client.query(
                'SELECT id, inquiry_no FROM custom_inquiries WHERE id = $1 AND user_id = $2 AND status = $3 AND deleted_at IS NULL',
                [parseInt(d.draft_id), req.user.id, 'draft']
            );
            if (dc.rows.length > 0) {
                inquiryId = dc.rows[0].id;
                inquiryNo = dc.rows[0].inquiry_no;
                const oldFiles = await client.query('SELECT stored_name FROM custom_inquiry_files WHERE inquiry_id = $1', [inquiryId]);
                oldStoredNames = oldFiles.rows.map(r => r.stored_name);
                await client.query('DELETE FROM custom_inquiry_files WHERE inquiry_id = $1', [inquiryId]);
                await client.query(
                    `UPDATE custom_inquiries SET status = 'pending', ${INQUIRY_UPDATE_SET}, modified_at = NOW() WHERE id = $39`,
                    [...fieldValues, inquiryId]
                );
            }
        }

        // 检查是否编辑已有询盘
        if (!inquiryId && d.edit_inquiry_id) {
            const ec = await client.query(
                'SELECT id, inquiry_no FROM custom_inquiries WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
                [parseInt(d.edit_inquiry_id), req.user.id]
            );
            if (ec.rows.length > 0) {
                inquiryId = ec.rows[0].id;
                inquiryNo = ec.rows[0].inquiry_no;
                const oldFiles = await client.query('SELECT stored_name FROM custom_inquiry_files WHERE inquiry_id = $1', [inquiryId]);
                oldStoredNames = oldFiles.rows.map(r => r.stored_name);
                await client.query('DELETE FROM custom_inquiry_files WHERE inquiry_id = $1', [inquiryId]);
                await client.query(
                    `UPDATE custom_inquiries SET status = 'pending', ${INQUIRY_UPDATE_SET}, modified_at = NOW() WHERE id = $39`,
                    [...fieldValues, inquiryId]
                );
            }
        }

        if (!inquiryId) {
            // 生成询盘编号 & 插入新询盘
            const seqResult = await client.query('SELECT generate_inquiry_no() AS no');
            inquiryNo = seqResult.rows[0].no;
            const insertResult = await client.query(`
                INSERT INTO custom_inquiries (
                    inquiry_no, user_id, ${INQUIRY_COLUMNS}
                ) VALUES (
                    $1, $2,
                    $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                    $13,
                    $14, $15, $16, $17, $18, $19, $20, $21,
                    $22, $23, $24, $25, $26, $27, $28, $29, $30,
                    $31, $32, $33, $34, $35,
                    $36, $37, $38,
                    $39, $40
                ) RETURNING id`, [inquiryNo, req.user.id, ...fieldValues]);
            inquiryId = insertResult.rows[0].id;
        }

        // 处理文件
        await handleUploadedFiles(client, inquiryId, req.files);
        await handleRemoteFiles(client, inquiryId, req.user.id, d.remote_files, oldStoredNames);

        await client.query('COMMIT');

        // 异步通知 n8n（不阻塞响应）
        fetch(`${N8N_BASE_URL}/get_new_inquiry`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                inquiry_id: inquiryId,
                inquiry_no: inquiryNo,
                user_id: req.user.id,
                contact_name: d.contact_name,
                brand_name: d.brand_name,
                delivery_mode: d.delivery_mode,
                submitted_at: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
            })
        }).catch(err => console.error('n8n webhook 通知失败:', err));

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
            "SELECT COUNT(*) FROM custom_inquiries WHERE user_id = $1 AND deleted_at IS NULL AND status != 'draft'",
            [req.user.id]
        );
        const total = parseInt(countResult.rows[0].count);

        const listResult = await db.query(`
            SELECT id, inquiry_no, status, delivery_mode,
                   odm_styles, oem_project, oem_style_count,
                   contact_name, brand_name,
                   created_at, modified_at
            FROM custom_inquiries 
            WHERE user_id = $1 AND deleted_at IS NULL AND status != 'draft'
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
            'SELECT * FROM custom_inquiries WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
            [req.params.id, req.user.id]
        );
        if (inquiryResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: '询盘不存在' });
        }

        const filesResult = await db.query(
            'SELECT id, category, sub_key, orig_name, stored_name, mime_type, size_bytes, created_at FROM custom_inquiry_files WHERE inquiry_id = $1 ORDER BY category, sub_key',
            [req.params.id]
        );

        // 修复旧数据：regex 曾无法匹配含 - 等字符的款式名，导致 odmCustom 文件存为 unknown
        const inquiry = inquiryResult.rows[0];
        const unknownFiles = filesResult.rows.filter(f => f.category === 'unknown' && (!f.sub_key || f.sub_key === ''));
        if (unknownFiles.length > 0) {
            try {
                let customData = inquiry.odm_custom_data;
                if (typeof customData === 'string') customData = JSON.parse(customData);
                if (customData && typeof customData === 'object') {
                    const styleNames = Object.keys(customData);
                    if (styleNames.length === 1) {
                        // 单款式：所有 unknown 文件归入该款式
                        const ids = unknownFiles.map(f => f.id);
                        await db.query(
                            'UPDATE custom_inquiry_files SET category = $1, sub_key = $2 WHERE id = ANY($3)',
                            ['odmCustom', styleNames[0], ids]
                        );
                        unknownFiles.forEach(f => { f.category = 'odmCustom'; f.sub_key = styleNames[0]; });
                    } else if (styleNames.length > 1) {
                        // 多款式：根据文件创建顺序平均分配（最佳努力）
                        const ids = unknownFiles.map(f => f.id);
                        for (const fid of ids) {
                            // 暂时全部归入第一个有 remark 的款式
                            const target = styleNames.find(n => customData[n] && customData[n].remark) || styleNames[0];
                            await db.query(
                                'UPDATE custom_inquiry_files SET category = $1, sub_key = $2 WHERE id = $3',
                                ['odmCustom', target, fid]
                            );
                            const ff = unknownFiles.find(f => f.id === fid);
                            if (ff) { ff.category = 'odmCustom'; ff.sub_key = target; }
                        }
                    }
                }
            } catch (e) { /* ignore migration errors */ }
        }

        // 查询 ODM 款式图片
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

// 8b. 导出询盘PDF
router.get('/inquiry/:id/pdf', authenticateToken, async (req, res) => {
    try {
        const { generateInquiryPDF } = require('../utils/pdfExport');
        const inquiryResult = await db.query(
            'SELECT * FROM custom_inquiries WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
            [req.params.id, req.user.id]
        );
        if (inquiryResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: '询盘不存在' });
        }
        const inquiry = inquiryResult.rows[0];

        const filesResult = await db.query(
            'SELECT id, category, sub_key, orig_name, stored_name, mime_type, size_bytes, created_at FROM custom_inquiry_files WHERE inquiry_id = $1 ORDER BY category, sub_key',
            [req.params.id]
        );

        // ODM style images
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
        } catch (e) { /* ignore */ }

        const lang = req.cookies && req.cookies.lng || 'en';
        const pdfBuffer = await generateInquiryPDF(inquiry, filesResult.rows, odmStyleImages, lang);
        const filename = 'inquiry_' + (inquiry.inquiry_no || inquiry.id) + '.pdf';

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"');
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);
    } catch (error) {
        console.error('PDF generation failed:', error);
        res.status(500).json({ success: false, message: 'PDF generation failed: ' + error.message });
    }
});

// 8c. 导出询盘 ZIP (PDF + 附件)
router.get('/inquiry/:id/export', authenticateToken, async (req, res) => {
    try {
        const { generateInquiryPDF } = require('../utils/pdfExport');
        const archiver = require('archiver');
        const https = require('https');
        const http = require('http');

        const inquiryResult = await db.query(
            'SELECT * FROM custom_inquiries WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
            [req.params.id, req.user.id]
        );
        if (inquiryResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: '询盘不存在' });
        }
        const inquiry = inquiryResult.rows[0];

        const filesResult = await db.query(
            'SELECT id, category, sub_key, orig_name, stored_name, mime_type, size_bytes, created_at FROM custom_inquiry_files WHERE inquiry_id = $1 ORDER BY category, sub_key',
            [req.params.id]
        );

        // ODM style images
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
        } catch (e) { /* ignore */ }

        const lang = req.cookies && req.cookies.lng || 'en';
        const pdfBuffer = await generateInquiryPDF(inquiry, filesResult.rows, odmStyleImages, lang);

        const inquiryNo = inquiry.inquiry_no || String(inquiry.id);
        const zipFilename = inquiryNo + '.zip';

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="' + zipFilename + '"');

        const archive = archiver('zip', { zlib: { level: 5 } });
        archive.on('error', (err) => { if (!res.headersSent) res.status(500).end(); });
        archive.pipe(res);

        // 1. PDF 询盘单
        archive.append(pdfBuffer, { name: inquiryNo + '.pdf' });

        // 2. 附件文件（按 category/sub_key 分文件夹）
        const FILE_BASE = 'https://files.yiswim.cloud/uploads/inquiries/';
        const usedNames = new Set();

        function fetchFileStream(url) {
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('timeout')), 15000);
                const proto = url.startsWith('https') ? https : http;
                const doRequest = (reqUrl) => {
                    proto.get(reqUrl, (resp) => {
                        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
                            doRequest(resp.headers.location);
                            return;
                        }
                        if (resp.statusCode !== 200) { clearTimeout(timer); reject(new Error('HTTP ' + resp.statusCode)); return; }
                        clearTimeout(timer);
                        resolve(resp);
                    }).on('error', (e) => { clearTimeout(timer); reject(e); });
                };
                doRequest(url);
            });
        }

        for (const f of filesResult.rows) {
            const url = FILE_BASE + encodeURIComponent(f.stored_name);
            let folder = f.category || 'other';
            if (f.sub_key) folder += '/' + f.sub_key;

            let name = f.orig_name || f.stored_name;
            const fullPath = folder + '/' + name;
            if (usedNames.has(fullPath)) {
                const dotIdx = name.lastIndexOf('.');
                const ext = dotIdx > 0 ? name.substring(dotIdx) : '';
                const base = ext ? name.substring(0, dotIdx) : name;
                name = base + '_' + f.id + ext;
            }
            usedNames.add(folder + '/' + name);

            try {
                const stream = await fetchFileStream(url);
                archive.append(stream, { name: folder + '/' + name });
            } catch (e) {
                console.warn('ZIP: failed to fetch', f.stored_name, e.message);
            }
        }

        await archive.finalize();
    } catch (error) {
        console.error('Export ZIP failed:', error);
        if (!res.headersSent) {
            res.status(500).json({ success: false, message: 'Export failed: ' + error.message });
        }
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

// 9.5 修改用户名
router.post('/change-username', authenticateToken, async (req, res) => {
    try {
        const { newUsername } = req.body;
        if (!newUsername || !newUsername.trim()) {
            return res.status(400).json({ success: false, message: '用户名不能为空' });
        }
        const username = newUsername.trim();
        if (username.length < 2 || username.length > 30) {
            return res.status(400).json({ success: false, message: '用户名长度需在2-30字符之间' });
        }

        // 检查用户名是否已被占用
        const existing = await db.query(
            'SELECT id FROM custom_users WHERE username = $1 AND id != $2',
            [username, req.user.id]
        );
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, message: '该用户名已被使用' });
        }

        await db.query(
            'UPDATE custom_users SET username = $1 WHERE id = $2',
            [username, req.user.id]
        );

        // 重新签发 JWT
        const token = jwt.sign(
            { id: req.user.id, username: username, email: req.user.email, role: req.user.role || 'user' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.cookie('auth_token', token, {
            httpOnly: true,
            secure: false,
            maxAge: 24 * 60 * 60 * 1000
        });

        res.json({ success: true, username: username });
    } catch (error) {
        console.error('修改用户名失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 10. 软删除询盘
router.delete('/inquiry/:id', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE custom_inquiries SET deleted_at = NOW() WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING id',
            [req.params.id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: '询盘不存在' });
        }
        res.json({ success: true, message: '删除成功' });
    } catch (error) {
        console.error('删除询盘失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

// 11. 暂存草稿 (Scheme C: 草稿作为 status='draft' 的询盘)
router.get('/draft', authenticateToken, async (req, res) => {
    try {
        const inquiryResult = await db.query(
            "SELECT * FROM custom_inquiries WHERE user_id = $1 AND status = 'draft' AND deleted_at IS NULL ORDER BY modified_at DESC NULLS LAST LIMIT 1",
            [req.user.id]
        );
        if (inquiryResult.rows.length === 0) {
            return res.json({ success: true, data: null });
        }
        const inquiry = inquiryResult.rows[0];
        const filesResult = await db.query(
            'SELECT id, category, sub_key, orig_name, stored_name, mime_type, size_bytes, created_at FROM custom_inquiry_files WHERE inquiry_id = $1 ORDER BY category, sub_key',
            [inquiry.id]
        );
        res.json({
            success: true,
            data: { ...inquiry, files: filesResult.rows },
            updated_at: inquiry.modified_at || inquiry.created_at
        });
    } catch (error) {
        console.error('获取草稿失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

router.post('/save-draft', authenticateToken, upload.any(), async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const d = req.body;
        const fieldValues = parseInquiryFields(d);

        // 查找现有草稿
        const existing = await client.query(
            "SELECT id FROM custom_inquiries WHERE user_id = $1 AND status = 'draft' AND deleted_at IS NULL",
            [req.user.id]
        );

        let inquiryId;
        let oldStoredNames = [];

        if (existing.rows.length > 0) {
            // 更新现有草稿
            inquiryId = existing.rows[0].id;
            const oldFiles = await client.query('SELECT stored_name FROM custom_inquiry_files WHERE inquiry_id = $1', [inquiryId]);
            oldStoredNames = oldFiles.rows.map(r => r.stored_name);
            await client.query('DELETE FROM custom_inquiry_files WHERE inquiry_id = $1', [inquiryId]);
            await client.query(
                `UPDATE custom_inquiries SET ${INQUIRY_UPDATE_SET}, modified_at = NOW() WHERE id = $39`,
                [...fieldValues, inquiryId]
            );
        } else {
            // 新建草稿询盘
            const seqResult = await client.query('SELECT generate_inquiry_no() AS no');
            const inquiryNo = seqResult.rows[0].no;
            const insertResult = await client.query(`
                INSERT INTO custom_inquiries (
                    inquiry_no, user_id, status, ${INQUIRY_COLUMNS}
                ) VALUES (
                    $1, $2, 'draft',
                    $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
                    $13,
                    $14, $15, $16, $17, $18, $19, $20, $21,
                    $22, $23, $24, $25, $26, $27, $28, $29, $30,
                    $31, $32, $33, $34, $35,
                    $36, $37, $38,
                    $39, $40
                ) RETURNING id`, [inquiryNo, req.user.id, ...fieldValues]);
            inquiryId = insertResult.rows[0].id;
        }

        // 处理文件
        await handleUploadedFiles(client, inquiryId, req.files);
        await handleRemoteFiles(client, inquiryId, req.user.id, d.remote_files, oldStoredNames);

        await client.query('COMMIT');
        res.json({ success: true, draft_id: inquiryId });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('保存草稿失败:', error);
        res.status(500).json({ success: false, message: req.t ? req.t('api.backendError') : '服务器错误' });
    } finally {
        client.release();
    }
});

router.delete('/draft', authenticateToken, async (req, res) => {
    try {
        const result = await db.query(
            "UPDATE custom_inquiries SET deleted_at = NOW() WHERE user_id = $1 AND status = 'draft' AND deleted_at IS NULL RETURNING id",
            [req.user.id]
        );
        res.json({ success: true, message: '草稿已删除' });
    } catch (error) {
        console.error('删除草稿失败:', error);
        res.status(500).json({ success: false, message: '服务器错误' });
    }
});

module.exports = router;
