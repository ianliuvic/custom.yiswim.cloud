const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const db = require('../config/db');
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
        res.status(500).json({ success: false, message: '服务器错误' });
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
        res.status(500).json({ success: false, message: '服务器错误' });
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
        res.status(500).json({ success: false, message: '服务器错误' });
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
        res.status(500).json({ success: false, message: '服务器错误' });
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
        res.status(500).json({ success: false, message: '服务器错误' });
    } finally {
        client.release();
    }
});

module.exports = router;
