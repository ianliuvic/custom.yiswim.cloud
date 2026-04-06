/* ── 管理后台 JS ── */
(function () {
    let currentFilter = 'all';
    let currentPage = 1;
    let currentSearch = '';
    let currentRows = [];       // 当前页数据
    let selectedIds = new Set(); // 选中的 ID

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
        selectedIds.clear();
        updateBatchBar();
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

            currentRows = json.data;
            renderTable(currentRows);
            renderPagination(json.pagination);
        } catch (err) {
            console.error(err);
            alert('网络错误');
        }
    }

    // ── 选择逻辑 ──
    function updateBatchBar() {
        const bar = document.getElementById('batchBar');
        const count = selectedIds.size;
        document.getElementById('batchCount').textContent = `已选 ${count} 项`;
        bar.classList.toggle('visible', count > 0);

        // 全选框同步
        const selectAll = document.getElementById('selectAll');
        if (selectAll) {
            selectAll.checked = currentRows.length > 0 && currentRows.every(r => selectedIds.has(r.id));
            selectAll.indeterminate = count > 0 && !selectAll.checked;
        }

        // 恢复按钮：只在有已删除项被选中时显示
        const hasDeleted = currentRows.some(r => selectedIds.has(r.id) && r.deleted_at);
        document.getElementById('batchRestoreBtn').style.display = hasDeleted ? '' : 'none';
    }

    window.toggleSelectAll = function (checked) {
        currentRows.forEach(r => {
            if (checked) selectedIds.add(r.id);
            else selectedIds.delete(r.id);
        });
        // 同步行内复选框
        document.querySelectorAll('.adm-row-cb').forEach(cb => { cb.checked = checked; });
        updateBatchBar();
    };

    window.toggleRowSelect = function (id, checked) {
        if (checked) selectedIds.add(id);
        else selectedIds.delete(id);
        updateBatchBar();
    };

    window.clearSelection = function () {
        selectedIds.clear();
        document.querySelectorAll('.adm-row-cb').forEach(cb => { cb.checked = false; });
        document.getElementById('selectAll').checked = false;
        updateBatchBar();
    };

    // ── 渲染表格 ──
    function renderTable(rows) {
        const tbody = document.getElementById('inquiryBody');
        if (!rows.length) {
            tbody.innerHTML = '<tr><td colspan="8" class="adm-empty">暂无数据</td></tr>';
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

            const checked = selectedIds.has(r.id) ? 'checked' : '';

            return `<tr class="${isDeleted ? 'row-deleted' : ''}">
                <td><input type="checkbox" class="adm-row-cb" ${checked} onchange="toggleRowSelect(${r.id}, this.checked)"></td>
                <td><a class="adm-inquiry-link" href="javascript:void(0)" onclick="openDetail(${r.id})">${esc(r.inquiry_no)}</a></td>
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

    // ── 批量操作 ──
    window.batchRestore = function () {
        const ids = [...selectedIds];
        const deletedIds = currentRows.filter(r => ids.includes(r.id) && r.deleted_at).map(r => r.id);
        if (!deletedIds.length) { alert('未选中已删除的询盘'); return; }
        showModal('批量恢复', `确定要恢复选中的 <strong>${deletedIds.length}</strong> 条已删除询盘吗？`, async () => {
            try {
                const resp = await fetch('/admin/api/inquiries/batch-restore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: deletedIds })
                });
                const json = await resp.json();
                if (json.success) { closeModal(); loadInquiries(); }
                else alert(json.message || '操作失败');
            } catch { alert('网络错误'); }
        });
    };

    window.batchHardDelete = function () {
        const ids = [...selectedIds];
        if (!ids.length) return;
        const totalFiles = currentRows.filter(r => ids.includes(r.id)).reduce((s, r) => s + (parseInt(r.file_count) || 0), 0);
        const fileHint = totalFiles > 0 ? `<br>共关联 <strong>${totalFiles}</strong> 个文件，将一并从磁盘删除。` : '';
        showModal(
            '⚠️ 批量彻底删除',
            `确定要彻底删除选中的 <strong>${ids.length}</strong> 条询盘吗？<br>此操作<strong>不可恢复</strong>。${fileHint}`,
            async () => {
                try {
                    const resp = await fetch('/admin/api/inquiries/batch-delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids })
                    });
                    const json = await resp.json();
                    if (json.success) { closeModal(); loadInquiries(); }
                    else alert(json.message || '操作失败');
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

    // ── Detail Panel ──
    const FILE_BASE = 'https://files.yiswim.cloud/uploads/inquiries/';
    let _currentDetailId = null;

    window.openDetail = async function (id) {
        _currentDetailId = id;
        const listMain = document.querySelector('.adm-main');
        const panel = document.getElementById('detailPanel');
        const content = document.getElementById('detailContent');
        const statsEl = document.getElementById('detailStats');
        const titleH = document.getElementById('detailTitle');
        const statusEl = document.getElementById('detailStatus');

        listMain.style.display = 'none';
        panel.style.display = 'block';
        content.innerHTML = '<div class="adm-loading">加载中...</div>';
        statsEl.innerHTML = '';

        try {
            const resp = await fetch('/admin/api/inquiry/' + id);
            const json = await resp.json();
            if (!json.success) throw new Error(json.message);

            const d = json.data;
            titleH.textContent = d.inquiry_no;

            // Status
            const isDeleted = !!d.deleted_at;
            statusEl.className = 'adm-badge ' + (isDeleted ? 'adm-badge-deleted' : 'adm-badge-active');
            statusEl.textContent = isDeleted ? '已删除' : (d.status === 'draft' ? '草稿' : '正常');

            // Stats pills
            const stats = [];
            stats.push(dpill('user', d.username + ' (' + d.email + ')'));
            if (d.delivery_mode) stats.push(dpill('truck', d.delivery_mode === 'bulk' ? '大货订单' : '样衣订单'));
            if (d.brand_name) stats.push(dpill('tag', d.brand_name));
            if (d.contact_name) stats.push(dpill('contact', d.contact_name));
            const odmArr = tryParse(d.odm_styles);
            if (Array.isArray(odmArr) && odmArr.length) stats.push(dpill('style', 'ODM ' + odmArr.length + ' 款'));
            if (d.oem_project) stats.push(dpill('style', 'OEM ' + (d.oem_style_count || 0) + ' 款'));
            if (d.files && d.files.length) stats.push(dpill('file', d.files.length + ' 个附件'));
            statsEl.innerHTML = stats.join('');

            // Build file map
            const fileMap = {};
            (d.files || []).forEach(f => {
                const cat = f.category || 'other';
                if (!fileMap[cat]) fileMap[cat] = [];
                fileMap[cat].push(f);
            });

            let html = '';

            // Admin action form (top)
            html += renderAdminActionForm(d);

            html += renderStyleSection(d, fileMap);
            html += renderFabricSection(d, fileMap);
            html += renderTrimsSection(d, fileMap);
            html += renderShippingSection(d, fileMap);
            html += renderContactSection(d);

            // Uncategorized files
            const shownCats = ['odmCustom', 'oem', 'fabric', 'cmt', 'metal', 'pad', 'bag', 'hangtag', 'label', 'hygiene', 'other', 'bulkPacking', 'finalDocs'];
            let remainFiles = [];
            Object.keys(fileMap).forEach(cat => {
                if (!shownCats.includes(cat)) remainFiles = remainFiles.concat(fileMap[cat]);
            });
            if (remainFiles.length) html += renderFilesSection(remainFiles, '其他附件');

            html += renderTimelineSection(d);

            content.innerHTML = html;
        } catch (e) {
            content.innerHTML = '<div class="adm-loading" style="color:#dc2626">加载失败：' + esc(e.message) + '</div>';
        }
    };

    window.closeDetail = function () {
        document.getElementById('detailPanel').style.display = 'none';
        document.querySelector('.adm-main').style.display = 'block';
        _currentDetailId = null;
    };

    window.exportPDF = function () {
        if (!_currentDetailId) return;
        window.open('/admin/api/inquiry/' + _currentDetailId + '/pdf', '_blank');
    };

    window.exportZIP = function () {
        if (!_currentDetailId) return;
        window.open('/admin/api/inquiry/' + _currentDetailId + '/export', '_blank');
    };

    window.saveAdminAction = async function () {
        if (!_currentDetailId) return;
        const btn = document.getElementById('adminSaveBtn');
        btn.disabled = true;
        btn.textContent = '保存中...';

        const status = document.getElementById('adminStatusSelect').value;
        const admin_reply = document.getElementById('adminReplyInput').value.trim();
        const project_link = document.getElementById('adminProjectLink').value.trim();
        const project_token = document.getElementById('adminProjectToken').value.trim();

        try {
            const resp = await fetch('/admin/api/inquiry/' + _currentDetailId + '/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, admin_reply, project_link, project_token })
            });
            const json = await resp.json();
            if (json.success) {
                btn.textContent = '✓ 已更新';
                btn.style.background = '#16a34a';
                // Refresh detail page after a short delay so timeline shows latest update
                setTimeout(() => {
                    window.openDetail(_currentDetailId);
                }, 1000);
            } else {
                alert(json.message || '保存失败');
                btn.textContent = '保存';
                btn.disabled = false;
            }
        } catch {
            alert('网络错误');
            btn.textContent = '保存';
            btn.disabled = false;
        }
    };

    // ── Detail Helpers ──
    function tryParse(v) {
        if (!v) return null;
        if (typeof v === 'object') return v;
        try { return JSON.parse(v); } catch { return null; }
    }

    function dpill(type, text) {
        return '<span class="adm-stat-pill">' + esc(text) + '</span>';
    }

    function dkv(label, value) {
        return '<div class="adm-kv"><span class="adm-kv-label">' + label + '</span><span class="adm-kv-value">' + (value || '-') + '</span></div>';
    }

    function dsecStart(type, title, countText) {
        return '<div class="adm-sec"><div class="adm-sec-head"><h4>' + title + '</h4>' +
            (countText ? '<span class="adm-sec-count">' + countText + '</span>' : '') +
            '</div><div class="adm-sec-body">';
    }
    function dsecEnd() { return '</div></div>'; }

    function renderFileItem(f) {
        const url = FILE_BASE + encodeURIComponent(f.stored_name);
        const ext = (f.orig_name || '').split('.').pop().toLowerCase();
        const isImg = /^(jpg|jpeg|png|gif|webp)$/i.test(ext);
        const sizeStr = f.size_bytes ? formatSize(f.size_bytes) : '';

        if (isImg) {
            return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="adm-file-img-preview">' +
                '<div class="adm-file-img-thumb"><img src="' + url + '" alt="' + esc(f.orig_name) + '" loading="lazy"></div>' +
                '<div class="adm-file-img-info"><div class="adm-file-name">' + esc(f.orig_name) + '</div>' +
                (sizeStr ? '<div class="adm-file-meta">' + sizeStr + '</div>' : '') +
                '</div></a>';
        }

        let iconClass = 'other';
        if (ext === 'pdf') iconClass = 'pdf';
        else if (/^(doc|docx)$/.test(ext)) iconClass = 'doc';
        else if (/^(zip|rar)$/.test(ext)) iconClass = 'zip';
        else if (/^(xls|xlsx)$/.test(ext)) iconClass = 'doc';
        return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="adm-file-item">' +
            '<div class="adm-file-icon ' + iconClass + '">' + ext.toUpperCase() + '</div>' +
            '<div class="adm-file-info"><div class="adm-file-name">' + esc(f.orig_name) + '</div>' +
            '<div class="adm-file-meta">' + sizeStr + (f.sub_key ? ' · ' + esc(f.sub_key) : '') + '</div>' +
            '</div></a>';
    }

    function renderInlineFiles(files, label) {
        let h = '<div class="adm-inline-files">';
        if (label) h += '<div class="adm-sub-label">' + esc(label) + '</div>';
        h += '<div class="adm-file-grid">';
        files.forEach(f => { h += renderFileItem(f); });
        h += '</div></div>';
        return h;
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function fmtDate(ts) {
        if (!ts) return '-';
        const d = new Date(ts);
        const pad = n => String(n).padStart(2, '0');
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    // ── Section Renderers ──
    function renderStyleSection(d, fileMap) {
        const odmArr = tryParse(d.odm_styles);
        const odmCustom = tryParse(d.odm_custom_data);
        const odmImages = d.odm_style_images || {};
        const oemDescs = tryParse(d.oem_descriptions);
        const hasODM = Array.isArray(odmArr) && odmArr.length;
        const hasOEM = d.oem_project;
        if (!hasODM && !hasOEM) return '';

        let h = dsecStart('style', '款式信息');

        if (hasODM) {
            h += '<div class="adm-divider"><span class="adm-divider-tag odm">ODM</span> 已选款式</div>';
            h += '<div class="adm-style-grid">';
            odmArr.forEach(name => {
                const displayName = typeof name === 'object' ? (name.name || JSON.stringify(name)) : name;
                let remark = '';
                if (odmCustom && odmCustom[displayName] && odmCustom[displayName].remark) remark = odmCustom[displayName].remark;
                const imgs = odmImages[displayName];
                const coverImg = Array.isArray(imgs) && imgs.length ? imgs[0] : '';
                const customFiles = (fileMap['odmCustom'] || []).filter(f => f.sub_key === displayName);

                h += '<div class="adm-style-card">';
                if (coverImg) h += '<div class="adm-style-card-img"><img src="' + esc(coverImg) + '" alt="' + esc(displayName) + '" loading="lazy"></div>';
                h += '<div class="adm-style-card-body"><strong>' + esc(displayName) + '</strong>';
                if (remark) h += '<div class="adm-style-remark">' + esc(remark) + '</div>';
                if (customFiles.length) {
                    h += '<div class="adm-file-grid" style="margin-top:8px">';
                    customFiles.forEach(f => { h += renderFileItem(f); });
                    h += '</div>';
                }
                h += '</div></div>';
            });
            h += '</div>';
        }

        if (hasOEM) {
            h += '<div class="adm-divider"><span class="adm-divider-tag oem">OEM</span> 自主设计</div>';
            h += dkv('项目名称', esc(d.oem_project));
            h += dkv('款式数量', d.oem_style_count || '-');
            if (d.oem_project_desc) h += dkv('项目描述', esc(d.oem_project_desc));
            if (Array.isArray(oemDescs) && oemDescs.length) {
                h += '<div class="adm-sub-label">款式描述</div>';
                oemDescs.forEach((desc, i) => {
                    h += dkv('款 ' + (i + 1), esc(typeof desc === 'object' ? JSON.stringify(desc) : desc));
                });
            }
            const oemFiles = fileMap['oem'] || [];
            const oemDesignFiles = oemFiles.filter(f => f.sub_key !== 'size');
            const oemSizeFiles = oemFiles.filter(f => f.sub_key === 'size');
            if (oemDesignFiles.length) h += renderInlineFiles(oemDesignFiles, '设计文件');
            if (oemSizeFiles.length || d.oem_size_remark) {
                if (d.oem_size_remark) h += dkv('尺寸说明', esc(d.oem_size_remark));
                if (oemSizeFiles.length) h += renderInlineFiles(oemSizeFiles, '尺寸文件');
            }
            if (d.oem_remark) h += dkv('备注', esc(d.oem_remark));
            if (d.oem_physical_sample) {
                h += dkv('寄送样衣', '<span style="color:#16a34a;font-weight:600">● 已寄送</span>' +
                    (d.oem_tracking_no ? ' 单号：' + esc(d.oem_tracking_no) : ''));
            }
        }

        h += dsecEnd();
        return h;
    }

    function renderFabricSection(d, fileMap) {
        const fab = tryParse(d.fabric_selection);
        if (!fab || typeof fab !== 'object' || !Object.keys(fab).length) return '';

        const fabricFiles = fileMap['fabric'] || [];
        const cmtFabricFiles = (fileMap['cmt'] || []).filter(f => f.sub_key === 'fabric');
        let h = dsecStart('fabric', '面料信息');

        Object.keys(fab).forEach(catKey => {
            const cat = fab[catKey];
            if (!cat || !cat.configs) return;
            const originalCat = cat.originalCatName || catKey;
            const configs = cat.configs;

            Object.keys(configs).forEach(fabricName => {
                const cfg = configs[fabricName];
                if (!cfg) return;
                const isCS = fabricName === 'CUSTOM_SOURCING';
                const mode = isCS ? 'custom' : (cfg.mode || 'solid');
                const modeLabel = { solid: '纯色', print: '印花', custom: '开发/找样' }[mode] || mode;
                const cardTitle = isCS ? originalCat : fabricName;

                h += '<div class="adm-fabric-card">';
                h += '<div class="adm-fabric-head"><strong>' + esc(cardTitle) + '</strong>';
                if (!isCS) h += '<span class="adm-chip">' + esc(originalCat) + '</span>';
                h += '<span class="adm-chip accent">' + modeLabel + '</span></div>';

                if (cfg.comp) h += dkv('成分', esc(cfg.comp));
                if (cfg.gsm) h += dkv('克重', esc(cfg.gsm + (!/g/i.test(cfg.gsm) ? ' g/m²' : '')));

                if (mode === 'solid' && Array.isArray(cfg.colors) && cfg.colors.length) {
                    h += '<div class="adm-color-list">';
                    cfg.colors.forEach(c => {
                        h += '<span class="adm-color-swatch"><span class="adm-color-dot" style="background:' + esc(c.hex || '#ccc') + '"></span>' + esc(c.name || '-') + '</span>';
                    });
                    h += '</div>';
                    if (cfg.colorText) h += dkv('色彩描述', esc(cfg.colorText));
                } else if (mode === 'print') {
                    if (cfg.printType) h += dkv('印花类型', cfg.printType === 'seamless' ? '满版印花' : '定位印花');
                    const printKey = catKey + '__' + fabricName + '__print';
                    let printFiles = fabricFiles.filter(f => f.sub_key === printKey);
                    if (!printFiles.length) {
                        const baseKey = catKey + '__' + fabricName;
                        printFiles = fabricFiles.filter(f => f.sub_key === baseKey && f.mime_type && f.mime_type.indexOf('image/') === 0);
                    }
                    if (printFiles.length) h += renderInlineFiles(printFiles, '印花图案');
                    if (cfg.printRefColor) h += dkv('参考底色', esc(cfg.printRefColor));
                    if (cfg.printScale) h += dkv('缩放比例', esc(cfg.printScale));
                } else if (mode === 'custom') {
                    if (cfg.customDesc) h += dkv('需求描述', esc(cfg.customDesc));
                    if (cfg.colorReq) h += dkv('颜色要求', esc(cfg.colorReq));
                    if (cfg.physical) h += dkv('实物邮寄', '是' + (cfg.trackingNo ? '（单号：' + esc(cfg.trackingNo) + '）' : ''));
                }

                if (cfg.remark) h += dkv('备注', esc(cfg.remark));

                const subKey = catKey + '__' + fabricName;
                let matched = fabricFiles.filter(f => f.sub_key === subKey);
                if (mode === 'print') {
                    const printKey2 = catKey + '__' + fabricName + '__print';
                    const printIds = {};
                    fabricFiles.filter(f => f.sub_key === printKey2).forEach(f => { printIds[f.id] = true; });
                    matched = matched.filter(f => !printIds[f.id]);
                }
                if (matched.length) h += renderInlineFiles(matched, '参考文件');
                h += '</div>';
            });
        });

        // CMT fabric
        const cmtData = tryParse(d.cmt_enabled);
        const fabricCmt = cmtData && cmtData.fabric;
        const fabricCmtEnabled = fabricCmt === true || (fabricCmt && fabricCmt.enabled);
        if (fabricCmtEnabled) {
            h += '<div class="adm-cmt-block"><div class="adm-cmt-title">客户自行提供面料 (CMT)</div>';
            if (fabricCmt && fabricCmt.desc) h += dkv('明细描述', esc(fabricCmt.desc));
            if (fabricCmt && fabricCmt.trackingNo) h += dkv('寄件单号', esc(fabricCmt.trackingNo));
            if (cmtFabricFiles.length) h += renderInlineFiles(cmtFabricFiles, '参考文件');
            h += '</div>';
        }

        h += dsecEnd();
        return h;
    }

    function renderTrimsSection(d, fileMap) {
        const trimDefs = [
            { key: 'metal_config', cat: 'metal', name: '五金配件' },
            { key: 'pad_config', cat: 'pad', name: '胸垫' },
            { key: 'bag_config', cat: 'bag', name: '包装袋' },
            { key: 'hangtag_config', cat: 'hangtag', name: '吊牌' },
            { key: 'label_config', cat: 'label', name: '标签' },
            { key: 'hygiene_config', cat: 'hygiene', name: '卫生贴' },
            { key: 'other_config', cat: 'other', name: '其他' }
        ];

        const cmtData = tryParse(d.cmt_enabled) || {};
        let cards = [];
        trimDefs.forEach(td => {
            const val = tryParse(d[td.key]);
            const cmtInfo = cmtData[td.cat];
            const cmtEnabled = cmtInfo === true || (cmtInfo && cmtInfo.enabled);
            const hasConfig = val && typeof val === 'object' && Object.keys(val).length;
            if (!hasConfig && !cmtEnabled) return;

            const trimFiles = fileMap[td.cat] || [];
            const cmtFiles = (fileMap['cmt'] || []).filter(f => f.sub_key === td.cat);
            let ch = '<div class="adm-trim-card"><div class="adm-trim-card-head">' + esc(td.name) + '</div>';

            const v = hasConfig ? val : {};
            const shownFileIds = {};
            function inlineByKey(subKey, label) {
                const matched = trimFiles.filter(f => f.sub_key === subKey);
                if (!matched.length) return '';
                matched.forEach(f => { shownFileIds[f.id] = true; });
                return renderInlineFiles(matched, label);
            }

            if (v.mode) ch += dkv('模式', v.mode === 'auto' ? '红绣标配' : '客户自定义');

            // Render config fields based on type
            if (td.key === 'metal_config') {
                if (v.finish) ch += dkv('表面处理', esc(v.finish));
                ch += inlineByKey('sourceFiles', '参考文件');
                if (v.logoCustom) {
                    ch += dkv('LOGO定制', '需要');
                    if (Array.isArray(v.logoTypes) && v.logoTypes.length) ch += dkv('LOGO类型', v.logoTypes.map(esc).join(', '));
                    ch += inlineByKey('logoFiles', 'LOGO文件');
                }
                if (v.details && v.categories && v.categories.length) {
                    v.categories.forEach(catName => {
                        const detail = v.details[catName];
                        if (!detail) return;
                        ch += '<div class="adm-sub-label" style="margin-top:8px;font-weight:600">' + esc(catName) + '</div>';
                        if (detail.remark) ch += dkv('备注', esc(detail.remark));
                        ch += inlineByKey('details__' + catName + '__styleFiles', '样式参考');
                        if (detail.logoNeeded) ch += inlineByKey('details__' + catName + '__logoFiles', 'LOGO文件');
                    });
                }
            } else if (td.key === 'pad_config') {
                if (v.thickness) ch += dkv('厚度', esc(v.thickness));
                if (v.color) ch += dkv('颜色', esc(v.color === '其他定制色' && v.otherColor ? v.otherColor + '（定制色）' : v.color));
                if (v.customShape) ch += dkv('异形', '是' + (v.shapeRemark ? '（' + esc(v.shapeRemark) + '）' : ''));
                ch += inlineByKey('shapeFiles', '形状参考');
                ch += inlineByKey('otherFiles', '其他参考');
            } else if (td.key === 'bag_config') {
                if (v.material) ch += dkv('材质', esc(v.material));
                if (v.size) ch += dkv('尺寸', esc(v.size));
                if (v.print) ch += dkv('印刷', esc(v.print));
                if (Array.isArray(v.crafts) && v.crafts.length) ch += dkv('工艺', v.crafts.map(esc).join(', '));
                ch += inlineByKey('designFiles', '设计文件');
            } else if (td.key === 'hangtag_config') {
                if (v.remark) ch += dkv('设计描述', esc(v.remark));
                ch += inlineByKey('designFiles', '设计文件');
                if (v.mode !== 'auto') {
                    if (v.material) ch += dkv('材质', esc(v.material === '其他' && v.materialRemark ? v.materialRemark + '（其他）' : v.material));
                    if (v.weight) ch += dkv('克重', esc(v.weight));
                    if (v.shape) ch += dkv('形状', esc(v.shape));
                    if (Array.isArray(v.crafts) && v.crafts.length) ch += dkv('工艺', v.crafts.map(esc).join(', '));
                    ch += inlineByKey('stringFiles', '吊绳参考');
                }
            } else if (td.key === 'label_config') {
                if (v.remark) ch += dkv('设计描述', esc(v.remark));
                ch += inlineByKey('designFiles', '设计文件');
                if (v.mode !== 'auto') {
                    if (v.material) ch += dkv('材质', esc(v.material));
                    if (v.size) ch += dkv('尺寸', esc(v.size));
                    if (v.method) ch += dkv('缝制方式', esc(v.method));
                    if (Array.isArray(v.components) && v.components.length) ch += dkv('部件', v.components.map(esc).join(', '));
                }
            } else if (td.key === 'hygiene_config') {
                if (v.material) ch += dkv('材质', esc(v.material));
                if (v.shape) ch += dkv('形状', esc(v.shape));
                if (v.size) ch += dkv('尺寸', esc(v.size));
                ch += inlineByKey('designFiles', '印刷设计图');
            } else if (td.key === 'other_config') {
                ch += inlineByKey('files', '参考附件');
            }

            if (v.remark && td.key !== 'hangtag_config' && td.key !== 'label_config') ch += dkv('备注', esc(v.remark));

            // CMT
            if (cmtEnabled) {
                ch += '<div class="adm-cmt-block"><div class="adm-cmt-title">客户自行提供 (CMT)</div>';
                if (cmtInfo && cmtInfo.desc) ch += dkv('明细描述', esc(cmtInfo.desc));
                if (cmtInfo && cmtInfo.trackingNo) ch += dkv('寄件单号', esc(cmtInfo.trackingNo));
                if (cmtFiles.length) ch += renderInlineFiles(cmtFiles, '参考文件');
                ch += '</div>';
            }

            // Remaining files
            const remainTrim = trimFiles.filter(f => !shownFileIds[f.id]);
            if (remainTrim.length) ch += renderInlineFiles(remainTrim, '其他文件');
            ch += '</div>';
            cards.push(ch);
        });

        if (!cards.length) return '';
        let h = dsecStart('trims', '辅料 / 包装', cards.length + ' 项');
        h += '<div class="adm-trim-grid">' + cards.join('') + '</div>';
        h += dsecEnd();
        return h;
    }

    function renderShippingSection(d, fileMap) {
        let h = dsecStart('shipping', '交付信息');
        h += dkv('交付模式', '<span class="adm-chip accent">' + (d.delivery_mode === 'bulk' ? '大货订单' : '样衣订单') + '</span>');

        if (d.delivery_mode !== 'bulk') {
            const sampleRows = tryParse(d.sample_rows);
            if (Array.isArray(sampleRows) && sampleRows.length) {
                h += '<div class="adm-sub-label" style="margin-top:12px">样衣明细</div>';
                h += '<table class="adm-detail-table"><thead><tr><th>款式</th><th>类型</th><th>尺码</th><th>数量</th><th>备注</th></tr></thead><tbody>';
                sampleRows.forEach(r => {
                    h += '<tr><td>' + esc(r.style) + '</td><td>' + esc(r.type) + '</td><td>' + esc(r.size) + '</td><td>' + esc(r.qty) + '</td><td>' + esc(r.desc || '-') + '</td></tr>';
                });
                h += '</tbody></table>';
            }
            const sc = tryParse(d.sample_config);
            if (sc && typeof sc === 'object') {
                if (sc.carrier) h += dkv('物流方式', esc(sc.carrier));
                if (sc.needBulkQuote) {
                    h += dkv('需大货报价', '是');
                    if (sc.intentQty) h += dkv('预估数量', esc(sc.intentQty) + ' 件');
                    if (sc.intentPrice) h += dkv('期望单价', '$' + esc(sc.intentPrice));
                }
            }
            if (d.sample_dest) h += dkv('目的地', esc(d.sample_dest));
        } else {
            const bulkRows = tryParse(d.bulk_rows);
            if (Array.isArray(bulkRows) && bulkRows.length) {
                h += '<div class="adm-sub-label" style="margin-top:12px">大货明细</div>';
                h += '<table class="adm-detail-table"><thead><tr><th>款式</th><th>数量</th><th>尺码分配</th><th>备注</th></tr></thead><tbody>';
                bulkRows.forEach(r => {
                    h += '<tr><td>' + esc(r.style) + '</td><td>' + esc(r.qty) + '</td><td>' + esc(r.sizeDetail || '-') + '</td><td>' + esc(r.desc || '-') + '</td></tr>';
                });
                h += '</tbody></table>';
            }
            const bl = tryParse(d.bulk_logistics);
            if (bl && typeof bl === 'object') {
                if (bl.term) h += dkv('贸易术语', esc(bl.term));
                if (bl.method) h += dkv('运输方式', esc(bl.method));
            }
            if (d.bulk_dest) h += dkv('目的地', esc(d.bulk_dest));
            if (d.bulk_target_price) h += dkv('目标价格', esc(d.bulk_target_price));
            if (d.bulk_packing_remark) h += dkv('包装备注', esc(d.bulk_packing_remark));
            const bpFiles = fileMap['bulkPacking'] || [];
            if (bpFiles.length) h += renderInlineFiles(bpFiles, '包装参考文件');
        }

        const fdFiles = fileMap['finalDocs'] || [];
        if (fdFiles.length) h += renderInlineFiles(fdFiles, '综合工艺单 / 企划书');

        h += dsecEnd();
        return h;
    }

    function renderContactSection(d) {
        if (!d.contact_name && !d.brand_name) return '';
        let h = dsecStart('contact', '联系信息');
        if (d.contact_name) h += dkv('联系人', esc(d.contact_name));
        if (d.contact_info) h += dkv('联系方式', esc(d.contact_info));
        if (d.brand_name) h += dkv('品牌名称', esc(d.brand_name));
        if (d.website) h += dkv('网站', '<a href="' + esc(d.website) + '" target="_blank" rel="noopener noreferrer">' + esc(d.website) + '</a>');
        if (d.final_remark) h += dkv('整体备注', esc(d.final_remark));
        if (d.nda_agreed_at) h += dkv('NDA 签署', '✓ 已签署 ' + fmtDate(d.nda_agreed_at));
        h += dsecEnd();
        return h;
    }

    function renderFilesSection(files, title) {
        if (!files || !files.length) return '';
        let h = dsecStart('files', title || '附件', files.length + ' 个');
        h += '<div class="adm-file-grid">';
        files.forEach(f => { h += renderFileItem(f); });
        h += '</div>';
        h += dsecEnd();
        return h;
    }

    function renderAdminActionForm(d) {
        const statusOpts = [
            { val: 'pending', label: '待处理' },
            { val: 'processing', label: '处理中' },
            { val: 'quoted', label: '已报价' },
            { val: 'closed', label: '已关闭' }
        ];
        const curStatus = d.status || 'pending';

        let h = '<div class="adm-sec adm-action-sec"><div class="adm-sec-head"><h4>📋 管理员操作</h4></div><div class="adm-sec-body">';

        // Status
        h += '<div class="adm-form-row"><label class="adm-form-label">询盘状态</label>';
        h += '<select id="adminStatusSelect" class="adm-form-select">';
        statusOpts.forEach(o => {
            h += '<option value="' + o.val + '"' + (curStatus === o.val ? ' selected' : '') + '>' + o.label + '</option>';
        });
        h += '</select></div>';

        // Admin reply
        h += '<div class="adm-form-row"><label class="adm-form-label">询盘回复</label>';
        h += '<textarea id="adminReplyInput" class="adm-form-textarea" rows="4" placeholder="输入对客户的回复内容...">' + esc(d.admin_reply || '') + '</textarea></div>';

        // Project link
        h += '<div class="adm-form-row"><label class="adm-form-label">项目链接</label>';
        h += '<input type="text" id="adminProjectLink" class="adm-form-input" placeholder="输入项目链接 URL" value="' + esc(d.project_link || '') + '"></div>';

        // Project token
        h += '<div class="adm-form-row"><label class="adm-form-label">项目 Token</label>';
        h += '<input type="text" id="adminProjectToken" class="adm-form-input" placeholder="输入项目访问 Token" value="' + esc(d.project_token || '') + '"></div>';

        // Save button
        h += '<div class="adm-form-row adm-form-actions"><button id="adminSaveBtn" class="adm-btn adm-btn-save" onclick="saveAdminAction()">保存</button></div>';

        h += '</div></div>';
        return h;
    }

    function renderTimelineSection(d) {
        let h = dsecStart('time', '时间线');
        h += '<div class="adm-timeline">';
        h += '<div class="adm-timeline-item"><span class="adm-timeline-dot"></span><strong>' + fmtDate(d.created_at) + '</strong> 创建询盘</div>';
        if (d.modified_at && d.modified_at !== d.created_at) {
            h += '<div class="adm-timeline-item"><span class="adm-timeline-dot muted"></span><strong>' + fmtDate(d.modified_at) + '</strong> 最后更新</div>';
        }
        if (d.deleted_at) {
            h += '<div class="adm-timeline-item"><span class="adm-timeline-dot danger"></span><strong>' + fmtDate(d.deleted_at) + '</strong> 已删除</div>';
        }
        h += '</div>';
        h += dsecEnd();
        return h;
    }
})();
