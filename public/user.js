/* ============ User Center ============ */
(function () {
    'use strict';

    const FILE_BASE = 'https://files.yiswim.cloud/uploads/inquiries/';
    let currentPage = 1;
    var _currentInquiryData = null; // 存储当前打开的询盘详情数据
    var _fabricNameMap = null; // Chinese→English fabric name map (lazy loaded)

    /* ---------- Tab switching ---------- */
    window.switchTab = function (tab) {
        document.querySelectorAll('.u-tab').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.u-menu-item').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.u-mobile-tab').forEach(el => el.classList.remove('active'));
        document.getElementById('tab-' + tab).classList.add('active');
        var sideItem = document.querySelector('.u-menu-item[data-tab="' + tab + '"]');
        if (sideItem) sideItem.classList.add('active');
        var mobItem = document.querySelector('.u-mobile-tab[data-tab="' + tab + '"]');
        if (mobItem) mobItem.classList.add('active');
        if (tab === 'inquiries') {
            closeDetail();
            loadInquiries(1);
        }
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
        listEl.innerHTML = '<div class="u-loading">Loading...</div>';
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
                    '<p>No inquiry records yet</p>' +
                    '<a href="/" class="u-btn-primary">+ New Inquiry</a>' +
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
                    '<button class="u-copy-btn" onclick="event.stopPropagation();editInquiry(' + r.id + ')" title="' + (window.__lang === 'zh' ? '修改' : 'Edit') + '">' +
                    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>' +
                    '</button>' +
                    '<button class="u-copy-btn" onclick="event.stopPropagation();copyToNewInquiry(' + r.id + ')" title="' + (window.__lang === 'zh' ? '复制为新询盘' : 'Copy as New') + '">' +
                    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
                    '</button>' +
                    '<button class="u-del-btn" onclick="event.stopPropagation();deleteInquiry(' + r.id + ',\'' + esc(r.inquiry_no) + '\')" title="Delete">' +
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
            listEl.innerHTML = '<div class="u-loading" style="color:#dc2626">Load failed: ' + esc(e.message) + '</div>';
        }
    };

    function buildDesc(r) {
        var parts = [];
        // ODM styles count
        var odm = tryParse(r.odm_styles);
        if (Array.isArray(odm) && odm.length) parts.push('ODM: ' + odm.length + 'style(s)');
        // OEM
        if (r.oem_project) parts.push('OEM: ' + esc(r.oem_project));
        if (r.oem_style_count) parts.push(r.oem_style_count + 'style(s)');
        // contact / brand
        if (r.brand_name) parts.push(esc(r.brand_name));
        if (r.contact_name) parts.push(esc(r.contact_name));
        // delivery
        if (r.delivery_mode) parts.push(r.delivery_mode === 'bulk' ? 'Bulk' : 'Sample');
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
        content.innerHTML = '<div class="u-loading">Loading...</div>';
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
            if (d.delivery_mode) stats.push(pill('truck', d.delivery_mode === 'bulk' ? 'Bulk Order' : 'Sample Order'));
            if (d.brand_name) stats.push(pill('tag', d.brand_name));
            if (d.contact_name) stats.push(pill('user', d.contact_name));
            var odmArr = tryParse(d.odm_styles);
            if (Array.isArray(odmArr) && odmArr.length) stats.push(pill('style', 'ODM ' + odmArr.length + ' style(s)'));
            if (d.oem_project) stats.push(pill('style', 'OEM ' + (d.oem_style_count || 0) + ' style(s)'));
            if (d.files && d.files.length) stats.push(pill('file', d.files.length + ' attachment(s)'));
            statsEl.innerHTML = stats.join('');

            // Build file map by category
            var fileMap = {};
            (d.files || []).forEach(function (f) {
                var cat = f.category || 'other';
                if (!fileMap[cat]) fileMap[cat] = [];
                fileMap[cat].push(f);
            });
            var html = '';

            // Lazy-load fabric name map (Chinese→English) for display
            if (!_fabricNameMap) {
                try {
                    var fabRes = await fetch('/api/get-data');
                    var fabJson = await fabRes.json();
                    if (fabJson.success && fabJson.data && fabJson.data.fabrics) {
                        _fabricNameMap = {};
                        fabJson.data.fabrics.forEach(function (f) {
                            if (f.name && f.name_en) _fabricNameMap[f.name] = f.name_en;
                        });
                        // Category translations
                        _fabricNameMap['面料'] = 'Shell';
                        _fabricNameMap['里料'] = 'Lining';
                        _fabricNameMap['网纱'] = 'Mesh';
                    }
                } catch (e) { _fabricNameMap = {}; }
            }

            // ─── Admin Response (top) ───
            html += renderAdminResponseSection(d);

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
            if (remainFiles.length) html += renderFilesSection(remainFiles, 'Other Attachments');

            // ─── Timeline ───
            html += renderTimelineSection(d);

            content.innerHTML = html;
        } catch (e) {
            content.innerHTML = '<div class="u-loading" style="color:#dc2626">Load failed: ' + esc(e.message) + '</div>';
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

        var h = secStart('style', 'Style Information');

        // ODM
        if (hasODM) {
            h += '<div class="u-sec-divider"><span class="u-sec-divider-tag odm">ODM</span><span class="u-sec-divider-text">Selected Styles</span><span class="u-sec-divider-line"></span></div>';
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
                        h += '<span class="u-img-count">' + allImgs.length + ' photo(s)</span>';
                    }
                    h += '</div>';
                }
                h += '<div class="u-style-card-body">';
                h += '<div class="u-style-card-name">' + esc(displayName) + '</div>';
                // Light Customization compact pill
                if (remark || customFiles.length) {
                    var summary = [];
                    if (remark) summary.push('Remark');
                    if (customFiles.length) summary.push(customFiles.length + ' file(s)');
                    var popId = 'cpop' + (++_lbSeq);
                    // store data for popover
                    _customPopData[popId] = { remark: remark, files: customFiles };
                    h += '<div class="u-custom-pill" onclick="event.stopPropagation();toggleCustomPop(\'' + popId + '\', this)">';
                    h += '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>';
                    h += '<span>Light Customization</span><span class="u-custom-pill-sum">' + esc(summary.join(' · ')) + '</span>';
                    h += '</div>';
                }
                h += '</div></div>';
            });
            h += '</div>';
        }

        // OEM
        if (hasOEM) {
            if (hasODM) h += '<div class="u-sec-separator"></div>';
            h += '<div class="u-sec-divider"><span class="u-sec-divider-tag oem">OEM</span><span class="u-sec-divider-text">Custom Design</span><span class="u-sec-divider-line"></span></div>';
            h += kv('Project Name', esc(d.oem_project));
            h += kv('Style Count', d.oem_style_count || '-');
            if (d.oem_project_desc) h += kv('Project Description', esc(d.oem_project_desc));
            if (Array.isArray(oemDescs) && oemDescs.length) {
                h += '<div class="u-sub-label" style="margin-top:12px">Style Descriptions</div>';
                h += '<div class="u-style-grid">';
                oemDescs.forEach(function (desc, i) {
                    h += '<div class="u-style-card">' +
                        '<div class="u-style-card-body">' +
                        '<div class="u-style-card-name">style(s) ' + (i + 1) + '</div>' +
                        '<div class="u-style-card-remark">' + esc(typeof desc === 'object' ? JSON.stringify(desc) : desc) + '</div>' +
                        '</div></div>';
                });
                h += '</div>';
            }
            // OEM files inline
            var oemFiles = fileMap['oem'] || [];
            var oemDesignFiles = oemFiles.filter(function (f) { return f.sub_key !== 'size'; });
            var oemSizeFiles = oemFiles.filter(function (f) { return f.sub_key === 'size'; });
            if (oemDesignFiles.length) {
                h += '<div class="u-sub-label" style="margin-top:12px">Design Files</div>';
                h += '<div class="u-file-grid">';
                oemDesignFiles.forEach(function (f) { h += renderFileItem(f); });
                h += '</div>';
            }
            if (oemSizeFiles.length || d.oem_size_remark) {
                h += '<div class="u-sub-label" style="margin-top:12px">Size Information</div>';
                if (d.oem_size_remark) h += kv('Size Description', esc(d.oem_size_remark));
                if (oemSizeFiles.length) {
                    h += '<div class="u-file-grid">';
                    oemSizeFiles.forEach(function (f) { h += renderFileItem(f); });
                    h += '</div>';
                }
            }
            if (d.oem_remark) h += kv('Remark', esc(d.oem_remark));
            // Send physical sample
            if (d.oem_physical_sample) {
                h += '<div class="u-kv"><div class="u-kv-label">Sample Shipping</div><div class="u-kv-value"><span style="color:#16a34a;font-weight:600">● Physical sample shipped</span>'
                    + (d.oem_tracking_no ? '<span style="margin-left:8px;color:var(--text-light);font-size:12px">Tracking #: ' + esc(d.oem_tracking_no) + '</span>' : '<span style="margin-left:8px;color:#f59e0b;font-size:12px">Tracking # pending</span>')
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

        var h = secStart('fabric', 'Fabric Information');

        Object.keys(fab).forEach(function (catKey) {
            var cat = fab[catKey];
            if (!cat || !cat.configs) return;
            var originalCat = cat.originalCatName || catKey;
            var fnMap = _fabricNameMap || {};
            var originalCatEn = cat.originalCatNameEn || fnMap[originalCat] || ((typeof _rt === 'function') ? _rt(originalCat) : originalCat);
            var isCustomSourcing = cat.activeName === 'CUSTOM_SOURCING';
            var displayName = isCustomSourcing ? originalCatEn : (cat.activeName || originalCatEn);
            var isLining = originalCatEn.indexOf('Lining') !== -1 || originalCatEn.indexOf('lining') !== -1;
            var configs = cat.configs;

            Object.keys(configs).forEach(function (fabricName) {
                var cfg = configs[fabricName];
                if (!cfg) return;
                var isCS = fabricName === 'CUSTOM_SOURCING';
                var mode = isCS ? 'custom' : (cfg.mode || 'solid');
                var modeLabel = { solid: 'Solid', print: 'Print', custom: 'Dev / Sourcing' }[mode] || mode;
                var fabricDisplayName = cfg.nameEn || fnMap[fabricName] || ((typeof _rt === 'function') ? _rt(fabricName) : fabricName);
                var cardTitle = isCS ? originalCatEn : fabricDisplayName;

                h += '<div class="u-fabric-card">';
                h += '<div class="u-fabric-card-head"><strong>' + esc(cardTitle) + '</strong>';
                if (!isCS && displayName) h += '<span class="u-fabric-cat-tag">' + esc(originalCatEn) + '</span>';
                h += '<span class="u-fabric-mode ' + mode + '">' + modeLabel + '</span></div>';

                // 通用：成分和克重（所有模式可用）
                if (cfg.comp) h += kv('Composition', esc(cfg.comp));
                if (cfg.gsm) {
                    var gsmVal = cfg.gsm;
                    if (!/g/i.test(gsmVal)) gsmVal += ' g/m²';
                    h += kv('Weight (GSM)', esc(gsmVal));
                }

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
                    if (cfg.colorText) h += kv('Color Description', esc(cfg.colorText));
                } else if (mode === 'print') {
                    if (cfg.printType) h += kv('Print Type', cfg.printType === 'seamless' ? 'All-over Print' : 'Placement Print');
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
                        h += renderInlineFiles(printFiles, 'Print Pattern');
                    }
                    if (cfg.printRefColor) h += kv('Reference Base Color', esc(cfg.printRefColor));
                    if (cfg.printScale) h += kv('Scale Ratio', esc(cfg.printScale));
                } else if (mode === 'custom') {
                    if (cfg.customDesc) h += kv('Requirement Description', esc(cfg.customDesc));
                    if (cfg.colorReq) h += kv('Color Requirement', esc(cfg.colorReq));
                    if (cfg.physical) h += kv('Physical Mail', 'Yes' + (cfg.trackingNo ? ' (Tracking #: ' + esc(cfg.trackingNo) + '）' : ''));
                }

                // 里料专属：Full Lining/Partial Lining
                if (isLining) {
                    if (cfg.fullLining != null) h += kv('Full Lining', cfg.fullLining ? 'Yes' : 'No');
                    if (cfg.liningPlacement) h += kv('Lining Placement', esc(cfg.liningPlacement));
                }

                // Color Blocking Notes（非里料）或 Remark（Lining）
                if (cfg.remark) h += kv(isLining ? 'Remark' : 'Color Blocking Notes', esc(cfg.remark));

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
                    h += renderInlineFiles(matched, 'Reference Files');
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
            h += '<div class="u-cmt-title">Customer-supplied Fabric (CMT)</div>';
            if (fabricCmt && fabricCmt.desc) h += kv('Detail Description', esc(fabricCmt.desc));
            if (fabricCmt && fabricCmt.trackingNo) h += kv('Shipping Tracking #', esc(fabricCmt.trackingNo));
            if (cmtFabricFiles.length) {
                h += renderInlineFiles(cmtFabricFiles, 'Reference Files');
            }
            h += '</div>';
        } else if (cmtFabricFiles.length) {
            h += '<div class="u-sub-label" style="margin-top:14px">Customer-supplied Fabric Files</div>';
            h += '<div class="u-file-grid">';
            cmtFabricFiles.forEach(function (f) { h += renderFileItem(f); });
            h += '</div>';
        }

        h += secEnd();
        return h;
    }

    function renderTrimsSection(d, fileMap) {
        var trimDefs = [
            { key: 'metal_config', cat: 'metal', name: 'Metal Hardware', icon: '⚙️' },
            { key: 'pad_config', cat: 'pad', name: 'Padding', icon: '🧵' },
            { key: 'bag_config', cat: 'bag', name: 'Packaging Bag', icon: '👜' },
            { key: 'hangtag_config', cat: 'hangtag', name: 'Hang Tag', icon: '🏷️' },
            { key: 'label_config', cat: 'label', name: 'Label', icon: '📋' },
            { key: 'hygiene_config', cat: 'hygiene', name: 'Hygiene Sticker', icon: '🩹' },
            { key: 'other_config', cat: 'other', name: 'Other', icon: '📦' }
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

        var h = secStart('trims', 'Trims / Packaging', cards.length + ' item(s)');
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
        if (mode) h += kv('Mode', mode === 'auto' ? 'Hongxiu Standard' : 'Customer Customized');

        // Common fields handling by type
        switch (td.key) {
            case 'metal_config':
                if (val.finish) h += kv('Surface Finish', esc(val.finish));
                h += inlineByKey('sourceFiles', 'General Reference Files');
                if (val.logoCustom) {
                    h += kv('Logo Customization', 'Required');
                    if (Array.isArray(val.logoTypes) && val.logoTypes.length) h += kv('Logo Type', val.logoTypes.map(esc).join(', '));
                    h += inlineByKey('logoFiles', 'General Logo Files');
                }
                // 各品类明细
                if (val.details && val.categories && val.categories.length) {
                    val.categories.forEach(function (catName) {
                        var detail = val.details[catName];
                        if (!detail) return;
                        h += '<div class="u-metal-cat-block">';
                        h += '<div class="u-metal-cat-name">' + esc(catName) + '</div>';
                        if (detail.remark) h += kv('Remark', esc(detail.remark));
                        h += inlineByKey('details__' + catName + '__styleFiles', 'Style Reference');
                        if (detail.logoNeeded) {
                            h += kv('Dedicated Logo', 'Required');
                            h += inlineByKey('details__' + catName + '__logoFiles', 'Logo Files');
                        }
                        h += '</div>';
                    });
                }
                break;
            case 'pad_config':
                if (val.thickness) h += kv('Thickness', esc(val.thickness));
                if (val.color) {
                    var colorDisplay = val.color;
                    if (val.color === 'Other Custom Color' && val.otherColor) colorDisplay = val.otherColor + ' (Custom)';
                    h += kv('Color', esc(colorDisplay));
                }
                if (val.customShape) {
                    h += kv('Custom Shape', 'Yes' + (val.shapeRemark ? '（' + esc(val.shapeRemark) + '）' : ''));
                    h += inlineByKey('shapeFiles', 'Shape Reference');
                }
                h += inlineByKey('otherFiles', 'Other Reference');
                break;
            case 'bag_config':
                if (val.material) h += kv('Material', esc(val.material));
                if (val.size) h += kv('Size', esc(val.size));
                if (val.print) h += kv('Print', esc(val.print));
                if (Array.isArray(val.crafts) && val.crafts.length) h += kv('Craft', val.crafts.map(esc).join(', '));
                h += inlineByKey('designFiles', 'Design Files');
                break;
            case 'hangtag_config':
                if (val.remark) h += kv('Design Description', esc(val.remark));
                h += inlineByKey('designFiles', 'Design Files');
                if (mode !== 'auto') {
                    var matText = val.material || '';
                    if (matText === 'Other' && val.materialRemark) matText = val.materialRemark + '（Other）';
                    if (matText) h += kv('Material', esc(matText));
                    h += inlineByKey('otherMatFiles', 'Material Reference');
                    if (val.weight) h += kv('Weight (GSM)', esc(val.weight));
                    if (val.shape) h += kv('Shape', esc(val.shape));
                    if (val.roundedCorner) h += kv('Rounded Corners', 'Yes');
                    if (val.shapeRemark) h += kv('Shape Description', esc(val.shapeRemark));
                    h += inlineByKey('shapeFiles', 'Die-cut / Custom Shape Reference');
                    if (Array.isArray(val.crafts) && val.crafts.length) h += kv('Craft', val.crafts.map(esc).join(', '));
                    if (val.craftRemark) h += kv('Craft Description', esc(val.craftRemark));
                    h += inlineByKey('otherCraftFiles', 'Craft Reference');
                    var strType = val.stringType || '';
                    if (strType === 'Custom material and shape' && val.stringRemark) strType = val.stringRemark + '（Custom）';
                    if (strType) h += kv('String', esc(strType));
                    h += inlineByKey('stringFiles', 'String Reference');
                    var strColor = val.stringColor || '';
                    if (strColor === 'Other' && val.stringColorOther) strColor = val.stringColorOther + '（Other）';
                    if (strColor) h += kv('String Color', esc(strColor));
                    if (val.isSet) h += kv('Sub-tag', 'Yes' + (val.setRemark ? '（' + esc(val.setRemark) + '）' : ''));
                }
                break;
            case 'label_config':
                if (val.remark) h += kv('Design Description', esc(val.remark));
                h += inlineByKey('designFiles', 'Design Files');
                if (mode !== 'auto') {
                    if (val.material) h += kv('Material', esc(val.material));
                    h += inlineByKey('otherMatFiles', 'Material Reference');
                    if (val.size) h += kv('Size', esc(val.size));
                    if (val.method) h += kv('Sewing Method', esc(val.method));
                    if (val.sewingRemark) h += kv('Sewing Description', esc(val.sewingRemark));
                    h += inlineByKey('sewingFiles', 'Sewing Method Reference');
                    if (Array.isArray(val.components) && val.components.length) h += kv('Components', val.components.map(esc).join(', '));
                    if (val.placements) {
                        Object.keys(val.placements).forEach(function (k) {
                            h += kv('Position (' + esc(k) + ')', esc(val.placements[k]));
                        });
                    }
                    h += inlineByKey('placementFiles__top', 'Label Placement Reference (Top)');
                    h += inlineByKey('placementFiles__bottom', 'Label Placement Reference (Bottom)');
                    // 兼容旧数据 isSet → isSplit
                    var isSplit = val.isSplit || val.isSet;
                    if (isSplit) {
                        h += kv('Main Label & Care Label', 'Customized Separately');
                        if (val.splitRemark) h += kv('Separation Description', esc(val.splitRemark));
                    }
                }
                break;
            case 'hygiene_config':
                if (val.material) h += kv('Material', esc(val.material));
                if (val.shape) h += kv('Shape', esc(val.shape));
                if (val.size) h += kv('Size', esc(val.size));
                h += inlineByKey('shapeFiles', 'Custom Die-cut Reference');
                if (val.noApply) h += kv('Non-adhesive', 'Yes');
                if (val.shapeRemark) h += kv('Custom Shape Requirement', esc(val.shapeRemark));
                if (val.applyRemark) h += kv('Adhesive Rules', esc(val.applyRemark));
                h += inlineByKey('applyFiles', 'Adhesive Position Reference');
                h += inlineByKey('designFiles', 'Print Design');
                break;
            case 'other_config':
                h += inlineByKey('files', 'Reference Attachments');
                break;
        }

        // Hang Tag/标签的 remark 已作为"Design Description"展示，不再重复
        if (val.remark && td.key !== 'hangtag_config' && td.key !== 'label_config') h += kv('Remark', esc(val.remark));

        // CMT 客供物料信息
        var cmtEnabled = cmtInfo === true || (cmtInfo && cmtInfo.enabled);
        if (cmtEnabled) {
            h += '<div class="u-cmt-block">';
            h += '<div class="u-cmt-title">Customer-supplied (CMT)</div>';
            if (cmtInfo && cmtInfo.desc) h += kv('Detail Description', esc(cmtInfo.desc));
            if (cmtInfo && cmtInfo.trackingNo) h += kv('Shipping Tracking #', esc(cmtInfo.trackingNo));
            if (cmtFiles.length) {
                h += renderInlineFiles(cmtFiles, 'Reference Files');
            }
            h += '</div>';
        }

        // Inline files for this trim (non-CMT, not yet shown)
        var remainFiles = trimFiles.filter(function (f) { return !shownFileIds[f.id]; });
        if (remainFiles.length) {
            h += renderInlineFiles(remainFiles, 'Other Files');
        }
        h += '</div>';
        return h;
    }

    function renderShippingSection(d, fileMap) {
        var h = secStart('shipping', 'Delivery Information');

        h += kv('Delivery Mode', '<span class="u-chip accent">' + (d.delivery_mode === 'bulk' ? 'Bulk Order' : 'Sample Order') + '</span>');

        var isSample = d.delivery_mode !== 'bulk';

        if (isSample) {
            // ── Sample only ──
            var sampleRows = tryParse(d.sample_rows);
            if (Array.isArray(sampleRows) && sampleRows.length) {
                h += '<div class="u-sub-label" style="margin-top:16px">Sample Details</div>';
                h += '<div class="u-table-wrap"><table class="u-table"><thead><tr>' +
                    '<th>Style</th><th>Type</th><th>Size</th><th>Qty</th><th>Remark</th>' +
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
                h += '<div class="u-sub-label" style="margin-top:16px">Sample Logistics</div>';
                if (sampleCfg.carrier) h += kv('Shipping Method', esc(sampleCfg.carrier));
                if (sampleCfg.needBulkQuote) {
                    h += kv('Need Bulk Quote', 'Yes');
                    if (sampleCfg.intentQty) h += kv('Estimated Bulk Qty', esc(sampleCfg.intentQty) + ' pcs');
                    if (sampleCfg.intentPrice) h += kv('Target EXW Unit Price', '$' + esc(sampleCfg.intentPrice));
                    if (sampleCfg.intentTerm) h += kv('Trade Terms', esc(sampleCfg.intentTerm));
                    if (sampleCfg.intentMethod) h += kv('Transport Method', esc(sampleCfg.intentMethod));
                }
            }
            if (d.sample_dest) h += kv('Sample Destination', esc(d.sample_dest));
        } else {
            // ── Bulk only ──
            var bulkRows = tryParse(d.bulk_rows);
            if (Array.isArray(bulkRows) && bulkRows.length) {
                h += '<div class="u-sub-label" style="margin-top:16px">Bulk Details</div>';
                h += '<div class="u-table-wrap"><table class="u-table"><thead><tr>' +
                    '<th>Style</th><th>Qty</th><th>Size Allocation</th><th>Remark</th>' +
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
                h += '<div class="u-sub-label" style="margin-top:16px">Bulk Logistics</div>';
                if (bulkLog.term) h += kv('Trade Terms', esc(bulkLog.term));
                if (bulkLog.method) h += kv('Transport Method', esc(bulkLog.method));
            }
            if (d.bulk_dest) h += kv('Bulk Destination', esc(d.bulk_dest));
            if (d.bulk_target_price) h += kv('Target Price', esc(d.bulk_target_price));
            if (d.bulk_packing_remark) h += kv('Packaging Remark', esc(d.bulk_packing_remark));
            // Bulk packing files
            var bpFiles = fileMap['bulkPacking'] || [];
            if (bpFiles.length) h += renderInlineFiles(bpFiles, 'Packaging Reference Files');
        }

        // Final docs files (relevant to both modes)
        var fdFiles = fileMap['finalDocs'] || [];
        if (fdFiles.length) h += renderInlineFiles(fdFiles, 'Comprehensive Tech Pack / Plan');

        h += secEnd();
        return h;
    }

    function renderContactSection(d) {
        if (!d.contact_name && !d.brand_name) return '';

        var h = secStart('contact', 'Contact Information');
        if (d.contact_name) h += kv('Contact Name', esc(d.contact_name));
        if (d.contact_info) h += kv('Contact Info', esc(d.contact_info));
        if (d.brand_name) h += kv('Brand Name', esc(d.brand_name));
        if (d.website) h += kv('Website', '<a href="' + esc(d.website) + '" target="_blank" rel="noopener noreferrer">' + esc(d.website) + '</a>');
        if (d.final_remark) h += kv('General Remark', esc(d.final_remark));
        if (d.nda_agreed_at) h += kv('NDA Signed', '<span class="u-check-item" style="display:inline-flex"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>Signed ' + fmtDate(d.nda_agreed_at) + '</span>');
        h += secEnd();
        return h;
    }

    function renderAdminResponseSection(d) {
        // 如果没有任何管理员回复信息，不显示此区块
        if (!d.admin_reply && !d.project_link && !d.project_token) return '';

        var h = '<div class="u-sec u-sec-response"><div class="u-sec-head"><div class="u-sec-icon response">' +
            '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
            '</div><h4>Inquiry Response</h4>';
        if (d.admin_replied_at) h += '<span class="u-sec-count">' + fmtDate(d.admin_replied_at) + ' (UTC+8)</span>';
        h += '</div><div class="u-sec-body">';

        if (d.admin_reply) h += kv('Response', '<div class="u-reply-text">' + esc(d.admin_reply) + '</div>');
        if (d.project_link) {
            h += kv('Project Link', '<span class="u-copyable-row">' +
                '<a href="' + esc(d.project_link) + '" target="_blank" rel="noopener noreferrer">' + esc(d.project_link) + '</a>' +
                '<button class="u-copy-btn" onclick="copyText(\'' + esc(d.project_link).replace(/'/g, "\\'") + '\', this)" title="Copy">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
                '</button></span>');
        }
        if (d.project_token) {
            var masked = d.project_token.replace(/./g, '•');
            h += kv('Project Token', '<span class="u-copyable-row">' +
                '<code class="u-token" id="tokenDisplay" data-real="' + esc(d.project_token) + '">' + masked + '</code>' +
                '<button class="u-copy-btn u-reveal-btn" onclick="toggleToken(this)" title="View">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>' +
                '</button>' +
                '<button class="u-copy-btn" onclick="copyText(\'' + esc(d.project_token).replace(/'/g, "\\'") + '\', this)" title="Copy">' +
                '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>' +
                '</button></span>');
        }

        h += '</div></div>';
        return h;
    }

    window.copyText = function (text, btn) {
        navigator.clipboard.writeText(text).then(function () {
            var orig = btn.innerHTML;
            btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
            setTimeout(function () { btn.innerHTML = orig; }, 1500);
        });
    };

    window.toggleToken = function (btn) {
        var code = document.getElementById('tokenDisplay');
        if (!code) return;
        var real = code.getAttribute('data-real');
        if (code.textContent === real) {
            code.textContent = real.replace(/./g, '•');
            btn.title = 'View';
        } else {
            code.textContent = real;
            btn.title = 'Hide';
        }
    };

    function renderFilesSection(files, title) {
        if (!files || !files.length) return '';
        var h = secStart('files', title || 'file(s)', files.length + ' file(s)');
        h += '<div class="u-file-grid">';
        files.forEach(function (f) { h += renderFileItem(f); });
        h += '</div>';
        h += secEnd();
        return h;
    }

    // Shared file item renderer — images show as thumbnail previews
    function renderFileItem(f) {
        var url = FILE_BASE + encodeURIComponent(f.stored_name);
        var ext = (f.orig_name || '').split('.').pop().toLowerCase();
        var isImg = /^(jpg|jpeg|png|gif|webp)$/i.test(ext);
        var sizeStr = f.size_bytes ? formatSize(f.size_bytes) : '';

        if (isImg) {
            return '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="u-file-img-preview">' +
                '<div class="u-file-img-thumb"><img src="' + url + '" alt="' + esc(f.orig_name) + '" loading="lazy"></div>' +
                '<div class="u-file-img-info"><div class="u-file-name">' + esc(f.orig_name) + '</div>' +
                (sizeStr ? '<div class="u-file-meta">' + sizeStr + '</div>' : '') +
                '</div></a>';
        }

        var iconClass = 'other';
        var iconText = ext.toUpperCase();
        if (ext === 'pdf') { iconClass = 'pdf'; iconText = 'PDF'; }
        else if (/^(doc|docx)$/.test(ext)) { iconClass = 'doc'; iconText = 'DOC'; }
        else if (/^(zip|rar)$/.test(ext)) { iconClass = 'zip'; iconText = 'ZIP'; }
        else if (/^(xls|xlsx)$/.test(ext)) { iconClass = 'doc'; iconText = 'XLS'; }
        else if (/^(ai|eps)$/.test(ext)) { iconClass = 'doc'; iconText = 'AI'; }
        else if (/^(svg)$/.test(ext)) { iconClass = 'img'; iconText = 'SVG'; }
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
        files.forEach(function (f) { h += renderFileItem(f); });
        h += '</div></div>';
        return h;
    }

    function renderTimelineSection(d) {
        var h = '<div class="u-sec"><div class="u-sec-head">' +
            '<div class="u-sec-icon time"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></div>' +
            '<h4>Timeline</h4></div><div class="u-sec-body">';
        h += '<div class="u-timeline">';
        h += '<div class="u-timeline-item"><div class="u-timeline-dot"></div><div class="u-timeline-text"><strong>' + fmtDate(d.created_at) + '</strong>Inquiry Created</div></div>';
        if (d.modified_at && d.modified_at !== d.created_at) {
            h += '<div class="u-timeline-item"><div class="u-timeline-dot muted"></div><div class="u-timeline-text"><strong>' + fmtDate(d.modified_at) + '</strong>Last Updated</div></div>';
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
        var inner = '<div class="u-cpop-header"><span>Customization Details</span><button onclick="document.getElementById(\'u-custom-popover\').remove()">&times;</button></div>';
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
        var popW = Math.min(300, window.innerWidth - 32);
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
        if (!(await showConfirm('Are you sure you want to delete inquiry ' + inquiryNo + '?'))) return;
        try {
            var res = await fetch('/api/inquiry/' + id, { method: 'DELETE' });
            var json = await res.json();
            if (json.success) {
                loadInquiries(currentPage);
            } else {
                showMsg('Delete failed: ' + (json.message || 'Unknown error'), 'error');
            }
        } catch (e) {
            showMsg('Network error, please retry', 'error');
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

    /* ---------- Change Username ---------- */
    window.toggleUsernameEdit = function () {
        var editRow = document.getElementById('usernameEditRow');
        var isHidden = editRow.style.display === 'none';
        editRow.style.display = isHidden ? 'flex' : 'none';
        if (isHidden) document.getElementById('newUsername').focus();
        document.getElementById('username-msg').textContent = '';
    };

    window.handleChangeUsername = async function () {
        var msg = document.getElementById('username-msg');
        var input = document.getElementById('newUsername');
        var newName = input.value.trim();
        var isEn = window.__lang === 'en';

        if (!newName || newName.length < 2) {
            msg.className = 'u-form-msg error';
            msg.textContent = isEn ? 'Username must be at least 2 characters' : '用户名至少需要2个字符';
            return;
        }
        if (newName.length > 30) {
            msg.className = 'u-form-msg error';
            msg.textContent = isEn ? 'Username cannot exceed 30 characters' : '用户名不能超过30个字符';
            return;
        }

        msg.className = 'u-form-msg';
        msg.textContent = isEn ? 'Submitting...' : 'Submitting...';

        try {
            var res = await fetch('/api/change-username', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newUsername: newName })
            });
            var json = await res.json();
            if (json.success) {
                msg.className = 'u-form-msg success';
                msg.textContent = isEn ? 'Username updated successfully' : '用户名修改成功';
                document.getElementById('usernameDisplay').textContent = json.username;
                var headerName = document.querySelector('.u-user-info strong');
                if (headerName) headerName.textContent = json.username;
                setTimeout(function () { window.toggleUsernameEdit(); }, 1000);
            } else {
                msg.className = 'u-form-msg error';
                msg.textContent = json.message || (isEn ? 'Update failed' : 'Change failed');
            }
        } catch (err) {
            msg.className = 'u-form-msg error';
            msg.textContent = isEn ? 'Network error, please retry' : 'Network error, please retry';
        }
    };

    window.handleChangePwd = async function (e) {
        e.preventDefault();
        var msg = document.getElementById('pwd-msg');
        var cur = document.getElementById('currentPwd').value;
        var np = document.getElementById('newPwd').value;
        var cp = document.getElementById('confirmPwd').value;

        if (np !== cp) {
            msg.className = 'u-form-msg error';
            msg.textContent = 'New passwords do not match';
            return false;
        }
        if (np.length < 8) {
            msg.className = 'u-form-msg error';
            msg.textContent = 'New password must be at least 8 characters';
            return false;
        }

        msg.className = 'u-form-msg';
        msg.textContent = 'Submitting...';

        try {
            var res = await fetch('/api/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: cur, newPassword: np })
            });
            var json = await res.json();
            if (json.success) {
                msg.className = 'u-form-msg success';
                msg.textContent = 'Password changed successfully';
                document.getElementById('changePwdForm').reset();
            } else {
                msg.className = 'u-form-msg error';
                msg.textContent = json.message || 'Change failed';
            }
        } catch (err) {
            msg.className = 'u-form-msg error';
            msg.textContent = 'Network error, please retry';
        }
        return false;
    };

    /* ---------- Export ZIP ---------- */
    window.exportPDF = async function () {
        if (!_currentInquiryData || !_currentInquiryData.id) {
            showMsg(window.__lang === 'zh' ? '请先打开询盘详情' : 'Please open an inquiry first', 'error');
            return;
        }
        var btn = document.getElementById('export-pdf-btn');
        var origText = btn.innerHTML;
        btn.disabled = true;
        var genLabel = window.__lang === 'zh' ? '打包中...' : 'Packaging...';
        btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="u-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> ' + genLabel;
        try {
            var res = await fetch('/api/inquiry/' + _currentInquiryData.id + '/export');
            if (!res.ok) {
                var err = await res.json().catch(function () { return { message: window.__lang === 'zh' ? '导出失败' : 'Export failed' }; });
                throw new Error(err.message || 'HTTP ' + res.status);
            }
            var blob = await res.blob();
            var url = URL.createObjectURL(blob);
            var a = document.createElement('a');
            a.href = url;
            a.download = (_currentInquiryData.inquiry_no || 'inquiry') + '.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            showMsg((window.__lang === 'zh' ? '导出失败：' : 'Export failed: ') + e.message, 'error');
        } finally {
            btn.disabled = false;
            btn.innerHTML = origText;
        }
    };

    /* ---------- Edit inquiry ---------- */
    window.editInquiry = function (id) {
        if (!id && _currentInquiryData) {
            try {
                sessionStorage.setItem('copyInquiryData', JSON.stringify(_currentInquiryData));
                sessionStorage.setItem('editInquiryId', String(_currentInquiryData.id));
                window.location.href = '/';
            } catch (e) {
                showMsg(window.__lang === 'zh' ? '操作失败：数据过大或存储不可用' : 'Failed: data too large', 'error');
            }
            return;
        }
        fetch('/api/inquiry/' + id)
            .then(function (res) { return res.json(); })
            .then(function (json) {
                if (!json.success) throw new Error(json.message);
                sessionStorage.setItem('copyInquiryData', JSON.stringify(json.data));
                sessionStorage.setItem('editInquiryId', String(json.data.id));
                window.location.href = '/';
            })
            .catch(function (e) {
                showMsg((window.__lang === 'zh' ? '获取询盘数据失败：' : 'Failed to load inquiry: ') + e.message, 'error');
            });
    };

    /* ---------- Copy to new inquiry ---------- */
    window.copyToNewInquiry = function (id) {
        if (!id && _currentInquiryData) {
            // 从详情页复制：直接使用已加载的数据
            try {
                sessionStorage.setItem('copyInquiryData', JSON.stringify(_currentInquiryData));
                window.location.href = '/';
            } catch (e) {
                showMsg('Copy failed: data too large or storage unavailable', 'error');
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
                showMsg('Failed to fetch inquiry data: ' + e.message, 'error');
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
        var m = { pending: 'Pending', processing: 'Processing', quoted: 'Quoted', closed: 'Closed' };
        return m[s] || s || 'Pending';
    }

    /* ---------- Draft (Save Draft) ---------- */
    async function loadDraft() {
        try {
            var res = await fetch('/api/draft');
            var json = await res.json();
            var banner = document.getElementById('draft-banner');
            if (json.success && json.data) {
                var timeEl = document.getElementById('draft-time');
                timeEl.textContent = 'Saved at ' + fmtDate(json.updated_at);
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
                showMsg('Draft does not exist or has expired', 'warn');
            }
        } catch (e) {
            showMsg('Failed to get draft', 'error');
        }
    };

    window.deleteDraft = async function () {
        if (!(await showConfirm('Are you sure you want to delete the draft?'))) return;
        try {
            var res = await fetch('/api/draft', { method: 'DELETE' });
            var json = await res.json();
            if (json.success) {
                document.getElementById('draft-banner').style.display = 'none';
            } else {
                showMsg('Delete failed', 'error');
            }
        } catch (e) {
            showMsg('Network error', 'error');
        }
    };

    /* ---------- Init ---------- */
    loadInquiries(1);
    loadDraft();

    // 支持 URL 参数直接打开指定询盘: /user?inquiry_no=HX-XXXXXX
    var urlParams = new URLSearchParams(window.location.search);
    var directInquiryNo = urlParams.get('inquiry_no');
    if (directInquiryNo) {
        fetch('/api/inquiry-by-no/' + encodeURIComponent(directInquiryNo))
            .then(function(r) { return r.json(); })
            .then(function(json) {
                if (json.success && json.id) openDetail(json.id);
            })
            .catch(function() {});
        window.history.replaceState({}, '', window.location.pathname);
    }
})();
