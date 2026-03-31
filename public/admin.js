/* ── 管理后台 JS ── */
(function () {
    let currentFilter = 'all';
    let currentPage = 1;
    let currentSearch = '';

    // ── 初始化 ──
    document.addEventListener('DOMContentLoaded', () => {
        loadInquiries();
        bindEvents();
    });

    function bindEvents() {
        document.querySelectorAll('.adm-filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelector('.adm-filter-btn.active').classList.remove('active');
                btn.classList.add('active');
                currentFilter = btn.dataset.filter;
                currentPage = 1;
                loadInquiries();
            });
        });

        document.getElementById('searchBtn').addEventListener('click', () => {
            currentSearch = document.getElementById('searchInput').value;
            currentPage = 1;
            loadInquiries();
        });

        document.getElementById('searchInput').addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                currentSearch = e.target.value;
                currentPage = 1;
                loadInquiries();
            }
        });
    }

    // ── 加载列表 ──
    async function loadInquiries() {
        try {
            const params = new URLSearchParams({
                page: currentPage,
                limit: 20,
                filter: currentFilter,
                search: currentSearch
            });
            const resp = await fetch(`/admin/api/inquiries?${params}`);
            const json = await resp.json();

            if (!json.success) {
                alert(json.message || '加载失败');
                return;
            }

            renderTable(json.data);
            renderPagination(json.pagination);
        } catch (err) {
            console.error(err);
            alert('网络错误');
        }
    }

    // ── 渲染表格 ──
    function renderTable(rows) {
        const tbody = document.getElementById('inquiryBody');
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="7" class="adm-empty">暂无数据</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(r => {
            const isDeleted = !!r.deleted_at;
            const statusBadge = isDeleted
                ? '<span class="adm-badge adm-badge-deleted">已删除</span>'
                : '<span class="adm-badge adm-badge-active">正常</span>';

            const deletedAt = isDeleted ? `<br><span style="font-size:11px;color:#94a3b8">删除于 ${fmtTime(r.deleted_at)}</span>` : '';

            let actions = '';
            if (isDeleted) {
                actions = `
                    <button class="adm-btn adm-btn-restore" onclick="restoreInquiry(${r.id}, '${esc(r.inquiry_no)}')">恢复</button>
                    <button class="adm-btn adm-btn-danger" onclick="hardDeleteInquiry(${r.id}, '${esc(r.inquiry_no)}', ${r.file_count})">彻底删除</button>
                `;
            } else {
                actions = `<button class="adm-btn adm-btn-danger" onclick="hardDeleteInquiry(${r.id}, '${esc(r.inquiry_no)}', ${r.file_count})">彻底删除</button>`;
            }

            return `<tr class="${isDeleted ? 'row-deleted' : ''}">
                <td><strong>${esc(r.inquiry_no)}</strong></td>
                <td>${esc(r.username)}</td>
                <td>${esc(r.email)}</td>
                <td>${r.file_count}</td>
                <td>${fmtTime(r.created_at)}${deletedAt}</td>
                <td>${statusBadge}</td>
                <td class="adm-actions">${actions}</td>
            </tr>`;
        }).join('');
    }

    // ── 渲染分页 ──
    function renderPagination(pg) {
        const el = document.getElementById('pagination');
        if (pg.totalPages <= 1) { el.innerHTML = ''; return; }

        let html = `<button class="adm-page-btn" ${pg.page <= 1 ? 'disabled' : ''} onclick="goPage(${pg.page - 1})">上一页</button>`;
        html += `<span class="adm-page-info">第 ${pg.page} / ${pg.totalPages} 页 (共 ${pg.total} 条)</span>`;
        html += `<button class="adm-page-btn" ${pg.page >= pg.totalPages ? 'disabled' : ''} onclick="goPage(${pg.page + 1})">下一页</button>`;
        el.innerHTML = html;
    }

    // ── 全局函数 ──
    window.goPage = function (p) {
        currentPage = p;
        loadInquiries();
    };

    window.restoreInquiry = function (id, no) {
        showModal('恢复询盘', `确定要恢复询盘 <strong>${no}</strong> 吗？恢复后用户将能再次看到该询盘。`, async () => {
            try {
                const resp = await fetch(`/admin/api/inquiry/${id}/restore`, { method: 'POST' });
                const json = await resp.json();
                if (json.success) {
                    closeModal();
                    loadInquiries();
                } else {
                    alert(json.message || '操作失败');
                }
            } catch { alert('网络错误'); }
        });
    };

    window.hardDeleteInquiry = function (id, no, fileCount) {
        const fileHint = fileCount > 0 ? `<br>该询盘关联 <strong>${fileCount}</strong> 个文件，将一并从磁盘删除。` : '';
        showModal(
            '⚠️ 彻底删除',
            `确定要彻底删除询盘 <strong>${no}</strong> 吗？<br>此操作<strong>不可恢复</strong>，数据库记录和磁盘文件将被永久清除。${fileHint}`,
            async () => {
                try {
                    const resp = await fetch(`/admin/api/inquiry/${id}`, { method: 'DELETE' });
                    const json = await resp.json();
                    if (json.success) {
                        closeModal();
                        loadInquiries();
                    } else {
                        alert(json.message || '操作失败');
                    }
                } catch { alert('网络错误'); }
            }
        );
    };

    // ── Modal ──
    function showModal(title, body, onConfirm) {
        document.getElementById('modalTitle').innerHTML = title;
        document.getElementById('modalBody').innerHTML = body;
        document.getElementById('modalMask').classList.add('visible');
        document.getElementById('modalConfirm').onclick = onConfirm;
    }

    window.closeModal = function () {
        document.getElementById('modalMask').classList.remove('visible');
    };

    // ── Utils ──
    function fmtTime(ts) {
        if (!ts) return '-';
        const d = new Date(ts);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    function esc(s) {
        if (!s) return '';
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }
})();
