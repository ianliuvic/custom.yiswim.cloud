/* ============ User Center ============ */
(function () {
    'use strict';

    const FILE_BASE = 'https://files.yiswim.cloud/uploads/inquiries/';
    let currentPage = 1;
    var _currentInquiryData = null; // 存储当前打开的询盘详情数据

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
                    '<button class="u-copy-btn" onclick="event.stopPropagation();copyToNewInquiry(' + r.id + ')" title="复制为新询盘">' +
                    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
                    '</button>' +
                    '<button class="u-del-btn" onclick="event.stopPropagation();deleteInquiry(' + r.id + ',\'' + esc(r.inquiry_no) + '\')" title="删除">' +
                    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>' +
                    '</button>' +
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
        _lbRegistry = {}; _lbSeq = 0; _customPopData = {};

        try {
            var res = await fetch('/api/inquiry/' + id);
            var json = await res.json();
            if (!json.success) throw new Error(json.message);

            var d = json.data;
            _currentInquiryData = d; // 保存当前询盘数据用于复制功能
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

            // Build file map by category
            var fileMap = {};
            (d.files || []).forEach(function (f) {
                var cat = f.category || 'other';
                if (!fileMap[cat]) fileMap[cat] = [];
                fileMap[cat].push(f);
            });
            var html = '';

            // ─── Section 1: Styles ───
            html += renderStyleSection(d, fileMap);

            // ─── Section 2: Fabric ───
            html += renderFabricSection(d, fileMap);

            // ─── Section 3: Trims ───
            html += renderTrimsSection(d, fileMap);

            // ─── Section 4: Shipping ───
            html += renderShippingSection(d, fileMap);

            // ─── Section 5: Contact ───
            html += renderContactSection(d);

            // ─── Uncategorized files ───
            var shownCats = ['odmCustom', 'oem', 'fabric', 'cmt', 'metal', 'pad', 'bag', 'hangtag', 'label', 'hygiene', 'other', 'bulkPacking', 'finalDocs'];
            var remainFiles = [];
            Object.keys(fileMap).forEach(function (cat) {
                if (shownCats.indexOf(cat) === -1) remainFiles = remainFiles.concat(fileMap[cat]);
            });
            if (remainFiles.length) html += renderFilesSection(remainFiles, '其他附件');

            // ─── Timeline ───
            html += renderTimelineSection(d);

            content.innerHTML = html;
        } catch (e) {
            content.innerHTML = '<div class="u-loading" style="color:#dc2626">加载失败：' + esc(e.message) + '</div>';
        }
    };

    /* ── Lightbox image registry ── */
    var _lbRegistry = {};
    var _lbSeq = 0;
    var _customPopData = {};
    function regLbImages(imgs) {
        var key = '_lb' + (++_lbSeq);
        _lbRegistry[key] = imgs;
        return key;
    }

    /* ── Section Renderers ── */

    function renderStyleSection(d, fileMap) {
        var odmArr = tryParse(d.odm_styles);
        var odmCustom = tryParse(d.odm_custom_data);
        var odmImages = d.odm_style_images || {};
        var oemDescs = tryParse(d.oem_descriptions);
        var hasODM = Array.isArray(odmArr) && odmArr.length;
        var hasOEM = d.oem_project;
        if (!hasODM && !hasOEM) return '';

        var h = secStart('style', '款式信息');

        // ODM
        if (hasODM) {
            h += '<div class="u-sec-divider"><span class="u-sec-divider-tag odm">ODM</span><span class="u-sec-divider-text">已选款式</span><span class="u-sec-divider-line"></span></div>';
            h += '<div class="u-style-grid">';
            odmArr.forEach(function (name) {
                var displayName = typeof name === 'object' ? (name.name || name.id || JSON.stringify(name)) : name;
                var remark = '';
                if (odmCustom && typeof odmCustom === 'object') {
                    var cd = odmCustom[displayName];
                    if (cd && cd.remark) remark = cd.remark;
                }
                // Style images from DB
                var imgs = odmImages[displayName];
                var allImgs = Array.isArray(imgs) ? imgs : [];
                var coverImg = allImgs.length ? allImgs[0] : '';

                // User-uploaded custom files for this style
                var customFiles = (fileMap['odmCustom'] || []).filter(function (f) { return f.sub_key === displayName; });

                h += '<div class="u-style-card' + (coverImg ? ' has-img' : '') + '">';
                if (coverImg) {
                    var lbKey = regLbImages(allImgs);
                    h += '<div class="u-style-card-img" style="cursor:pointer" onclick="openLightbox(\'' + lbKey + '\', 0)">';
                    h += '<img src="' + esc(coverImg) + '" alt="' + esc(displayName) + '" loading="lazy" onerror="this.parentElement.style.display=\'none\'">';
                    if (allImgs.length > 1) {
                        h += '<span class="u-img-count">' + allImgs.length + ' 张</span>';
                    }
                    h += '</div>';
                }
                h += '<div class="u-style-card-body">';
                h += '<div class="u-style-card-name">' + esc(displayName) + '</div>';
                // 轻定制 compact pill
                if (remark || customFiles.length) {
                    var summary = [];
                    if (remark) summary.push('备注');
                    if (customFiles.length) summary.push(customFiles.length + '个文件');
                    var popId = 'cpop' + (++_lbSeq);
                    // store data for popover
                    _customPopData[popId] = { remark: remark, files: customFiles };
                    h += '<div class="u-custom-pill" onclick="event.stopPropagation();toggleCustomPop(\'' + popId + '\', this)">';
                    h += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
                    h += '<span>轻定制</span><span class="u-custom-pill-sum">' + esc(summary.join(' · ')) + '</span>';
                    h += '</div>';
                }
                h += '</div></div>';
            });
            h += '</div>';
        }

        // OEM
        if (hasOEM) {
            if (hasODM) h += '<div class="u-sec-separator"></div>';
            h += '<div class="u-sec-divider"><span class="u-sec-divider-tag oem">OEM</span><span class="u-sec-divider-text">自主设计</span><span class="u-sec-divider-line"></span></div>';
            h += kv('项目名称', esc(d.oem_project));
            h += kv('款式数量', d.oem_style_count || '-');
            if (Array.isArray(oemDescs) && oemDescs.length) {
                h += '<div class="u-sub-label" style="margin-top:12px">款式描述</div>';
                h += '<div class="u-style-grid">';
                oemDescs.forEach(function (desc, i) {
                    h += '<div class="u-style-card">' +
                        '<div class="u-style-card-body">' +
                        '<div class="u-style-card-name">款 ' + (i + 1) + '</div>' +
                        '<div class="u-style-card-remark">' + esc(typeof desc === 'object' ? JSON.stringify(desc) : desc) + '</div>' +
                        '</div></div>';
                });
                h += '</div>';
            }
            // OEM files inline
            var oemFiles = fileMap['oem'] || [];
            if (oemFiles.length) {
                h += '<div class="u-sub-label" style="margin-top:12px">设计文件</div>';
                h += '<div class="u-file-grid">';
                oemFiles.forEach(function (f) { h += renderFileItem(f); });
                h += '</div>';
            }
            if (d.oem_remark) h += kv('备注', esc(d.oem_remark));
            // 寄送实体样衣
            if (d.oem_physical_sample) {
                h += '<div class="u-kv"><div class="u-kv-label">寄送样衣</div><div class="u-kv-value"><span style="color:#16a34a;font-weight:600">● 已寄送实体样衣</span>'
                    + (d.oem_tracking_no ? '<span style="margin-left:8px;color:var(--text-light);font-size:12px">单号：' + esc(d.oem_tracking_no) + '</span>' : '<span style="margin-left:8px;color:#f59e0b;font-size:12px">待更新物流单号</span>')
                    + '</div></div>';
            }
        }

        h += secEnd();
        return h;
    }

    function renderFabricSection(d, fileMap) {
        var fab = tryParse(d.fabric_selection);
        if (!fab || typeof fab !== 'object' || !Object.keys(fab).length) return '';

        var fabricFiles = fileMap['fabric'] || [];
        var cmtFabricFiles = (fileMap['cmt'] || []).filter(function (f) { return f.sub_key === 'fabric'; });

        var h = secStart('fabric', '面料信息');

        Object.keys(fab).forEach(function (catKey) {
            var cat = fab[catKey];
            if (!cat || !cat.configs) return;
            var originalCat = cat.originalCatName || catKey;
            var isCustomSourcing = cat.activeName === 'CUSTOM_SOURCING';
            var displayName = isCustomSourcing ? originalCat : (cat.activeName || originalCat);
            var isLining = originalCat.indexOf('里料') !== -1 || originalCat.indexOf('Lining') !== -1 || originalCat.indexOf('lining') !== -1;
            var configs = cat.configs;

            Object.keys(configs).forEach(function (fabricName) {
                var cfg = configs[fabricName];
                if (!cfg) return;
                var isCS = fabricName === 'CUSTOM_SOURCING';
                var mode = isCS ? 'custom' : (cfg.mode || 'solid');
                var modeLabel = { solid: '纯色', print: '印花', custom: '开发/找样' }[mode] || mode;
                var cardTitle = isCS ? originalCat : fabricName;

                h += '<div class="u-fabric-card">';
                h += '<div class="u-fabric-card-head"><strong>' + esc(cardTitle) + '</strong>';
                if (!isCS && displayName) h += '<span class="u-fabric-cat-tag">' + esc(originalCat) + '</span>';
                h += '<span class="u-fabric-mode ' + mode + '">' + modeLabel + '</span></div>';

                if (mode === 'solid') {
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
                    // 印花图片：新数据 sub_key 以 __print 结尾，旧数据从同 sub_key 中按 mime_type 分离图片
                    var printKey = catKey + '__' + fabricName + '__print';
                    var printFiles = fabricFiles.filter(function (f) { return f.sub_key === printKey; });
                    if (!printFiles.length) {
                        // 兼容旧数据：从相同 sub_key 中提取图片文件作为印花图
                        var baseKey = catKey + '__' + fabricName;
                        printFiles = fabricFiles.filter(function (f) {
                            return f.sub_key === baseKey && f.mime_type && f.mime_type.indexOf('image/') === 0;
                        });
                    }
                    if (printFiles.length) {
                        h += renderInlineFiles(printFiles, '印花图案');
                    }
                    if (cfg.printRefColor) h += kv('参考底色', esc(cfg.printRefColor));
                    if (cfg.printScale) h += kv('缩放比例', esc(cfg.printScale));
                } else if (mode === 'custom') {
                    if (cfg.customDesc) h += kv('需求描述', esc(cfg.customDesc));
                    if (cfg.comp) h += kv('成分', esc(cfg.comp));
                    if (cfg.gsm) h += kv('克重', esc(cfg.gsm) + ' g/m²');
                    if (cfg.colorReq) h += kv('颜色要求', esc(cfg.colorReq));
                    if (cfg.physical) h += kv('实物邮寄', '是' + (cfg.trackingNo ? '（单号：' + esc(cfg.trackingNo) + '）' : ''));
                }

                // 里料专属：全衬里/局部衬里
                if (isLining) {
                    if (cfg.fullLining != null) h += kv('全衬里', cfg.fullLining ? '是' : '否');
                    if (cfg.liningPlacement) h += kv('衬里位置', esc(cfg.liningPlacement));
                }

                // 拼色说明（非里料）或 备注（里料）
                if (cfg.remark) h += kv(isLining ? '备注' : '拼色说明', esc(cfg.remark));

                // Inline fabric files matching this fabric (use catKey for DB match)
                var subKey = catKey + '__' + fabricName;
                var matched = fabricFiles.filter(function (f) { return f.sub_key === subKey; });
                // 排除已在印花图案中展示的图片
                if (mode === 'print' && printFiles.length) {
                    var printIds = {};
                    printFiles.forEach(function (pf) { printIds[pf.id] = true; });
                    matched = matched.filter(function (f) { return !printIds[f.id]; });
                }
                if (matched.length) {
                    h += renderInlineFiles(matched, '参考文件');
                }

                h += '</div>';
            });
        });

        // CMT customer-supplied fabric
        var cmtData = tryParse(d.cmt_enabled);
        var fabricCmt = cmtData && cmtData.fabric;
        // 兼容旧格式 (true/false) 和新格式 ({ enabled, desc, trackingNo })
        var fabricCmtEnabled = fabricCmt === true || (fabricCmt && fabricCmt.enabled);
        if (fabricCmtEnabled) {
            h += '<div class="u-cmt-block">';
            h += '<div class="u-cmt-title">客户自行提供面料 (CMT)</div>';
            if (fabricCmt && fabricCmt.desc) h += kv('明细描述', esc(fabricCmt.desc));
            if (fabricCmt && fabricCmt.trackingNo) h += kv('寄件单号', esc(fabricCmt.trackingNo));
            if (cmtFabricFiles.length) {
                h += renderInlineFiles(cmtFabricFiles, '参考文件');
            }
            h += '</div>';
        } else if (cmtFabricFiles.length) {
            h += '<div class="u-sub-label" style="margin-top:14px">客供面料文件</div>';
            h += '<div class="u-file-grid">';
            cmtFabricFiles.forEach(function (f) { h += renderFileItem(f); });
            h += '</div>';
        }

        h += secEnd();
        return h;
    }

    function renderTrimsSection(d, fileMap) {
        var trimDefs = [
            { key: 'metal_config', cat: 'metal', name: '五金配件', icon: '⚙️' },
            { key: 'pad_config', cat: 'pad', name: '胸垫', icon: '🧵' },
            { key: 'bag_config', cat: 'bag', name: '包装袋', icon: '👜' },
            { key: 'hangtag_config', cat: 'hangtag', name: '吊牌', icon: '🏷️' },
            { key: 'label_config', cat: 'label', name: '标签', icon: '📋' },
            { key: 'hygiene_config', cat: 'hygiene', name: '卫生贴', icon: '🩹' },
            { key: 'other_config', cat: 'other', name: '其他', icon: '📦' }
        ];

        var cmtData = tryParse(d.cmt_enabled) || {};
        var cards = [];
        trimDefs.forEach(function (td) {
            var val = tryParse(d[td.key]);
            var cmtInfo = cmtData[td.cat];
            var cmtEnabled = cmtInfo === true || (cmtInfo && cmtInfo.enabled);
            // 如果没有配置也没有CMT，跳过
            var hasConfig = val && typeof val === 'object' && Object.keys(val).length;
            if (!hasConfig && !cmtEnabled) return;
            var trimFiles = (fileMap[td.cat] || []);
            var cmtFiles = (fileMap['cmt'] || []).filter(function (f) { return f.sub_key === td.cat; });
            cards.push(renderOneTrimCard(td, hasConfig ? val : {}, trimFiles, cmtFiles, cmtInfo));
        });
        if (cards.length === 0) return '';

        var h = secStart('trims', '辅料 / 包装', cards.length + ' 项');
        h += '<div class="u-trim-grid">' + cards.join('') + '</div>';
        h += secEnd();
        return h;
    }

    function renderOneTrimCard(td, val, trimFiles, cmtFiles, cmtInfo) {
        var h = '<div class="u-trim-card">';
        h += '<div class="u-trim-card-head"><div class="u-trim-dot on"></div>' + td.icon + ' ' + td.name + '</div>';

        // 已展示的文件 ID 集合，用于最终排除
        var shownFileIds = {};
        function inlineByKey(subKey, label) {
            var matched = trimFiles.filter(function (f) { return f.sub_key === subKey; });
            if (!matched.length) return '';
            matched.forEach(function (f) { shownFileIds[f.id] = true; });
            return renderInlineFiles(matched, label);
        }

        var mode = val.mode;
        if (mode) h += kv('模式', mode === 'auto' ? '红绣标配' : '客户自定义');

        // Common fields handling by type
        switch (td.key) {
            case 'metal_config':
                if (val.finish) h += kv('表面处理', esc(val.finish));
                h += inlineByKey('sourceFiles', '通用参考文件');
                if (val.logoCustom) {
                    h += kv('LOGO定制', '需要');
                    if (Array.isArray(val.logoTypes) && val.logoTypes.length) h += kv('LOGO类型', val.logoTypes.map(esc).join(', '));
                    h += inlineByKey('logoFiles', '通用LOGO文件');
                }
                // 各品类明细
                if (val.details && val.categories && val.categories.length) {
                    val.categories.forEach(function (catName) {
                        var detail = val.details[catName];
                        if (!detail) return;
                        h += '<div class="u-metal-cat-block">';
                        h += '<div class="u-metal-cat-name">' + esc(catName) + '</div>';
                        if (detail.remark) h += kv('备注', esc(detail.remark));
                        h += inlineByKey('details__' + catName + '__styleFiles', '样式参考');
                        if (detail.logoNeeded) {
                            h += kv('独立LOGO', '需要');
                            h += inlineByKey('details__' + catName + '__logoFiles', 'LOGO文件');
                        }
                        h += '</div>';
                    });
                }
                break;
            case 'pad_config':
                if (val.thickness) h += kv('厚度', esc(val.thickness));
                if (val.color) {
                    var colorDisplay = val.color;
                    if (val.color === '其他定制色' && val.otherColor) colorDisplay = val.otherColor + '（定制色）';
                    h += kv('颜色', esc(colorDisplay));
                }
                if (val.customShape) {
                    h += kv('异形', '是' + (val.shapeRemark ? '（' + esc(val.shapeRemark) + '）' : ''));
                    h += inlineByKey('shapeFiles', '形状参考');
                }
                h += inlineByKey('otherFiles', '其他参考');
                break;
            case 'bag_config':
                if (val.material) h += kv('材质', esc(val.material));
                if (val.size) h += kv('尺寸', esc(val.size));
                if (val.print) h += kv('印刷', esc(val.print));
                if (Array.isArray(val.crafts) && val.crafts.length) h += kv('工艺', val.crafts.map(esc).join(', '));
                h += inlineByKey('designFiles', '设计文件');
                break;
            case 'hangtag_config':
                if (val.remark) h += kv('设计描述', esc(val.remark));
                h += inlineByKey('designFiles', '设计文件');
                if (mode !== 'auto') {
                    var matText = val.material || '';
                    if (matText === '其他' && val.materialRemark) matText = val.materialRemark + '（其他）';
                    if (matText) h += kv('材质', esc(matText));
                    h += inlineByKey('otherMatFiles', '材质参考');
                    if (val.weight) h += kv('克重', esc(val.weight));
                    if (val.shape) h += kv('形状', esc(val.shape));
                    if (val.roundedCorner) h += kv('圆角', '是');
                    if (val.shapeRemark) h += kv('形状说明', esc(val.shapeRemark));
                    h += inlineByKey('shapeFiles', '刀模/异形参考');
                    if (Array.isArray(val.crafts) && val.crafts.length) h += kv('工艺', val.crafts.map(esc).join(', '));
                    if (val.craftRemark) h += kv('工艺说明', esc(val.craftRemark));
                    h += inlineByKey('otherCraftFiles', '工艺参考');
                    var strType = val.stringType || '';
                    if (strType === '定制材质与形状' && val.stringRemark) strType = val.stringRemark + '（定制）';
                    if (strType) h += kv('吊绳', esc(strType));
                    h += inlineByKey('stringFiles', '吊绳参考');
                    var strColor = val.stringColor || '';
                    if (strColor === '其他' && val.stringColorOther) strColor = val.stringColorOther + '（其他）';
                    if (strColor) h += kv('绳色', esc(strColor));
                    if (val.isSet) h += kv('副牌', '有' + (val.setRemark ? '（' + esc(val.setRemark) + '）' : ''));
                }
                break;
            case 'label_config':
                if (val.remark) h += kv('设计描述', esc(val.remark));
                h += inlineByKey('designFiles', '设计文件');
                if (mode !== 'auto') {
                    if (val.material) h += kv('材质', esc(val.material));
                    h += inlineByKey('otherMatFiles', '材质参考');
                    if (val.size) h += kv('尺寸', esc(val.size));
                    if (val.method) h += kv('缝制方式', esc(val.method));
                    if (val.sewingRemark) h += kv('缝制说明', esc(val.sewingRemark));
                    h += inlineByKey('sewingFiles', '缝制方式参考');
                    if (Array.isArray(val.components) && val.components.length) h += kv('部件', val.components.map(esc).join(', '));
                    if (val.placements) {
                        Object.keys(val.placements).forEach(function (k) {
                            h += kv('位置 (' + esc(k) + ')', esc(val.placements[k]));
                        });
                    }
                    h += inlineByKey('placementFiles__top', '打标位置参考 (上)');
                    h += inlineByKey('placementFiles__bottom', '打标位置参考 (下)');
                    // 兼容旧数据 isSet → isSplit
                    var isSplit = val.isSplit || val.isSet;
                    if (isSplit) {
                        h += kv('主标与洗水标', '分开定制');
                        if (val.splitRemark) h += kv('分开说明', esc(val.splitRemark));
                    }
                }
                break;
            case 'hygiene_config':
                if (val.material) h += kv('材质', esc(val.material));
                if (val.shape) h += kv('形状', esc(val.shape));
                if (val.size) h += kv('尺寸', esc(val.size));
                h += inlineByKey('shapeFiles', '异形刀模参考');
                if (val.noApply) h += kv('免粘贴', '是');
                if (val.shapeRemark) h += kv('异形要求', esc(val.shapeRemark));
                if (val.applyRemark) h += kv('粘贴规则', esc(val.applyRemark));
                h += inlineByKey('applyFiles', '粘贴位置参考');
                h += inlineByKey('designFiles', '印刷设计图');
                break;
            case 'other_config':
                h += inlineByKey('files', '参考附件');
                break;
        }

        // 吊牌/标签的 remark 已作为"设计描述"展示，不再重复
        if (val.remark && td.key !== 'hangtag_config' && td.key !== 'label_config') h += kv('备注', esc(val.remark));

        // CMT 客供物料信息
        var cmtEnabled = cmtInfo === true || (cmtInfo && cmtInfo.enabled);
        if (cmtEnabled) {
            h += '<div class="u-cmt-block">';
            h += '<div class="u-cmt-title">客户自行提供 (CMT)</div>';
            if (cmtInfo && cmtInfo.desc) h += kv('明细描述', esc(cmtInfo.desc));
            if (cmtInfo && cmtInfo.trackingNo) h += kv('寄件单号', esc(cmtInfo.trackingNo));
            if (cmtFiles.length) {
                h += renderInlineFiles(cmtFiles, '参考文件');
            }
            h += '</div>';
        }

        // Inline files for this trim (non-CMT, not yet shown)
        var remainFiles = trimFiles.filter(function (f) { return !shownFileIds[f.id]; });
        if (remainFiles.length) {
            h += renderInlineFiles(remainFiles, '其他文件');
        }
        h += '</div>';
        return h;
    }

    function renderShippingSection(d, fileMap) {
        var h = secStart('shipping', '交付信息');

        h += kv('交付模式', '<span class="u-chip accent">' + (d.delivery_mode === 'bulk' ? '大货订单' : '样衣订单') + '</span>');

        var isSample = d.delivery_mode !== 'bulk';

        if (isSample) {
            // ── Sample only ──
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
            var sampleCfg = tryParse(d.sample_config);
            if (sampleCfg && typeof sampleCfg === 'object' && Object.keys(sampleCfg).length) {
                h += '<div class="u-sub-label" style="margin-top:16px">样衣物流</div>';
                if (sampleCfg.carrier) h += kv('物流方式', esc(sampleCfg.carrier));
                if (sampleCfg.needBulkQuote) {
                    h += kv('需大货报价', '是');
                    if (sampleCfg.intentQty) h += kv('预估大货数量', esc(sampleCfg.intentQty) + ' 件');
                    if (sampleCfg.intentPrice) h += kv('期望EXW单价', '$' + esc(sampleCfg.intentPrice));
                    if (sampleCfg.intentTerm) h += kv('贸易术语', esc(sampleCfg.intentTerm));
                    if (sampleCfg.intentMethod) h += kv('运输方式', esc(sampleCfg.intentMethod));
                }
            }
            if (d.sample_dest) h += kv('样衣目的地', esc(d.sample_dest));
        } else {
            // ── Bulk only ──
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
            var bulkLog = tryParse(d.bulk_logistics);
            if (bulkLog && typeof bulkLog === 'object' && Object.keys(bulkLog).length) {
                h += '<div class="u-sub-label" style="margin-top:16px">大货物流</div>';
                if (bulkLog.term) h += kv('贸易术语', esc(bulkLog.term));
                if (bulkLog.method) h += kv('运输方式', esc(bulkLog.method));
            }
            if (d.bulk_dest) h += kv('大货目的地', esc(d.bulk_dest));
            if (d.bulk_target_price) h += kv('目标价格', esc(d.bulk_target_price));
            if (d.bulk_packing_remark) h += kv('包装备注', esc(d.bulk_packing_remark));
            // Bulk packing files
            var bpFiles = fileMap['bulkPacking'] || [];
            if (bpFiles.length) h += renderInlineFiles(bpFiles, '包装参考文件');
        }

        // Final docs files (relevant to both modes)
        var fdFiles = fileMap['finalDocs'] || [];
        if (fdFiles.length) h += renderInlineFiles(fdFiles, '综合工艺单 / 企划书');

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

    function renderFilesSection(files, title) {
        if (!files || !files.length) return '';
        var h = secStart('files', title || '附件', files.length + ' 个');
        h += '<div class="u-file-grid">';
        files.forEach(function (f) { h += renderFileItem(f); });
        h += '</div>';
        h += secEnd();
        return h;
    }

    // Shared file item renderer
    function renderFileItem(f) {
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
        return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="u-file-item">' +
            '<div class="u-file-icon ' + iconClass + '">' + iconText + '</div>' +
            '<div class="u-file-info"><div class="u-file-name">' + esc(f.orig_name) + '</div>' +
            '<div class="u-file-meta">' + sizeStr + (f.sub_key ? ' · ' + esc(f.sub_key) : '') + '</div>' +
            '</div></a>';
    }

    // Inline files block within a section
    function renderInlineFiles(files, label) {
        var h = '<div class="u-inline-files">';
        if (label) h += '<div class="u-sub-label" style="margin-top:12px">' + esc(label) + '</div>';
        h += '<div class="u-file-grid">';
        files.forEach(function (f) {
            var url = FILE_BASE + encodeURIComponent(f.stored_name);
            var isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(f.orig_name);
            if (isImg) {
                h += '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="u-inline-img-wrap">' +
                    '<img src="' + url + '" alt="' + esc(f.orig_name) + '" loading="lazy">' +
                    '<span>' + esc(f.orig_name) + '</span></a>';
            } else {
                h += renderFileItem(f);
            }
        });
        h += '</div></div>';
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

    /* ---------- Custom popover ---------- */
    window.toggleCustomPop = function (popId, pillEl) {
        // close any existing
        var existing = document.getElementById('u-custom-popover');
        if (existing) {
            var wasFor = existing.getAttribute('data-pop-id');
            existing.remove();
            if (wasFor === popId) return; // toggle off
        }
        var data = _customPopData[popId];
        if (!data) return;
        var pop = document.createElement('div');
        pop.id = 'u-custom-popover';
        pop.className = 'u-custom-popover';
        pop.setAttribute('data-pop-id', popId);
        var inner = '<div class="u-cpop-header"><span>轻定制详情</span><button onclick="document.getElementById(\'u-custom-popover\').remove()">&times;</button></div>';
        inner += '<div class="u-cpop-body">';
        if (data.remark) inner += '<div class="u-cpop-remark">' + esc(data.remark) + '</div>';
        if (data.files && data.files.length) {
            inner += '<div class="u-cpop-files">';
            data.files.forEach(function (f) {
                var url = FILE_BASE + encodeURIComponent(f.stored_name);
                var isImg = /\.(jpg|jpeg|png|gif|webp)$/i.test(f.orig_name);
                if (isImg) {
                    var fKey = regLbImages([url]);
                    inner += '<a class="u-cpop-thumb" onclick="event.preventDefault();openLightbox(\'' + fKey + '\', 0)" href="' + url + '"><img src="' + url + '" alt="' + esc(f.orig_name) + '" loading="lazy"></a>';
                } else {
                    inner += renderFileItem(f);
                }
            });
            inner += '</div>';
        }
        inner += '</div>';
        pop.innerHTML = inner;
        document.body.appendChild(pop);
        // position near the pill
        var rect = pillEl.getBoundingClientRect();
        var popW = 300;
        var left = rect.left;
        if (left + popW > window.innerWidth - 16) left = window.innerWidth - popW - 16;
        if (left < 16) left = 16;
        pop.style.left = left + 'px';
        pop.style.width = popW + 'px';
        // show below pill, but if not enough space, show above
        var spaceBelow = window.innerHeight - rect.bottom - 16;
        if (spaceBelow >= 200) {
            pop.style.top = (rect.bottom + 6) + 'px';
        } else {
            pop.style.bottom = (window.innerHeight - rect.top + 6) + 'px';
        }
    };

    // close popover on outside click
    document.addEventListener('click', function (e) {
        var pop = document.getElementById('u-custom-popover');
        if (pop && !pop.contains(e.target) && !e.target.closest('.u-custom-pill')) pop.remove();
    });

    window.closeDetail = function () {
        document.getElementById('inquiry-detail').style.display = 'none';
        document.getElementById('inquiry-list').style.display = '';
        document.getElementById('inquiry-pagination').style.display = '';
        document.querySelector('.u-page-title').style.display = '';
    };

    /* ---------- Delete inquiry ---------- */
    window.deleteInquiry = async function (id, inquiryNo) {
        if (!(await showConfirm('确定要删除询盘 ' + inquiryNo + ' 吗？'))) return;
        try {
            var res = await fetch('/api/inquiry/' + id, { method: 'DELETE' });
            var json = await res.json();
            if (json.success) {
                loadInquiries(currentPage);
            } else {
                showMsg('删除失败：' + (json.message || '未知错误'), 'error');
            }
        } catch (e) {
            showMsg('网络错误，请重试', 'error');
        }
    };

    /* ---------- Lightbox ---------- */
    var lbImages = [];
    var lbIndex = 0;

    function createLightbox() {
        if (document.getElementById('u-lightbox')) return;
        var el = document.createElement('div');
        el.id = 'u-lightbox';
        el.className = 'u-lightbox';
        el.innerHTML = '<div class="u-lb-overlay" onclick="closeLightbox()"></div>' +
            '<button class="u-lb-close" onclick="closeLightbox()">&times;</button>' +
            '<button class="u-lb-prev" onclick="lbNav(-1)">&#8249;</button>' +
            '<div class="u-lb-content"><img id="u-lb-img" src="" alt=""><div class="u-lb-counter" id="u-lb-counter"></div></div>' +
            '<button class="u-lb-next" onclick="lbNav(1)">&#8250;</button>';
        document.body.appendChild(el);
        document.addEventListener('keydown', function (e) {
            if (!document.getElementById('u-lightbox').classList.contains('active')) return;
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') lbNav(-1);
            if (e.key === 'ArrowRight') lbNav(1);
        });
    }

    function showLbImage() {
        var img = document.getElementById('u-lb-img');
        var counter = document.getElementById('u-lb-counter');
        img.src = lbImages[lbIndex];
        counter.textContent = lbImages.length > 1 ? (lbIndex + 1) + ' / ' + lbImages.length : '';
        document.querySelector('.u-lb-prev').style.display = lbImages.length > 1 ? '' : 'none';
        document.querySelector('.u-lb-next').style.display = lbImages.length > 1 ? '' : 'none';
    }

    window.openLightbox = function (keyOrArr, idx) {
        createLightbox();
        if (typeof keyOrArr === 'string' && _lbRegistry[keyOrArr]) {
            lbImages = _lbRegistry[keyOrArr];
        } else if (Array.isArray(keyOrArr)) {
            lbImages = keyOrArr;
        } else {
            lbImages = [];
        }
        lbIndex = idx || 0;
        showLbImage();
        document.getElementById('u-lightbox').classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    window.closeLightbox = function () {
        document.getElementById('u-lightbox').classList.remove('active');
        document.body.style.overflow = '';
    };

    window.lbNav = function (dir) {
        lbIndex = (lbIndex + dir + lbImages.length) % lbImages.length;
        showLbImage();
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

    /* ---------- Copy to new inquiry ---------- */
    window.copyToNewInquiry = function (id) {
        if (!id && _currentInquiryData) {
            // 从详情页复制：直接使用已加载的数据
            try {
                sessionStorage.setItem('copyInquiryData', JSON.stringify(_currentInquiryData));
                window.location.href = '/';
            } catch (e) {
                showMsg('复制失败：数据过大或存储不可用', 'error');
            }
            return;
        }
        // 从列表卡片复制：先获取数据
        fetch('/api/inquiry/' + id)
            .then(function (res) { return res.json(); })
            .then(function (json) {
                if (!json.success) throw new Error(json.message);
                sessionStorage.setItem('copyInquiryData', JSON.stringify(json.data));
                window.location.href = '/';
            })
            .catch(function (e) {
                showMsg('获取询盘数据失败：' + e.message, 'error');
            });
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

    /* ---------- Draft (暂存草稿) ---------- */
    async function loadDraft() {
        try {
            var res = await fetch('/api/draft');
            var json = await res.json();
            var banner = document.getElementById('draft-banner');
            if (json.success && json.data) {
                var timeEl = document.getElementById('draft-time');
                timeEl.textContent = '保存于 ' + fmtDate(json.updated_at);
                banner.style.display = 'flex';
            } else {
                banner.style.display = 'none';
            }
        } catch (e) { /* ignore */ }
    }

    window.restoreDraft = async function () {
        try {
            var res = await fetch('/api/draft');
            var json = await res.json();
            if (json.success && json.data) {
                sessionStorage.setItem('copyInquiryData', JSON.stringify(json.data));
                sessionStorage.setItem('restoreDraftId', String(json.data.id));
                window.location.href = '/';
            } else {
                showMsg('草稿不存在或已过期', 'warn');
            }
        } catch (e) {
            showMsg('获取草稿失败', 'error');
        }
    };

    window.deleteDraft = async function () {
        if (!(await showConfirm('确定要删除草稿吗？'))) return;
        try {
            var res = await fetch('/api/draft', { method: 'DELETE' });
            var json = await res.json();
            if (json.success) {
                document.getElementById('draft-banner').style.display = 'none';
            } else {
                showMsg('删除失败', 'error');
            }
        } catch (e) {
            showMsg('网络错误', 'error');
        }
    };

    /* ---------- Init ---------- */
    loadInquiries(1);
    loadDraft();
})();
