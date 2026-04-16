const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
const { N8N_BASE_URL } = require('../config/constants');
const authenticateAdmin = require('../middleware/adminAuth');

const UPLOAD_BASE = process.env.UPLOAD_PATH || path.join(__dirname, '..', 'uploads');

// 管理员页面
router.get('/', authenticateAdmin, (req, res) => {
    res.render('admin', { title: '管理后台', user: req.user });
});

// 获取询盘列表 (支持筛选: all / active / deleted)
router.get('/api/inquiries', authenticateAdmin, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        const filter = req.query.filter || 'all'; // all / active / deleted
        const search = req.query.search || '';

        let whereClause = '';
        if (filter === 'active') whereClause = 'AND i.deleted_at IS NULL';
        else if (filter === 'deleted') whereClause = 'AND i.deleted_at IS NOT NULL';

        let searchClause = '';
        const params = [];
        let paramIdx = 1;

        if (search.trim()) {
            searchClause = `AND (i.inquiry_no ILIKE $${paramIdx} OR u.username ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`;
            params.push(`%${search.trim()}%`);
            paramIdx++;
        }

        const countResult = await db.query(
            `SELECT COUNT(*) FROM custom_inquiries i
             JOIN custom_users u ON i.user_id = u.id
             WHERE 1=1 ${whereClause} ${searchClause}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        const listResult = await db.query(
            `SELECT i.id, i.inquiry_no, i.created_at, i.deleted_at,
                    u.username, u.email,
                    (SELECT COUNT(*) FROM custom_inquiry_files f WHERE f.inquiry_id = i.id) AS file_count
             FROM custom_inquiries i
             JOIN custom_users u ON i.user_id = u.id
             WHERE 1=1 ${whereClause} ${searchClause}
             ORDER BY i.created_at DESC
             LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
            [...params, limit, offset]
        );

        res.json({
            success: true,
            data: listResult.rows,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('管理员获取询盘列表失败:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 恢复软删除的询盘
router.post('/api/inquiry/:id/restore', authenticateAdmin, async (req, res) => {
    try {
        const result = await db.query(
            'UPDATE custom_inquiries SET deleted_at = NULL WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id, inquiry_no',
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: '询盘不存在或未被删除' });
        }
        res.json({ success: true, message: '恢复成功', data: result.rows[0] });
    } catch (error) {
        console.error('恢复询盘失败:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 硬删除询盘 (彻底删除: 磁盘文件 + 数据库记录)
router.delete('/api/inquiry/:id', authenticateAdmin, async (req, res) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // 1. 查询关联文件
        const filesResult = await client.query(
            'SELECT stored_name FROM custom_inquiry_files WHERE inquiry_id = $1',
            [req.params.id]
        );

        // 2. 删除数据库记录
        await client.query('DELETE FROM custom_inquiry_files WHERE inquiry_id = $1', [req.params.id]);
        const delResult = await client.query('DELETE FROM custom_inquiries WHERE id = $1 RETURNING id, inquiry_no', [req.params.id]);

        if (delResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: '询盘不存在' });
        }

        await client.query('COMMIT');

        // 3. 删除磁盘文件 (事务提交后再删，避免回滚后文件已丢)
        const uploadDir = path.join(UPLOAD_BASE, 'inquiries');
        let deletedFiles = 0;
        for (const file of filesResult.rows) {
            const filePath = path.join(uploadDir, file.stored_name);
            try {
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                    deletedFiles++;
                }
            } catch (e) {
                console.error('删除文件失败:', filePath, e.message);
            }
        }

        res.json({
            success: true,
            message: `彻底删除成功，清理了 ${deletedFiles} 个文件`,
            data: delResult.rows[0]
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('硬删除询盘失败:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        client.release();
    }
});

// 批量恢复软删除的询盘
router.post('/api/inquiries/batch-restore', authenticateAdmin, async (req, res) => {
    try {
        const ids = req.body.ids;
        if (!Array.isArray(ids) || !ids.length) {
            return res.status(400).json({ success: false, message: '请选择要恢复的询盘' });
        }
        const result = await db.query(
            'UPDATE custom_inquiries SET deleted_at = NULL WHERE id = ANY($1) AND deleted_at IS NOT NULL RETURNING id',
            [ids]
        );
        res.json({ success: true, message: `成功恢复 ${result.rowCount} 条询盘`, count: result.rowCount });
    } catch (error) {
        console.error('批量恢复失败:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 批量硬删除询盘
router.post('/api/inquiries/batch-delete', authenticateAdmin, async (req, res) => {
    const ids = req.body.ids;
    if (!Array.isArray(ids) || !ids.length) {
        return res.status(400).json({ success: false, message: '请选择要删除的询盘' });
    }
    const client = await db.connect();
    try {
        await client.query('BEGIN');

        // 1. 查询所有关联文件
        const filesResult = await client.query(
            'SELECT stored_name FROM custom_inquiry_files WHERE inquiry_id = ANY($1)', [ids]
        );

        // 2. 删除数据库记录
        await client.query('DELETE FROM custom_inquiry_files WHERE inquiry_id = ANY($1)', [ids]);
        const delResult = await client.query('DELETE FROM custom_inquiries WHERE id = ANY($1) RETURNING id', [ids]);

        await client.query('COMMIT');

        // 3. 删除磁盘文件
        const uploadDir = path.join(UPLOAD_BASE, 'inquiries');
        let deletedFiles = 0;
        for (const file of filesResult.rows) {
            const filePath = path.join(uploadDir, file.stored_name);
            try {
                if (fs.existsSync(filePath)) { fs.unlinkSync(filePath); deletedFiles++; }
            } catch (e) { console.error('删除文件失败:', filePath, e.message); }
        }

        res.json({
            success: true,
            message: `彻底删除 ${delResult.rowCount} 条询盘，清理 ${deletedFiles} 个文件`,
            count: delResult.rowCount
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('批量硬删除失败:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    } finally {
        client.release();
    }
});

// 获取询盘详情 (管理员 — 不限制 user_id)
router.get('/api/inquiry/:id', authenticateAdmin, async (req, res) => {
    try {
        const inquiryResult = await db.query(
            'SELECT i.*, u.username, u.email FROM custom_inquiries i JOIN custom_users u ON i.user_id = u.id WHERE i.id = $1',
            [req.params.id]
        );
        if (inquiryResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: '询盘不存在' });
        }

        const filesResult = await db.query(
            'SELECT id, category, sub_key, orig_name, stored_name, mime_type, size_bytes, created_at FROM custom_inquiry_files WHERE inquiry_id = $1 ORDER BY category, sub_key',
            [req.params.id]
        );

        const inquiry = inquiryResult.rows[0];

        // ODM 款式图片
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

        res.json({
            success: true,
            data: { ...inquiry, files: filesResult.rows, odm_style_images: odmStyleImages }
        });
    } catch (error) {
        console.error('管理员获取询盘详情失败:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 更新询盘状态 & 管理员回复信息
router.post('/api/inquiry/:id/update', authenticateAdmin, async (req, res) => {
    try {
        const { status, admin_reply, project_link, project_token } = req.body;
        const allowedStatuses = ['pending', 'processing', 'quoted', 'closed'];
        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: '无效的状态值' });
        }

        const fields = [];
        const values = [];
        let idx = 1;

        if (status) { fields.push(`status = $${idx++}`); values.push(status); }
        // admin_reply 允许空字符串（清空）
        if (admin_reply !== undefined) { fields.push(`admin_reply = $${idx++}`); values.push(admin_reply || null); }
        if (project_link !== undefined) { fields.push(`project_link = $${idx++}`); values.push(project_link || null); }
        if (project_token !== undefined) { fields.push(`project_token = $${idx++}`); values.push(project_token || null); }

        if (!fields.length) {
            return res.status(400).json({ success: false, message: '没有需要更新的字段' });
        }

        // 如果有回复内容，更新回复时间
        if (admin_reply) { fields.push(`admin_replied_at = NOW()`); }

        fields.push(`modified_at = NOW()`);
        values.push(parseInt(req.params.id));

        const result = await db.query(
            `UPDATE custom_inquiries SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, inquiry_no, status`,
            values
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: '询盘不存在' });
        }

        // 当管理员发送了回复内容时，异步通知 n8n 发送邮件提醒
        if (admin_reply) {
            const inquiry = result.rows[0];
            db.query('SELECT u.email, u.username FROM custom_users u JOIN custom_inquiries i ON i.user_id = u.id WHERE i.id = $1', [parseInt(req.params.id)])
                .then(userResult => {
                    if (userResult.rows.length > 0) {
                        const user = userResult.rows[0];
                        fetch(`${N8N_BASE_URL}/admin-reply-notify`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                inquiry_id: inquiry.id,
                                inquiry_no: inquiry.inquiry_no,
                                status: inquiry.status,
                                admin_reply,
                                project_link: project_link || null,
                                project_token: project_token || null,
                                user_email: user.email,
                                user_name: user.username,
                                replied_at: new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
                            })
                        }).catch(err => console.error('n8n admin-reply-notify 通知失败:', err));
                    }
                })
                .catch(err => console.error('查询用户邮箱失败:', err));
        }

        res.json({ success: true, message: '更新成功', data: result.rows[0] });
    } catch (error) {
        console.error('更新询盘失败:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// 导出询盘 PDF (管理员)
router.get('/api/inquiry/:id/pdf', authenticateAdmin, async (req, res) => {
    try {
        const { generateInquiryPDF } = require('../utils/pdfExport');
        const inquiryResult = await db.query('SELECT * FROM custom_inquiries WHERE id = $1', [req.params.id]);
        if (inquiryResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: '询盘不存在' });
        }
        const inquiry = inquiryResult.rows[0];
        const filesResult = await db.query(
            'SELECT id, category, sub_key, orig_name, stored_name, mime_type, size_bytes, created_at FROM custom_inquiry_files WHERE inquiry_id = $1 ORDER BY category, sub_key',
            [req.params.id]
        );

        let odmStyleImages = {};
        try {
            let odmNames = inquiry.odm_styles;
            if (typeof odmNames === 'string') odmNames = JSON.parse(odmNames);
            if (Array.isArray(odmNames) && odmNames.length > 0) {
                const stylesResult = await db.query(`
                    SELECT s.name,
                        COALESCE(json_agg('https://files.yiswim.cloud/' || i.unique_image_id) FILTER (WHERE i.unique_image_id IS NOT NULL), '[]') as image_urls
                    FROM custom_odm_styles s LEFT JOIN images i ON s.id = i.notion_page_id
                    WHERE s.name = ANY($1) GROUP BY s.id`, [odmNames]);
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
        console.error('Admin PDF generation failed:', error);
        res.status(500).json({ success: false, message: 'PDF generation failed: ' + error.message });
    }
});

// 导出询盘 ZIP (管理员)
router.get('/api/inquiry/:id/export', authenticateAdmin, async (req, res) => {
    try {
        const { generateInquiryPDF } = require('../utils/pdfExport');
        const archiver = require('archiver');
        const https = require('https');
        const http = require('http');

        const inquiryResult = await db.query('SELECT * FROM custom_inquiries WHERE id = $1', [req.params.id]);
        if (inquiryResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: '询盘不存在' });
        }
        const inquiry = inquiryResult.rows[0];
        const filesResult = await db.query(
            'SELECT id, category, sub_key, orig_name, stored_name, mime_type, size_bytes, created_at FROM custom_inquiry_files WHERE inquiry_id = $1 ORDER BY category, sub_key',
            [req.params.id]
        );

        let odmStyleImages = {};
        try {
            let odmNames = inquiry.odm_styles;
            if (typeof odmNames === 'string') odmNames = JSON.parse(odmNames);
            if (Array.isArray(odmNames) && odmNames.length > 0) {
                const stylesResult = await db.query(`
                    SELECT s.name,
                        COALESCE(json_agg('https://files.yiswim.cloud/' || i.unique_image_id) FILTER (WHERE i.unique_image_id IS NOT NULL), '[]') as image_urls
                    FROM custom_odm_styles s LEFT JOIN images i ON s.id = i.notion_page_id
                    WHERE s.name = ANY($1) GROUP BY s.id`, [odmNames]);
                stylesResult.rows.forEach(r => { odmStyleImages[r.name] = r.image_urls; });
            }
        } catch (e) { /* ignore */ }

        const lang = req.cookies && req.cookies.lng || 'en';
        const pdfBuffer = await generateInquiryPDF(inquiry, filesResult.rows, odmStyleImages, lang);
        const inquiryNo = inquiry.inquiry_no || String(inquiry.id);

        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', 'attachment; filename="' + inquiryNo + '.zip"');

        const archive = archiver('zip', { zlib: { level: 5 } });
        archive.on('error', () => { if (!res.headersSent) res.status(500).end(); });
        archive.pipe(res);
        archive.append(pdfBuffer, { name: inquiryNo + '.pdf' });

        const FILE_BASE = 'https://files.yiswim.cloud/uploads/inquiries/';
        const usedNames = new Set();

        function fetchFileStream(url) {
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error('timeout')), 15000);
                const proto = url.startsWith('https') ? https : http;
                const doReq = (u) => {
                    proto.get(u, (resp) => {
                        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) { doReq(resp.headers.location); return; }
                        if (resp.statusCode !== 200) { clearTimeout(timer); reject(new Error('HTTP ' + resp.statusCode)); return; }
                        clearTimeout(timer); resolve(resp);
                    }).on('error', (e) => { clearTimeout(timer); reject(e); });
                };
                doReq(url);
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
            } catch (e) { console.warn('ZIP: failed to fetch', f.stored_name, e.message); }
        }

        await archive.finalize();
    } catch (error) {
        console.error('Admin export ZIP failed:', error);
        if (!res.headersSent) res.status(500).json({ success: false, message: 'Export failed: ' + error.message });
    }
});

// ========== Feedback Management ==========

// List feedbacks with pagination and filter
router.get('/api/feedbacks', authenticateAdmin, async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
        const offset = (page - 1) * limit;
        const filter = req.query.filter || 'all'; // all, pending, accepted, rejected, rewarded
        const search = (req.query.search || '').trim();

        let where = '';
        const params = [];
        if (filter !== 'all') {
            params.push(filter);
            where = 'WHERE f.status = $' + params.length;
        }
        if (search) {
            params.push('%' + search + '%');
            const sIdx = params.length;
            const searchClause = `(u.username ILIKE $${sIdx} OR u.email ILIKE $${sIdx} OR f.content ILIKE $${sIdx})`;
            where = where ? where + ' AND ' + searchClause : 'WHERE ' + searchClause;
        }

        const countResult = await db.query(
            `SELECT COUNT(*) FROM custom_user_feedback f LEFT JOIN custom_users u ON f.user_id = u.id ${where}`,
            params
        );
        const total = parseInt(countResult.rows[0].count);

        params.push(limit, offset);
        const dataResult = await db.query(
            `SELECT f.*, u.username, u.email
             FROM custom_user_feedback f
             LEFT JOIN custom_users u ON f.user_id = u.id
             ${where}
             ORDER BY f.created_at DESC
             LIMIT $${params.length - 1} OFFSET $${params.length}`,
            params
        );

        res.json({
            success: true,
            data: dataResult.rows,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        console.error('Admin list feedbacks error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get single feedback detail
router.get('/api/feedback/:id', authenticateAdmin, async (req, res) => {
    try {
        const result = await db.query(
            `SELECT f.*, u.username, u.email
             FROM custom_user_feedback f
             LEFT JOIN custom_users u ON f.user_id = u.id
             WHERE f.id = $1`,
            [req.params.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Feedback not found' });
        }
        res.json({ success: true, data: result.rows[0] });
    } catch (error) {
        console.error('Admin get feedback error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Update feedback (review: accept/reject/reward + coupon + admin note)
router.post('/api/feedback/:id/update', authenticateAdmin, async (req, res) => {
    try {
        const { status, admin_note, coupon_code } = req.body;
        const allowedStatuses = ['pending', 'accepted', 'rejected', 'rewarded'];
        if (status && !allowedStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid status' });
        }

        // Get current feedback to determine coupon_amount
        const current = await db.query('SELECT * FROM custom_user_feedback WHERE id = $1', [req.params.id]);
        if (current.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Feedback not found' });
        }

        const fields = [];
        const values = [];
        let idx = 1;

        if (status) {
            fields.push('status = $' + idx++);
            values.push(status);
        }
        if (admin_note !== undefined) {
            fields.push('admin_note = $' + idx++);
            values.push(admin_note);
        }
        if (coupon_code !== undefined) {
            fields.push('coupon_code = $' + idx++);
            values.push(coupon_code);
        }
        if (status === 'accepted' || status === 'rejected' || status === 'rewarded') {
            fields.push('reviewed_at = $' + idx++);
            values.push(new Date());
        }

        if (fields.length === 0) {
            return res.status(400).json({ success: false, message: 'No fields to update' });
        }

        values.push(req.params.id);
        await db.query(
            `UPDATE custom_user_feedback SET ${fields.join(', ')} WHERE id = $${idx}`,
            values
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Admin update feedback error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
