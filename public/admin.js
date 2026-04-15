/* ── Admin Panel JS ── */
(function () {
    let currentFilter = 'all';
    let currentPage = 1;
    let currentSearch = '';
    let currentRows = [];       // 当前页数据
    let selectedIds = new Set(); // 选中的 ID
    let _fabricNameMap = null; // Chinese→English fabric name map (lazy loaded)

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
                alert(json.message || 'Load failed');
                return;
            }

            currentRows = json.data;
            renderTable(currentRows);
            renderPagination(json.pagination);
        } catch (err) {
            console.error(err);
            alert('Network error');
        }
    }

    // ── 选择逻辑 ──
    function updateBatchBar() {
        const bar = document.getElementById('batchBar');
        const count = selectedIds.size;
        document.getElementById('batchCount').textContent = `Selected ${count} item(s)`;
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
            tbody.innerHTML = '<tr><td colspan="8" class="adm-empty">No data</td></tr>';
            return;
        }

        tbody.innerHTML = rows.map(r => {
            const isDeleted = !!r.deleted_at;
            const statusBadge = isDeleted
                ? '<span class="adm-badge adm-badge-deleted">Deleted</span>'
                : '<span class="adm-badge adm-badge-active">Active</span>';

            const deletedAt = isDeleted ? `<br><span style="font-size:11px;color:#94a3b8">Deleted at ${fmtTime(r.deleted_at)}</span>` : '';

            let actions = '';
            if (isDeleted) {
                actions = `
                    <button class="adm-btn adm-btn-restore" onclick="restoreInquiry(${r.id}, '${esc(r.inquiry_no)}')">Restore</button>
                    <button class="adm-btn adm-btn-danger" onclick="hardDeleteInquiry(${r.id}, '${esc(r.inquiry_no)}', ${r.file_count})">Hard Delete</button>
                `;
            } else {
                actions = `<button class="adm-btn adm-btn-danger" onclick="hardDeleteInquiry(${r.id}, '${esc(r.inquiry_no)}', ${r.file_count})">Hard Delete</button>`;
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

        let html = `<button class="adm-page-btn" ${pg.page <= 1 ? 'disabled' : ''} onclick="goPage(${pg.page - 1})">Previous</button>`;
        html += `<span class="adm-page-info">Page ${pg.page} / ${pg.totalPages} (Total ${pg.total})</span>`;
        html += `<button class="adm-page-btn" ${pg.page >= pg.totalPages ? 'disabled' : ''} onclick="goPage(${pg.page + 1})">Next</button>`;
        el.innerHTML = html;
    }

    // ── 全局函数 ──
    window.goPage = function (p) {
        currentPage = p;
        loadInquiries();
    };

    window.restoreInquiry = function (id, no) {
        showModal('Restore Inquiry', `Are you sure you want to restore inquiry <strong>${no}</strong>? The user will be able to see it again after restoration.`, async () => {
            try {
                const resp = await fetch(`/admin/api/inquiry/${id}/restore`, { method: 'POST' });
                const json = await resp.json();
                if (json.success) {
                    closeModal();
                    loadInquiries();
                } else {
                    alert(json.message || 'Operation failed');
                }
            } catch { alert('Network error'); }
        });
    };

    window.hardDeleteInquiry = function (id, no, fileCount) {
        const fileHint = fileCount > 0 ? `<br>This inquiry has <strong>${fileCount}</strong> file(s) that will also be deleted from disk.` : '';
        showModal(
            '⚠️ Hard Delete',
            `Are you sure you want to permanently delete inquiry <strong>${no}</strong>?<br>This action is <strong>irreversible</strong>. Database records and disk files will be permanently removed.${fileHint}`,
            async () => {
                try {
                    const resp = await fetch(`/admin/api/inquiry/${id}`, { method: 'DELETE' });
                    const json = await resp.json();
                    if (json.success) {
                        closeModal();
                        loadInquiries();
                    } else {
                        alert(json.message || 'Operation failed');
                    }
                } catch { alert('Network error'); }
            }
        );
    };

    // ── 批量操作 ──
    window.batchRestore = function () {
        const ids = [...selectedIds];
        const deletedIds = currentRows.filter(r => ids.includes(r.id) && r.deleted_at).map(r => r.id);
        if (!deletedIds.length) { alert('No deleted inquiries selected'); return; }
        showModal('Batch Restore', `Are you sure you want to restore the selected <strong>${deletedIds.length}</strong> deleted inquiry(ies)?`, async () => {
            try {
                const resp = await fetch('/admin/api/inquiries/batch-restore', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ids: deletedIds })
                });
                const json = await resp.json();
                if (json.success) { closeModal(); loadInquiries(); }
                else alert(json.message || 'Operation failed');
            } catch { alert('Network error'); }
        });
    };

    window.batchHardDelete = function () {
        const ids = [...selectedIds];
        if (!ids.length) return;
        const totalFiles = currentRows.filter(r => ids.includes(r.id)).reduce((s, r) => s + (parseInt(r.file_count) || 0), 0);
        const fileHint = totalFiles > 0 ? `<br>Total <strong>${totalFiles}</strong> associated file(s) will also be deleted from disk.` : '';
        showModal(
            '⚠️ Batch Hard Delete',
            `Are you sure you want to permanently delete the selected <strong>${ids.length}</strong> inquiry(ies)?<br>This action is <strong>irreversible</strong>.${fileHint}`,
            async () => {
                try {
                    const resp = await fetch('/admin/api/inquiries/batch-delete', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ids })
                    });
                    const json = await resp.json();
                    if (json.success) { closeModal(); loadInquiries(); }
                    else alert(json.message || 'Operation failed');
                } catch { alert('Network error'); }
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
        content.innerHTML = '<div class="adm-loading">Loading...</div>';
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
            statusEl.textContent = isDeleted ? 'Deleted' : (d.status === 'draft' ? 'Draft' : 'Active');

            // Stats pills
            const stats = [];
            stats.push(dpill('user', d.username + ' (' + d.email + ')'));
            if (d.delivery_mode) stats.push(dpill('truck', d.delivery_mode === 'bulk' ? 'Bulk Order' : 'Sample Order'));
            if (d.brand_name) stats.push(dpill('tag', d.brand_name));
            if (d.contact_name) stats.push(dpill('contact', d.contact_name));
            const odmArr = tryParse(d.odm_styles);
            if (Array.isArray(odmArr) && odmArr.length) stats.push(dpill('style', 'ODM ' + odmArr.length + ' style(s)'));
            if (d.oem_project) stats.push(dpill('style', 'OEM ' + (d.oem_style_count || 0) + ' style(s)'));
            if (d.files && d.files.length) stats.push(dpill('file', d.files.length + ' attachment(s)'));
            statsEl.innerHTML = stats.join('');

            // Build file map
            const fileMap = {};
            (d.files || []).forEach(f => {
                const cat = f.category || 'other';
                if (!fileMap[cat]) fileMap[cat] = [];
                fileMap[cat].push(f);
            });

            let html = '';

            // Lazy-load fabric name map
            if (!_fabricNameMap) {
                try {
                    const fabRes = await fetch('/api/get-data');
                    const fabJson = await fabRes.json();
                    if (fabJson.success && fabJson.data && fabJson.data.fabrics) {
                        _fabricNameMap = {};
                        fabJson.data.fabrics.forEach(f => {
                            if (f.name && f.name_en) _fabricNameMap[f.name] = f.name_en;
                        });
                        _fabricNameMap['面料'] = 'Shell';
                        _fabricNameMap['里料'] = 'Lining';
                        _fabricNameMap['网纱'] = 'Mesh';
                    }
                } catch (e) { _fabricNameMap = {}; }
            }

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
            if (remainFiles.length) html += renderFilesSection(remainFiles, 'Other Attachments');

            html += renderTimelineSection(d);

            content.innerHTML = html;
        } catch (e) {
            content.innerHTML = '<div class="adm-loading" style="color:#dc2626">Load failed: ' + esc(e.message) + '</div>';
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
        btn.textContent = 'Saving...';

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
                btn.textContent = '✓ Updated';
                btn.style.background = '#16a34a';
                // Refresh detail page after a short delay so timeline shows latest update
                setTimeout(() => {
                    window.openDetail(_currentDetailId);
                }, 1000);
            } else {
                alert(json.message || 'Save failed');
                btn.textContent = 'Save';
                btn.disabled = false;
            }
        } catch {
            alert('Network error');
            btn.textContent = 'Save';
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

        let h = dsecStart('style', 'Style Information');

        if (hasODM) {
            h += '<div class="adm-divider"><span class="adm-divider-tag odm">ODM</span> Selected Styles</div>';
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
            h += '<div class="adm-divider"><span class="adm-divider-tag oem">OEM</span> Custom Design</div>';
            h += dkv('Project Name', esc(d.oem_project));
            h += dkv('Style Count', d.oem_style_count || '-');
            if (d.oem_project_desc) h += dkv('Project Description', esc(d.oem_project_desc));
            if (Array.isArray(oemDescs) && oemDescs.length) {
                h += '<div class="adm-sub-label">Style Descriptions</div>';
                oemDescs.forEach((desc, i) => {
                    h += dkv('style(s) ' + (i + 1), esc(typeof desc === 'object' ? JSON.stringify(desc) : desc));
                });
            }
            const oemFiles = fileMap['oem'] || [];
            const oemDesignFiles = oemFiles.filter(f => f.sub_key !== 'size');
            const oemSizeFiles = oemFiles.filter(f => f.sub_key === 'size');
            if (oemDesignFiles.length) h += renderInlineFiles(oemDesignFiles, 'Design Files');
            if (oemSizeFiles.length || d.oem_size_remark) {
                if (d.oem_size_remark) h += dkv('Size Description', esc(d.oem_size_remark));
                if (oemSizeFiles.length) h += renderInlineFiles(oemSizeFiles, 'Size Files');
            }
            if (d.oem_remark) h += dkv('Remark', esc(d.oem_remark));
            if (d.oem_physical_sample) {
                h += dkv('Sample Shipping', '<span style="color:#16a34a;font-weight:600">● Shipped</span>' +
                    (d.oem_tracking_no ? ' Tracking #: ' + esc(d.oem_tracking_no) : ''));
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
        let h = dsecStart('fabric', 'Fabric Information');
        const fnMap = _fabricNameMap || {};

        Object.keys(fab).forEach(catKey => {
            const cat = fab[catKey];
            if (!cat || !cat.configs) return;
            const originalCat = cat.originalCatNameEn || fnMap[cat.originalCatName] || cat.originalCatName || catKey;
            const configs = cat.configs;

            Object.keys(configs).forEach(fabricName => {
                const cfg = configs[fabricName];
                if (!cfg) return;
                const isCS = fabricName === 'CUSTOM_SOURCING';
                const mode = isCS ? 'custom' : (cfg.mode || 'solid');
                const modeLabel = { solid: 'Solid', print: 'Print', custom: 'Dev / Sourcing' }[mode] || mode;
                const fabricDisplayName = cfg.nameEn || fnMap[fabricName] || fabricName;
                const cardTitle = isCS ? originalCat : fabricDisplayName;

                h += '<div class="adm-fabric-card">';
                h += '<div class="adm-fabric-head"><strong>' + esc(cardTitle) + '</strong>';
                if (!isCS) h += '<span class="adm-chip">' + esc(originalCat) + '</span>';
                h += '<span class="adm-chip accent">' + modeLabel + '</span></div>';

                if (cfg.comp) h += dkv('Composition', esc(cfg.comp));
                if (cfg.gsm) h += dkv('Weight (GSM)', esc(cfg.gsm + (!/g/i.test(cfg.gsm) ? ' g/m²' : '')));

                if (mode === 'solid' && Array.isArray(cfg.colors) && cfg.colors.length) {
                    h += '<div class="adm-color-list">';
                    cfg.colors.forEach(c => {
                        h += '<span class="adm-color-swatch"><span class="adm-color-dot" style="background:' + esc(c.hex || '#ccc') + '"></span>' + esc(c.name || '-') + '</span>';
                    });
                    h += '</div>';
                    if (cfg.colorText) h += dkv('Color Description', esc(cfg.colorText));
                } else if (mode === 'print') {
                    if (cfg.printType) h += dkv('Print Type', cfg.printType === 'seamless' ? 'All-over Print' : 'Placement Print');
                    const printKey = catKey + '__' + fabricName + '__print';
                    let printFiles = fabricFiles.filter(f => f.sub_key === printKey);
                    if (!printFiles.length) {
                        const baseKey = catKey + '__' + fabricName;
                        printFiles = fabricFiles.filter(f => f.sub_key === baseKey && f.mime_type && f.mime_type.indexOf('image/') === 0);
                    }
                    if (printFiles.length) h += renderInlineFiles(printFiles, 'Print Pattern');
                    if (cfg.printRefColor) h += dkv('Reference Base Color', esc(cfg.printRefColor));
                    if (cfg.printScale) h += dkv('Scale Ratio', esc(cfg.printScale));
                } else if (mode === 'custom') {
                    if (cfg.customDesc) h += dkv('Requirement Description', esc(cfg.customDesc));
                    if (cfg.colorReq) h += dkv('Color Requirement', esc(cfg.colorReq));
                    if (cfg.physical) h += dkv('Physical Mail', 'Yes' + (cfg.trackingNo ? ' (Tracking #: ' + esc(cfg.trackingNo) + '）' : ''));
                }

                if (cfg.remark) h += dkv('Remark', esc(cfg.remark));

                const subKey = catKey + '__' + fabricName;
                let matched = fabricFiles.filter(f => f.sub_key === subKey);
                if (mode === 'print') {
                    const printKey2 = catKey + '__' + fabricName + '__print';
                    const printIds = {};
                    fabricFiles.filter(f => f.sub_key === printKey2).forEach(f => { printIds[f.id] = true; });
                    matched = matched.filter(f => !printIds[f.id]);
                }
                if (matched.length) h += renderInlineFiles(matched, 'Reference Files');
                h += '</div>';
            });
        });

        // CMT fabric
        const cmtData = tryParse(d.cmt_enabled);
        const fabricCmt = cmtData && cmtData.fabric;
        const fabricCmtEnabled = fabricCmt === true || (fabricCmt && fabricCmt.enabled);
        if (fabricCmtEnabled) {
            h += '<div class="adm-cmt-block"><div class="adm-cmt-title">Customer-supplied Fabric (CMT)</div>';
            if (fabricCmt && fabricCmt.desc) h += dkv('Detail Description', esc(fabricCmt.desc));
            if (fabricCmt && fabricCmt.trackingNo) h += dkv('Shipping Tracking #', esc(fabricCmt.trackingNo));
            if (cmtFabricFiles.length) h += renderInlineFiles(cmtFabricFiles, 'Reference Files');
            h += '</div>';
        }

        h += dsecEnd();
        return h;
    }

    function renderTrimsSection(d, fileMap) {
        const trimDefs = [
            { key: 'metal_config', cat: 'metal', name: 'Metal Hardware' },
            { key: 'pad_config', cat: 'pad', name: 'Padding' },
            { key: 'bag_config', cat: 'bag', name: 'Packaging Bag' },
            { key: 'hangtag_config', cat: 'hangtag', name: 'Hang Tag' },
            { key: 'label_config', cat: 'label', name: 'Label' },
            { key: 'hygiene_config', cat: 'hygiene', name: 'Hygiene Sticker' },
            { key: 'other_config', cat: 'other', name: 'Other' }
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

            if (v.mode) ch += dkv('Mode', v.mode === 'auto' ? 'Hongxiu Standard' : 'Customer Customized');

            // Render config fields based on type
            if (td.key === 'metal_config') {
                if (v.finish) ch += dkv('Surface Finish', esc(v.finish));
                ch += inlineByKey('sourceFiles', 'Reference Files');
                if (v.logoCustom) {
                    ch += dkv('Logo Customization', 'Required');
                    if (Array.isArray(v.logoTypes) && v.logoTypes.length) ch += dkv('Logo Type', v.logoTypes.map(esc).join(', '));
                    ch += inlineByKey('logoFiles', 'Logo Files');
                }
                if (v.details && v.categories && v.categories.length) {
                    v.categories.forEach(catName => {
                        const detail = v.details[catName];
                        if (!detail) return;
                        ch += '<div class="adm-sub-label" style="margin-top:8px;font-weight:600">' + esc(catName) + '</div>';
                        if (detail.remark) ch += dkv('Remark', esc(detail.remark));
                        ch += inlineByKey('details__' + catName + '__styleFiles', 'Style Reference');
                        if (detail.logoNeeded) ch += inlineByKey('details__' + catName + '__logoFiles', 'Logo Files');
                    });
                }
            } else if (td.key === 'pad_config') {
                if (v.thickness) ch += dkv('Thickness', esc(v.thickness));
                if (v.color) ch += dkv('Color', esc(v.color === 'Other Custom Color' && v.otherColor ? v.otherColor + ' (Custom)' : v.color));
                if (v.customShape) ch += dkv('Custom Shape', 'Yes' + (v.shapeRemark ? '（' + esc(v.shapeRemark) + '）' : ''));
                ch += inlineByKey('shapeFiles', 'Shape Reference');
                ch += inlineByKey('otherFiles', 'Other Reference');
            } else if (td.key === 'bag_config') {
                if (v.material) ch += dkv('Material', esc(v.material));
                if (v.size) ch += dkv('Size', esc(v.size));
                if (v.print) ch += dkv('Print', esc(v.print));
                if (Array.isArray(v.crafts) && v.crafts.length) ch += dkv('Craft', v.crafts.map(esc).join(', '));
                ch += inlineByKey('designFiles', 'Design Files');
            } else if (td.key === 'hangtag_config') {
                if (v.remark) ch += dkv('Design Description', esc(v.remark));
                ch += inlineByKey('designFiles', 'Design Files');
                if (v.mode !== 'auto') {
                    if (v.material) ch += dkv('Material', esc(v.material === 'Other' && v.materialRemark ? v.materialRemark + '（Other）' : v.material));
                    if (v.weight) ch += dkv('Weight (GSM)', esc(v.weight));
                    if (v.shape) ch += dkv('Shape', esc(v.shape));
                    if (Array.isArray(v.crafts) && v.crafts.length) ch += dkv('Craft', v.crafts.map(esc).join(', '));
                    ch += inlineByKey('stringFiles', 'String Reference');
                }
            } else if (td.key === 'label_config') {
                if (v.remark) ch += dkv('Design Description', esc(v.remark));
                ch += inlineByKey('designFiles', 'Design Files');
                if (v.mode !== 'auto') {
                    if (v.material) ch += dkv('Material', esc(v.material));
                    if (v.size) ch += dkv('Size', esc(v.size));
                    if (v.method) ch += dkv('Sewing Method', esc(v.method));
                    if (Array.isArray(v.components) && v.components.length) ch += dkv('Components', v.components.map(esc).join(', '));
                }
            } else if (td.key === 'hygiene_config') {
                if (v.material) ch += dkv('Material', esc(v.material));
                if (v.shape) ch += dkv('Shape', esc(v.shape));
                if (v.size) ch += dkv('Size', esc(v.size));
                ch += inlineByKey('designFiles', 'Print Design');
            } else if (td.key === 'other_config') {
                ch += inlineByKey('files', 'Reference Attachments');
            }

            if (v.remark && td.key !== 'hangtag_config' && td.key !== 'label_config') ch += dkv('Remark', esc(v.remark));

            // CMT
            if (cmtEnabled) {
                ch += '<div class="adm-cmt-block"><div class="adm-cmt-title">Customer-supplied (CMT)</div>';
                if (cmtInfo && cmtInfo.desc) ch += dkv('Detail Description', esc(cmtInfo.desc));
                if (cmtInfo && cmtInfo.trackingNo) ch += dkv('Shipping Tracking #', esc(cmtInfo.trackingNo));
                if (cmtFiles.length) ch += renderInlineFiles(cmtFiles, 'Reference Files');
                ch += '</div>';
            }

            // Remaining files
            const remainTrim = trimFiles.filter(f => !shownFileIds[f.id]);
            if (remainTrim.length) ch += renderInlineFiles(remainTrim, 'Other Files');
            ch += '</div>';
            cards.push(ch);
        });

        if (!cards.length) return '';
        let h = dsecStart('trims', 'Trims / Packaging', cards.length + ' item(s)');
        h += '<div class="adm-trim-grid">' + cards.join('') + '</div>';
        h += dsecEnd();
        return h;
    }

    function renderShippingSection(d, fileMap) {
        let h = dsecStart('shipping', 'Delivery Information');
        h += dkv('Delivery Mode', '<span class="adm-chip accent">' + (d.delivery_mode === 'bulk' ? 'Bulk Order' : 'Sample Order') + '</span>');

        if (d.delivery_mode !== 'bulk') {
            const sampleRows = tryParse(d.sample_rows);
            if (Array.isArray(sampleRows) && sampleRows.length) {
                h += '<div class="adm-sub-label" style="margin-top:12px">Sample Details</div>';
                h += '<table class="adm-detail-table"><thead><tr><th>Style</th><th>Type</th><th>Size</th><th>Qty</th><th>Remark</th></tr></thead><tbody>';
                sampleRows.forEach(r => {
                    h += '<tr><td>' + esc(r.style) + '</td><td>' + esc(r.type) + '</td><td>' + esc(r.size) + '</td><td>' + esc(r.qty) + '</td><td>' + esc(r.desc || '-') + '</td></tr>';
                });
                h += '</tbody></table>';
            }
            const sc = tryParse(d.sample_config);
            if (sc && typeof sc === 'object') {
                if (sc.carrier) h += dkv('Shipping Method', esc(sc.carrier));
                if (sc.needBulkQuote) {
                    h += dkv('Need Bulk Quote', 'Yes');
                    if (sc.intentQty) h += dkv('Estimated Qty', esc(sc.intentQty) + ' pcs');
                    if (sc.intentPrice) h += dkv('Target Unit Price', '$' + esc(sc.intentPrice));
                }
            }
            if (d.sample_dest) h += dkv('Destination', esc(d.sample_dest));
        } else {
            const bulkRows = tryParse(d.bulk_rows);
            if (Array.isArray(bulkRows) && bulkRows.length) {
                h += '<div class="adm-sub-label" style="margin-top:12px">Bulk Details</div>';
                h += '<table class="adm-detail-table"><thead><tr><th>Style</th><th>Qty</th><th>Size Allocation</th><th>Remark</th></tr></thead><tbody>';
                bulkRows.forEach(r => {
                    h += '<tr><td>' + esc(r.style) + '</td><td>' + esc(r.qty) + '</td><td>' + esc(r.sizeDetail || '-') + '</td><td>' + esc(r.desc || '-') + '</td></tr>';
                });
                h += '</tbody></table>';
            }
            const bl = tryParse(d.bulk_logistics);
            if (bl && typeof bl === 'object') {
                if (bl.term) h += dkv('Trade Terms', esc(bl.term));
                if (bl.method) h += dkv('Transport Method', esc(bl.method));
            }
            if (d.bulk_dest) h += dkv('Destination', esc(d.bulk_dest));
            if (d.bulk_target_price) h += dkv('Target Price', esc(d.bulk_target_price));
            if (d.bulk_packing_remark) h += dkv('Packaging Remark', esc(d.bulk_packing_remark));
            const bpFiles = fileMap['bulkPacking'] || [];
            if (bpFiles.length) h += renderInlineFiles(bpFiles, 'Packaging Reference Files');
        }

        const fdFiles = fileMap['finalDocs'] || [];
        if (fdFiles.length) h += renderInlineFiles(fdFiles, 'Comprehensive Tech Pack / Plan');

        h += dsecEnd();
        return h;
    }

    function renderContactSection(d) {
        if (!d.contact_name && !d.brand_name) return '';
        let h = dsecStart('contact', 'Contact Information');
        if (d.contact_name) h += dkv('Contact Name', esc(d.contact_name));
        if (d.contact_info) h += dkv('Contact Info', esc(d.contact_info));
        if (d.brand_name) h += dkv('Brand Name', esc(d.brand_name));
        if (d.website) h += dkv('Website', '<a href="' + esc(d.website) + '" target="_blank" rel="noopener noreferrer">' + esc(d.website) + '</a>');
        if (d.final_remark) h += dkv('General Remark', esc(d.final_remark));
        if (d.nda_agreed_at) h += dkv('NDA Signed', '✓ Signed ' + fmtDate(d.nda_agreed_at));
        h += dsecEnd();
        return h;
    }

    function renderFilesSection(files, title) {
        if (!files || !files.length) return '';
        let h = dsecStart('files', title || 'file(s)', files.length + ' file(s)');
        h += '<div class="adm-file-grid">';
        files.forEach(f => { h += renderFileItem(f); });
        h += '</div>';
        h += dsecEnd();
        return h;
    }

    function renderAdminActionForm(d) {
        const statusOpts = [
            { val: 'pending', label: 'Pending' },
            { val: 'processing', label: 'Processing' },
            { val: 'quoted', label: 'Quoted' },
            { val: 'closed', label: 'Closed' }
        ];
        const curStatus = d.status || 'pending';

        let h = '<div class="adm-sec adm-action-sec"><div class="adm-sec-head"><h4>📋 Admin Actions</h4></div><div class="adm-sec-body">';

        // Status
        h += '<div class="adm-form-row"><label class="adm-form-label">Inquiry Status</label>';
        h += '<select id="adminStatusSelect" class="adm-form-select">';
        statusOpts.forEach(o => {
            h += '<option value="' + o.val + '"' + (curStatus === o.val ? ' selected' : '') + '>' + o.label + '</option>';
        });
        h += '</select></div>';

        // Admin reply
        h += '<div class="adm-form-row"><label class="adm-form-label">Inquiry Response</label>';
        h += '<textarea id="adminReplyInput" class="adm-form-textarea" rows="4" placeholder="Enter response to client...">' + esc(d.admin_reply || '') + '</textarea></div>';

        // Project link
        h += '<div class="adm-form-row"><label class="adm-form-label">Project Link</label>';
        h += '<input type="text" id="adminProjectLink" class="adm-form-input" placeholder="Enter project link URL" value="' + esc(d.project_link || '') + '"></div>';

        // Project token
        h += '<div class="adm-form-row"><label class="adm-form-label">Project Token</label>';
        h += '<input type="text" id="adminProjectToken" class="adm-form-input" placeholder="Enter project access token" value="' + esc(d.project_token || '') + '"></div>';

        // Save button
        h += '<div class="adm-form-row adm-form-actions"><button id="adminSaveBtn" class="adm-btn adm-btn-save" onclick="saveAdminAction()">Save</button></div>';

        h += '</div></div>';
        return h;
    }

    function renderTimelineSection(d) {
        let h = dsecStart('time', 'Timeline');
        h += '<div class="adm-timeline">';
        h += '<div class="adm-timeline-item"><span class="adm-timeline-dot"></span><strong>' + fmtDate(d.created_at) + '</strong> Inquiry Created</div>';
        if (d.modified_at && d.modified_at !== d.created_at) {
            h += '<div class="adm-timeline-item"><span class="adm-timeline-dot muted"></span><strong>' + fmtDate(d.modified_at) + '</strong> Last Updated</div>';
        }
        if (d.deleted_at) {
            h += '<div class="adm-timeline-item"><span class="adm-timeline-dot danger"></span><strong>' + fmtDate(d.deleted_at) + '</strong> Deleted</div>';
        }
        h += '</div>';
        h += dsecEnd();
        return h;
    }
})();
