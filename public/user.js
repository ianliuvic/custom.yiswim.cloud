/* ============ User Center ============ */
(function () {
    'use strict';

    const FILE_BASE = 'https://files.yiswim.cloud/uploads/inquiries/';
    let currentPage = 1;

    /* ---------- Tab switching ---------- */
    window.switchTab = function (tab) {
        document.querySelectorAll('.u-tab').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.u-menu-item').forEach(el => el.classList.remove('active'));
        document.getElementById('tab-' + tab).classList.add('active');
        document.querySelector('.u-menu-item[data-tab="' + tab + '"]').classList.add('active');
        if (tab === 'inquiries') closeDetail();
    };

    /* ---------- Language ---------- */
    window.setLanguage = function (lng) {
        document.cookie = 'lng=' + lng + ';path=/;max-age=31536000';
        location.reload();
    };

    /* ---------- Inquiry list ---------- */
    window.loadInquiries = async function (page) {
        page = page || 1;
        currentPage = page;
        const listEl = document.getElementById('inquiry-list');
        const pagEl = document.getElementById('inquiry-pagination');
        listEl.innerHTML = '<div class="u-loading">加载中...</div>';
        pagEl.innerHTML = '';

        try {
            const res = await fetch('/api/my-inquiries?page=' + page);
            const json = await res.json();
            if (!json.success) throw new Error(json.message);

            const rows = json.data;
            const pag = json.pagination;

            if (rows.length === 0) {
                listEl.innerHTML =
                    '<div class="u-empty">' +
                    '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
                    '<p>暂无询盘记录</p>' +
                    '<a href="/" class="u-btn-primary">+ 新建询盘</a>' +
                    '</div>';
                return;
            }

            listEl.innerHTML = rows.map(function (r) {
                var desc = buildDesc(r);
                return (
                    '<div class="u-inquiry-card" onclick="openDetail(' + r.id + ')">' +
                    '<div class="u-inquiry-card-left">' +
                    '<div class="u-inquiry-no">' + esc(r.inquiry_no) + '</div>' +
                    '<div class="u-inquiry-meta">' + desc + '</div>' +
                    '</div>' +
                    '<div class="u-inquiry-card-right">' +
                    '<span class="u-status-tag u-status-' + esc(r.status) + '">' + statusLabel(r.status) + '</span>' +
                    '<span style="font-size:12px;color:#94a3b8">' + fmtDate(r.created_at) + '</span>' +
                    '</div>' +
                    '</div>'
                );
            }).join('');

            // pagination
            if (pag.totalPages > 1) {
                var btns = '';
                btns += '<button class="u-page-btn" onclick="loadInquiries(' + (page - 1) + ')"' + (page <= 1 ? ' disabled' : '') + '>&lsaquo;</button>';
                for (var i = 1; i <= pag.totalPages; i++) {
                    btns += '<button class="u-page-btn' + (i === page ? ' active' : '') + '" onclick="loadInquiries(' + i + ')">' + i + '</button>';
                }
                btns += '<button class="u-page-btn" onclick="loadInquiries(' + (page + 1) + ')"' + (page >= pag.totalPages ? ' disabled' : '') + '>&rsaquo;</button>';
                pagEl.innerHTML = btns;
            }
        } catch (e) {
            listEl.innerHTML = '<div class="u-loading" style="color:#dc2626">加载失败：' + esc(e.message) + '</div>';
        }
    };

    function buildDesc(r) {
        var parts = [];
        // ODM styles count
        var odm = tryParse(r.odm_styles);
        if (Array.isArray(odm) && odm.length) parts.push('ODM: ' + odm.length + '款');
        // OEM
        if (r.oem_project) parts.push('OEM: ' + esc(r.oem_project));
        if (r.oem_style_count) parts.push(r.oem_style_count + '款');
        // contact / brand
        if (r.brand_name) parts.push(esc(r.brand_name));
        if (r.contact_name) parts.push(esc(r.contact_name));
        // delivery
        if (r.delivery_mode) parts.push(r.delivery_mode === 'bulk' ? '大货' : '样衣');
        return parts.map(function (p) { return '<span>' + p + '</span>'; }).join('');
    }

    /* ---------- Detail ---------- */
    window.openDetail = async function (id) {
        var listEl = document.getElementById('inquiry-list');
        var pagEl = document.getElementById('inquiry-pagination');
        var titleEl = document.querySelector('.u-page-title');
        var panel = document.getElementById('inquiry-detail');
        var titleH = document.getElementById('detail-title');
        var statusEl = document.getElementById('detail-status');
        var statsEl = document.getElementById('detail-stats');
        var content = document.getElementById('detail-content');

        listEl.style.display = 'none';
        pagEl.style.display = 'none';
        titleEl.style.display = 'none';
        panel.style.display = 'block';
        content.innerHTML = '<div class="u-loading">加载中...</div>';
        statsEl.innerHTML = '';

        try {
            var res = await fetch('/api/inquiry/' + id);
            var json = await res.json();
            if (!json.success) throw new Error(json.message);

            var d = json.data;
            titleH.textContent = d.inquiry_no;
            statusEl.className = 'u-status-tag u-status-' + d.status;
            statusEl.textContent = statusLabel(d.status);

            // Summary stats bar
            var stats = [];
            if (d.delivery_mode) stats.push(pill('truck', d.delivery_mode === 'bulk' ? '大货订单' : '样衣订单'));
            if (d.brand_name) stats.push(pill('tag', d.brand_name));
            if (d.contact_name) stats.push(pill('user', d.contact_name));
            var odmArr = tryParse(d.odm_styles);
            if (Array.isArray(odmArr) && odmArr.length) stats.push(pill('style', 'ODM ' + odmArr.length + ' 款'));
            if (d.oem_project) stats.push(pill('style', 'OEM ' + (d.oem_style_count || 0) + ' 款'));
            if (d.files && d.files.length) stats.push(pill('file', d.files.length + ' 个附件'));
            statsEl.innerHTML = stats.join('');

            var html = '';

            // ─── Section 1: Styles ───
            html += renderStyleSection(d);

            // ─── Section 2: Fabric ───
            html += renderFabricSection(d);

            // ─── Section 3: Trims ───
            html += renderTrimsSection(d);

            // ─── Section 4: Shipping ───
            html += renderShippingSection(d);

            // ─── Section 5: Contact ───
            html += renderContactSection(d);

            // ─── Files ───
            if (d.files && d.files.length) html += renderFilesSection(d.files);

            // ─── Timeline ───
            html += renderTimelineSection(d);

            content.innerHTML = html;
        } catch (e) {
            content.innerHTML = '<div class="u-loading" style="color:#dc2626">加载失败：' + esc(e.message) + '</div>';
        }
    };

    /* ── Section Renderers ── */

    function renderStyleSection(d) {
        var odmArr = tryParse(d.odm_styles);
        var odmCustom = tryParse(d.odm_custom_data);
        var oemDescs = tryParse(d.oem_descriptions);
        var oemCk = tryParse(d.oem_checklist);
        var hasODM = Array.isArray(odmArr) && odmArr.length;
        var hasOEM = d.oem_project;
        if (!hasODM && !hasOEM) return '';

        var h = secStart('style', '款式信息');

        // ODM
        if (hasODM) {
            h += '<div class="u-sub-label">ODM 已选款式</div>';
            h += '<div class="u-style-grid">';
            odmArr.forEach(function (name) {
                var remark = '';
                if (odmCustom && typeof odmCustom === 'object') {
                    var key = typeof name === 'object' ? (name.name || name.id || '') : name;
                    var cd = odmCustom[key];
                    if (cd && cd.remark) remark = cd.remark;
                }
                var displayName = typeof name === 'object' ? (name.name || name.id || JSON.stringify(name)) : name;
                h += '<div class="u-style-card">' +
                    '<div class="u-style-card-name">' + esc(displayName) + '</div>' +
                    (remark ? '<div class="u-style-card-remark">' + esc(remark) + '</div>' : '') +
                    '</div>';
            });
            h += '</div>';
        }

        // OEM
        if (hasOEM) {
            if (hasODM) h += '<div style="height:16px"></div>';
            h += '<div class="u-sub-label">OEM 自主设计</div>';
            h += kv('项目名称', esc(d.oem_project));
            h += kv('款式数量', d.oem_style_count || '-');
            if (Array.isArray(oemDescs) && oemDescs.length) {
                h += '<div class="u-sub-label" style="margin-top:12px">款式描述</div>';
                h += '<div class="u-style-grid">';
                oemDescs.forEach(function (desc, i) {
                    h += '<div class="u-style-card">' +
                        '<div class="u-style-card-name">款 ' + (i + 1) + '</div>' +
                        '<div class="u-style-card-remark">' + esc(typeof desc === 'object' ? JSON.stringify(desc) : desc) + '</div>' +
                        '</div>';
                });
                h += '</div>';
            }
            if (Array.isArray(oemCk) && oemCk.length) {
                h += '<div class="u-sub-label" style="margin-top:12px">已确认条目</div>';
                h += '<div class="u-check-list">';
                oemCk.forEach(function (item) {
                    var label = typeof item === 'object' ? (item.label || item.name || JSON.stringify(item)) : item;
                    h += '<div class="u-check-item"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>' + esc(label) + '</div>';
                });
                h += '</div>';
            }
            if (d.oem_remark) h += kv('备注', esc(d.oem_remark));
        }

        h += secEnd();
        return h;
    }

    function renderFabricSection(d) {
        var fab = tryParse(d.fabric_selection);
        if (!fab || typeof fab !== 'object' || !Object.keys(fab).length) return '';

        var h = secStart('fabric', '面料信息');

        Object.keys(fab).forEach(function (catKey) {
            var cat = fab[catKey];
            if (!cat || !cat.configs) return;
            var catName = cat.activeName || cat.originalCatName || catKey;
            var configs = cat.configs;

            Object.keys(configs).forEach(function (fabricName) {
                var cfg = configs[fabricName];
                if (!cfg) return;
                var mode = cfg.mode || 'solid';
                var modeLabel = { solid: '纯色', print: '印花', custom: '开发/找样' }[mode] || mode;

                h += '<div class="u-fabric-card">';
                h += '<div class="u-fabric-card-head"><strong>' + esc(fabricName) + '</strong><span class="u-fabric-mode ' + mode + '">' + modeLabel + '</span></div>';

                if (mode === 'solid') {
                    // Colors
                    var colors = cfg.colors;
                    if (Array.isArray(colors) && colors.length) {
                        h += '<div class="u-color-list">';
                        colors.forEach(function (c) {
                            h += '<div class="u-color-swatch">' +
                                '<div class="u-color-dot" style="background:' + esc(c.hex || '#ccc') + '"></div>' +
                                '<div class="u-color-text">' + esc(c.name || '-') +
                                (c.pantone ? '<small>' + esc(c.pantone) + '</small>' : '') +
                                '</div></div>';
                        });
                        h += '</div>';
                    }
                    if (cfg.colorText) h += kv('色彩描述', esc(cfg.colorText));
                } else if (mode === 'print') {
                    if (cfg.printType) h += kv('印花类型', cfg.printType === 'seamless' ? '满版印花' : '定位印花');
                    if (cfg.printRefColor) h += kv('参考底色', esc(cfg.printRefColor));
                    if (cfg.printScale) h += kv('缩放比例', esc(cfg.printScale));
                } else if (mode === 'custom') {
                    if (cfg.customDesc) h += kv('需求描述', esc(cfg.customDesc));
                    if (cfg.comp) h += kv('成分', esc(cfg.comp));
                    if (cfg.gsm) h += kv('克重', esc(cfg.gsm) + ' g/m²');
                    if (cfg.colorReq) h += kv('颜色要求', esc(cfg.colorReq));
                    if (cfg.physical) h += kv('实物邮寄', '是' + (cfg.trackingNo ? '（单号：' + esc(cfg.trackingNo) + '）' : ''));
                }

                if (cfg.fullLining != null) h += kv('全衬里', cfg.fullLining ? '是' : '否');
                if (cfg.liningPlacement) h += kv('衬里位置', esc(cfg.liningPlacement));
                if (cfg.remark) h += kv('备注', esc(cfg.remark));

                h += '</div>';
            });
        });

        h += secEnd();
        return h;
    }

    function renderTrimsSection(d) {
        var cmt = tryParse(d.cmt_enabled);
        var trimDefs = [
            { key: 'metal_config', name: '五金配件', icon: '⚙️' },
            { key: 'pad_config', name: '胸垫', icon: '🧵' },
            { key: 'bag_config', name: '包装袋', icon: '👜' },
            { key: 'hangtag_config', name: '吊牌', icon: '🏷️' },
            { key: 'label_config', name: '标签', icon: '📋' },
            { key: 'hygiene_config', name: '卫生贴', icon: '🩹' },
            { key: 'other_config', name: '其他', icon: '📦' }
        ];

        var cards = [];
        trimDefs.forEach(function (td) {
            var val = tryParse(d[td.key]);
            if (!val || typeof val !== 'object' || !Object.keys(val).length) return;
            cards.push(renderOneTrimCard(td, val));
        });
        if (cards.length === 0) return '';

        var h = secStart('trims', '辅料 / 包装', cards.length + ' 项');
        h += '<div class="u-trim-grid">' + cards.join('') + '</div>';
        h += secEnd();
        return h;
    }

    function renderOneTrimCard(td, val) {
        var h = '<div class="u-trim-card">';
        h += '<div class="u-trim-card-head"><div class="u-trim-dot on"></div>' + td.icon + ' ' + td.name + '</div>';

        var mode = val.mode;
        if (mode) h += kv('模式', mode === 'auto' ? '红绣标配' : '客户自定义');

        // Common fields handling by type
        switch (td.key) {
            case 'metal_config':
                if (val.finish) h += kv('表面处理', esc(val.finish));
                if (val.logoCustom) {
                    h += kv('LOGO', '需要定制');
                    if (Array.isArray(val.logoTypes) && val.logoTypes.length) h += kv('LOGO类型', val.logoTypes.map(esc).join(', '));
                }
                break;
            case 'pad_config':
                if (val.thickness) h += kv('厚度', esc(val.thickness));
                if (val.color) h += kv('颜色', esc(val.color === 'others' && val.otherColor ? val.otherColor : val.color));
                if (val.customShape) h += kv('异形', '是' + (val.shapeRemark ? '（' + esc(val.shapeRemark) + '）' : ''));
                break;
            case 'bag_config':
                if (val.material) h += kv('材质', esc(val.material));
                if (val.size) h += kv('尺寸', esc(val.size));
                if (val.print) h += kv('印刷', esc(val.print));
                if (Array.isArray(val.crafts) && val.crafts.length) h += kv('工艺', val.crafts.map(esc).join(', '));
                break;
            case 'hangtag_config':
                if (val.material) h += kv('材质', esc(val.material));
                if (val.weight) h += kv('克重', esc(val.weight));
                if (val.shape) h += kv('形状', esc(val.shape));
                if (val.roundedCorner) h += kv('圆角', '是');
                if (Array.isArray(val.crafts) && val.crafts.length) h += kv('工艺', val.crafts.map(esc).join(', '));
                if (val.stringType) h += kv('吊绳', esc(val.stringType));
                if (val.stringColor) h += kv('绳色', esc(val.stringColor));
                if (val.isSet) h += kv('副牌', '有' + (val.setRemark ? '（' + esc(val.setRemark) + '）' : ''));
                break;
            case 'label_config':
                if (val.material) h += kv('材质', esc(val.material));
                if (val.size) h += kv('尺寸', esc(val.size));
                if (val.method) h += kv('缝制方式', esc(val.method));
                if (Array.isArray(val.components) && val.components.length) h += kv('部件', val.components.map(esc).join(', '));
                if (val.placements) {
                    Object.keys(val.placements).forEach(function (k) {
                        h += kv('位置 (' + esc(k) + ')', esc(val.placements[k]));
                    });
                }
                if (val.isSplit) h += kv('分体标', '是' + (val.splitRemark ? '（' + esc(val.splitRemark) + '）' : ''));
                break;
            case 'hygiene_config':
                if (val.material) h += kv('材质', esc(val.material));
                if (val.shape) h += kv('形状', esc(val.shape));
                if (val.size) h += kv('尺寸', esc(val.size));
                if (val.noApply) h += kv('免粘贴', '是');
                if (val.shapeRemark) h += kv('异形要求', esc(val.shapeRemark));
                if (val.applyRemark) h += kv('粘贴规则', esc(val.applyRemark));
                break;
            case 'other_config':
                // Simple remark
                break;
        }

        if (val.remark) h += kv('备注', esc(val.remark));
        h += '</div>';
        return h;
    }

    function renderShippingSection(d) {
        var h = secStart('shipping', '交付信息');

        h += kv('交付模式', '<span class="u-chip accent">' + (d.delivery_mode === 'bulk' ? '大货订单' : '样衣订单') + '</span>');

        // Sample rows
        var sampleRows = tryParse(d.sample_rows);
        if (Array.isArray(sampleRows) && sampleRows.length) {
            h += '<div class="u-sub-label" style="margin-top:16px">样衣明细</div>';
            h += '<div class="u-table-wrap"><table class="u-table"><thead><tr>' +
                '<th>款式</th><th>类型</th><th>尺码</th><th>数量</th><th>备注</th>' +
                '</tr></thead><tbody>';
            sampleRows.forEach(function (r) {
                h += '<tr><td>' + esc(r.style) + '</td><td>' + esc(r.type) + '</td>' +
                    '<td>' + esc(r.size) + '</td><td>' + esc(r.qty) + '</td>' +
                    '<td>' + esc(r.desc || '-') + '</td></tr>';
            });
            h += '</tbody></table></div>';
        }

        // Sample config
        var sampleCfg = tryParse(d.sample_config);
        if (sampleCfg && typeof sampleCfg === 'object' && Object.keys(sampleCfg).length) {
            h += '<div class="u-sub-label" style="margin-top:16px">样衣物流</div>';
            if (sampleCfg.carrier) h += kv('物流方式', esc(sampleCfg.carrier));
            if (sampleCfg.needBulkQuote) h += kv('需大货报价', '是');
            if (sampleCfg.intentTerm) h += kv('贸易术语', esc(sampleCfg.intentTerm));
            if (sampleCfg.intentMethod) h += kv('运输方式', esc(sampleCfg.intentMethod));
        }
        if (d.sample_dest) h += kv('样衣目的地', esc(d.sample_dest));

        // Bulk rows
        var bulkRows = tryParse(d.bulk_rows);
        if (Array.isArray(bulkRows) && bulkRows.length) {
            h += '<div class="u-sub-label" style="margin-top:16px">大货明细</div>';
            h += '<div class="u-table-wrap"><table class="u-table"><thead><tr>' +
                '<th>款式</th><th>数量</th><th>尺码分配</th><th>备注</th>' +
                '</tr></thead><tbody>';
            bulkRows.forEach(function (r) {
                h += '<tr><td>' + esc(r.style) + '</td><td>' + esc(r.qty) + '</td>' +
                    '<td>' + esc(r.sizeDetail || '-') + '</td>' +
                    '<td>' + esc(r.desc || '-') + '</td></tr>';
            });
            h += '</tbody></table></div>';
        }

        // Bulk logistics
        var bulkLog = tryParse(d.bulk_logistics);
        if (bulkLog && typeof bulkLog === 'object' && Object.keys(bulkLog).length) {
            h += '<div class="u-sub-label" style="margin-top:16px">大货物流</div>';
            if (bulkLog.term) h += kv('贸易术语', esc(bulkLog.term));
            if (bulkLog.method) h += kv('运输方式', esc(bulkLog.method));
        }
        if (d.bulk_dest) h += kv('大货目的地', esc(d.bulk_dest));
        if (d.bulk_target_price) h += kv('目标价格', esc(d.bulk_target_price));
        if (d.bulk_packing_remark) h += kv('包装备注', esc(d.bulk_packing_remark));

        h += secEnd();
        return h;
    }

    function renderContactSection(d) {
        if (!d.contact_name && !d.brand_name) return '';

        var h = secStart('contact', '联系信息');
        if (d.contact_name) h += kv('联系人', esc(d.contact_name));
        if (d.contact_info) h += kv('联系方式', esc(d.contact_info));
        if (d.brand_name) h += kv('品牌名称', esc(d.brand_name));
        if (d.website) h += kv('网站', '<a href="' + esc(d.website) + '" target="_blank" rel="noopener noreferrer">' + esc(d.website) + '</a>');
        if (d.final_remark) h += kv('整体备注', esc(d.final_remark));
        if (d.nda_agreed_at) h += kv('NDA 签署', '<span class="u-check-item" style="display:inline-flex"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>已签署 ' + fmtDate(d.nda_agreed_at) + '</span>');
        h += secEnd();
        return h;
    }

    function renderFilesSection(files) {
        // Group files by category
        var grouped = {};
        files.forEach(function (f) {
            var cat = f.category || 'other';
            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(f);
        });

        var catLabels = { oem: 'OEM 文件', fabric: '面料文件', metal: '五金文件', pad: '胸垫文件', bag: '包装袋文件', hangtag: '吊牌文件', label: '标签文件', hygiene: '卫生贴文件', bulk: '大货文件', final: '最终文件', other: '其他文件' };

        var h = secStart('files', '附件', files.length + ' 个');

        Object.keys(grouped).forEach(function (cat) {
            var label = catLabels[cat] || cat;
            h += '<div class="u-sub-label">' + esc(label) + '</div>';
            h += '<div class="u-file-grid">';
            grouped[cat].forEach(function (f) {
                var url = FILE_BASE + encodeURIComponent(f.stored_name);
                var ext = (f.orig_name || '').split('.').pop().toLowerCase();
                var iconClass = 'other';
                var iconText = ext.toUpperCase();
                if (/^(jpg|jpeg|png|gif|webp|svg)$/.test(ext)) { iconClass = 'img'; iconText = 'IMG'; }
                else if (ext === 'pdf') { iconClass = 'pdf'; iconText = 'PDF'; }
                else if (/^(doc|docx)$/.test(ext)) { iconClass = 'doc'; iconText = 'DOC'; }
                else if (/^(zip|rar)$/.test(ext)) { iconClass = 'zip'; iconText = 'ZIP'; }
                else if (/^(xls|xlsx)$/.test(ext)) { iconClass = 'doc'; iconText = 'XLS'; }
                else if (/^(ai|eps)$/.test(ext)) { iconClass = 'doc'; iconText = 'AI'; }

                var sizeStr = f.size_bytes ? formatSize(f.size_bytes) : '';
                h += '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="u-file-item">' +
                    '<div class="u-file-icon ' + iconClass + '">' + iconText + '</div>' +
                    '<div class="u-file-info"><div class="u-file-name">' + esc(f.orig_name) + '</div>' +
                    '<div class="u-file-meta">' + sizeStr + (f.sub_key ? ' · ' + esc(f.sub_key) : '') + '</div>' +
                    '</div></a>';
            });
            h += '</div>';
        });

        h += secEnd();
        return h;
    }

    function renderTimelineSection(d) {
        var h = '<div class="u-sec"><div class="u-sec-head">' +
            '<div class="u-sec-icon time"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>' +
            '<h4>时间线</h4></div><div class="u-sec-body">';
        h += '<div class="u-timeline">';
        h += '<div class="u-timeline-item"><div class="u-timeline-dot"></div><div class="u-timeline-text"><strong>' + fmtDate(d.created_at) + '</strong>创建询盘</div></div>';
        if (d.modified_at && d.modified_at !== d.created_at) {
            h += '<div class="u-timeline-item"><div class="u-timeline-dot muted"></div><div class="u-timeline-text"><strong>' + fmtDate(d.modified_at) + '</strong>最后更新</div></div>';
        }
        h += '</div></div></div>';
        return h;
    }

    /* ── Section helpers ── */
    var secIcons = {
        style: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.38 3.46L16 2 12 5.5 8 2 3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47c.1.6.4 1.14.82 1.55L12 19l8.32-8.29c.42-.41.72-.95.82-1.55l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>',
        fabric: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 16l4-8 4 5 4-3"/></svg>',
        trims: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
        shipping: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
        contact: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
        files: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
    };

    function secStart(type, title, countText) {
        return '<div class="u-sec"><div class="u-sec-head"><div class="u-sec-icon ' + type + '">' + (secIcons[type] || '') + '</div><h4>' + title + '</h4>' +
            (countText ? '<span class="u-sec-count">' + countText + '</span>' : '') +
            '</div><div class="u-sec-body">';
    }
    function secEnd() { return '</div></div>'; }
    function kv(label, value) {
        return '<div class="u-kv"><div class="u-kv-label">' + label + '</div><div class="u-kv-value">' + (value || '-') + '</div></div>';
    }

    function pill(type, text) {
        var icons = {
            truck: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
            tag: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>',
            user: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
            style: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.38 3.46L16 2 12 5.5 8 2 3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47c.1.6.4 1.14.82 1.55L12 19l8.32-8.29c.42-.41.72-.95.82-1.55l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>',
            file: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
        };
        return '<div class="u-stat-pill">' + (icons[type] || '') + '<strong>' + esc(text) + '</strong></div>';
    }

    function formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    window.closeDetail = function () {
        document.getElementById('inquiry-detail').style.display = 'none';
        document.getElementById('inquiry-list').style.display = '';
        document.getElementById('inquiry-pagination').style.display = '';
        document.querySelector('.u-page-title').style.display = '';
    };

    /* ---------- Change password ---------- */
    window.handleChangePwd = async function (e) {
        e.preventDefault();
        var msg = document.getElementById('pwd-msg');
        var cur = document.getElementById('currentPwd').value;
        var np = document.getElementById('newPwd').value;
        var cp = document.getElementById('confirmPwd').value;

        if (np !== cp) {
            msg.className = 'u-form-msg error';
            msg.textContent = '两次输入的新密码不一致';
            return false;
        }
        if (np.length < 8) {
            msg.className = 'u-form-msg error';
            msg.textContent = '新密码至少需要8位';
            return false;
        }

        msg.className = 'u-form-msg';
        msg.textContent = '提交中...';

        try {
            var res = await fetch('/api/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: cur, newPassword: np })
            });
            var json = await res.json();
            if (json.success) {
                msg.className = 'u-form-msg success';
                msg.textContent = '密码修改成功';
                document.getElementById('changePwdForm').reset();
            } else {
                msg.className = 'u-form-msg error';
                msg.textContent = json.message || '修改失败';
            }
        } catch (err) {
            msg.className = 'u-form-msg error';
            msg.textContent = '网络错误，请重试';
        }
        return false;
    };

    /* ---------- Helpers ---------- */
    function esc(s) {
        if (s == null) return '';
        var d = document.createElement('div');
        d.textContent = String(s);
        return d.innerHTML;
    }

    function tryParse(v) {
        if (v == null) return null;
        if (typeof v === 'object') return v;
        try { return JSON.parse(v); } catch (e) { return v; }
    }

    function fmtDate(s) {
        if (!s) return '-';
        var d = new Date(s);
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    function pad(n) { return n < 10 ? '0' + n : String(n); }

    function statusLabel(s) {
        var m = { pending: '待处理', processing: '处理中', quoted: '已报价', closed: '已关闭' };
        return m[s] || s || '待处理';
    }

    /* ---------- Init ---------- */
    loadInquiries(1);
})();
