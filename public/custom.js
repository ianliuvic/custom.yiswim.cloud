        // ==========================================
        // 远程文件辅助 (复制询盘时恢复已上传文件)
        // ==========================================
        const REMOTE_FILE_BASE = 'https://files.yiswim.cloud/uploads/inquiries/';
        function isRemoteFile(f) { return f && f._remote === true; }
        function remoteFileUrl(f) { return f.url || (REMOTE_FILE_BASE + encodeURIComponent(f.stored_name)); }
        function isImageMime(mime) { return mime && mime.startsWith('image/'); }
        function fileExt(name) { return (name || '').split('.').pop().toUpperCase(); }

        // 全局 CMT 数据管理
        let currentDraftId = null; // Scheme C: 当前草稿询盘 ID
        let currentEditInquiryId = null; // 编辑模式：要覆盖更新的询盘 ID
        let cmtFilesData = {
            fabric: [],
            pad: [],
            metal: [],
            bag: [],
            hangtag: [],
            label: [],
            hygiene: [],
            other: []
        };

        // 新增胸垫配置对象
        let padConfig = {
            mode: 'auto',
            customShape: false,
            shapeRemark: '',
            thickness: '常规标准 (5-8mm)', // 更改这里的默认值
            color: '海绵裸色',
            otherColor: '',
            remark: '',
            shapeFiles: [],
            otherFiles: []
        };

        /**
         * 统一处理 CMT 模式的文件上传
         * @param {HTMLElement} input - file input 元素
         * @param {string} category - 类别 (如 'fabric', 'metal', 'other' 等)
         */
        function handleCmtFiles(input, category) {
            const files = Array.from(input.files);
            const targetArray = cmtFilesData[category];
            
            files.forEach(file => {
                if (file.size > 20 * 1024 * 1024) { showMsg(`文件 ${file.name} 超过 20MB`, 'error'); return; }
                if (!targetArray.some(f => f.name === file.name && f.size === file.size)) {
                    targetArray.push(file);
                }
            });
        
            // 更新按钮文字
            const nameElId = (category === 'fabric') ? 'fabricCmtFileName' : `cmt-filename-${category}`;
            const nameEl = document.getElementById(nameElId);
            if (nameEl) nameEl.innerText = `已选 ${targetArray.length} 个文件`;
        
            renderCmtPreviews(category);
            
            // 触发对应的侧边栏汇总刷新
            if (category === 'fabric') updateFabricSummary();
            else updateTrimSummaryTrigger(category);
            
            input.value = '';
        }
        
        /**
         * 渲染 CMT 预览网格 - 优化版
         */
        function renderCmtPreviews(category) {
            const gridId = (category === 'fabric') ? 'fabricCmtPreview' : `cmt-preview-${category}`;
            const grid = document.getElementById(gridId);
            if (!grid) return;
            
            grid.innerHTML = '';
            const files = cmtFilesData[category];
        
            files.forEach((file, index) => {
                const remote = isRemoteFile(file);
                const isImage = remote ? isImageMime(file.mime) : file.type.startsWith('image/');
                const ext = fileExt(file.name);
                const shortName = file.name.length > 6 ? file.name.substring(0, 3) + '...' : file.name;
        
                let content;
                if (isImage) {
                    const src = remote ? remoteFileUrl(file) : URL.createObjectURL(file);
                    content = `<img src="${src}" onclick="openOemPreview(this.src, '${file.name}')" style="width:100%; height:100%; object-fit:cover;">`;
                } else {
                    content = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:10px;font-weight:bold;border-radius:4px;">${ext}</div>`;
                }
        
                grid.insertAdjacentHTML('beforeend', `
                    <div class="oem-preview-item" id="preview-cmt-${category}-${index}">
                        ${content}
                        <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.5); color:#fff; font-size:8px; padding:1px; text-align:center; white-space:nowrap; overflow:hidden;">${shortName}</div>
                        <button type="button" class="oem-preview-remove" onclick="removeCmtFile(${index}, '${category}')" style="width:16px; height:16px; font-size:12px;">&times;</button>
                    </div>
                `);
            });
        }

        
        /**
         * 移除 CMT 文件
         */
        function removeCmtFile(index, category) {
            cmtFilesData[category].splice(index, 1);
            
            // 更新文字提示
            const nameElId = (category === 'fabric') ? 'fabricCmtFileName' : `cmt-filename-${category}`;
            const nameEl = document.getElementById(nameElId);
            if (nameEl) {
                const count = cmtFilesData[category].length;
                nameEl.innerText = count > 0 ? `已选 ${count} 个文件` : (category === 'fabric' ? '点击上传图片或 PDF 清单' : '点击上传');
            }
        
            renderCmtPreviews(category);
            if (category === 'fabric') updateFabricSummary();
            else updateTrimSummaryTrigger(category);
        }


        document.addEventListener('DOMContentLoaded', async () => {
            try {
                const response = await fetch('/api/get-data');
                const result = await response.json();
                if (result.success && result.data) {
                    if(result.data.bags) renderBags(result.data.bags);
                    if(result.data.odm_styles) renderOdmStyles(result.data.odm_styles);
                    if(result.data.fabrics) renderFabrics(result.data.fabrics);
                    // 新增：触发渲染 Checklist
                    if(result.data.oem_checklists) renderOemChecklists(result.data.oem_checklists);

                    // 检查是否有复制询盘数据需要恢复
                    const copyRaw = sessionStorage.getItem('copyInquiryData');
                    const draftId = sessionStorage.getItem('restoreDraftId');
                    const editId = sessionStorage.getItem('editInquiryId');
                    if (copyRaw) {
                        sessionStorage.removeItem('copyInquiryData');
                        sessionStorage.removeItem('restoreDraftId');
                        sessionStorage.removeItem('editInquiryId');
                        try {
                            const copyData = JSON.parse(copyRaw);
                            if (draftId) currentDraftId = parseInt(draftId);
                            if (editId) currentEditInquiryId = parseInt(editId);
                            restoreFromInquiry(copyData);
                        } catch(e) { console.warn('恢复询盘数据失败:', e); }
                    } else {
                        // 仅在非复制模式下自动填充联系信息
                        if(result.data.last_contact) prefillContact(result.data.last_contact);
                    }
                }
            } catch (error) { console.warn('加载数据API未就绪，使用静态展示框架:', error); }
        });

        // 自动填充 Step 5 联系信息（从用户上次询盘带入）
        function prefillContact(c) {
            const map = {
                'final-contact-name': c.contact_name,
                'final-contact-info': c.contact_info,
                'final-brand-name': c.brand_name,
                'final-website': c.website
            };
            for (const [id, val] of Object.entries(map)) {
                if (val) { const el = document.getElementById(id); if (el) el.value = val; }
            }
            if (c.nda_agreed_at) {
                const el = document.getElementById('nda-agree');
                if (el) el.checked = true;
            }
            if (typeof validateContact === 'function') validateContact();
            if (typeof updateStep5Summary === 'function') updateStep5Summary();
        }

        // ==========================================
        // 从历史询盘恢复表单数据 (复制为新询盘)
        // ==========================================
        function restoreFromInquiry(d) {
            const _parse = (v) => {
                if (v == null) return null;
                if (typeof v === 'object') return v;
                try { return JSON.parse(v); } catch(e) { return null; }
            };

            // ── Step 1: 款式 ──
            const odmArr = _parse(d.odm_styles) || [];
            const odmCustom = _parse(d.odm_custom_data) || {};

            // 选择 ODM 款式
            odmArr.forEach(function(name) {
                const cardId = 'card-' + String(name).replace(/\s+/g, '-');
                const cardEl = document.getElementById(cardId);
                if (cardEl) {
                    selectOdmStyle(name, cardEl, true);
                } else {
                    if (selectedOdmStyles.indexOf(name) === -1) selectedOdmStyles.push(name);
                }
            });
            // 恢复 odmCustomData (无文件)
            for (const sn in odmCustom) {
                odmCustomData[sn] = { remark: (odmCustom[sn] && odmCustom[sn].remark) || '', files: [] };
                // 更新轻定制徽章
                const badge = document.getElementById('badge-' + sn.replace(/\s+/g, '-'));
                if (badge && odmCustom[sn] && odmCustom[sn].remark) badge.classList.add('active');
            }

            // 确保默认显示 ODM 面板
            toggleStyleMode('existing');

            // OEM 数据恢复 (始终填充，仅在 OEM 模式激活时切换 Tab)
            if (d.oem_mode_active) {
                toggleStyleMode('upload');
            }
            if (d.oem_project || d.oem_mode_active || d.oem_style_count) {
                const projEl = document.getElementById('oem-collection-name');
                if (projEl) projEl.value = d.oem_project || '';
                const projDescEl = document.getElementById('oem-project-desc');
                if (projDescEl) projDescEl.value = d.oem_project_desc || '';
                const countEl = document.getElementById('oem-collection-count');
                if (countEl) {
                    countEl.value = d.oem_style_count || 0;
                    // 先设置 descriptions 数组，再渲染输入框
                    const descs = _parse(d.oem_descriptions) || [];
                    oemStyleDescriptions = descs.map(function(v) { return typeof v === 'object' ? JSON.stringify(v) : String(v || ''); });
                    renderOemStyleDescInputs();
                }
                const remarkEl = document.getElementById('oem-remark');
                if (remarkEl) remarkEl.value = d.oem_remark || '';
                const sizeRemarkEl = document.getElementById('oem-size-remark');
                if (sizeRemarkEl) sizeRemarkEl.value = d.oem_size_remark || '';
                // 实体样衣
                if (d.oem_physical_sample) {
                    const physEl = document.getElementById('oem-physical');
                    if (physEl) { physEl.checked = true; togglePhysicalInfo(true); }
                    if (d.oem_tracking_no) {
                        const trackEl = document.querySelector('#oem-address-info input');
                        if (trackEl) trackEl.value = d.oem_tracking_no;
                    }
                }
                // Checklist
                const checkedIds = _parse(d.oem_checklist) || [];
                document.querySelectorAll('.oem-checklist-item input[type="checkbox"]').forEach(function(cb) {
                    if (checkedIds.indexOf(cb.value) !== -1) {
                        cb.checked = true;
                        cb.parentElement.style.background = '#fff';
                    }
                });
                if (typeof syncOemCheckAllBtn === 'function') syncOemCheckAllBtn();
            }
            updateCombinedStyleSummary();

            // ── Step 2: 面料 ──
            const fabData = _parse(d.fabric_selection) || {};
            for (const catId in fabData) {
                if (!fabricSelection[catId]) continue;
                const srcCat = fabData[catId];
                fabricSelection[catId].activeName = srcCat.activeName || '';
                fabricSelection[catId].configs = {};
                var srcConfigs = srcCat.configs || {};
                for (const fabricName in srcConfigs) {
                    var srcCfg = srcConfigs[fabricName];
                    fabricSelection[catId].configs[fabricName] = Object.assign({}, srcCfg, {
                        files: [], prints: [], customFiles: [],
                        designFiles: [], shapeFiles: [], applyFiles: []
                    });
                }
                // 视觉选中面料卡片 (使用 onclick 属性匹配，兼容 CUSTOM_SOURCING 和英文名)
                if (srcCat.activeName) {
                    var grid = document.getElementById(catId);
                    if (grid) {
                        grid.querySelectorAll('.fabric-item').forEach(function(item) {
                            var onclick = item.getAttribute('onclick') || '';
                            if (onclick.indexOf("'" + srcCat.activeName + "'") !== -1) {
                                item.classList.add('selected');
                            }
                        });
                    }
                }
            }

            // 面料配置面板展开：对当前活跃的面料 Tab 展开配置面板
            // 利用 switchFabricCat 的内置恢复逻辑来展开面板 (无需重复实现)
            if (activeFabricCat && fabricSelection[activeFabricCat] && fabricSelection[activeFabricCat].activeName) {
                var activeTabEl = document.querySelector('#fabric-sub-tabs .mode-option.active');
                // switchFabricCat 中包含面板定位、模式切换、数据填充等全套恢复逻辑
                if (activeTabEl) switchFabricCat(activeFabricCat, activeTabEl);
            }

            if (typeof updateFabricSummary === 'function') updateFabricSummary();

            // ── Step 3: 辅料 ──
            const trimMap = {
                metal: { dbKey: 'metal_config', ref: function() { return metalConfig; }, set: function(v) { metalConfig = v; } },
                pad:   { dbKey: 'pad_config',   ref: function() { return padConfig; },   set: function(v) { padConfig = v; } },
                bag:   { dbKey: 'bag_config',   ref: function() { return bagConfig; },   set: function(v) { bagConfig = v; } },
                hangtag:{ dbKey: 'hangtag_config', ref: function() { return hangtagConfig; }, set: function(v) { hangtagConfig = v; } },
                label: { dbKey: 'label_config', ref: function() { return labelConfig; }, set: function(v) { labelConfig = v; } },
                hygiene:{ dbKey: 'hygiene_config', ref: function() { return hygieneConfig; }, set: function(v) { hygieneConfig = v; } },
                other: { dbKey: 'other_config', ref: function() { return otherConfig; }, set: function(v) { otherConfig = v; } }
            };
            const fileArrayKeys = ['designFiles','shapeFiles','sourceFiles','logoFiles','otherFiles',
                'shapeFiles','applyFiles','otherMatFiles','otherCraftFiles','stringFiles',
                'sewingFiles','customFiles'];

            // 草稿中额外保存了 trim_enabled 状态
            const draftTrimEnabled = d.trim_enabled || {};

            for (const cat in trimMap) {
                var info = trimMap[cat];
                var cfg = _parse(d[info.dbKey]) || {};
                var shouldEnable = draftTrimEnabled[cat] || (cfg && Object.keys(cfg).length > 0);
                if (shouldEnable) {
                    // 启用该辅料
                    var yesRadio = document.querySelector('input[name="need_' + cat + '"][value="yes"]');
                    if (yesRadio) { yesRadio.checked = true; toggleTrim(cat, true); }
                    // 确保文件数组为空
                    fileArrayKeys.forEach(function(k) { if (!(k in cfg)) cfg[k] = []; });
                    // 处理嵌套对象中的文件数组
                    if (cfg.details) {
                        for (var dk in cfg.details) {
                            var det = cfg.details[dk];
                            if (det) {
                                if (!det.styleFiles) det.styleFiles = [];
                                if (!det.logoFiles) det.logoFiles = [];
                            }
                        }
                    }
                    if (cfg.placementFiles) {
                        for (var pk in cfg.placementFiles) { cfg.placementFiles[pk] = []; }
                    }
                    info.set(cfg);
                    // updateTrimSummaryTrigger 延后到 restoreTrimVisuals 之后调用
                    // (否则 summary 函数会从空 DOM 读取并覆盖 config 中的文本值)

                    // 视觉选中包装袋材质卡片
                    if (cat === 'bag' && cfg.material) {
                        var bagContainer = document.getElementById('bag-list-container');
                        if (bagContainer) {
                            bagContainer.querySelectorAll('.bag-material').forEach(function(item) {
                                var h4 = item.querySelector('.option-info h4');
                                if (h4 && h4.textContent.trim() === cfg.material) {
                                    item.classList.add('selected');
                                }
                            });
                        }
                    }
                }
            }

            // ── 辅料视觉状态恢复 (卡片选中、面板展开、输入框填充) ──
            (function restoreTrimVisuals() {
                // 通用：根据文本内容在容器中选中卡片
                function selectCardByText(containerId, cardSelector, text) {
                    var c = document.getElementById(containerId);
                    if (!c || !text) return null;
                    var found = null;
                    c.querySelectorAll(cardSelector).forEach(function(el) {
                        if (el.textContent.trim() === text || el.textContent.trim().indexOf(text) === 0) {
                            el.classList.add('selected');
                            found = el;
                        }
                    });
                    return found;
                }

                // ── Metal ──
                if (metalConfig.mode) switchMetalMode(metalConfig.mode);
                if (metalConfig.finish) {
                    var finishContainer = document.getElementById('metal-finish-container');
                    if (finishContainer) {
                        finishContainer.querySelectorAll('.finish-item').forEach(function(el) {
                            el.classList.remove('selected');
                            var onclick = el.getAttribute('onclick') || '';
                            if (onclick.indexOf("'" + metalConfig.finish + "'") !== -1) el.classList.add('selected');
                        });
                    }
                }
                if (metalConfig.categories && metalConfig.categories.length > 0) {
                    var metalGrid = document.getElementById('metal-category-grid');
                    if (metalGrid) {
                        metalConfig.categories.forEach(function(catName) {
                            metalGrid.querySelectorAll('.metal-item').forEach(function(el) {
                                if (el.getAttribute('data-cat') === catName || el.textContent.trim().indexOf(catName) !== -1) {
                                    el.classList.add('selected');
                                    var xBtn = el.querySelector('.file-remove');
                                    if (xBtn) xBtn.style.display = 'flex';
                                }
                            });
                        });
                    }
                }
                if (metalConfig.logoCustom) {
                    // logoCustom 是全局级别，对应的 DOM 在 per-item 面板中，不在此恢复
                }

                // ── Pad ──
                // 先填充文本输入，再切模式（switchPadMode→updatePadSummary 会从 DOM 读值写回 config）
                if (padConfig.shapeRemark) { var el = document.getElementById('pad-shape-remark'); if (el) el.value = padConfig.shapeRemark; }
                if (padConfig.remark) { var el = document.getElementById('pad-remark'); if (el) el.value = padConfig.remark; }
                if (padConfig.otherColor) { var el = document.getElementById('pad-color-other'); if (el) el.value = padConfig.otherColor; }
                if (padConfig.mode) switchPadMode(padConfig.mode);
                if (padConfig.thickness) {
                    var padThickContainer = document.querySelector('#content-pad .pad-thick')?.parentNode;
                    if (padThickContainer) {
                        padThickContainer.querySelectorAll('.pad-thick').forEach(function(el) {
                            el.classList.remove('selected');
                            var onclick = el.getAttribute('onclick') || '';
                            if (onclick.indexOf("'" + padConfig.thickness + "'") !== -1) el.classList.add('selected');
                        });
                    }
                }
                if (padConfig.color) {
                    var padColorContainer = document.querySelector('#content-pad .pad-color')?.parentNode;
                    if (padColorContainer) {
                        padColorContainer.querySelectorAll('.pad-color').forEach(function(el) {
                            el.classList.remove('selected');
                            var onclick = el.getAttribute('onclick') || '';
                            if (onclick.indexOf("'" + padConfig.color + "'") !== -1) el.classList.add('selected');
                        });
                    }
                    var padDisplay = document.getElementById('pad-color-display');
                    if (padDisplay) padDisplay.innerText = padConfig.color;
                    if (padConfig.color === '其他定制色') {
                        var otherArea = document.getElementById('pad-color-other-area');
                        if (otherArea) otherArea.classList.remove('hidden');
                    }
                }
                if (padConfig.customShape) {
                    var shapeCheck = document.getElementById('pad-custom-shape-check');
                    if (shapeCheck) shapeCheck.checked = true;
                    var shapeArea = document.getElementById('pad-shape-custom-area');
                    if (shapeArea) shapeArea.classList.remove('hidden');
                }
                // （文本已在 switchPadMode 前填充）

                // ── Hangtag ──
                if (hangtagConfig.mode) switchHangtagMode(hangtagConfig.mode);
                if (hangtagConfig.material) {
                    var htMatGrid = document.getElementById('hangtag-material-grid');
                    if (htMatGrid) {
                        htMatGrid.querySelectorAll('.option-item').forEach(function(el) {
                            el.classList.remove('selected');
                            var onclick = el.getAttribute('onclick') || '';
                            if (onclick.indexOf("'" + hangtagConfig.material + "'") !== -1) el.classList.add('selected');
                        });
                        // 标准材质显示克重区域
                        var isStdMat = ['白卡纸', '铜版纸', '牛皮纸'].indexOf(hangtagConfig.material) !== -1;
                        var weightArea = document.getElementById('hangtag-weight-area');
                        if (weightArea) weightArea.classList.toggle('hidden', !isStdMat);
                    }
                }
                if (hangtagConfig.weight) {
                    var weightContainer = document.getElementById('hangtag-weight-area');
                    if (weightContainer) {
                        weightContainer.querySelectorAll('.chip').forEach(function(el) {
                            el.classList.remove('selected');
                            if (el.textContent.trim() === hangtagConfig.weight) el.classList.add('selected');
                        });
                    }
                }
                if (hangtagConfig.shape) {
                    var shapeGrid = document.getElementById('hangtag-shape-grid');
                    if (shapeGrid) {
                        shapeGrid.querySelectorAll('.option-item').forEach(function(el) {
                            el.classList.remove('selected');
                            var onclick = el.getAttribute('onclick') || '';
                            if (onclick.indexOf("'" + hangtagConfig.shape + "'") !== -1) el.classList.add('selected');
                        });
                    }
                }
                if (hangtagConfig.roundedCorner) {
                    var rc = document.getElementById('hangtag-rounded-corner');
                    if (rc) rc.checked = true;
                }
                if (hangtagConfig.crafts && hangtagConfig.crafts.length > 0) {
                    var craftGrid = document.getElementById('hangtag-craft-grid');
                    if (craftGrid) {
                        craftGrid.querySelectorAll('.option-item').forEach(function(el) {
                            var onclick = el.getAttribute('onclick') || '';
                            hangtagConfig.crafts.forEach(function(c) {
                                if (onclick.indexOf("'" + c + "'") !== -1) el.classList.add('selected');
                            });
                        });
                    }
                }
                if (hangtagConfig.stringType) {
                    var strGrid = document.getElementById('hangtag-string-grid');
                    if (strGrid) {
                        strGrid.querySelectorAll('.option-item').forEach(function(el) {
                            el.classList.remove('selected');
                            var onclick = el.getAttribute('onclick') || '';
                            if (onclick.indexOf("'" + hangtagConfig.stringType + "'") !== -1) el.classList.add('selected');
                        });
                    }
                }
                if (hangtagConfig.stringColor) {
                    var scContainer = document.getElementById('hangtag-string-color-container');
                    if (scContainer) {
                        scContainer.querySelectorAll('.string-color-swatch').forEach(function(el) {
                            el.classList.remove('selected');
                            if (el.getAttribute('title') === hangtagConfig.stringColor || el.getAttribute('title') === hangtagConfig.stringColor.replace('其他', '其他颜色')) el.classList.add('selected');
                        });
                    }
                    var scDisplay = document.getElementById('string-color-name-display');
                    if (scDisplay) scDisplay.innerText = hangtagConfig.stringColor;
                    if (hangtagConfig.stringColor === '其他') {
                        var scOther = document.getElementById('hangtag-string-color-other-area');
                        if (scOther) scOther.classList.remove('hidden');
                    }
                }
                if (hangtagConfig.isSet) {
                    var setCheck = document.getElementById('hangtag-is-set');
                    if (setCheck) setCheck.checked = true;
                    var setArea = document.getElementById('hangtag-set-detail-area');
                    if (setArea) setArea.classList.remove('hidden');
                }
                if (hangtagConfig.remark) { var el = document.getElementById('hangtag-remark'); if (el) el.value = hangtagConfig.remark; }
                if (hangtagConfig.materialRemark) { var el = document.getElementById('hangtag-material-remark'); if (el) el.value = hangtagConfig.materialRemark; }
                if (hangtagConfig.shapeRemark) { var el = document.getElementById('hangtag-shape-remark'); if (el) el.value = hangtagConfig.shapeRemark; }
                if (hangtagConfig.craftRemark) { var el = document.getElementById('hangtag-craft-remark'); if (el) el.value = hangtagConfig.craftRemark; }
                if (hangtagConfig.stringRemark) { var el = document.getElementById('hangtag-string-remark'); if (el) el.value = hangtagConfig.stringRemark; }
                if (hangtagConfig.stringColorOther) { var el = document.getElementById('hangtag-string-color-other'); if (el) el.value = hangtagConfig.stringColorOther; }
                if (hangtagConfig.setRemark) { var el = document.getElementById('hangtag-set-remark'); if (el) el.value = hangtagConfig.setRemark; }

                // ── Label ──
                // 先填充文本输入，再切模式（switchLabelMode→updateLabelSummary 会从 DOM 读值写回 config）
                if (labelConfig.remark) { var el = document.getElementById('label-remark'); if (el) el.value = labelConfig.remark; }
                if (labelConfig.size) { var el = document.getElementById('label-custom-size'); if (el) el.value = labelConfig.size; }
                if (labelConfig.splitRemark) { var el = document.getElementById('label-split-remark'); if (el) el.value = labelConfig.splitRemark; }
                if (labelConfig.sewingRemark) { var el = document.getElementById('label-sewing-remark'); if (el) el.value = labelConfig.sewingRemark; }
                if (labelConfig.mode) switchLabelMode(labelConfig.mode);
                // 材质选中：找到匹配卡片并模拟 selectLabelMaterial 的核心逻辑
                if (labelConfig.material) {
                    var lMatGrid = document.getElementById('label-material-grid');
                    if (lMatGrid) {
                        var matchedEl = null;
                        lMatGrid.querySelectorAll('.option-item').forEach(function(el) {
                            el.classList.remove('selected');
                            var onclick = el.getAttribute('onclick') || '';
                            if (onclick.indexOf("'" + labelConfig.material + "'") !== -1) { el.classList.add('selected'); matchedEl = el; }
                        });
                        // 显示配置面板（定位在 switchSubTab 切换到 label 时重算，因为 pane-label 此时 display:none）
                        if (matchedEl) {
                            var lPanel = document.getElementById('label-config-panel');
                            if (lPanel) {
                                lMatGrid.appendChild(lPanel);
                                lPanel.classList.remove('hidden');
                                // 子区域显示逻辑
                                var otherArea = document.getElementById('label-material-other-area');
                                var sizeSewing = document.getElementById('label-dynamic-size-sewing');
                                var sizeArea = document.getElementById('label-size-area');
                                var sewingArea = document.getElementById('label-sewing-area');
                                if (labelConfig.material === '其他') {
                                    if (otherArea) otherArea.classList.remove('hidden');
                                    if (sizeSewing) sizeSewing.classList.add('hidden');
                                } else if (labelConfig.material === '印标') {
                                    if (otherArea) otherArea.classList.add('hidden');
                                    if (sizeSewing) sizeSewing.classList.remove('hidden');
                                    if (sizeArea) sizeArea.classList.remove('hidden');
                                    if (sewingArea) sewingArea.classList.add('hidden');
                                } else {
                                    if (otherArea) otherArea.classList.add('hidden');
                                    if (sizeSewing) sizeSewing.classList.remove('hidden');
                                    if (sizeArea) sizeArea.classList.remove('hidden');
                                    if (sewingArea) sewingArea.classList.remove('hidden');
                                }
                            }
                        }
                    }
                }
                // 尺寸输入
                if (labelConfig.size) { var el = document.getElementById('label-custom-size'); if (el) el.value = labelConfig.size; }
                // 部件选中
                if (labelConfig.components && labelConfig.components.length > 0) {
                    var compChips = document.querySelectorAll('#pane-label .chip');
                    compChips.forEach(function(chip) {
                        // 只处理带 toggleLabelComponent 的 chip
                        var onclick = chip.getAttribute('onclick') || '';
                        if (onclick.indexOf('toggleLabelComponent') === -1) return;
                        chip.classList.remove('selected');
                    });
                    compChips.forEach(function(chip) {
                        var onclick = chip.getAttribute('onclick') || '';
                        if (onclick.indexOf('toggleLabelComponent') === -1) return;
                        labelConfig.components.forEach(function(comp) {
                            if (onclick.indexOf("'" + comp + "'") !== -1) chip.classList.add('selected');
                        });
                    });
                    var topArea = document.getElementById('label-placement-top-area');
                    var bottomArea = document.getElementById('label-placement-bottom-area');
                    if (topArea) topArea.classList.toggle('hidden', labelConfig.components.indexOf('上装/连体') === -1);
                    if (bottomArea) bottomArea.classList.toggle('hidden', labelConfig.components.indexOf('下装/裤装') === -1);
                }
                // 位置选中
                if (labelConfig.placements) {
                    ['top', 'bottom'].forEach(function(gt) {
                        if (!labelConfig.placements[gt]) return;
                        var pGrid = document.getElementById('label-placement-' + gt + '-grid');
                        if (pGrid) {
                            pGrid.querySelectorAll('.option-item').forEach(function(el) {
                                el.classList.remove('selected');
                                var onclick = el.getAttribute('onclick') || '';
                                if (onclick.indexOf("'" + labelConfig.placements[gt] + "'") !== -1) el.classList.add('selected');
                            });
                            // 自定义位置
                            if (labelConfig.placements[gt] === '自定义其他位置') {
                                var customArea = document.getElementById('label-placement-custom-' + gt);
                                if (customArea) customArea.classList.remove('hidden');
                            }
                        }
                    });
                }
                // 缝制方式选中
                if (labelConfig.method) {
                    var sewGrid = document.getElementById('label-sewing-grid');
                    if (sewGrid) {
                        sewGrid.querySelectorAll('.option-item').forEach(function(el) {
                            el.classList.remove('selected');
                            var onclick = el.getAttribute('onclick') || '';
                            if (onclick.indexOf("'" + labelConfig.method + "'") !== -1) el.classList.add('selected');
                        });
                        if (labelConfig.method === '其他') {
                            var sewOther = document.getElementById('label-sewing-other-area');
                            if (sewOther) sewOther.classList.remove('hidden');
                        }
                    }
                }
                if (labelConfig.isSplit) {
                    var splitCheck = document.getElementById('label-is-split');
                    if (splitCheck) splitCheck.checked = true;
                    var splitArea = document.getElementById('label-split-detail-area');
                    if (splitArea) splitArea.classList.remove('hidden');
                }
                // （文本已在 switchLabelMode 前填充）

                // ── Hygiene ──
                // 先填充文本输入，再切模式（switchHygieneMode→updateHygieneSummary 会从 DOM 读值写回 config）
                if (hygieneConfig.remark) { var el = document.getElementById('hygiene-text'); if (el) el.value = hygieneConfig.remark; }
                if (hygieneConfig.shapeRemark) { var el = document.getElementById('hygiene-shape-remark'); if (el) el.value = hygieneConfig.shapeRemark; }
                if (hygieneConfig.applyRemark) { var el = document.getElementById('hygiene-apply-remark'); if (el) el.value = hygieneConfig.applyRemark; }
                if (hygieneConfig.size) {
                    var sizeCheck = document.getElementById('hygiene-custom-size-check');
                    if (sizeCheck) sizeCheck.checked = true;
                    var sizeInput = document.getElementById('hygiene-custom-size');
                    if (sizeInput) sizeInput.value = hygieneConfig.size;
                }
                if (hygieneConfig.mode) switchHygieneMode(hygieneConfig.mode);
                if (hygieneConfig.material) {
                    var hygMatContainer = document.querySelector('#content-hygiene .hygiene-mat')?.parentNode;
                    if (hygMatContainer) {
                        hygMatContainer.querySelectorAll('.hygiene-mat').forEach(function(el) {
                            el.classList.remove('selected');
                            var onclick = el.getAttribute('onclick') || '';
                            if (onclick.indexOf("'" + hygieneConfig.material + "'") !== -1) el.classList.add('selected');
                        });
                    }
                }
                if (hygieneConfig.shape) {
                    var shapeGrid = document.getElementById('hygiene-shape-grid');
                    if (shapeGrid) {
                        shapeGrid.querySelectorAll('.hygiene-shape').forEach(function(el) {
                            el.classList.remove('selected');
                            var onclick = el.getAttribute('onclick') || '';
                            if (onclick.indexOf("'" + hygieneConfig.shape + "'") !== -1) el.classList.add('selected');
                        });
                        if (hygieneConfig.shape === '其他定制形状') {
                            var customShape = document.getElementById('hygiene-custom-shape-area');
                            if (customShape) customShape.classList.remove('hidden');
                        }
                    }
                }
                if (hygieneConfig.size) {
                    var sizeCheck = document.getElementById('hygiene-custom-size-check');
                    if (sizeCheck) sizeCheck.checked = true;
                    var sizeArea = document.getElementById('hygiene-size-input-area');
                    if (sizeArea) sizeArea.classList.remove('hidden');
                    var sizeInput = document.getElementById('hygiene-custom-size');
                    if (sizeInput) sizeInput.value = hygieneConfig.size;
                }
                if (hygieneConfig.noApply) {
                    var noApplyCheck = document.getElementById('hygiene-no-apply');
                    if (noApplyCheck) noApplyCheck.checked = true;
                    var ruleArea = document.getElementById('hygiene-apply-rule-area');
                    if (ruleArea) ruleArea.classList.add('hidden');
                }
                // （文本已在 switchHygieneMode 前填充）

                // ── Bag (配置面板 + 尺寸/印刷/工艺) ──
                if (bagConfig.material && bagConfig.material !== '未选材质') {
                    var bagContainer = document.getElementById('bag-list-container');
                    if (bagContainer) {
                        // 找到匹配卡片并模拟 onBagClick 核心逻辑 (不含 scroll)
                        var matchedBagEl = null;
                        bagContainer.querySelectorAll('.bag-material').forEach(function(el) {
                            el.classList.remove('selected');
                            var onclick = el.getAttribute('onclick') || '';
                            if (onclick.indexOf(bagConfig.material) !== -1) { matchedBagEl = el; }
                        });
                        if (matchedBagEl) {
                            matchedBagEl.classList.add('selected');
                            // 展开配置面板（定位在 changeStep 进入 step-3 时重算）
                            var bagPanel = document.getElementById('bag-config-panel');
                            if (bagPanel) {
                                // 先追加到容器末尾并显示，进入 step-3 时会重新定位
                                bagContainer.appendChild(bagPanel);
                                bagPanel.classList.remove('hidden');
                            }
                            // 提取 bag JSON 渲染尺寸
                            var onclickAttr = matchedBagEl.getAttribute('onclick') || '';
                            var bagJsonMatch = onclickAttr.match(/onBagClick\((\{.*?\}),/);
                            if (bagJsonMatch) {
                                try {
                                    var bagObj = JSON.parse(bagJsonMatch[1].replace(/&quot;/g, '"'));
                                    var rawSizes = bagObj.size || bagObj.sizes || bagObj['尺寸'] || [];
                                    if (typeof rawSizes === 'string') rawSizes = rawSizes.split(',').map(function(s) { return s.trim(); });
                                    renderBagSizes(rawSizes);
                                } catch(e) {}
                            }
                        }
                    }
                    // 选中尺寸
                    if (bagConfig.size && bagConfig.size !== '未选尺寸') {
                        setTimeout(function() {
                            var sizeContainer = document.getElementById('bag-size-container');
                            if (sizeContainer) {
                                sizeContainer.querySelectorAll('.bag-size').forEach(function(el) {
                                    var onclick = el.getAttribute('onclick') || '';
                                    if (onclick.indexOf("'" + bagConfig.size + "'") !== -1) el.classList.add('selected');
                                });
                                if (bagConfig.size === '自定义尺寸') {
                                    var customBox = document.getElementById('bag-custom-size-box');
                                    if (customBox) customBox.classList.remove('hidden');
                                    if (bagConfig.customWidth) { var w = document.getElementById('bag-custom-width'); if (w) w.value = bagConfig.customWidth; }
                                    if (bagConfig.customHeight) { var h = document.getElementById('bag-custom-height'); if (h) h.value = bagConfig.customHeight; }
                                }
                            }
                        }, 150);
                    }
                    // 印刷模式
                    if (bagConfig.print && bagConfig.print !== '空白无印') {
                        var printGrid = document.getElementById('bag-print-grid');
                        if (printGrid) {
                            printGrid.querySelectorAll('.bag-print').forEach(function(el) {
                                el.classList.remove('selected');
                                var onclick = el.getAttribute('onclick') || '';
                                if (onclick.indexOf("'" + bagConfig.print + "'") !== -1) el.classList.add('selected');
                            });
                            var printPanel = document.getElementById('bag-print-panel');
                            if (printPanel) {
                                printGrid.parentNode.insertBefore(printPanel, printGrid.nextSibling);
                                printPanel.classList.remove('hidden');
                            }
                        }
                    }
                    // 工艺选中
                    if (bagConfig.crafts && bagConfig.crafts.length > 0) {
                        var craftContainer = document.getElementById('content-bag');
                        if (craftContainer) {
                            craftContainer.querySelectorAll('.bag-craft').forEach(function(el) {
                                var onclick = el.getAttribute('onclick') || '';
                                bagConfig.crafts.forEach(function(c) {
                                    if (onclick.indexOf("'" + c + "'") !== -1) el.classList.add('selected');
                                });
                            });
                        }
                    }
                }

                // ── Other ──
                if (otherConfig.remark) { var el = document.getElementById('other-remark'); if (el) el.value = otherConfig.remark; }
            })();

            // 辅料汇总更新 (必须在视觉状态恢复之后，确保 DOM 输入框已填充)
            for (var _cat in trimMap) {
                var _isEnabled = document.querySelector('input[name="need_' + _cat + '"][value="yes"]');
                if (_isEnabled && _isEnabled.checked) updateTrimSummaryTrigger(_cat);
            }

            // CMT 状态
            const cmtData = _parse(d.cmt_enabled) || {};
            for (const cat in cmtData) {
                var cmtVal = cmtData[cat];
                if (cmtVal && (cmtVal === true || cmtVal.enabled)) {
                    var cmtCb = document.getElementById('cmt-check-' + cat);
                    if (cat === 'fabric') cmtCb = document.getElementById('fabric-cmt-check');
                    if (cmtCb) {
                        cmtCb.checked = true;
                        if (cat === 'fabric') {
                            toggleFabricCmtInfo(true);
                            if (cmtVal.desc) { var el = document.getElementById('fabric-cmt-desc'); if (el) el.value = cmtVal.desc; }
                            if (cmtVal.trackingNo) { var el2 = document.getElementById('fabric-cmt-tracking'); if (el2) el2.value = cmtVal.trackingNo; }
                        } else {
                            if (typeof toggleTrimCmt === 'function') toggleTrimCmt(cat, true);
                            if (cmtVal.desc) { var el3 = document.getElementById('cmt-desc-' + cat); if (el3) el3.value = cmtVal.desc; }
                            if (cmtVal.trackingNo) { var el4 = document.getElementById('cmt-tracking-' + cat); if (el4) el4.value = cmtVal.trackingNo; }
                        }
                    }
                }
            }
            if (typeof validateTrims === 'function') validateTrims();

            // ── Step 4: 下单交付 ──
            var mode = d.delivery_mode || 'sample';
            currentDeliveryMode = mode;

            // 恢复 sample 数据
            var savedSampleRows = _parse(d.sample_rows) || [];
            var savedSampleCfg = _parse(d.sample_config) || {};
            sampleConfig = Object.assign({ carrier: 'DHL/FedEx (红绣代办)', needBulkQuote: false, intentTerm: 'DDP', intentMethod: 'Sea Freight (海运)' }, savedSampleCfg);
            sampleRows = savedSampleRows.length > 0 ? savedSampleRows : [];

            // 恢复 bulk 数据
            var savedBulkRows = _parse(d.bulk_rows) || [];
            var savedBulkCfg = _parse(d.bulk_logistics) || {};
            bulkLogisticsConfig = Object.assign({ term: 'DDP 双清包税', method: 'Sea' }, savedBulkCfg);
            bulkRows = savedBulkRows.length > 0 ? savedBulkRows : [];

            // 切换交付模式 (会触发渲染)
            switchDeliveryMode(mode);

            // 设置 DOM 输入值
            if (d.sample_dest) { var el = document.getElementById('sample-destination'); if (el) el.value = d.sample_dest; }
            if (d.bulk_dest) { var el2 = document.getElementById('bulk-destination'); if (el2) el2.value = d.bulk_dest; }
            if (d.bulk_target_price) { var el3 = document.getElementById('bulk-target-price'); if (el3) el3.value = d.bulk_target_price; }
            if (d.bulk_packing_remark) { var el4 = document.getElementById('bulk-shipping-remark'); if (el4) el4.value = d.bulk_packing_remark; }

            // 大货意向评估
            if (sampleConfig.needBulkQuote) {
                var chk = document.getElementById('sample-need-bulk-quote');
                if (chk) chk.checked = true;
                toggleSampleBulkIntent(true);
                if (sampleConfig.intentQty) { var q = document.getElementById('sample-intent-qty'); if (q) q.value = sampleConfig.intentQty; }
                if (sampleConfig.intentPrice) { var p = document.getElementById('sample-intent-price'); if (p) p.value = sampleConfig.intentPrice; }
            }

            // 选中 sample carrier 按钮 (.chip 元素，非 .option-item)
            if (sampleConfig.carrier) {
                var carrierChips = document.querySelectorAll('#pane-delivery-sample .chip');
                carrierChips.forEach(function(el) {
                    var onclick = el.getAttribute('onclick') || '';
                    if (onclick.indexOf('selectSampleAttr') !== -1 && onclick.indexOf('carrier') !== -1) {
                        el.classList.remove('selected');
                        if (onclick.indexOf("'" + sampleConfig.carrier + "'") !== -1) el.classList.add('selected');
                    }
                });
            }

            // 选中 sample 大货意向运输方式 & 贸易术语 (.sewing-card 元素)
            if (sampleConfig.needBulkQuote) {
                if (sampleConfig.intentMethod) {
                    document.querySelectorAll('#pane-delivery-sample .sewing-card').forEach(function(el) {
                        var onclick = el.getAttribute('onclick') || '';
                        if (onclick.indexOf('intentMethod') !== -1) {
                            el.classList.remove('selected');
                            if (onclick.indexOf("'" + sampleConfig.intentMethod + "'") !== -1) el.classList.add('selected');
                        }
                    });
                }
                if (sampleConfig.intentTerm) {
                    document.querySelectorAll('#pane-delivery-sample .sewing-card').forEach(function(el) {
                        var onclick = el.getAttribute('onclick') || '';
                        if (onclick.indexOf('intentTerm') !== -1) {
                            el.classList.remove('selected');
                            if (onclick.indexOf("'" + sampleConfig.intentTerm + "'") !== -1) el.classList.add('selected');
                        }
                    });
                }
            }

            // 选中 bulk 贸易术语按钮 (radio-card 使用 radio input)
            if (bulkLogisticsConfig.term) {
                document.querySelectorAll('#pane-delivery-bulk input[name="bulk_trade_term"]').forEach(function(radio) {
                    var onclick = radio.getAttribute('onclick') || '';
                    if (onclick.indexOf("'" + bulkLogisticsConfig.term + "'") !== -1) {
                        radio.checked = true;
                    } else {
                        radio.checked = false;
                    }
                });
            }
            // 选中 bulk 运输方式按钮 (先清除默认 selected)
            if (bulkLogisticsConfig.method) {
                document.querySelectorAll('.bulk-method').forEach(function(el) {
                    el.classList.remove('selected');
                    if (el.getAttribute('onclick') && el.getAttribute('onclick').indexOf("'" + bulkLogisticsConfig.method + "'") !== -1) {
                        el.classList.add('selected');
                    }
                });
            }

            updateLogisticsSummary();
            if (typeof validateShipping === 'function') validateShipping();

            // ── Step 5: 确认提交 ──
            var fieldMap = {
                'final-contact-name': d.contact_name,
                'final-contact-info': d.contact_info,
                'final-brand-name': d.brand_name,
                'final-website': d.website,
                'final-remark': d.final_remark,
                'assign-sales': d.assign_sales,
                'assign-pattern': d.assign_pattern,
                'assign-sewing': d.assign_sewing
            };
            for (var id in fieldMap) {
                if (fieldMap[id]) { var el5 = document.getElementById(id); if (el5) el5.value = fieldMap[id]; }
            }
            if (d.nda_agreed_at) {
                var ndaEl = document.getElementById('nda-agree');
                if (ndaEl) ndaEl.checked = true;
            }
            if (typeof updateStep5Summary === 'function') updateStep5Summary();
            if (typeof validateContact === 'function') validateContact();

            // ── 全局验证 (移至附件恢复之后) ──

            // ── 恢复附件 (远程文件) ──
            if (d.files && d.files.length > 0) {
                var makeRemote = function(f) {
                    return { _remote: true, name: f.orig_name, mime: f.mime_type, size: f.size_bytes, stored_name: f.stored_name };
                };
                var filesByCategory = {};
                d.files.forEach(function(f) {
                    if (!filesByCategory[f.category]) filesByCategory[f.category] = [];
                    filesByCategory[f.category].push(f);
                });

                // ODM Custom
                (filesByCategory.odmCustom || []).forEach(function(f) {
                    if (odmCustomData[f.sub_key]) odmCustomData[f.sub_key].files.push(makeRemote(f));
                });

                // OEM
                (filesByCategory.oem || []).forEach(function(f) {
                    if (oemFilesData[f.sub_key]) oemFilesData[f.sub_key].push(makeRemote(f));
                });
                ['tech', 'ref', 'size'].forEach(function(type) {
                    var grid = document.getElementById('oem' + type.charAt(0).toUpperCase() + type.slice(1) + 'Preview');
                    if (!grid) return;
                    oemFilesData[type].forEach(function(file, idx) {
                        if (!isRemoteFile(file)) return;
                        var isImg = isImageMime(file.mime);
                        addOemPreviewItem(type, isImg ? remoteFileUrl(file) : null, file.name, idx, isImg, fileExt(file.name));
                    });
                });

                // Fabric
                (filesByCategory.fabric || []).forEach(function(f) {
                    var parts = f.sub_key.split('__');
                    if (parts.length < 3) return;
                    var catId = parts[0], fabName = parts[1], propName = parts[2];
                    var cfg = fabricSelection[catId] && fabricSelection[catId].configs && fabricSelection[catId].configs[fabName];
                    if (!cfg) return;
                    if (propName === 'print') { cfg.prints.push(makeRemote(f)); }
                    else if (Array.isArray(cfg[propName])) { cfg[propName].push(makeRemote(f)); }
                });

                // CMT
                (filesByCategory.cmt || []).forEach(function(f) {
                    if (cmtFilesData[f.sub_key]) cmtFilesData[f.sub_key].push(makeRemote(f));
                });
                Object.keys(cmtFilesData).forEach(function(cat) {
                    if (cmtFilesData[cat].length > 0) renderCmtPreviews(cat);
                });

                // Trim files — generic nested‐path handler
                var trimRefs = { metal: metalConfig, pad: padConfig, bag: bagConfig, hangtag: hangtagConfig, label: labelConfig, hygiene: hygieneConfig, other: otherConfig };
                for (var tCat in trimRefs) {
                    (filesByCategory[tCat] || []).forEach(function(f) {
                        var parts = f.sub_key.split('__');
                        var target = trimRefs[tCat];
                        for (var i = 0; i < parts.length - 1; i++) { target = target && target[parts[i]]; }
                        var lastKey = parts[parts.length - 1];
                        if (target && Array.isArray(target[lastKey])) target[lastKey].push(makeRemote(f));
                    });
                }

                // Render trim previews
                if (filesByCategory.metal) {
                    if (metalConfig.logoFiles.length) renderMetalPreviews('logo');
                    if (metalConfig.sourceFiles.length) renderMetalPreviews('source');
                    for (var mCat in metalConfig.details) {
                        if (metalConfig.details[mCat].logoFiles.length) renderMetalItemPreviews(mCat, 'logo');
                        if (metalConfig.details[mCat].styleFiles.length) renderMetalItemPreviews(mCat, 'style');
                    }
                }
                if (filesByCategory.pad) {
                    if (padConfig.shapeFiles.length) renderPadPreviews('shape');
                    if (padConfig.otherFiles.length) renderPadPreviews('other');
                }
                if (filesByCategory.bag && bagConfig.designFiles.length) renderBagPreviews();
                if (filesByCategory.hangtag) {
                    var htMap = { designFiles: 'design', shapeFiles: 'shape', otherMatFiles: 'material', otherCraftFiles: 'craft', stringFiles: 'string' };
                    for (var hk in htMap) { if (hangtagConfig[hk] && hangtagConfig[hk].length) renderHangtagPreviews(htMap[hk]); }
                }
                if (filesByCategory.label) {
                    if (labelConfig.designFiles.length) renderLabelPreviews();
                    if (labelConfig.placementFiles && labelConfig.placementFiles.top && labelConfig.placementFiles.top.length) renderLabelPlacementPreviews('top');
                    if (labelConfig.placementFiles && labelConfig.placementFiles.bottom && labelConfig.placementFiles.bottom.length) renderLabelPlacementPreviews('bottom');
                    if (labelConfig.sewingFiles && labelConfig.sewingFiles.length) renderLabelSewingPreviews();
                }
                if (filesByCategory.hygiene) {
                    ['design', 'shape', 'apply'].forEach(function(t) {
                        if (hygieneConfig[t + 'Files'] && hygieneConfig[t + 'Files'].length) renderHygienePreviews(t);
                    });
                }
                if (filesByCategory.other && otherConfig.files.length) renderOtherPreviews();

                // Bulk packing & Final docs
                (filesByCategory.bulkPacking || []).forEach(function(f) { bulkPackingFiles.push(makeRemote(f)); });
                if (bulkPackingFiles.length) renderBulkPackingPreviews();
                (filesByCategory.finalDocs || []).forEach(function(f) { finalDocsFiles.push(makeRemote(f)); });
                if (finalDocsFiles.length) renderFinalDocsPreviews();

                if (typeof updateCombinedStyleSummary === 'function') updateCombinedStyleSummary();
            }

            // ── 全局验证 (附件恢复完成后执行，确保验证结果正确) ──
            if (typeof validateAll === 'function') validateAll();

            // ── 提示用户 ──
            var hasRestoredFiles = d.files && d.files.length > 0;
            var isDraftRestore = !!currentDraftId;
            var isEditMode = !!currentEditInquiryId;
            setTimeout(function() {
                var toast = document.createElement('div');
                toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:99999;padding:12px 24px;border-radius:10px;background:#065f46;color:#fff;font-size:14px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,.15);transition:opacity .5s;';
                toast.textContent = isDraftRestore
                    ? _t('已恢复暂存草稿')
                    : isEditMode
                    ? _t('已加载询盘数据，修改后重新提交')
                    : (hasRestoredFiles ? _t('已从历史询盘复制数据（含附件）') : _t('已从历史询盘复制数据'));
                document.body.appendChild(toast);
                setTimeout(function() { toast.style.opacity = '0'; }, 3000);
                setTimeout(function() { toast.remove(); }, 3500);
            }, 300);
        }

        // 动态渲染 OEM Checklist (采用紧凑型清单样式)
        function renderOemChecklists(items) {
            const container = document.getElementById('oem-checklist-container');
            const section = document.getElementById('oem-checklist-section');
            if (!container) return;

            if (!items || items.length === 0) {
                if (section) section.style.display = 'none';
                container.innerHTML = '';
                return;
            }

            container.innerHTML = items.map((item, index) => {
                const isLast = index === items.length - 1;
                const borderBottom = isLast ? 'none' : '1px solid #fde68a'; 
                
                // 核心修改：在 onchange 里加入了 syncOemCheckAllBtn() 联动检查
                const lang = window.__lang || 'zh';
                const displayText = (lang === 'en' && item.content_en) ? item.content_en : item.content;
                return `
                <label class="oem-checklist-item" style="display: flex; align-items: center; width: 100%; box-sizing: border-box; padding: 8px 12px; border-bottom: ${borderBottom}; cursor: pointer; transition: background 0.2s; border-radius: 6px;">
                    <input type="checkbox" style="width: 16px; height: 16px; accent-color: var(--primary-color); margin: 0 12px 0 0; cursor: pointer; flex-shrink: 0;" onchange="this.parentElement.style.background = this.checked ? '#fff' : 'transparent'; syncOemCheckAllBtn(); validateStyle();">
                    <span style="font-size: 13px; font-weight: 500; color: #475569; line-height: 1.4;">${displayText}</span>
                </label>
                `;
            }).join('');
            
            // 为所有的 label 增加鼠标悬停效果
            container.querySelectorAll('.oem-checklist-item').forEach(label => {
                label.addEventListener('mouseenter', function() {
                    if (!this.querySelector('input').checked) this.style.background = 'rgba(255, 255, 255, 0.5)';
                });
                label.addEventListener('mouseleave', function() {
                    if (!this.querySelector('input').checked) this.style.background = 'transparent';
                });
            });
            
            // 初始渲染时也同步一下按钮状态
            syncOemCheckAllBtn();
        }

        // ==========================================
        // OEM Checklist 智能全选/联动逻辑
        // ==========================================
        
        // 1. 点击“一键全选/取消”按钮时触发
        function toggleAllOemChecklists() {
            const checkboxes = document.querySelectorAll('.oem-checklist-item input[type="checkbox"]');
            if (checkboxes.length === 0) return;

            // 检查当前是否已经全部选中
            let allChecked = true;
            checkboxes.forEach(cb => { if (!cb.checked) allChecked = false; });

            // 如果已经全选了，就执行全不选；如果还没全选，就全选
            const targetState = !allChecked; 

            checkboxes.forEach(cb => {
                cb.checked = targetState;
                // 手动触发样式的高亮与取消
                cb.parentElement.style.background = targetState ? '#fff' : 'transparent';
            });

            // 同步更新按钮文案
            syncOemCheckAllBtn();
            validateStyle();
        }

        // 2. 双向联动：根据当前打勾数量，自动更新按钮的文字和颜色
        function syncOemCheckAllBtn() {
            const checkboxes = document.querySelectorAll('.oem-checklist-item input[type="checkbox"]');
            const btn = document.getElementById('oem-check-all-btn');
            if (checkboxes.length === 0 || !btn) return;

            let allChecked = true;
            checkboxes.forEach(cb => { if (!cb.checked) allChecked = false; });

            if (allChecked) {
                btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px; vertical-align:-1px;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg> 取消全选`;
                btn.style.color = '#ef4444';
                btn.style.borderColor = '#fecaca';
            } else {
                btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right:4px; vertical-align:-1px;"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg> 一键全选`;
                btn.style.color = '#d97706';
                btn.style.borderColor = '#fde68a';
            }
        }


        // 绑定底部按钮事件
        document.getElementById('prevBtn').addEventListener('click', () => changeStep(-1));
        document.getElementById('nextBtn').addEventListener('click', () => {
            
            // --- 优化：Step 1 的 OEM 必填 Checklist 拦截逻辑 ---
            if (currentStep === 1) {
                const isOemActive = document.getElementById('mode-oem').classList.contains('active');
                
                // 只有当处于 OEM 模式，并且用户确实填写了 OEM 内容时，才触发拦截校验
                if (isOemActive && checkOemHasContent()) {
                    const checklists = document.querySelectorAll('.oem-checklist-item input[type="checkbox"]');
                    let allChecked = true;
                    checklists.forEach(cb => { if (!cb.checked) allChecked = false; });
                    
                    if (!allChecked) {
                        showMsg(_t("⚠️ 提交前置校验失败：\n\n您提交了自主设计 (OEM) 需求，为避免后期版型开发与大货生产出现工艺偏差，请务必逐一勾选确认「核心工艺与细节确认单」中的所有必填核对项。"), 'warn');
                        
                        // 自动滚动到该区域，并做一次警示闪烁动画
                        const checklistArea = document.getElementById('oem-checklist-section');
                        if (checklistArea) {
                            const scrollArea = document.querySelector('.config-scroll-area');
                            const rect = checklistArea.getBoundingClientRect();
                            const scrollRect = scrollArea.getBoundingClientRect();
                            // 平滑滚动
                            scrollArea.scrollBy({ top: rect.top - scrollRect.top - 20, behavior: 'smooth' });
                            
                            // 红色呼吸闪烁反馈
                            checklistArea.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.3)';
                            setTimeout(() => { checklistArea.style.boxShadow = 'none'; }, 1500);
                        }
                        return; // 终止跳转，留在第一步
                    }
                }
            }
            // ----------------------------------------------------

            if (currentStep === totalSteps) {
                submitForm(); // 触发最终提交
            } else {
                changeStep(1);
            }
        });



        // ==========================================
        // 1. ODM 款式渲染与联动
        // ==========================================
        function renderOdmStyles(styles) {
            const navContainer = document.getElementById('odm-category-nav');
            const contentContainer = document.getElementById('odm-content-container');
            if (!styles || styles.length === 0) { navContainer.innerHTML = '<p style="color:#999;font-size:12px;">暂无款式数据</p>'; return; }

            const categories = [...new Set(styles.map(s => s.category).filter(Boolean))];

            // --- 新增：强制分类排序逻辑 ---
            const targetOrder = ['比基尼', '分体', '连体', '大码', '儿童', '沙滩裤', '男裤'];
            categories.sort((a, b) => {
                const indexA = targetOrder.indexOf(a);
                const indexB = targetOrder.indexOf(b);
                if (indexA !== -1 && indexB !== -1) return indexA - indexB; // 都在预设里，按预设顺序
                if (indexA !== -1) return -1; // a 在预设里，a 靠前
                if (indexB !== -1) return 1;  // b 在预设里，b 靠前
                return a.localeCompare(b, 'zh-CN'); // 都不在预设里，按默认中文排序
            });
            // ------------------------------
            
            navContainer.innerHTML = ''; contentContainer.innerHTML = '';
            categories.forEach((cat, index) => {
                const isActive = index === 0 ? 'active' : '';
                const catId = `cat-${cat.replace(/\s+/g, '-')}`;
                navContainer.insertAdjacentHTML('beforeend', `<div class="cat-item ${isActive}" onclick="switchCategory('${catId}', this)">${cat}</div>`);
                contentContainer.insertAdjacentHTML('beforeend', `<div id="${catId}" class="cat-pane ${isActive}"><div class="option-grid" id="grid-${catId}"></div></div>`);
                
                const catStyles = styles.filter(s => s.category === cat);

                const gridContainer = document.getElementById(`grid-${catId}`);
                catStyles.forEach(style => {
                    if (style.image_urls && style.image_urls.length > 0) {
                        style.image_urls.sort((a, b) => {
                            const keyA = a.split('/').pop().replace(/_\d+\.\w+$/, '');
                            const keyB = b.split('/').pop().replace(/_\d+\.\w+$/, '');
                            return keyA === keyB ? a.localeCompare(b) : keyA.localeCompare(keyB);
                        });
                    }
                    const coverImg = (style.image_urls && style.image_urls.length > 0) ? style.image_urls[0] : '';
                    const styleJson = JSON.stringify(style).replace(/"/g, '&quot;');
                    
                    const cardHtml = `
                        <div class="option-item style-item" id="card-${style.name.replace(/\s+/g, '-')}" onclick="selectOdmStyle('${style.name}', this)">
                            <div class="details-btn" onclick="event.stopPropagation(); openDetailModal(${styleJson})" title="查看图片">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                            <div class="customize-btn" onclick="event.stopPropagation(); openCustomModal(${styleJson}, this.closest('.option-item'))" title="版型轻定制">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                            </div>
                            <img src="${coverImg}" class="option-img" loading="lazy">
                            <div class="option-info" style="padding: 14px 18px;">
                                <h4 style="margin: 0; text-align: center;">${style.name} <span class="custom-badge" id="badge-${style.name.replace(/\s+/g, '-')}">✨ 已定制</span></h4>
                            </div>
                        </div>`;

                    gridContainer.insertAdjacentHTML('beforeend', cardHtml);
                });
            });
        }

        function switchCategory(catId, el) {
            document.querySelectorAll('#odm-category-nav .cat-item').forEach(item => item.classList.remove('active')); el.classList.add('active');
            document.querySelectorAll('#odm-content-container .cat-pane').forEach(pane => pane.classList.remove('active')); document.getElementById(catId).classList.add('active');
        }

    // 1. 实现双向同步 OEM 数量
    function syncOemCount(val) {
        const sampleInput = document.getElementById('oem-style-count');
        const bulkInput = document.getElementById('bulk-oem-style-count');
        
        // 同步数值
        if(sampleInput) sampleInput.value = val;
        if(bulkInput) bulkInput.value = val;
        
        // 如果在打样 Tab，需要重新渲染表格下拉框
        if (typeof renderSampleTable === 'function') {
            renderSampleTable();
        }
        
        updateLogisticsSummary();
    }

        // 多选切换逻辑
        function selectOdmStyle(name, el, forceSelect = false) {
            const index = selectedOdmStyles.indexOf(name);
            
            if (forceSelect) {
                if (index === -1) selectedOdmStyles.push(name);
                if (el) el.classList.add('selected');
            } else {
                if (index > -1) {
                    selectedOdmStyles.splice(index, 1); 
                    if (el) el.classList.remove('selected');
                } else {
                    selectedOdmStyles.push(name); 
                    if (el) el.classList.add('selected');
                }
            }
            updateCombinedStyleSummary();
            // 【新增】同步更新 Step-4 的 ODM 数量徽章
            const count = selectedOdmStyles.length; // 定义 count
            const sBadge = document.getElementById('odm-count-badge');
            const bBadge = document.getElementById('bulk-odm-count-badge');
            if (sBadge) sBadge.innerText = count;
            if (bBadge) bBadge.innerText = count;
        }

        // 3. 升级初始化逻辑，支持两个 Tab 的锁定状态同步
        function updateStep4Scale() {
            const count = selectedOdmStyles.length;
            const hasOemContent = checkOemHasContent();

            // 处理打样 Tab
            const sBadge = document.getElementById('odm-count-badge');
            if(sBadge) sBadge.innerText = count;
            
            // 处理大货 Tab
            const bBadge = document.getElementById('bulk-odm-count-badge');
            if(bBadge) bBadge.innerText = count;
            
            // 将 Step 1 的数量同步到 Step 4 的 OEM 徽章上
            const oemCountInput = document.getElementById('oem-collection-count');
            const currentOemCount = oemCountInput ? (parseInt(oemCountInput.value) || 0) : 0;
            const sOemBadge = document.getElementById('oem-count-badge');
            const bOemBadge = document.getElementById('bulk-oem-count-badge');
            if (sOemBadge) sOemBadge.innerText = currentOemCount;
            if (bOemBadge) bOemBadge.innerText = currentOemCount;
        
            if (currentDeliveryMode === 'sample') renderSampleTable();

            // 确保大货表格有初始行
            if (bulkRows.length === 0) addBulkRow();
            else renderBulkTable();
        }

        // --- 新增函数，替换掉旧的 updateOdmSummary ---
        function updateCombinedStyleSummary() {
            const sumStyleEl = document.getElementById('sum-style');
            let html = '';
        
            // 1. 处理 ODM 部分
            if (selectedOdmStyles.length > 0) {
                html += `<div style="margin-bottom:8px;"><strong>ODM款式 (${selectedOdmStyles.length}):</strong><br>`;
                html += selectedOdmStyles.map(name => {
                    const custom = odmCustomData[name];
                    const hasCustom = custom && (custom.remark !== '' || custom.files.length > 0);
                    return `<span style="font-size: 11px; color: #64748b; display: block;">- ${name}${hasCustom ? ' <span style="color:var(--primary-color)">(已定制)</span>' : ''}</span>`;
                }).join('');
                html += `</div>`;
            }
        
            // 2. 处理 OEM 部分 (判断是否有文件或备注)
            const hasOemFiles = oemFilesData.tech.length > 0 || oemFilesData.ref.length > 0 || oemFilesData.size.length > 0;
            const oemRemark = document.getElementById('oem-remark').value.trim();
            const oemSizeRemark = (document.getElementById('oem-size-remark')?.value || '').trim();
            const collectionName = document.getElementById('oem-collection-name') ? document.getElementById('oem-collection-name').value.trim() : '';
            const collectionCount = parseInt(document.getElementById('oem-collection-count')?.value) || 0;
            const oemPhysical = document.getElementById('oem-physical').checked; // 新增：获取寄样勾选状态
            if (hasOemFiles || oemRemark !== '' || oemSizeRemark !== '' || oemPhysical || collectionName !== '') {
                html += `<div style="border-top: 1px dashed #e2e8f0; padding-top: 8px;">`;
                html += `<strong style="color:var(--primary-color);">${_t('OEM 自主设计包:')}</strong><br>`;
                
                // 【新增】显示项目名称和数量
                if (collectionName) {
                    html += `<span style="font-size: 11px; color: #1e293b; display:block; font-weight:600;">[ ${collectionName} ] - ${_t('共')} ${collectionCount} ${_t('款')}</span>`;
                } else if (collectionCount > 0) {
                    html += `<span style="font-size: 11px; color: #1e293b; display:block; font-weight:600;">${_t('共')} ${collectionCount} ${_t('款设计')}</span>`;
                }
                
                // 显示上传状态
                if (hasOemFiles) {
                    html += `<span style="font-size: 11px; color: #64748b; display:block;">- ${_t('已传:')} ${oemFilesData.ref.length}${_t('图 /')} ${oemFilesData.tech.length}${_t('文件')}${oemFilesData.size.length > 0 ? ' / ' + oemFilesData.size.length + _t('尺寸') : ''}</span>`;
                }
                
                // 新增：显示寄样状态
                if (oemPhysical) {
                    html += `<span style="font-size: 11px; color: #64748b; display:block;">- <span style="color:#27ae60;">●</span> ${_t('寄送实体样衣')}</span>`;
                    const trackingInput = document.querySelector('#oem-address-info input');
                    const trackingNo = trackingInput ? trackingInput.value.trim() : '';
                    if (trackingNo) {
                        html += `<span style="font-size: 10px; color: #94a3b8; display:block; padding-left:15px;">${_t('单号:')} ${trackingNo}</span>`;
                    } else if (oemPhysical) {
                        html += `<span style="font-size: 10px; color: #f59e0b; display:block; padding-left:15px;">${_t('待更新物流单号')}</span>`;
                    }                
                }
        
                // 如果只有备注没有文件和寄样，显示提示
                if (!hasOemFiles && !oemPhysical && (oemRemark !== '' || oemSizeRemark !== '')) {
                    html += `<span style="font-size: 11px; color: #64748b; display:block;">- ${_t('仅文字需求说明')}</span>`;
                }
                html += `</div>`;
            }
        
            if (html === '') {
                sumStyleEl.innerText = '未选择';
            } else {
                sumStyleEl.innerHTML = `<div style="text-align: right; line-height: 1.4;">${html}</div>`;
            }
            validateStyle();
        }

        // ==========================================
        // 2. ODM 轻定制 (Modal)
        // ==========================================
        let odmCustomData = {}; let currentEditingStyle = ''; let currentModalFiles = [];
        let selectedOdmStyles = []; 
        const MAX_FILE_SIZE = 20 * 1024 * 1024;

        // 新增轮播状态变量
        let customModalImages = [];
        let customImageIndex = 0;
        // 参数名改为 styleData 接收完整对象
        function openCustomModal(styleData, cardEl) {
            const styleName = styleData.name; // 从对象中解构出名字
            selectOdmStyle(styleName, cardEl, true); 
            currentEditingStyle = styleName;
            document.getElementById('customModalTarget').innerText = `(${styleName})`;
            
            // 初始化轮播数据
            customModalImages = styleData.image_urls || [];
            if (typeof styleData.image_urls === 'string') customModalImages = [styleData.image_urls];
            customImageIndex = 0;
            renderCustomModalCarousel();

            const existingData = odmCustomData[styleName] || { remark: '', files: [] };
            document.getElementById('customRemark').value = existingData.remark;
            currentModalFiles = [...existingData.files];
            renderFileList();
            document.getElementById('customModal').classList.add('active');
        }

        // 渲染轻定制弹窗的轮播图
        function renderCustomModalCarousel() {
            const imgEl = document.getElementById('customModalImg');
            const prevBtn = document.getElementById('custom-carousel-prev');
            const nextBtn = document.getElementById('custom-carousel-next');
            const dots = document.getElementById('custom-carousel-dots');
            
            if (!customModalImages || customModalImages.length === 0) {
                imgEl.style.display = 'none';
                prevBtn.style.display = 'none'; nextBtn.style.display = 'none'; dots.innerHTML = '';
                return;
            }
            
            imgEl.style.display = 'block';
            imgEl.src = customModalImages[customImageIndex];
            
            if (customModalImages.length <= 1) {
                prevBtn.style.display = 'none'; nextBtn.style.display = 'none'; dots.innerHTML = '';
            } else {
                prevBtn.style.display = 'flex'; nextBtn.style.display = 'flex';
                dots.innerHTML = customModalImages.map((_, idx) => `<div class="carousel-dot ${idx === customImageIndex ? 'active' : ''}" onclick="goToCustomModalImage(${idx})" style="width: 6px; height: 6px;"></div>`).join('');
            }
        }
        
        // 轻定制弹窗的翻页事件
        function customCarouselMove(step) {
            if (customModalImages.length <= 1) return;
            customImageIndex = (customImageIndex + step + customModalImages.length) % customModalImages.length;
            renderCustomModalCarousel();
        }
        
        // 轻定制弹窗的点选事件
        function goToCustomModalImage(idx) {
            customImageIndex = idx;
            renderCustomModalCarousel();
        }

        function closeCustomModal() { document.getElementById('customModal').classList.remove('active'); currentModalFiles = []; }

        function saveCustomization() {
            const remark = document.getElementById('customRemark').value.trim();
            const hasFile = currentModalFiles.length > 0;
            odmCustomData[currentEditingStyle] = { remark: remark, files: [...currentModalFiles] };
            const safeId = currentEditingStyle.replace(/\s+/g, '-');
            const badgeEl = document.getElementById(`badge-${safeId}`);
            if (badgeEl) badgeEl.classList.toggle('active', remark !== '' || hasFile);
            
            updateCombinedStyleSummary(); 
            closeCustomModal();
        }

        function formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        function getFileExt(filename) { return filename.split('.').pop().toLowerCase(); }

        function renderFileList() {
            const listContainer = document.getElementById('customFileList');
            listContainer.innerHTML = '';
            currentModalFiles.forEach((file, index) => {
                const ext = getFileExt(file.name);
                let iconClass = '';
                if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) iconClass = 'img';
                else if (ext === 'pdf') iconClass = 'pdf'; else if (['ai', 'eps'].includes(ext)) iconClass = 'ai';
                const sizeStr = isRemoteFile(file) ? formatBytes(file.size || 0) : formatBytes(file.size);
                listContainer.insertAdjacentHTML('beforeend', `
                    <div class="file-item"><div class="file-info"><div class="file-icon ${iconClass}">${ext.substring(0, 3)}</div><div class="file-details"><span class="file-name" title="${file.name}">${file.name}</span><span class="file-size">${sizeStr}</span></div></div><button class="file-remove" onclick="removeModalFile(${index})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
                `);
            });
        }
        function removeModalFile(index) { currentModalFiles.splice(index, 1); renderFileList(); }

        function handleFilesAdded(files) {
            let alertMsg = '';
            Array.from(files).forEach(file => {
                if (file.size > MAX_FILE_SIZE) { alertMsg += `文件 "${file.name}" 超20MB。\n`; return; }
                if (!currentModalFiles.some(existing => existing.name === file.name && existing.size === file.size)) { currentModalFiles.push(file); }
            });
            if (alertMsg) showMsg(alertMsg, 'error');
            renderFileList();
        }

        document.getElementById('customFile').addEventListener('change', function(e) { handleFilesAdded(e.target.files); this.value = ''; });
        const dropzone = document.getElementById('customDropzone');
        if (dropzone) {
            dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
            dropzone.addEventListener('dragleave', (e) => { e.preventDefault(); dropzone.classList.remove('dragover'); });
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault(); dropzone.classList.remove('dragover');
                if (e.dataTransfer.files?.length) handleFilesAdded(e.dataTransfer.files);
            });
        }

        // 检查用户是否在 Step 1 填写了任何 OEM 相关信息
        function checkOemHasContent() {
            const hasRef = typeof oemFilesData !== 'undefined' && oemFilesData.ref.length > 0;
            const hasTech = typeof oemFilesData !== 'undefined' && oemFilesData.tech.length > 0;
            const hasSize = typeof oemFilesData !== 'undefined' && oemFilesData.size.length > 0;
            
            const oemRemarkEl = document.getElementById('oem-remark');
            const hasRemark = oemRemarkEl && oemRemarkEl.value.trim() !== '';

            const oemSizeRemarkEl = document.getElementById('oem-size-remark');
            const hasSizeRemark = oemSizeRemarkEl && oemSizeRemarkEl.value.trim() !== '';
            
            const physicalEl = document.getElementById('oem-physical');
            const hasPhysical = physicalEl && physicalEl.checked;

            const collectionName = (document.getElementById('oem-collection-name')?.value || '').trim();
            const collectionCount = parseInt(document.getElementById('oem-collection-count')?.value) || 0;
            const hasCollection = collectionName !== '' || collectionCount > 0;
            
            // 只要有任何一项满足，就认为用户有 OEM 需求
            return hasRef || hasTech || hasSize || hasSizeRemark || hasRemark || hasPhysical || hasCollection;
        }

        // ==========================================
        // 3. OEM 自主设计模块
        // ==========================================
        let oemFilesData = { tech: [], ref: [], size: [] }; 
        let oemStyleDescriptions = []; // 存储每款的简述

        function renderOemStyleDescInputs() {
            const countInput = document.getElementById('oem-collection-count');
            let count = parseInt(countInput.value) || 0; // 默认为 0
            if (count > 50) { count = 50; countInput.value = 50; }
            
            const container = document.getElementById('oem-style-desc-container');
            
            // 扩展数组以保留之前填写的值
            while (oemStyleDescriptions.length < count) {
                oemStyleDescriptions.push('');
            }
            
            let html = '';
            for (let i = 0; i < count; i++) {
                // 转义处理避免单引号破坏 HTML 属性
                const safeValue = oemStyleDescriptions[i].replace(/"/g, '&quot;');
                html += `
                    <div style="display: flex; align-items: center; gap: 10px; animation: fadeIn 0.3s ease;">
                        <span style="font-size: 11px; font-weight: 600; color: var(--primary-color); min-width: 45px;">款 ${i + 1} :</span>
                        <input type="text" class="oem-input-mini" style="flex: 1; height: 32px; font-size: 12px; background: #fff;" 
                               placeholder="简要标识 (如: 红色连体款 / Page 1 比基尼上衣)" 
                               value="${safeValue}" 
                               oninput="oemStyleDescriptions[${i}] = this.value; updateCombinedStyleSummary();">
                    </div>
                `;
            }
            container.innerHTML = html;
            
            // 关键：将款式数量同步到第四步(交付规划)的 OEM 数量框，并触发对应逻辑
            // 更新 Step 4 的两个 OEM 徽章
            const sBadge = document.getElementById('oem-count-badge');
            const bBadge = document.getElementById('bulk-oem-count-badge');
            if (sBadge) sBadge.innerText = count;
            if (bBadge) bBadge.innerText = count;
            
            // 依然需要触发后续表格渲染逻辑
            if (typeof renderSampleTable === 'function') renderSampleTable();
            if (typeof renderBulkTable === 'function') renderBulkTable();
            
            // 触发第四步的表格刷新
            if (typeof syncOemCount === 'function') syncOemCount(count);
            if (typeof refreshSampleTableStyles === 'function') refreshSampleTableStyles();
            
            updateCombinedStyleSummary();
        }

        function togglePhysicalInfo(isVisible) {
            const infoBox = document.getElementById('oem-address-info');
            isVisible ? infoBox.classList.remove('hidden') : infoBox.classList.add('hidden');
            updateCombinedStyleSummary();
        }

        function handleOemFiles(input, type) {
            Array.from(input.files).forEach(file => {
                if (file.size > MAX_FILE_SIZE) { showMsg(`文件 ${file.name} 超过 20MB`, 'error'); return; }
                if (oemFilesData[type].some(f => f.name === file.name && f.size === file.size)) return;
                
                oemFilesData[type].push(file);
                const fileIndex = oemFilesData[type].length - 1;

                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => addOemPreviewItem(type, e.target.result, file.name, fileIndex, true);
                    reader.readAsDataURL(file);
                } else {
                    const ext = file.name.split('.').pop().toUpperCase();
                    addOemPreviewItem(type, null, file.name, fileIndex, false, ext);
                }
            });
            input.value = ''; 
            updateCombinedStyleSummary();
        }

        function addOemPreviewItem(type, src, fileName, index, isImage, ext = '') {
            const grid = document.getElementById(`oem${type.charAt(0).toUpperCase() + type.slice(1)}Preview`);
            const previewContent = isImage ? `<img src="${src}" alt="预览" style="cursor: zoom-in;" data-name="${fileName}" onclick="openOemPreview(this.src, this.getAttribute('data-name'))">` : `
                <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f1f5f9; color:#64748b;">
                    <span style="font-size:10px; font-weight:800; margin-bottom:2px;">${ext}</span>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                </div>`;
            grid.insertAdjacentHTML('beforeend', `
                <div class="oem-preview-item" id="oem-preview-${type}-${index}">
                    ${previewContent}
                    <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.4); color:#fff; font-size:8px; padding:2px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${fileName}</div>
                    <button type="button" class="oem-preview-remove" onclick="removeOemFile('${type}', ${index})">&times;</button>
                </div>
            `);
        }

        // 处理 OEM 及各种用户上传小图的点击放大
        function openOemPreview(clickedSrc, fileName) {
            const clickedImg = document.querySelector(`img[src="${clickedSrc}"]`);
            let allImgs = [];
            
            if (clickedImg) {
                // 仅抓取当前局部网格内的所有图片，防止把别的区域的图也卷进轮播里
                const grid = clickedImg.closest('.oem-image-preview-grid') || clickedImg.parentElement.parentElement;
                allImgs = grid.querySelectorAll('img');
            } else {
                allImgs = document.querySelectorAll('.oem-preview-item img');
            }
            
            let imageUrls = Array.from(allImgs).map(img => img.src);
            // 兜底：如果找不到集合，至少把当前点击的图放进去
            if (imageUrls.length === 0) imageUrls = [clickedSrc];
            
            const startIndex = imageUrls.indexOf(clickedSrc);
            
            currentSwatchImages = imageUrls;
            currentSwatchIndex = startIndex !== -1 ? startIndex : 0;
            
            updateSwatchCarouselUI();
            document.getElementById('swatchFullModal').classList.add('active');
        }


        function removeOemFile(type, index) {
            oemFilesData[type].splice(index, 1);
            const grid = document.getElementById(`oem${type.charAt(0).toUpperCase() + type.slice(1)}Preview`);
            grid.innerHTML = '';
            oemFilesData[type].forEach((file, idx) => {
                const remote = isRemoteFile(file);
                const isImage = remote ? isImageMime(file.mime) : file.type.startsWith('image/');
                if (remote) {
                    addOemPreviewItem(type, isImage ? remoteFileUrl(file) : null, file.name, idx, isImage, fileExt(file.name));
                } else if (isImage) {
                    const reader = new FileReader();
                    reader.onload = (e) => addOemPreviewItem(type, e.target.result, file.name, idx, true);
                    reader.readAsDataURL(file);
                } else { addOemPreviewItem(type, null, file.name, idx, false, file.name.split('.').pop().toUpperCase()); }
            });
            updateCombinedStyleSummary();
        }

        document.addEventListener('DOMContentLoaded', () => {
            ['Tech', 'Ref', 'Size'].forEach(type => {
                const zone = document.getElementById(`oem${type}Dropzone`);
                if(!zone) return;
                zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('dragover'); });
                zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
                zone.addEventListener('drop', (e) => {
                    e.preventDefault(); zone.classList.remove('dragover');
                    if(e.dataTransfer.files?.length) handleOemFiles({ files: e.dataTransfer.files, value:'' }, type.toLowerCase());
                });
            });
        });

        // --- 修改后 ---
        function toggleStyleMode(mode) {
            const list = document.getElementById('existing-styles'), upload = document.getElementById('custom-upload');
            const odmBtn = document.getElementById('mode-odm'), oemBtn = document.getElementById('mode-oem');
            if(mode === 'existing') {
                list.classList.remove('hidden'); upload.classList.add('hidden');
                odmBtn.classList.add('active'); oemBtn.classList.remove('active');
            } else {
                list.classList.add('hidden'); upload.classList.remove('hidden');
                oemBtn.classList.add('active'); odmBtn.classList.remove('active');
            }
            updateCombinedStyleSummary(); // 统一调用新的汇总函数
        }

        // ==========================================
        // 保密协议 (NDA) 弹窗
        // ==========================================
        function openNdaModal() { document.getElementById('ndaModal').classList.add('active'); }
        function closeNdaModal() { document.getElementById('ndaModal').classList.remove('active'); }
        document.getElementById('ndaModal').addEventListener('click', function(e) { if(e.target === this) closeNdaModal(); });


        // ==========================================
        // 4. 多图轮播弹窗
        // ==========================================
        let currentModalImages = [], currentImageIndex = 0;
        // 处理款式、面料、包装袋卡片的右上角点击
        function openDetailModal(itemData) {
            let urls = itemData.image_urls || [];
            if (typeof urls === 'string') urls = [urls];
            
            if (urls.length === 0) {
                showMsg(_t('抱歉，该项目暂无高清预览图。'), 'info');
                return;
            }

            // 直接把数据交给高级沉浸式图库去渲染
            currentSwatchImages = urls;
            currentSwatchIndex = 0;
            
            updateSwatchCarouselUI();
            document.getElementById('swatchFullModal').classList.add('active');
        }

        function renderModalCarousel() {
            const carouselBox = document.getElementById('modalCarousel');
            if (!currentModalImages?.length) { carouselBox.style.display = 'none'; document.getElementById('carousel-dots').innerHTML = ''; return; }
            carouselBox.style.display = 'flex'; document.getElementById('modalImg').src = currentModalImages[currentImageIndex];
            const prevBtn = document.getElementById('carousel-prev'), nextBtn = document.getElementById('carousel-next'), dots = document.getElementById('carousel-dots');
            if (currentModalImages.length <= 1) { prevBtn.style.display = 'none'; nextBtn.style.display = 'none'; dots.innerHTML = ''; } 
            else { prevBtn.style.display = 'flex'; nextBtn.style.display = 'flex'; dots.innerHTML = currentModalImages.map((_, idx) => `<div class="carousel-dot ${idx === currentImageIndex ? 'active' : ''}" onclick="goToModalImage(${idx})"></div>`).join(''); }
        }
        function carouselMove(step) { if(currentModalImages.length <= 1) return; currentImageIndex = (currentImageIndex + step + currentModalImages.length) % currentModalImages.length; renderModalCarousel(); }
        function goToModalImage(idx) { currentImageIndex = idx; renderModalCarousel(); }
        function closeDetailModal() { document.getElementById('detailModal').classList.remove('active'); }
        document.getElementById('closeModalBtn').addEventListener('click', closeDetailModal);
        document.getElementById('detailModal').addEventListener('click', function(e) { if(e.target === this) closeDetailModal(); });

        // ==========================================
        // 5. 步进器及面料、辅料逻辑
        // ==========================================
        let currentStep = 1; const totalSteps = 5;

        // 延迟加载背景图：将 data-bg 转为真实 backgroundImage
        function lazyLoadStepImages(stepNum) {
            const stepEl = document.getElementById('step-' + stepNum);
            if (!stepEl) return;
            stepEl.querySelectorAll('[data-bg]').forEach(el => {
                if (!el.style.backgroundImage || !el.style.backgroundImage.includes('url')) {
                    el.style.backgroundImage = "url('" + el.dataset.bg + "')";
                }
            });
        }

        function changeStep(n) {
            // 隐藏当前步骤
            document.getElementById(`step-${currentStep}`).classList.add('hidden'); 
            document.getElementById(`step-${currentStep}-label`).classList.remove('active');
            
            // 更新当前步数
            currentStep += n;
            
            // 显示新步骤
            document.getElementById(`step-${currentStep}`).classList.remove('hidden'); 
            document.getElementById(`step-${currentStep}-label`).classList.add('active');

            // 延迟加载当前步骤的背景图
            lazyLoadStepImages(currentStep);
            
            // 按钮状态更新
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            
            prevBtn.disabled = (currentStep === 1);

            if (currentStep === totalSteps) { 
                // 优化：不再使用绿色的丑按钮
                nextBtn.innerText = _t('确认并提交定制需求'); 
                // 我们可以加一个标识类名，或者干脆保持品牌红
                nextBtn.classList.add('is-final');
                // nextBtn.style.backgroundColor = ''; // 删掉原来的 green 赋值
            } else { 
                nextBtn.innerText = _t('继续下一步'); 
                nextBtn.classList.remove('is-final');
            }
            
            // 回到顶部
            document.querySelector('.config-scroll-area').scrollTop = 0;

            // 【新增】如果进入的是第四步，且处于打样模式，则刷新数据
            if (currentStep === 4) {
                    updateStep4Scale(); // 进入 Step 4 时统一刷新
                    updateLogisticsSummary();
                }

            // 进入 Step 2 时，重新定位面料配置面板 (restore 时 DOM 不可见导致 offsetTop=0 定位失败)
            if (currentStep === 2 && activeFabricCat && fabricSelection[activeFabricCat] && fabricSelection[activeFabricCat].activeName) {
                var _tabEl = document.querySelector('#fabric-sub-tabs .mode-option.active');
                if (_tabEl) switchFabricCat(activeFabricCat, _tabEl);
            }


        }

        // 点击左上角 Logo/标题 返回第一步（不清空数据）
        window.goToStep1 = function () {
            if (currentStep !== 1) changeStep(1 - currentStep);
        };

        // 点击顶部 step tab 直接跳转
        window.goToStep = function (target) {
            if (target !== currentStep && target >= 1 && target <= totalSteps) {
                changeStep(target - currentStep);
            }
        };

        // ==========================================
        // 实时表单验证系统 (Real-time Validation)
        // ==========================================
        const dotActivated = {};
        let _resetting = false;
        function setDot(id, state) {
            if (_resetting) return;
            const dot = document.getElementById(id);
            if (!dot) return;
            dot.classList.remove('ok', 'warn');
            if (state === true) {
                dot.classList.add('ok');
                dotActivated[id] = true;
            } else if (state === false) {
                if (dotActivated[id]) dot.classList.add('warn');
                // else stay grey — section not yet interacted
            }
            // state === null → neutral (grey, no class)
        }

        function validateStyle() {
            const hasOdm = selectedOdmStyles.length > 0;
            const hasOem = typeof checkOemHasContent === 'function' && checkOemHasContent();

            // 如果 OEM 有任何内容，则必须保证完整性
            let oemComplete = true;
            if (hasOem) {
                // 1) 项目名称 + 款式数量 必填
                const collectionName = (document.getElementById('oem-collection-name')?.value || '').trim();
                const collectionCount = parseInt(document.getElementById('oem-collection-count')?.value) || 0;
                if (!collectionName || collectionCount <= 0) oemComplete = false;

                // 2) 备注、参考图、技术文件、尺寸文件 至少有一项
                const hasRemark = (document.getElementById('oem-remark')?.value || '').trim() !== '';
                const hasSizeRemark = (document.getElementById('oem-size-remark')?.value || '').trim() !== '';
                const hasRef = typeof oemFilesData !== 'undefined' && oemFilesData.ref.length > 0;
                const hasTech = typeof oemFilesData !== 'undefined' && oemFilesData.tech.length > 0;
                const hasSize = typeof oemFilesData !== 'undefined' && oemFilesData.size.length > 0;
                if (!hasRemark && !hasSizeRemark && !hasRef && !hasTech && !hasSize) oemComplete = false;

                // 3) checklist 全部勾选
                const checklists = document.querySelectorAll('.oem-checklist-item input[type="checkbox"]');
                if (checklists.length > 0) {
                    const allChecked = Array.from(checklists).every(cb => cb.checked);
                    if (!allChecked) oemComplete = false;
                }
            }

            // 至少有一种模式，且 OEM 若有内容则必须完整
            const ok = (hasOdm || hasOem) && oemComplete;
            setDot('dot-style', ok);
            return ok;
        }

        function validateFabric() {
            const isCmt = document.getElementById('fabric-cmt-check')?.checked;

            if (isCmt) {
                // CMT 模式：有描述或文件即可
                const desc = (document.getElementById('fabric-cmt-desc')?.value || '').trim();
                const hasFiles = typeof cmtFilesData !== 'undefined' && cmtFilesData.fabric.length > 0;
                const ok = desc !== '' || hasFiles;
                setDot('dot-fabric', ok);
                return ok;
            }

            // 非 CMT：面料 tab 必须选中且配置完整，里料和网纱可选但若选了也需完整
            let mainFabricOk = false;
            let allComplete = true;

            if (typeof fabricSelection !== 'undefined') {
                for (const catId in fabricSelection) {
                    const sel = fabricSelection[catId];
                    if (!sel || !sel.activeName) continue;
                    const catName = sel.originalCatName || '';
                    const config = sel.configs[sel.activeName];
                    if (!config) continue;

                    const isLining = catName.includes('里料');
                    const isMesh = catName.includes('网纱');
                    const isMain = !isLining && !isMesh;

                    if (isMain) mainFabricOk = true;

                    // 定制找样模式需有描述
                    if (sel.activeName === 'CUSTOM_SOURCING') {
                        if (!config.customDesc || config.customDesc.trim() === '') allComplete = false;
                        continue;
                    }

                    // 纯色模式需有色号，印花模式需有设计图
                    if (config.mode === 'print') {
                        if (!config.prints || config.prints.length === 0) allComplete = false;
                    } else {
                        if (!config.colorText || config.colorText.trim() === '') allComplete = false;
                    }

                    // 里料局部模式需有描述
                    if (isLining && config.fullLining === false) {
                        if (!config.liningPlacement || config.liningPlacement.trim() === '') allComplete = false;
                    }
                }
            }

            const ok = mainFabricOk && allComplete;
            setDot('dot-fabric', ok);
            return ok;
        }

        function validateTrims() {
            // Step 3 overall: at least one trim decision made (enabled or disabled) — always passes
            // We just mark green if all enabled trims are configured
            const trimChecks = ['metal', 'pad', 'bag', 'hangtag', 'label', 'hygiene', 'other'];
            let allOk = true;
            for (const t of trimChecks) {
                const enabledRadio = document.querySelector(`input[name="need_${t}"][value="yes"]`);
                const isEnabled = enabledRadio && enabledRadio.checked;

                // CMT 模式：need 为 "no" 但 cmt 勾选，描述或文件至少有一项
                const cmtCheck = document.getElementById(`cmt-check-${t}`);
                if (!isEnabled && cmtCheck && cmtCheck.checked) {
                    const desc = (document.getElementById(`cmt-desc-${t}`)?.value || '').trim();
                    const hasFiles = typeof cmtFilesData !== 'undefined' && cmtFilesData[t] && cmtFilesData[t].length > 0;
                    if (!desc && !hasFiles) { allOk = false; }
                    continue;
                }

                if (!isEnabled) continue; // 未启用且无 CMT = skip
                
                if (t === 'other') {
                    const hasRemark = (document.getElementById('other-remark')?.value || '').trim() !== '';
                    const hasFiles = typeof otherConfig !== 'undefined' && otherConfig.files && otherConfig.files.length > 0;
                    if (!hasRemark && !hasFiles) { allOk = false; }
                }
                if (t === 'bag') {
                    if (typeof bagConfig !== 'undefined') {
                        // 必须选择材质卡片
                        if (bagConfig.material === '未选材质') { allOk = false; }
                        // 自定义尺寸需有长宽
                        if (bagConfig.size === '自定义尺寸' || bagConfig.size === '自定义尺寸 (未输入)') { allOk = false; }
                        // 单色/彩色印刷需有文件或文本
                        if (bagConfig.print && bagConfig.print !== '空白无印') {
                            const hasRemark = (document.getElementById('bag-remark')?.value || '').trim() !== '';
                            const hasFiles = bagConfig.designFiles && bagConfig.designFiles.length > 0;
                            if (!hasRemark && !hasFiles) { allOk = false; }
                        }
                    }
                }
                // pad: custom shape needs remark or files; custom color needs input
                if (t === 'pad') {
                    if (typeof padConfig !== 'undefined') {
                        if (padConfig.customShape) {
                            const hasRemark = padConfig.shapeRemark && padConfig.shapeRemark.trim() !== '';
                            const hasFiles = padConfig.shapeFiles && padConfig.shapeFiles.length > 0;
                            if (!hasRemark && !hasFiles) { allOk = false; }
                        }
                        if (padConfig.color === '其他定制色') {
                            const v = (document.getElementById('pad-color-other')?.value || '').trim();
                            if (!v) { allOk = false; }
                        }
                    }
                }
                // metal custom mode with no categories, or categories missing remark/files
                if (t === 'metal') {
                    if (typeof metalConfig !== 'undefined' && metalConfig.mode === 'custom') {
                        if (metalConfig.categories.length === 0) { allOk = false; }
                        else {
                            for (const cat of metalConfig.categories) {
                                const d = metalConfig.details[cat];
                                if (!d) { allOk = false; break; }
                                const hasRemark = d.remark && d.remark.trim() !== '';
                                const hasFiles = d.styleFiles && d.styleFiles.length > 0;
                                if (!hasRemark && !hasFiles) { allOk = false; break; }
                            }
                        }
                    }
                }
                // label: design files or remark needed (both auto and custom modes)
                if (t === 'label') {
                    if (typeof labelConfig !== 'undefined') {
                        const hasRemark = (document.getElementById('label-remark')?.value || '').trim() !== '';
                        const hasFiles = labelConfig.designFiles && labelConfig.designFiles.length > 0;
                        if (!hasRemark && !hasFiles) { allOk = false; }

                        if (labelConfig.mode === 'custom') {
                            // A. 材质选"其他"需有描述或文件
                            if (labelConfig.material === '其他') {
                                const r = (document.getElementById('label-material-remark')?.value || '').trim() !== '';
                                const f = labelConfig.otherMatFiles && labelConfig.otherMatFiles.length > 0;
                                if (!r && !f) { allOk = false; }
                            }
                            // A2. 前三个材质(印标/TPU标/织唛标)需有尺寸
                            if (['印标', 'TPU标', '织唛标'].includes(labelConfig.material)) {
                                const size = (document.getElementById('label-custom-size')?.value || '').trim();
                                if (!size) { allOk = false; }
                            }
                            // A3. TPU标/织唛标需选择缝制方式
                            if (['TPU标', '织唛标'].includes(labelConfig.material)) {
                                if (!labelConfig.method || labelConfig.method.trim() === '') { allOk = false; }
                            }
                            // B. 缝制方式选"其他"需有描述或文件
                            if (labelConfig.method === '其他') {
                                const r = (document.getElementById('label-sewing-remark')?.value || '').trim() !== '';
                                const f = labelConfig.sewingFiles && labelConfig.sewingFiles.length > 0;
                                if (!r && !f) { allOk = false; }
                            }
                            // C. 上装位置选"自定义其他位置"需有描述
                            if (labelConfig.components.includes('上装/连体') && labelConfig.placements.top === '自定义其他位置') {
                                const v = (document.getElementById('label-custom-top-text')?.value || '').trim();
                                if (!v) { allOk = false; }
                            }
                            // D. 下装位置选"自定义其他位置"需有描述
                            if (labelConfig.components.includes('下装/裤装') && labelConfig.placements.bottom === '自定义其他位置') {
                                const v = (document.getElementById('label-custom-bottom-text')?.value || '').trim();
                                if (!v) { allOk = false; }
                            }
                            // E. 主洗标分开需有说明
                            if (labelConfig.isSplit) {
                                const v = (document.getElementById('label-split-remark')?.value || '').trim();
                                if (!v) { allOk = false; }
                            }
                        }
                    }
                }
                // hangtag: design files or remark needed (both auto and custom modes)
                if (t === 'hangtag') {
                    if (typeof hangtagConfig !== 'undefined') {
                        const hasRemark = (document.getElementById('hangtag-remark')?.value || '').trim() !== '';
                        const hasFiles = hangtagConfig.designFiles && hangtagConfig.designFiles.length > 0;
                        if (!hasRemark && !hasFiles) { allOk = false; }

                        // A. 材质选"其他"需有描述或文件
                        if (hangtagConfig.material === '其他') {
                            const r = (document.getElementById('hangtag-material-remark')?.value || '').trim() !== '';
                            const f = hangtagConfig.otherMatFiles && hangtagConfig.otherMatFiles.length > 0;
                            if (!r && !f) { allOk = false; }
                        }
                        // B. 形状选"异形定制"需有描述或文件
                        if (hangtagConfig.shape === '尺寸或特殊异形定制') {
                            const r = (document.getElementById('hangtag-shape-remark')?.value || '').trim() !== '';
                            const f = hangtagConfig.shapeFiles && hangtagConfig.shapeFiles.length > 0;
                            if (!r && !f) { allOk = false; }
                        }
                        // C. 工艺选"其他"需有描述或文件
                        if (hangtagConfig.crafts && hangtagConfig.crafts.includes('其他')) {
                            const r = (document.getElementById('hangtag-craft-remark')?.value || '').trim() !== '';
                            const f = hangtagConfig.otherCraftFiles && hangtagConfig.otherCraftFiles.length > 0;
                            if (!r && !f) { allOk = false; }
                        }
                        // D. 吊粒选"定制材质与形状"需有描述或文件
                        if (hangtagConfig.stringType === '定制材质与形状') {
                            const r = (document.getElementById('hangtag-string-remark')?.value || '').trim() !== '';
                            const f = hangtagConfig.stringFiles && hangtagConfig.stringFiles.length > 0;
                            if (!r && !f) { allOk = false; }
                        }
                        // D. 吊粒颜色选"其他"需有输入
                        if (hangtagConfig.stringColor === '其他') {
                            const v = (document.getElementById('hangtag-string-color-other')?.value || '').trim();
                            if (!v) { allOk = false; }
                        }
                        // 子母牌勾选后需有描述
                        if (hangtagConfig.isSet) {
                            const v = (document.getElementById('hangtag-set-remark')?.value || '').trim();
                            if (!v) { allOk = false; }
                        }
                    }
                }
                // hygiene: custom mode checks
                if (t === 'hygiene') {
                    if (typeof hygieneConfig !== 'undefined' && hygieneConfig.mode === 'custom') {
                        // A. 形状选"其他定制形状"需有描述或文件
                        if (hygieneConfig.shape === '其他定制形状') {
                            const r = (document.getElementById('hygiene-shape-remark')?.value || '').trim() !== '';
                            const f = hygieneConfig.shapeFiles && hygieneConfig.shapeFiles.length > 0;
                            if (!r && !f) { allOk = false; }
                        }
                        // A. 自定义尺寸勾选后需有输入
                        const sizeCheck = document.getElementById('hygiene-custom-size-check');
                        if (sizeCheck && sizeCheck.checked) {
                            const size = (document.getElementById('hygiene-custom-size')?.value || '').trim();
                            if (!size) { allOk = false; }
                        }
                        // B. 印刷内容不能为空（文件或文字至少一项）
                        const hasText = (document.getElementById('hygiene-text')?.value || '').trim() !== '';
                        const hasDesign = hygieneConfig.designFiles && hygieneConfig.designFiles.length > 0;
                        if (!hasText && !hasDesign) { allOk = false; }
                    }
                }
            }
            setDot('dot-trims', allOk);
            return allOk;
        }

        function validateShipping() {
            let ok = false;
            if (typeof currentDeliveryMode !== 'undefined') {
                if (currentDeliveryMode === 'sample') {
                    if (typeof sampleRows !== 'undefined') {
                        ok = sampleRows.some(r => r.style && r.style !== '');
                    }
                    // 必须选择样品接收目的地
                    const dest = document.getElementById('sample-destination')?.value || '';
                    if (!dest) { ok = false; }
                    // 勾选核算大货价时，预估大货数量不能为空
                    const bulkQuoteCheck = document.getElementById('sample-need-bulk-quote');
                    if (bulkQuoteCheck && bulkQuoteCheck.checked) {
                        const qty = (document.getElementById('sample-intent-qty')?.value || '').trim();
                        if (!qty || parseInt(qty) <= 0) { ok = false; }
                    }
                } else {
                    if (typeof bulkRows !== 'undefined') {
                        ok = bulkRows.some(r => r.style && r.style !== '');
                    }
                    // 必须填写期望 EXW 大货单价范围
                    const price = (document.getElementById('bulk-target-price')?.value || '').trim();
                    if (!price) { ok = false; }
                    // 必须选择目的地国家
                    const dest = document.getElementById('bulk-destination')?.value || '';
                    if (!dest) { ok = false; }
                }
            }
            setDot('dot-shipping', ok);
            return ok;
        }

        function validateContact() {
            const name = document.getElementById('final-contact-name')?.value.trim() || '';
            const info = document.getElementById('final-contact-info')?.value.trim() || '';
            const brand = document.getElementById('final-brand-name')?.value.trim() || '';
            const ok = name !== '' && info !== '' && brand !== '';
            setDot('dot-contact', ok);
            return ok;
        }

        function validateAll() {
            const results = {
                style: validateStyle(),
                fabric: validateFabric(),
                trims: validateTrims(),
                shipping: validateShipping(),
                contact: validateContact()
            };
            results.allValid = Object.values(results).every(v => v === true);
            return results;
        }

        // --- 最终表单提交出口 (新增) ---
        // 图片压缩：Canvas 缩放到最大 1920px，质量 0.85
        function compressImage(file, maxSize = 1920, quality = 0.85) {
            return new Promise((resolve) => {
                if (!file.type.match(/^image\/(jpeg|png|webp)$/)) { resolve(file); return; }
                if (file.size < 200 * 1024) { resolve(file); return; } // <200KB 不压缩
                const img = new Image();
                img.onload = () => {
                    let { width, height } = img;
                    if (width > maxSize || height > maxSize) {
                        const ratio = Math.min(maxSize / width, maxSize / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width; canvas.height = height;
                    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                    canvas.toBlob((blob) => {
                        if (blob && blob.size < file.size) {
                            resolve(new File([blob], file.name, { type: blob.type, lastModified: file.lastModified }));
                        } else {
                            resolve(file); // 压缩后更大就用原图
                        }
                    }, file.type === 'image/png' ? 'image/png' : 'image/jpeg', quality);
                };
                img.onerror = () => resolve(file);
                img.src = URL.createObjectURL(file);
            });
        }

        // 批量压缩 FormData 中的所有文件
        async function compressFormDataFiles(fd) {
            const newFd = new FormData();
            const entries = [...fd.entries()];
            for (const [key, value] of entries) {
                if (value instanceof File) {
                    newFd.append(key, await compressImage(value));
                } else {
                    newFd.append(key, value);
                }
            }
            return newFd;
        }

        // 上传弹窗控制
        function showUploadModal() {
            const m = document.getElementById('uploadModal');
            m.style.display = 'flex';
            document.getElementById('uploadProgressBar').style.width = '0%';
            document.getElementById('uploadPercent').textContent = '0%';
            document.getElementById('uploadTitle').textContent = _t('正在压缩并上传文件...');
            document.getElementById('uploadSubtitle').textContent = _t('请勿关闭页面');
            document.getElementById('uploadSpinner').style.display = 'block';
        }
        function updateUploadProgress(percent) {
            document.getElementById('uploadProgressBar').style.width = percent + '%';
            document.getElementById('uploadPercent').textContent = Math.round(percent) + '%';
            if (percent >= 100) {
                document.getElementById('uploadTitle').textContent = _t('服务器处理中...');
            }
        }
        function hideUploadModal() {
            document.getElementById('uploadModal').style.display = 'none';
        }

        // 辅助：从 config 对象中剥离 File 对象，返回纯 JSON 和文件清单
        // parentKey 用于组合嵌套路径，如 "拉链头__styleFiles"
        function stripFiles(obj, category, subKey) {
            const files = [];
            const clean = {};
            for (const [k, v] of Object.entries(obj)) {
                var fileKey = subKey ? subKey + '__' + k : k;
                if (v instanceof File) {
                    files.push({ file: v, category, subKey: fileKey });
                } else if (isRemoteFile(v)) {
                    files.push({ file: v, category, subKey: fileKey, remote: true });
                } else if (Array.isArray(v)) {
                    const fileItems = v.filter(i => i instanceof File);
                    const remoteItems = v.filter(i => isRemoteFile(i));
                    const dataItems = v.filter(i => !(i instanceof File) && !isRemoteFile(i));
                    if (fileItems.length > 0) files.push(...fileItems.map(f => ({ file: f, category, subKey: fileKey })));
                    if (remoteItems.length > 0) files.push(...remoteItems.map(f => ({ file: f, category, subKey: fileKey, remote: true })));
                    clean[k] = dataItems;
                } else if (v && typeof v === 'object' && !(v instanceof Date)) {
                    const nested = stripFiles(v, category, subKey ? subKey + '__' + k : k);
                    clean[k] = nested.clean;
                    files.push(...nested.files);
                } else {
                    clean[k] = v;
                }
            }
            return { clean, files };
        }

        // 辅助：将 fabricSelection 中的 File 对象提取出来
        function stripFabricFiles(fabSel) {
            const allFiles = [];
            const clean = {};
            for (const [catName, catObj] of Object.entries(fabSel)) {
                const catClean = { ...catObj, configs: {} };
                if (catObj.configs) {
                    for (const [fabName, fabConf] of Object.entries(catObj.configs)) {
                        const baseKey = `${catName}__${fabName}`;
                        // 先单独提取 prints 文件，标记为 print 子类
                        const printFiles = (fabConf.prints || []).filter(f => f instanceof File);
                        const printRemote = (fabConf.prints || []).filter(f => isRemoteFile(f));
                        const printData = (fabConf.prints || []).filter(f => !(f instanceof File) && !isRemoteFile(f));
                        printFiles.forEach(f => allFiles.push({ file: f, category: 'fabric', subKey: baseKey + '__print' }));
                        printRemote.forEach(f => allFiles.push({ file: f, category: 'fabric', subKey: baseKey + '__print', remote: true }));
                        // 用剩余数据调用 stripFiles
                        const confWithoutPrints = { ...fabConf, prints: printData };
                        const s = stripFiles(confWithoutPrints, 'fabric', baseKey);
                        catClean.configs[fabName] = s.clean;
                        allFiles.push(...s.files);
                    }
                }
                clean[catName] = catClean;
            }
            return { clean, files: allFiles };
        }

        // ==========================================
        // 暂存草稿功能
        // ==========================================
        function collectFormState() {
            // 同步 DOM 输入值到配置对象 (和 submitForm 保持一致)
            padConfig.otherColor = document.getElementById('pad-color-other')?.value.trim() || '';
            padConfig.shapeRemark = document.getElementById('pad-shape-remark')?.value.trim() || '';
            padConfig.remark = document.getElementById('pad-remark')?.value.trim() || '';
            hangtagConfig.remark = document.getElementById('hangtag-remark')?.value.trim() || '';
            hangtagConfig.materialRemark = document.getElementById('hangtag-material-remark')?.value.trim() || '';
            hangtagConfig.shapeRemark = document.getElementById('hangtag-shape-remark')?.value.trim() || '';
            hangtagConfig.craftRemark = document.getElementById('hangtag-craft-remark')?.value.trim() || '';
            hangtagConfig.stringRemark = document.getElementById('hangtag-string-remark')?.value.trim() || '';
            hangtagConfig.stringColorOther = document.getElementById('hangtag-string-color-other')?.value.trim() || '';
            hangtagConfig.setRemark = document.getElementById('hangtag-set-remark')?.value.trim() || '';
            labelConfig.remark = document.getElementById('label-remark')?.value.trim() || '';
            labelConfig.splitRemark = document.getElementById('label-split-remark')?.value.trim() || '';
            labelConfig.sewingRemark = document.getElementById('label-sewing-remark')?.value.trim() || '';
            if (sampleConfig.needBulkQuote) {
                sampleConfig.intentQty = document.getElementById('sample-intent-qty')?.value || '';
                sampleConfig.intentPrice = document.getElementById('sample-intent-price')?.value || '';
            }

            // 收集辅料需要/不需要状态
            const trimCategories = ['metal', 'pad', 'bag', 'hangtag', 'label', 'hygiene', 'other'];
            const trimEnabled = {};
            trimCategories.forEach(cat => {
                trimEnabled[cat] = !!document.querySelector(`input[name="need_${cat}"][value="yes"]`)?.checked;
            });

            // 辅料配置（剥离文件对象）
            const trimConfigs = { metal: metalConfig, pad: padConfig, bag: bagConfig, hangtag: hangtagConfig, label: labelConfig, hygiene: hygieneConfig, other: otherConfig };
            const cleanTrims = {};
            for (const [cat, conf] of Object.entries(trimConfigs)) {
                if (trimEnabled[cat]) {
                    cleanTrims[cat] = stripFiles(conf, cat).clean;
                } else {
                    cleanTrims[cat] = {};
                }
            }

            // CMT 状态
            const cmtEnabled = {};
            trimCategories.forEach(cat => {
                const cmtCb = document.getElementById(`cmt-check-${cat}`);
                if (cmtCb && cmtCb.checked) {
                    cmtEnabled[cat] = { enabled: true, desc: (document.getElementById(`cmt-desc-${cat}`)?.value || '').trim(), trackingNo: (document.getElementById(`cmt-tracking-${cat}`)?.value || '').trim() };
                } else {
                    cmtEnabled[cat] = false;
                }
            });
            const fabricCmtCb = document.getElementById('fabric-cmt-check');
            if (fabricCmtCb && fabricCmtCb.checked) {
                cmtEnabled.fabric = { enabled: true, desc: (document.getElementById('fabric-cmt-desc')?.value || '').trim(), trackingNo: (document.getElementById('fabric-cmt-tracking')?.value || '').trim() };
            } else {
                cmtEnabled.fabric = false;
            }

            // OEM checklist
            const checkedIds = [];
            document.querySelectorAll('.oem-checklist-item input[type="checkbox"]:checked').forEach(cb => checkedIds.push(cb.value));

            // odmCustomData 只保留 remark
            const odmClean = {};
            for (const [sn, data] of Object.entries(odmCustomData)) {
                odmClean[sn] = { remark: data.remark || '' };
            }

            return {
                // Step 1
                odm_styles: selectedOdmStyles,
                odm_custom_data: odmClean,
                oem_project: document.getElementById('oem-collection-name')?.value || '',
                oem_project_desc: document.getElementById('oem-project-desc')?.value || '',
                oem_style_count: parseInt(document.getElementById('oem-collection-count')?.value) || 0,
                oem_descriptions: oemStyleDescriptions,
                oem_checklist: checkedIds,
                oem_remark: document.getElementById('oem-remark')?.value || '',
                oem_size_remark: document.getElementById('oem-size-remark')?.value || '',
                oem_physical_sample: document.getElementById('oem-physical')?.checked || false,
                oem_tracking_no: document.querySelector('#oem-address-info input')?.value.trim() || '',
                oem_mode_active: document.getElementById('mode-oem')?.classList.contains('active') || false,
                // Step 2
                fabric_selection: stripFabricFiles(fabricSelection).clean,
                // Step 3
                trim_enabled: trimEnabled,
                cmt_enabled: cmtEnabled,
                metal_config: cleanTrims.metal,
                pad_config: cleanTrims.pad,
                bag_config: cleanTrims.bag,
                hangtag_config: cleanTrims.hangtag,
                label_config: cleanTrims.label,
                hygiene_config: cleanTrims.hygiene,
                other_config: cleanTrims.other,
                // Step 4
                delivery_mode: currentDeliveryMode,
                sample_rows: sampleRows,
                sample_config: sampleConfig,
                sample_dest: document.getElementById('sample-destination')?.value || '',
                bulk_rows: bulkRows,
                bulk_logistics: bulkLogisticsConfig,
                bulk_dest: document.getElementById('bulk-destination')?.value || '',
                bulk_target_price: document.getElementById('bulk-target-price')?.value || '',
                bulk_packing_remark: document.getElementById('bulk-shipping-remark')?.value || '',
                // Step 5
                contact_name: document.getElementById('final-contact-name')?.value.trim() || '',
                contact_info: document.getElementById('final-contact-info')?.value.trim() || '',
                brand_name: document.getElementById('final-brand-name')?.value.trim() || '',
                website: document.getElementById('final-website')?.value || '',
                final_remark: document.getElementById('final-remark')?.value || '',
                assign_sales: document.getElementById('assign-sales')?.value || '',
                assign_pattern: document.getElementById('assign-pattern')?.value || '',
                assign_sewing: document.getElementById('assign-sewing')?.value || '',
                nda_agreed_at: document.getElementById('nda-agree')?.checked ? new Date().toISOString() : null,
                // 元信息
                current_step: currentStep
            };
        }

        // 构造 FormData (暂存草稿 & 正式提交共用)
        function buildFormData() {
            // 同步 DOM 输入值到配置对象
            padConfig.otherColor = document.getElementById('pad-color-other')?.value.trim() || '';
            padConfig.shapeRemark = document.getElementById('pad-shape-remark')?.value.trim() || '';
            padConfig.remark = document.getElementById('pad-remark')?.value.trim() || '';
            hangtagConfig.remark = document.getElementById('hangtag-remark')?.value.trim() || '';
            hangtagConfig.materialRemark = document.getElementById('hangtag-material-remark')?.value.trim() || '';
            hangtagConfig.shapeRemark = document.getElementById('hangtag-shape-remark')?.value.trim() || '';
            hangtagConfig.craftRemark = document.getElementById('hangtag-craft-remark')?.value.trim() || '';
            hangtagConfig.stringRemark = document.getElementById('hangtag-string-remark')?.value.trim() || '';
            hangtagConfig.stringColorOther = document.getElementById('hangtag-string-color-other')?.value.trim() || '';
            hangtagConfig.setRemark = document.getElementById('hangtag-set-remark')?.value.trim() || '';
            labelConfig.remark = document.getElementById('label-remark')?.value.trim() || '';
            labelConfig.splitRemark = document.getElementById('label-split-remark')?.value.trim() || '';
            labelConfig.sewingRemark = document.getElementById('label-sewing-remark')?.value.trim() || '';
            if (sampleConfig.needBulkQuote) {
                sampleConfig.intentQty = document.getElementById('sample-intent-qty')?.value || '';
                sampleConfig.intentPrice = document.getElementById('sample-intent-price')?.value || '';
            }

            const fd = new FormData();
            const remoteFiles = [];

            // —— Step 1: 款式 ——
            fd.append('odm_styles', JSON.stringify(selectedOdmStyles));
            const odmClean = {};
            for (const [styleName, data] of Object.entries(odmCustomData)) {
                odmClean[styleName] = { remark: data.remark };
                (data.files || []).forEach(f => {
                    if (isRemoteFile(f)) { remoteFiles.push({ category: 'odmCustom', sub_key: styleName, orig_name: f.name, stored_name: f.stored_name, mime_type: f.mime, size_bytes: f.size }); }
                    else { fd.append(`files[odmCustom][${styleName}]`, f); }
                });
            }
            fd.append('odm_custom_data', JSON.stringify(odmClean));
            fd.append('oem_project', document.getElementById('oem-collection-name')?.value || '');
            fd.append('oem_project_desc', document.getElementById('oem-project-desc')?.value || '');
            fd.append('oem_style_count', document.getElementById('oem-collection-count')?.value || '0');
            fd.append('oem_descriptions', JSON.stringify(oemStyleDescriptions));
            const checkedIds = [];
            document.querySelectorAll('.oem-checklist-item input[type="checkbox"]:checked').forEach(cb => {
                checkedIds.push(cb.value);
            });
            fd.append('oem_checklist', JSON.stringify(checkedIds));
            fd.append('oem_remark', document.getElementById('oem-remark')?.value || '');
            fd.append('oem_size_remark', document.getElementById('oem-size-remark')?.value || '');
            fd.append('oem_physical_sample', document.getElementById('oem-physical')?.checked ? '1' : '0');
            var _trackInput = document.querySelector('#oem-address-info input');
            fd.append('oem_tracking_no', _trackInput ? _trackInput.value.trim() : '');
            (oemFilesData.tech || []).forEach(f => {
                if (isRemoteFile(f)) { remoteFiles.push({ category: 'oem', sub_key: 'tech', orig_name: f.name, stored_name: f.stored_name, mime_type: f.mime, size_bytes: f.size }); }
                else { fd.append('files[oem][tech]', f); }
            });
            (oemFilesData.ref || []).forEach(f => {
                if (isRemoteFile(f)) { remoteFiles.push({ category: 'oem', sub_key: 'ref', orig_name: f.name, stored_name: f.stored_name, mime_type: f.mime, size_bytes: f.size }); }
                else { fd.append('files[oem][ref]', f); }
            });
            (oemFilesData.size || []).forEach(f => {
                if (isRemoteFile(f)) { remoteFiles.push({ category: 'oem', sub_key: 'size', orig_name: f.name, stored_name: f.stored_name, mime_type: f.mime, size_bytes: f.size }); }
                else { fd.append('files[oem][size]', f); }
            });

            // —— Step 2: 面料 ——
            const fabResult = stripFabricFiles(fabricSelection);
            fd.append('fabric_selection', JSON.stringify(fabResult.clean));
            fabResult.files.forEach(item => {
                if (item.remote) { remoteFiles.push({ category: 'fabric', sub_key: item.subKey, orig_name: item.file.name, stored_name: item.file.stored_name, mime_type: item.file.mime, size_bytes: item.file.size }); }
                else { fd.append(`files[fabric][${item.subKey}]`, item.file); }
            });

            // —— Step 3: 辅料 ——
            const cmtEnabled = {};
            const trimCategories = ['metal', 'pad', 'bag', 'hangtag', 'label', 'hygiene', 'other'];
            trimCategories.forEach(cat => {
                const cmtCb = document.getElementById(`cmt-check-${cat}`);
                const enabled = cmtCb ? cmtCb.checked : false;
                if (enabled) {
                    const desc = (document.getElementById(`cmt-desc-${cat}`)?.value || '').trim();
                    const tracking = (document.getElementById(`cmt-tracking-${cat}`)?.value || '').trim();
                    cmtEnabled[cat] = { enabled: true, desc: desc, trackingNo: tracking };
                } else {
                    cmtEnabled[cat] = false;
                }
            });
            const fabricCmtCb = document.getElementById('fabric-cmt-check');
            if (fabricCmtCb && fabricCmtCb.checked) {
                const fabDesc = (document.getElementById('fabric-cmt-desc')?.value || '').trim();
                const fabTracking = (document.getElementById('fabric-cmt-tracking')?.value || '').trim();
                cmtEnabled.fabric = { enabled: true, desc: fabDesc, trackingNo: fabTracking };
            } else {
                cmtEnabled.fabric = false;
            }
            fd.append('cmt_enabled', JSON.stringify(cmtEnabled));

            for (const [cat, files] of Object.entries(cmtFilesData)) {
                files.forEach(f => {
                    if (isRemoteFile(f)) { remoteFiles.push({ category: 'cmt', sub_key: cat, orig_name: f.name, stored_name: f.stored_name, mime_type: f.mime, size_bytes: f.size }); }
                    else { fd.append(`files[cmt][${cat}]`, f); }
                });
            }

            const trimConfigs = { metal: metalConfig, pad: padConfig, bag: bagConfig, hangtag: hangtagConfig, label: labelConfig, hygiene: hygieneConfig, other: otherConfig };
            for (const [cat, conf] of Object.entries(trimConfigs)) {
                const isEnabled = cat === 'other'
                    ? document.querySelector('input[name="need_other"][value="yes"]')?.checked
                    : document.querySelector(`input[name="need_${cat}"][value="yes"]`)?.checked;
                if (isEnabled) {
                    const s = stripFiles(conf, cat);
                    fd.append(`${cat}_config`, JSON.stringify(s.clean));
                    s.files.forEach(item => {
                        if (item.remote) { remoteFiles.push({ category: cat, sub_key: item.subKey, orig_name: item.file.name, stored_name: item.file.stored_name, mime_type: item.file.mime, size_bytes: item.file.size }); }
                        else { fd.append(`files[${cat}][${item.subKey}]`, item.file); }
                    });
                } else {
                    fd.append(`${cat}_config`, JSON.stringify({}));
                }
            }

            // —— Step 4: 下单交付 ——
            fd.append('delivery_mode', currentDeliveryMode);
            fd.append('sample_rows', JSON.stringify(sampleRows));
            fd.append('sample_config', JSON.stringify(sampleConfig));
            fd.append('sample_dest', document.getElementById('sample-destination')?.value || '');
            fd.append('bulk_rows', JSON.stringify(bulkRows));
            fd.append('bulk_logistics', JSON.stringify(bulkLogisticsConfig));
            fd.append('bulk_dest', document.getElementById('bulk-destination')?.value || '');
            fd.append('bulk_target_price', document.getElementById('bulk-target-price')?.value || '');
            fd.append('bulk_packing_remark', document.getElementById('bulk-shipping-remark')?.value || '');
            bulkPackingFiles.forEach(f => {
                if (isRemoteFile(f)) { remoteFiles.push({ category: 'bulkPacking', sub_key: 'ref', orig_name: f.name, stored_name: f.stored_name, mime_type: f.mime, size_bytes: f.size }); }
                else { fd.append('files[bulkPacking][ref]', f); }
            });

            // —— Step 5: 确认提交 ——
            fd.append('contact_name', document.getElementById('final-contact-name')?.value.trim() || '');
            fd.append('contact_info', document.getElementById('final-contact-info')?.value.trim() || '');
            fd.append('brand_name', document.getElementById('final-brand-name')?.value.trim() || '');
            fd.append('website', document.getElementById('final-website')?.value || '');
            fd.append('final_remark', document.getElementById('final-remark')?.value || '');
            fd.append('assign_sales', document.getElementById('assign-sales')?.value || '');
            fd.append('assign_pattern', document.getElementById('assign-pattern')?.value || '');
            fd.append('assign_sewing', document.getElementById('assign-sewing')?.value || '');
            fd.append('nda_agreed', document.getElementById('nda-agree')?.checked ? '1' : '0');
            finalDocsFiles.forEach(f => {
                if (isRemoteFile(f)) { remoteFiles.push({ category: 'finalDocs', sub_key: 'doc', orig_name: f.name, stored_name: f.stored_name, mime_type: f.mime, size_bytes: f.size }); }
                else { fd.append('files[finalDocs][doc]', f); }
            });

            if (remoteFiles.length > 0) {
                fd.append('remote_files', JSON.stringify(remoteFiles));
            }
            return fd;
        }

        async function saveDraft() {
            const draftBtn = document.getElementById('draftBtn');
            try {
                if (draftBtn) { draftBtn.disabled = true; draftBtn.style.opacity = '0.5'; }
                const fd = buildFormData();
                if (currentDraftId) fd.append('draft_id', String(currentDraftId));
                const res = await fetch('/api/save-draft', { method: 'POST', body: fd });
                const json = await res.json();
                if (json.success) {
                    currentDraftId = json.draft_id;
                    const toast = document.createElement('div');
                    toast.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:99999;padding:12px 24px;border-radius:10px;background:#065f46;color:#fff;font-size:14px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,.15);transition:opacity .5s;';
                    toast.textContent = _t('暂存成功，可在用户中心恢复');
                    document.body.appendChild(toast);
                    setTimeout(() => { toast.style.opacity = '0'; }, 2500);
                    setTimeout(() => { toast.remove(); }, 3000);
                } else {
                    showMsg(_t('暂存失败：') + (json.message || ''), 'error');
                }
            } catch (e) {
                console.error('暂存失败:', e);
                showMsg(_t('暂存失败，请检查网络'), 'error');
            } finally {
                if (draftBtn) { draftBtn.disabled = false; draftBtn.style.opacity = ''; }
            }
        }
        window.saveDraft = saveDraft;

        async function submitForm() {
            // 1. 全量验证
            const v = validateAll();
            
            if (!v.allValid) {
                // 构造缺失项提示
                const missing = [];
                if (!v.style) missing.push(_t('① 款式定义：请至少选择一个 ODM 款式或上传一个 OEM 设计'));
                if (!v.fabric) missing.push(_t('② 面料材质：请至少选择一种面料'));
                if (!v.trims) missing.push(_t('③ 品牌辅料：已启用的辅料需完善配置'));
                if (!v.shipping) missing.push(_t('④ 下单交付：请在表格中至少选择一个款式'));
                if (!v.contact) missing.push(_t('⑤ 客户档案：请填写姓名、联系方式和品牌名称'));
                
                await showMsg(_t('提交前请完善以下必填内容：') + '\n\n' + missing.join('\n'), 'warn');
                
                // 跳转到第一个有问题的步骤
                const stepMap = { style: 1, fabric: 2, trims: 3, shipping: 4, contact: 5 };
                for (const key of ['style', 'fabric', 'trims', 'shipping', 'contact']) {
                    if (!v[key]) {
                        const target = stepMap[key];
                        if (currentStep !== target) changeStep(target - currentStep);
                        break;
                    }
                }
                return;
            }
            
            // 2. NDA 校验 (仅提交时检查)
            const ndaChecked = document.getElementById('nda-agree').checked;
            if (!ndaChecked) {
                showMsg(_t("提交前请阅读并勾选同意商业保密协议 (NDA)。"), 'warn');
                return;
            }
        
            // 3. 构造 FormData
            const fd = buildFormData();
            if (currentEditInquiryId) fd.append('edit_inquiry_id', String(currentEditInquiryId));
            else if (currentDraftId) fd.append('draft_id', String(currentDraftId));

            // 4. 显示上传弹窗 & 压缩图片
            const nextBtn = document.getElementById('nextBtn');
            const originalBtnHTML = nextBtn.innerHTML;
            nextBtn.disabled = true;
            showUploadModal();

            try {
                // 压缩所有图片文件
                document.getElementById('uploadTitle').textContent = _t('正在压缩图片...');
                const compressedFd = await compressFormDataFiles(fd);

                // 5. 使用 XMLHttpRequest 上传（支持进度）
                document.getElementById('uploadTitle').textContent = _t('正在上传文件...');
                const result = await new Promise((resolve, reject) => {
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', '/api/submit-inquiry');
                    xhr.upload.onprogress = (e) => {
                        if (e.lengthComputable) updateUploadProgress((e.loaded / e.total) * 100);
                    };
                    xhr.onload = () => {
                        try { resolve(JSON.parse(xhr.responseText)); } 
                        catch { reject(new Error('响应解析失败')); }
                    };
                    xhr.onerror = () => reject(new Error('网络错误'));
                    xhr.ontimeout = () => reject(new Error('请求超时'));
                    xhr.timeout = 5 * 60 * 1000; // 5 分钟超时
                    xhr.send(compressedFd);
                });

                hideUploadModal();
                if (result.success) {
                    currentDraftId = null;
                    currentEditInquiryId = null;
                    await showMsg(_t("✅ 提交成功！") + `\n\n${_t('您的需求编号为:')} ${result.inquiry_no}\n${_t('专属业务经理将在 24 小时内为您提供正式报价。')}`, 'success');
                    window.location.href = '/user';
                } else {
                    showMsg(_t('提交失败，请稍后重试。') + (result.message ? `\n${result.message}` : ''), 'error');
                    nextBtn.innerHTML = originalBtnHTML;
                    nextBtn.disabled = false;
                }
            } catch (err) {
                hideUploadModal();
                console.error('提交异常:', err);
                showMsg(_t('网络异常，请检查网络后重试。'), 'error');
                nextBtn.innerHTML = originalBtnHTML;
                nextBtn.disabled = false;
            }
        }

        function selectItem(category, displayName) {
            document.getElementById(`sum-${category}`).innerText = displayName;
            document.getElementById(`step-${currentStep}`).querySelectorAll('.option-item').forEach(item => item.classList.remove('selected'));
            event.currentTarget.classList.add('selected');
        }

        // ==========================================
        // 动态面料渲染与联动逻辑
        // ==========================================
        window.globalFabricsMap = {}; // 用于全局根据名称快速查找面料详情

        // 辅助函数：根据面料名称解析并拼接色卡完整的 URL 数组
        function getFabricSwatches(fabricName) {
            const fabric = window.globalFabricsMap[fabricName];
            if (!fabric || !fabric.swatch_pic_names) return [];
            
            // 按逗号分割，去除前后空格，过滤掉空值，然后拼接完整的 URL
            return fabric.swatch_pic_names.split(',')
                .map(name => name.trim())
                .filter(name => name.length > 0)
                .map(name => `https://files.yiswim.cloud/uploads/${name}`);
        }

        // 新增：动态渲染颜色面板的函数
        function renderColorPalette(fabricName, selectedColors) {
            const container = document.getElementById('color-palette-container');
            container.innerHTML = '';
            
            const fabric = window.globalFabricsMap[fabricName];
            if (!fabric || !fabric.colors || fabric.colors.length === 0) {
                container.innerHTML = '<p style="font-size:12px; color:#94a3b8; grid-column:1/-1;">该面料暂未配置可选色卡。</p>';
                return;
            }
            
            // 按照 color_code 排序 (支持数字或包含字母的色号混合排序)
            const sortedColors = [...fabric.colors].sort((a, b) => {
                return String(a.color_code).localeCompare(String(b.color_code), undefined, {numeric: true});
            });

            sortedColors.forEach(color => {
                const codeStr = String(color.color_code);
                const isSelected = selectedColors.includes(codeStr);
                const selectedClass = isSelected ? 'selected' : '';
                
                // 判断是否存在 tag 且不为空/null
                let tagHtml = '';
                if (color.tag && color.tag !== 'null' && String(color.tag).trim() !== '') {
                    tagHtml = `<div class="color-tag-badge">${color.tag}</div>`;
                }

                container.insertAdjacentHTML('beforeend', `
                    <div class="color-swatch-wrapper ${selectedClass}" onclick="toggleColor('${codeStr}', this)">
                        ${tagHtml}
                        <div class="color-swatch" style="background-color: ${color.hex};"></div>
                        <div class="color-swatch-text">
                            <div class="color-swatch-code">${codeStr}</div>
                        </div>
                    </div>
                `);
            });

        }

        let fabricSelection = {}; 
        let activeFabricCat = '';

        function renderFabrics(fabrics) {
            const tabsContainer = document.getElementById('fabric-sub-tabs');
            const panesContainer = document.getElementById('fabric-panes-container');
            
            if (!fabrics || fabrics.length === 0) { 
                tabsContainer.innerHTML = '<p style="color:#999;font-size:12px;">暂无面料数据</p>'; 
                return; 
            }

            // 1. 获取所有不重复的面料分类 (Category)
            const categories =[...new Set(fabrics.map(f => f.category).filter(Boolean))];
            
            // --- 新增：强制分类排序逻辑 ---
            const targetOrder = ['面料', '里料', '网纱']; // 您可以随时在这里增减或调整顺序
            categories.sort((a, b) => {
                const indexA = targetOrder.indexOf(a);
                const indexB = targetOrder.indexOf(b);
                
                // 如果两个都在预设里，按预设的数组索引排序 (0, 1, 2...)
                if (indexA !== -1 && indexB !== -1) return indexA - indexB; 
                
                // 如果 a 在预设里，b 不在，那么 a 肯定排在前面
                if (indexA !== -1) return -1; 
                
                // 如果 b 在预设里，a 不在，那么 b 肯定排在前面
                if (indexB !== -1) return 1;  
                
                // 都不在预设里，按默认的中文拼音排序兜底
                return a.localeCompare(b, 'zh-CN'); 
            });
            // ------------------------------
            
            tabsContainer.innerHTML = '';
            panesContainer.innerHTML = '';
            fabricSelection = {};

            // 2. 动态生成 Tabs 和 Panes
            categories.forEach((cat, index) => {
                const catId = `fabric-cat-${index}`; // 使用 index 避免类名中的特殊字符问题
                const isActive = index === 0 ? 'active' : '';
                if (index === 0) activeFabricCat = catId; 

                // 初始化该分类的缓存数据结构：包含当前活跃名字 activeName 和各面料的独立配置 configs
                fabricSelection[catId] = { activeName: '', originalCatName: cat, configs: {} };

                // 插入 Tab (改用 mode-option 样式)
                tabsContainer.insertAdjacentHTML('beforeend', `<div class="mode-option ${isActive}" onclick="switchFabricCat('${catId}', this)">${cat}</div>`);

                // 插入 Pane 和 Grid
                panesContainer.insertAdjacentHTML('beforeend', `<div id="${catId}" class="fabric-pane ${isActive}"><div class="option-grid" id="grid-${catId}"></div></div>`);

                const catFabrics = fabrics.filter(f => f.category === cat);
                const gridContainer = document.getElementById(`grid-${catId}`);

                // 3. 填充当前分类下的面料卡片
                catFabrics.forEach(fabric => {
                    window.globalFabricsMap[fabric.name] = fabric; // 将面料数据存入全局字典

                    // --- 新增：标签解析逻辑 ---
                    let tagsHtml = '';
                    if (fabric.tags && fabric.tags.trim() !== '') {
                        // 使用正则兼容中英文逗号分割，并过滤空字符串
                        const tagList = fabric.tags.split(/[，,]/).map(t => t.trim()).filter(t => t !== '');
                        if (tagList.length > 0) {
                            tagsHtml = `<div class="fabric-tags-wrapper">` + 
                                tagList.map(t => {
                                    const isHighlight = ['常用', '推荐', 'HOT'].includes(t);
                                    return `<span class="fabric-tag-item ${isHighlight ? 'highlight' : ''}">${t}</span>`;
                                }).join('') + 
                            `</div>`;
                        }
                    }

                    const coverImg = (fabric.image_urls && fabric.image_urls.length > 0) ? fabric.image_urls[0] : '';
                    const fabricJson = JSON.stringify(fabric).replace(/"/g, '&quot;');
                    
                    // 1. 同时兼容中英文命名习惯，且因为是数组格式，提取第一个元素即可
                    let rawComp = fabric.composition || fabric['成分'];
                    let rawGsm = fabric.gsm || fabric.weight || fabric['克重'];

                    let compStr = '';
                    if (Array.isArray(rawComp) && rawComp.length > 0) {
                        compStr = String(rawComp[0]).trim();
                    } else if (rawComp !== undefined && rawComp !== null) {
                        compStr = String(rawComp).trim(); // 兼容万一存成了单行文本
                    }

                    let gsmStr = '';
                    if (Array.isArray(rawGsm) && rawGsm.length > 0) {
                        gsmStr = String(rawGsm[0]).trim();
                    } else if (rawGsm !== undefined && rawGsm !== null) {
                        gsmStr = String(rawGsm).trim();
                    }
                    
                    // 2. 自动补全克重单位 'g' (兼容输入了 220 或 220g)
                    if (gsmStr && !gsmStr.toLowerCase().endsWith('g') && !gsmStr.toLowerCase().endsWith('gsm')) {
                        gsmStr += 'g';
                    }

                    // 3. 拼接并设置优雅的兜底文案
                    const subText = [compStr, gsmStr].filter(Boolean).join(' | ') || '精选定制面料';
                    // ----------------------------------------
                    
                    const cardHtml = `
                        <div class="option-item fabric-item" onclick="selectFabric('${fabric.name}', this, '${catId}')">
                            <div class="details-btn" onclick="event.stopPropagation(); openDetailModal(${fabricJson})" title="查看详情">
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                            </div>
                            ${coverImg ? `<img src="${coverImg}" class="option-img" loading="lazy">` : `...`}
                            <div class="option-info">
                                <h4>${(window.__lang === 'en' && fabric.name_en) ? fabric.name_en : fabric.name}</h4>
                                <p style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${subText}">${subText}</p>
                                <!-- 插入标签区域 -->
                                ${tagsHtml}
                            </div>
                        </div>`;
                    gridContainer.insertAdjacentHTML('beforeend', cardHtml);
                }); // <--- 注意：普通面料的循环在这里结束

                // ✅ 正确位置：移到循环外部
                // 在每个面料网格末尾增加唯一的“定制找样”卡片
                const customCardHtml = `
                    <div class="option-item fabric-item custom-sourcing-card" id="custom-card-${catId}" onclick="selectFabric('CUSTOM_SOURCING', this, '${catId}')">
                        <div class="custom-sourcing-img">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line>
                            </svg>
                            <span style="font-size:12px; margin-top:8px; font-weight:500;">自定义面料</span>
                        </div>
                        <div class="option-info">
                            <h4>找不到心仪面料？</h4>
                            <p style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="上传参考图或要求，由红绣为您全球找样/开发">定制开发 / 全球找样</p>
                        </div>
                    </div>`;
                gridContainer.insertAdjacentHTML('beforeend', customCardHtml);
            });

            updateFabricSummary();
        }

        function switchFabricCat(catId, el) {
            activeFabricCat = catId; 
            el.parentNode.querySelectorAll('.mode-option').forEach(t => t.classList.remove('active')); 
            el.classList.add('active');
            
            document.querySelectorAll('#fabric-panes-container .fabric-pane').forEach(p => p.classList.remove('active')); 
            document.getElementById(catId).classList.add('active');
            
            // 检查新切换的分类是否已有选中的面料，如有则恢复面板
            const panel = document.getElementById('fabric-config-panel');
            const selection = fabricSelection[catId];
            
            if (selection && selection.activeName) {
                const selectedEl = document.getElementById(catId).querySelector('.fabric-item.selected');
                const config = selection.configs[selection.activeName];
                
                if (selectedEl) {
                    const gridContainer = document.getElementById(`grid-${catId}`);
                    let insertBeforeNode = null;
                    let currentElement = selectedEl.nextElementSibling;
                    while (currentElement) {
                        if (currentElement.id === 'fabric-config-panel') { currentElement = currentElement.nextElementSibling; continue; }
                        if (currentElement.offsetTop > selectedEl.offsetTop) { insertBeforeNode = currentElement; break; }
                        currentElement = currentElement.nextElementSibling;
                    }
                    if (insertBeforeNode) gridContainer.insertBefore(panel, insertBeforeNode);
                    else gridContainer.appendChild(panel);
                    
                    panel.classList.remove('hidden');
                    
                    document.getElementById('config-type-tag').innerText = selection.originalCatName;
                    
                    const isCustomSourcing = (selection.activeName === 'CUSTOM_SOURCING');
                    const modeSwitcher = document.getElementById('fabric-mode-switcher');
                    const solidArea = document.getElementById('fabric-solid-area');
                    const printArea = document.getElementById('fabric-print-area');
                    const customForm = document.getElementById('fabric-custom-sourcing-form');
                    const notesArea = document.querySelector('.fabric-notes-area');
                    const isSimplified = ['里料', '网纱'].includes(selection.originalCatName);
                    const isLining = selection.originalCatName.includes('里料') || selection.originalCatName.includes('Lining');

                    // --- 统一控制里料样式 ---
                    if (notesArea) notesArea.style.display = isSimplified  ? 'none' : 'block';
                    if (modeSwitcher) modeSwitcher.style.display = isSimplified  ? 'none' : 'inline-flex';

                    // --- 核心修复：切换 Tab 时强制重置里料专属区域的显隐状态 ---
                    const liningSpecialConfig = document.getElementById('lining-special-config');
                    if (liningSpecialConfig) {
                        liningSpecialConfig.classList.toggle('hidden', !isLining);
                        if (isLining) {
                            const isFull = config.fullLining !== false;
                            document.getElementById('lining-mode-full').classList.toggle('active', isFull);
                            document.getElementById('lining-mode-partial').classList.toggle('active', !isFull);
                            document.getElementById('lining-partial-area').classList.toggle('hidden', isFull);
                            document.getElementById('lining-placement-remark').value = config.liningPlacement || '';
                        }
                    }
                    const liningHintBox2 = document.getElementById('lining-color-hint');
                    if (liningHintBox2) liningHintBox2.classList.toggle('hidden', !isLining);
                    const liningQuickPick2 = document.getElementById('lining-quick-pick');
                    if (liningQuickPick2) {
                        liningQuickPick2.classList.toggle('hidden', !isLining);
                        if (isLining) syncLiningQuickBtns();
                    }

                    if (isCustomSourcing) {
                        // 定制找样逻辑
                        const _csLabel = window.__lang === 'en' ? 'Custom Sourcing / Global Development' : '定制开发/全球找样';
                        document.getElementById('selected-fabric-display').innerText = window.__lang === 'en' ? `${selection.originalCatName}: ${_csLabel}` : `${selection.originalCatName}：${_csLabel}`;
                        [modeSwitcher, solidArea, printArea].forEach(area => area?.classList.add('hidden'));
                        if(customForm) customForm.classList.remove('hidden');
                        
                        // 恢复数据
                        document.getElementById('custom-fabric-desc').value = config.customDesc || '';
                        document.getElementById('custom-fabric-comp').value = config.comp || '';
                        document.getElementById('custom-fabric-gsm').value = config.gsm || '';
                        document.getElementById('custom-fabric-color').value = config.colorReq || '';
                        document.getElementById('custom-fabric-physical').checked = config.physical || false;
                        document.getElementById('custom-fabric-tracking').value = config.trackingNo || '';
                        document.getElementById('custom-fabric-address-info').classList.toggle('hidden', !config.physical);
                        renderCustomFabricPreview(config.customFiles || []);
                    } else {
                        // 标准面料逻辑
                        const _activeEnName = (window.__lang === 'en' && window.globalFabricsMap && window.globalFabricsMap[selection.activeName] && window.globalFabricsMap[selection.activeName].name_en) ? window.globalFabricsMap[selection.activeName].name_en : selection.activeName;
                        document.getElementById('selected-fabric-display').innerText = window.__lang === 'en' ? `${selection.originalCatName}: ${_activeEnName}` : `${selection.originalCatName}：${selection.activeName}`;
                        [solidArea, printArea].forEach(area => area?.classList.remove('hidden'));
                        if(customForm) customForm.classList.add('hidden');
                        
                        if (isSimplified) config.mode = 'solid';
                        switchFabricMode(config.mode); 
                        document.getElementById('fabric-color-input').value = config.colorText || '';
                        
                        if (config.mode === 'print') {
                            document.querySelectorAll('.print-type-item').forEach(item => {
                                const isTarget = (config.printType === 'seamless' && item.innerText.includes('无缝')) || 
                                                 (config.printType === 'placement' && item.innerText.includes('定位'));
                                item.classList.toggle('selected', isTarget);
                            });
                            document.getElementById('fabric-print-ref-color').value = config.printRefColor || '';
                        }

                        // --- 核心修复：切换 Tab 时，同步恢复该面料的色卡封面图 ---
                        const swatches = getFabricSwatches(selection.activeName);
                        const previewDiv = document.getElementById('fabric-swatch-img-preview');
                        if (previewDiv) {
                            if (swatches.length > 0) {
                                previewDiv.style.backgroundImage = `url('${swatches[0]}')`;
                                previewDiv.innerHTML = ''; 
                            } else {
                                previewDiv.style.backgroundImage = 'none';
                                previewDiv.innerHTML = '<span style="color:#94a3b8; font-size:12px; font-weight:600;">[ 暂无高清色卡档案 ]</span>';
                            }
                        }
                        // -----------------------------------------------------------
                    }


                    // 通用项恢复
                    document.getElementById('fabric-remark').value = config.remark || '';
                    renderFabricFileList(config.files || []); 
                    renderPrintPreview(config.prints || []);

                    
                    setTimeout(() => {
                        const arrow = document.getElementById('config-arrow');
                        const arrowPos = selectedEl.getBoundingClientRect().left - panel.getBoundingClientRect().left + (selectedEl.getBoundingClientRect().width / 2) - 8;
                        arrow.style.left = `${arrowPos}px`;
                        scrollToPanelHeader();
                    }, 50);
                }
            } else {
                panel.classList.add('hidden');
            }
        }

        // 处理印花文件上传
        function handlePrintFiles(files) {
            if(!activeFabricCat || !fabricSelection[activeFabricCat].activeName) return;
            const config = fabricSelection[activeFabricCat].configs[fabricSelection[activeFabricCat].activeName];
            
            Array.from(files).forEach(file => {
                if (file.size > 20 * 1024 * 1024) { showMsg(`印花文件 ${file.name} 超过 20MB`, 'error'); return; }
                if (!config.prints.some(f => f.name === file.name && f.size === file.size)) {
                    config.prints.push(file);
                }
            });
            renderPrintPreview(config.prints);
        }

        // 渲染印花预览
        function renderPrintPreview(files) {
            const grid = document.getElementById('printPreviewGrid');
            grid.innerHTML = '';
            files.forEach((file, index) => {
                const remote = isRemoteFile(file);
                const isImage = remote ? isImageMime(file.mime) : file.type.startsWith('image/');
                const ext = fileExt(file.name);
                
                if (isImage) {
                    if (remote) {
                        grid.insertAdjacentHTML('beforeend', `
                            <div class="oem-preview-item">
                                <img src="${remoteFileUrl(file)}" onclick="openOemPreview(this.src, '${file.name}')" style="cursor:zoom-in;">
                                <button type="button" class="oem-preview-remove" onclick="removePrintFile(${index})">&times;</button>
                            </div>`);
                    } else {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            grid.insertAdjacentHTML('beforeend', `
                                <div class="oem-preview-item">
                                    <img src="${e.target.result}" onclick="openOemPreview(this.src, '${file.name}')" style="cursor:zoom-in;">
                                    <button type="button" class="oem-preview-remove" onclick="removePrintFile(${index})">&times;</button>
                                </div>`);
                        };
                        reader.readAsDataURL(file);
                    }
                } else {
                    grid.insertAdjacentHTML('beforeend', `
                        <div class="oem-preview-item" style="display:flex; align-items:center; justify-content:center; flex-direction:column;">
                            <span style="font-size:10px; font-weight:800; color:#64748b;">${ext}</span>
                            <button type="button" class="oem-preview-remove" onclick="removePrintFile(${index})">&times;</button>
                        </div>`);
                }
            });
        }

        // 移除印花文件
        function removePrintFile(index) {
            const config = fabricSelection[activeFabricCat].configs[fabricSelection[activeFabricCat].activeName];
            config.prints.splice(index, 1);
            renderPrintPreview(config.prints);
        }

        // 处理面料附件上传
        function handleFabricFiles(files) {
            if(!activeFabricCat || !fabricSelection[activeFabricCat].activeName) return;
            const config = fabricSelection[activeFabricCat].configs[fabricSelection[activeFabricCat].activeName];
            
            Array.from(files).forEach(file => {
                if (file.size > 20 * 1024 * 1024) { showMsg(`文件 ${file.name} 超过 20MB`, 'error'); return; }
                if (!config.files.some(f => f.name === file.name && f.size === file.size)) {
                    config.files.push(file);
                }
            });
            renderFabricFileList(config.files);
        }

        // 渲染面料附件列表
        function renderFabricFileList(files) {
            const listContainer = document.getElementById('fabricFileList');
            listContainer.innerHTML = '';
            files.forEach((file, index) => {
                const ext = file.name.split('.').pop().toLowerCase();
                listContainer.insertAdjacentHTML('beforeend', `
                    <div class="file-item" style="padding: 6px 12px;">
                        <div class="file-info">
                            <div class="file-icon" style="width:24px; height:24px; font-size:9px;">${ext.substring(0,3)}</div>
                            <span class="file-name" style="font-size:12px;">${file.name}</span>
                        </div>
                        <button class="file-remove" onclick="removeFabricFile(${index})">×</button>
                    </div>
                `);
            });
        }

        // 移除面料附件
        function removeFabricFile(index) {
            const config = fabricSelection[activeFabricCat].configs[fabricSelection[activeFabricCat].activeName];
            config.files.splice(index, 1);
            renderFabricFileList(config.files);
        }

        // 新增：精确控制滚动，使配置面板的 header 位于视图中上部
        function scrollToPanelHeader() {
            setTimeout(() => {
                const scrollArea = document.querySelector('.config-scroll-area');
                const panel = document.getElementById('fabric-config-panel');
                const header = panel.querySelector('.config-header');
                
                if (scrollArea && header && !panel.classList.contains('hidden')) {
                    const scrollAreaRect = scrollArea.getBoundingClientRect();
                    const headerRect = header.getBoundingClientRect();
                    // 计算距离：让 header 停留在距离滚动容器顶部 80px 的位置（偏中上部）
                    const scrollAmount = headerRect.top - scrollAreaRect.top - 80;
                    scrollArea.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                }
            }, 80); // 确保 DOM 已完全展开并重新排版
        }

        function selectFabric(name, el, catId) {
            const panel = document.getElementById('fabric-config-panel');
            const selection = fabricSelection[catId];
            const isCustomSourcing = (name === 'CUSTOM_SOURCING');
            
            // 1. 处理面板折叠逻辑
            if (selection.activeName === name && !panel.classList.contains('hidden')) {
                panel.classList.add('hidden');
                return;
            }
        
            // 2. 切换选中状态与 DOM 搬运
            document.getElementById(catId).querySelectorAll('.fabric-item').forEach(item => item.classList.remove('selected')); 
            el.classList.add('selected');
            
            const gridContainer = document.getElementById(`grid-${catId}`);
            let insertBeforeNode = null;
            let currentElement = el.nextElementSibling;
            while (currentElement) {
                if (currentElement.id === 'fabric-config-panel') { 
                    currentElement = currentElement.nextElementSibling; 
                    continue; 
                }
                if (currentElement.offsetTop > el.offsetTop) { 
                    insertBeforeNode = currentElement; 
                    break; 
                }
                currentElement = currentElement.nextElementSibling;
            }
            if (insertBeforeNode) gridContainer.insertBefore(panel, insertBeforeNode);
            else gridContainer.appendChild(panel);
            
            panel.classList.remove('hidden'); 
            scrollToPanelHeader();
            
            // 调整配置面板的小箭头指向
            const arrow = document.getElementById('config-arrow');
            if (arrow) {
                const arrowPos = el.getBoundingClientRect().left - panel.getBoundingClientRect().left + (el.getBoundingClientRect().width / 2) - 8;
                arrow.style.left = `${arrowPos}px`;
            }
        
            // 3. 数据结构初始化 (新增 fullLining 和 liningPlacement)
            selection.activeName = name; 
            if (!selection.configs[name]) {
                selection.configs[name] = { 
                    mode: isCustomSourcing ? 'custom' : 'solid', 
                    colors: [], colorText: '', printType: 'seamless', printRefColor: '',
                    remark: '', files: [], prints: [], customDesc: '', comp: '', printScale: '',
                    gsm: '', colorReq: '', physical: false, trackingNo: '', customFiles: [],
                    fullLining: true, liningPlacement: '' // <--- 新增字段
                };
                // 标准面料：从面料目录自动填充成分和克重
                if (!isCustomSourcing && window.globalFabricsMap && window.globalFabricsMap[name]) {
                    const catFabric = window.globalFabricsMap[name];
                    let rawComp = catFabric.composition || catFabric['成分'];
                    let rawGsm = catFabric.gsm || catFabric.weight || catFabric['克重'];
                    if (Array.isArray(rawComp) && rawComp.length > 0) selection.configs[name].comp = String(rawComp[0]).trim();
                    else if (rawComp) selection.configs[name].comp = String(rawComp).trim();
                    if (Array.isArray(rawGsm) && rawGsm.length > 0) selection.configs[name].gsm = String(rawGsm[0]).trim();
                    else if (rawGsm) selection.configs[name].gsm = String(rawGsm).trim();
                }
            }
            const config = selection.configs[name];
        
            // 4. UI 显隐逻辑定义
            const modeSwitcher = document.getElementById('fabric-mode-switcher');
            const solidArea = document.getElementById('fabric-solid-area');
            const printArea = document.getElementById('fabric-print-area');
            const customForm = document.getElementById('fabric-custom-sourcing-form');
            const notesArea = document.querySelector('.fabric-notes-area'); 
            
            // 判断当前大类是否为“里料”相关的词汇
            const isLining = selection.originalCatName.includes('里料') || selection.originalCatName.includes('Lining');
            const isSimplified = ['里料', '网纱'].includes(selection.originalCatName);
        
            // 控制里料简化样式
            if (notesArea) notesArea.style.display = isSimplified ? 'none' : 'block';
            if (modeSwitcher) modeSwitcher.style.display = isSimplified ? 'none' : 'inline-flex';

            // 新增：控制里料专属的颜色提示框与快速选色
            const liningHintBox = document.getElementById('lining-color-hint');
            if (liningHintBox) liningHintBox.classList.toggle('hidden', !isLining);
            const liningQuickPick = document.getElementById('lining-quick-pick');
            if (liningQuickPick) {
                liningQuickPick.classList.toggle('hidden', !isLining);
                if (isLining) syncLiningQuickBtns();
            }
        
            if (isCustomSourcing) {
                // A. 定制找样模式 UI
                [modeSwitcher, solidArea, printArea].forEach(area => area?.classList.add('hidden'));
                customForm.classList.remove('hidden');
                const _csLabelB = window.__lang === 'en' ? 'Custom Sourcing / Global Development' : '定制开发/全球找样';
                document.getElementById('selected-fabric-display').innerText = window.__lang === 'en' ? `${selection.originalCatName}: ${_csLabelB}` : `${selection.originalCatName}：${_csLabelB}`;
                
                // 恢复定制表单数据
                document.getElementById('custom-fabric-desc').value = config.customDesc || '';
                document.getElementById('custom-fabric-comp').value = config.comp || '';
                document.getElementById('custom-fabric-gsm').value = config.gsm || '';
                document.getElementById('custom-fabric-color').value = config.colorReq || '';
                document.getElementById('custom-fabric-physical').checked = config.physical || false;
                document.getElementById('custom-fabric-tracking').value = config.trackingNo || '';
                document.getElementById('custom-fabric-address-info').classList.toggle('hidden', !config.physical);
                renderCustomFabricPreview(config.customFiles || []);
                
                const nameEl = document.getElementById('customFabricFileName');
                if (nameEl) nameEl.innerText = config.customFiles.length > 0 ? `已选 ${config.customFiles.length} 个附件` : '选择图片或 PDF 说明文档';
            } else {
                // B. 标准面料模式 UI
                [modeSwitcher, solidArea, printArea].forEach(area => area?.classList.remove('hidden'));
                if(customForm) customForm.classList.add('hidden');
                const _fabricEnName = (window.__lang === 'en' && window.globalFabricsMap && window.globalFabricsMap[name] && window.globalFabricsMap[name].name_en) ? window.globalFabricsMap[name].name_en : name;
                document.getElementById('selected-fabric-display').innerText = window.__lang === 'en' ? `${selection.originalCatName}: ${_fabricEnName}` : `${selection.originalCatName}：${name}`;
                
                if (isSimplified) config.mode = 'solid'; // 里料强制纯色数据
                switchFabricMode(config.mode); 
                
                document.getElementById('fabric-color-input').value = config.colorText || '';
                if (config.mode === 'print') {
                    document.getElementById('fabric-print-scale').value = config.printScale || '';
                    document.querySelectorAll('.print-type-item').forEach(item => {
                        const isTarget = (config.printType === 'seamless' && item.innerText.includes('无缝')) || 
                                         (config.printType === 'placement' && item.innerText.includes('定位'));
                        item.classList.toggle('selected', isTarget);
                    });
                    document.getElementById('fabric-print-ref-color').value = config.printRefColor || '';
                }

                // --- 新增核心逻辑：动态更新纯色模式下的色卡预览小图 ---
                const swatches = getFabricSwatches(name);
                const previewDiv = document.getElementById('fabric-swatch-img-preview');
                if (previewDiv) {
                    if (swatches.length > 0) {
                        previewDiv.style.backgroundImage = `url('${swatches[0]}')`; // 默认展示第一张作为封面
                        previewDiv.innerHTML = ''; // 清空占位文字
                    } else {
                        previewDiv.style.backgroundImage = 'none';
                        previewDiv.innerHTML = '<span style="color:#94a3b8; font-size:12px; font-weight:600;">[ 暂无高清色卡档案 ]</span>';
                    }
                }
                // ----------------------------------------------------
            }
        
            // --- 新增核心逻辑：里料专属的“全衬/局部”区域控制 ---
            const liningSpecialConfig = document.getElementById('lining-special-config');
            if (liningSpecialConfig) {
                // 只有当前 Tab 叫“里料”时才显示这个区块
                liningSpecialConfig.classList.toggle('hidden', !isLining);
                
                if (isLining) {
                    const isFull = config.fullLining !== false; // 默认值为 true
                    document.getElementById('lining-mode-full').classList.toggle('active', isFull);
                    document.getElementById('lining-mode-partial').classList.toggle('active', !isFull);
                    document.getElementById('lining-partial-area').classList.toggle('hidden', isFull);
                    document.getElementById('lining-placement-remark').value = config.liningPlacement || '';
                }
            }
        
            // 5. 恢复通用项
            document.getElementById('config-type-tag').innerText = selection.originalCatName;
            document.getElementById('fabric-remark').value = config.remark || '';
            renderFabricFileList(config.files || []);
            renderPrintPreview(config.prints || []);
            
            updateFabricSummary();
        }


        // 处理定制找样附件上传
        function handleCustomFabricFiles(files) {
            if(!activeFabricCat || !fabricSelection[activeFabricCat].activeName) return;
            const config = fabricSelection[activeFabricCat].configs[fabricSelection[activeFabricCat].activeName];
            
            Array.from(files).forEach(file => {
                if (file.size > 20 * 1024 * 1024) { showMsg(`文件 ${file.name} 超过 20MB`, 'error'); return; }
                if (!config.customFiles.some(f => f.name === file.name && f.size === file.size)) {
                    config.customFiles.push(file);
                }
            });
            
            document.getElementById('customFabricFileName').innerText = `已选 ${config.customFiles.length} 个附件`;
            renderCustomFabricPreview(config.customFiles);
            updateFabricSummary();
        }
        
        // 渲染定制找样预览
        function renderCustomFabricPreview(files) {
            const grid = document.getElementById('customFabricPreviewGrid');
            if(!grid) return;
            grid.innerHTML = '';
            files.forEach((file, index) => {
                const remote = isRemoteFile(file);
                const isImage = remote ? isImageMime(file.mime) : file.type.startsWith('image/');
                const ext = fileExt(file.name);
                
                let content;
                if (isImage) {
                    const src = remote ? remoteFileUrl(file) : URL.createObjectURL(file);
                    content = `<img src="${src}" onclick="openOemPreview(this.src, '${file.name}')" style="cursor:zoom-in;">`;
                } else {
                    content = `<div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f1f5f9; color:#64748b; font-size:10px; font-weight:bold;">${ext}</div>`;
                }
                    
                grid.insertAdjacentHTML('beforeend', `
                    <div class="oem-preview-item" style="width:60px; height:60px; border-radius:6px;">
                        ${content}
                        <button type="button" class="oem-preview-remove" onclick="removeCustomFabricFile(${index})">&times;</button>
                    </div>`);
            });
        }
        
        // 移除定制找样附件
        function removeCustomFabricFile(index) {
            const config = fabricSelection[activeFabricCat].configs[fabricSelection[activeFabricCat].activeName];
            config.customFiles.splice(index, 1);
            document.getElementById('customFabricFileName').innerText = config.customFiles.length > 0 ? `已选 ${config.customFiles.length} 个附件` : '选择图片或 PDF 说明文档';
            renderCustomFabricPreview(config.customFiles);
            updateFabricSummary();
        }

        // 切换印花类型
        function switchPrintType(type, el) {
            if(!activeFabricCat || !fabricSelection[activeFabricCat] || !fabricSelection[activeFabricCat].activeName) return;
            const config = fabricSelection[activeFabricCat].configs[fabricSelection[activeFabricCat].activeName];
            
            config.printType = type;
            
            // 切换 UI 选中态
            el.parentNode.querySelectorAll('.print-type-item').forEach(item => item.classList.remove('selected'));
            el.classList.add('selected');
            
            updateFabricSummary();
        }
        
        // 更新印花参考色号
        function updatePrintRefColor() {
            if(!activeFabricCat || !fabricSelection[activeFabricCat] || !fabricSelection[activeFabricCat].activeName) return;
            const config = fabricSelection[activeFabricCat].configs[fabricSelection[activeFabricCat].activeName];
            
            config.printRefColor = document.getElementById('fabric-print-ref-color').value.trim();
            updateFabricSummary();
        }

        // 修复：新增缺失的印花尺寸比例更新函数
        function updatePrintScale() {
            if(!activeFabricCat || !fabricSelection[activeFabricCat] || !fabricSelection[activeFabricCat].activeName) return;
            const config = fabricSelection[activeFabricCat].configs[fabricSelection[activeFabricCat].activeName];
            
            config.printScale = document.getElementById('fabric-print-scale').value.trim();
            updateFabricSummary(); // 触发右侧侧边栏更新
        }

        function switchFabricMode(mode) {
            if(!activeFabricCat || !fabricSelection[activeFabricCat] || !fabricSelection[activeFabricCat].activeName) return;
            const config = fabricSelection[activeFabricCat].configs[fabricSelection[activeFabricCat].activeName];
            config.mode = mode;
            document.getElementById('mode-solid').classList.toggle('active', mode === 'solid'); 
            document.getElementById('mode-print').classList.toggle('active', mode === 'print');
            document.getElementById('fabric-solid-area').classList.toggle('hidden', mode !== 'solid'); 
            document.getElementById('fabric-print-area').classList.toggle('hidden', mode !== 'print');
            updateFabricSummary();
        }

        // 记录用户输入的面料色号并触发汇总更新
        function pickLiningQuickColor(btnEl, color) {
            if (!activeFabricCat || !fabricSelection[activeFabricCat] || !fabricSelection[activeFabricCat].activeName) return;
            const config = fabricSelection[activeFabricCat].configs[fabricSelection[activeFabricCat].activeName];
            const translated = _t(color);
            // Toggle: click again to deselect
            if (config.colorText === translated) {
                config.colorText = '';
            } else {
                config.colorText = translated;
            }
            document.getElementById('fabric-color-input').value = config.colorText;
            syncLiningQuickBtns();
            updateFabricSummary();
        }

        function syncLiningQuickBtns() {
            const currentColor = document.getElementById('fabric-color-input')?.value.trim() || '';
            document.querySelectorAll('.lining-quick-btn').forEach(btn => {
                const raw = btn.dataset.color;
                const isActive = currentColor === raw || currentColor === _t(raw);
                btn.style.borderColor = isActive ? 'var(--primary-color)' : '#e2e8f0';
                btn.style.background = isActive ? '#fef2f2' : '#fff';
            });
        }

        function updateSolidColorInput() {
            if(!activeFabricCat || !fabricSelection[activeFabricCat] || !fabricSelection[activeFabricCat].activeName) return;
            const config = fabricSelection[activeFabricCat].configs[fabricSelection[activeFabricCat].activeName];
            config.colorText = document.getElementById('fabric-color-input').value.trim();
            syncLiningQuickBtns();
            updateFabricSummary();
        }
        
        let zoom = 1;
        let offset = { x: 0, y: 0 };
        let isPanning = false;
        let startPos = { x: 0, y: 0 };
        
        const swatchImg = document.getElementById('swatchFullImg');
        const swatchCont = document.getElementById('swatchFullContainer');

        let currentSwatchImages = [];
        let currentSwatchIndex = 0;
        
        function openFabricColorModal() {
            // 安全性检查：确保当前有选中的面料
            if(!activeFabricCat || !fabricSelection[activeFabricCat] || !fabricSelection[activeFabricCat].activeName) return;
            
            const fabricName = fabricSelection[activeFabricCat].activeName;
            const swatches = getFabricSwatches(fabricName);
            
            // 如果该面料没有配置色卡，直接拦截并提示
            if (swatches.length === 0) {
                showMsg(_t('该面料暂未配置高清物理色卡照片，请直接填写您需要的色号或颜色描述。'), 'info');
                return;
            }

            // 动态注入当前面料的色卡数组
            currentSwatchImages = swatches;
            currentSwatchIndex = 0;
            
            // 渲染 UI 并绑定第一张图
            updateSwatchCarouselUI();
            
            document.getElementById('swatchFullModal').classList.add('active');
        }


        // 更新轮播图 UI 及控制按钮显示状态
        function updateSwatchCarouselUI() {
            const img = document.getElementById('swatchFullImg');
            const prevBtn = document.getElementById('swatch-prev-btn');
            const nextBtn = document.getElementById('swatch-next-btn');
            const counter = document.getElementById('swatch-counter');
            
            if (currentSwatchImages.length === 0) return;
            
            // 1. 加载当前图片
            img.src = currentSwatchImages[currentSwatchIndex];
            
            // 2. 重置缩放与位移状态
            zoom = 1; 
            offset = { x: 0, y: 0 };
            setTimeout(updateSwatchTransform, 10);
            
            // 3. 只有一张图时隐藏控制器，否则显示
            if (currentSwatchImages.length <= 1) {
                prevBtn.style.display = 'none';
                nextBtn.style.display = 'none';
                counter.style.display = 'none';
            } else {
                // 【关键修复】这里要用 flex 而不是 block，否则 SVG 会失去居中效果
                prevBtn.style.display = 'flex';
                nextBtn.style.display = 'flex';
                counter.style.display = 'block';
                counter.innerText = `${currentSwatchIndex + 1} / ${currentSwatchImages.length}`;
            }
            // 增加 Hover 动态反馈逻辑
            [prevBtn, nextBtn].forEach(btn => {
                btn.onmouseover = () => btn.style.background = "rgba(255,255,255,0.25)";
                btn.onmouseout = () => btn.style.background = "rgba(255,255,255,0.1)";
            });
        }

        
        // 左右切换逻辑
        function swatchCarouselMove(step) {
            if (currentSwatchImages.length <= 1) return;
            currentSwatchIndex = (currentSwatchIndex + step + currentSwatchImages.length) % currentSwatchImages.length;
            updateSwatchCarouselUI();
        }

        // 2. 更新图片状态 (唯一控制函数)
        function updateSwatchTransform() {
            swatchImg.style.transform = `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`;
        }
        
        // 3. 滚轮无级缩放 (以画面中心为锚点)
        swatchCont.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const delta = e.deltaY > 0 ? 0.85 : 1.15; // 缩放系数
            const newZoom = zoom * delta;
            
            // 限制缩放范围 (0.5倍 到 15倍)
            if (newZoom > 0.5 && newZoom < 15) {
                // 核心算法：为了让缩放中心保持在画面中心
                // 我们需要让偏移量也跟随缩放系数同步变化
                offset.x *= delta;
                offset.y *= delta;
                
                zoom = newZoom;
                updateSwatchTransform();
            }
        }, { passive: false });

        // 4. 左键拖拽平移
        swatchCont.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // 仅限左键
            isPanning = true;
            startPos = { x: e.clientX - offset.x, y: e.clientY - offset.y };
            swatchCont.style.cursor = 'grabbing';
        });
        
        window.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            offset.x = e.clientX - startPos.x;
            offset.y = e.clientY - startPos.y;
            updateSwatchTransform();
        });
        
        window.addEventListener('mouseup', () => {
            isPanning = false;
            swatchCont.style.cursor = 'grab';
        });
        
        // 5. 辅助功能：双击重置
        swatchCont.addEventListener('dblclick', () => {
            zoom = 1; 
            offset = { x: 0, y: 0 }; // 坐标归零
            updateSwatchTransform();
        });

        // 6. 移动端手指连续滑动切换图片（带跟手动画）
        (function() {
            var touchStartX = 0, touchStartY = 0, touchMoveX = 0, isHSwipe = null;
            var isSwiping = false; // 动画进行中锁
            var THRESHOLD = 40;   // 触发切换的最小滑动距离(px)

            swatchCont.addEventListener('touchstart', function(e) {
                if (isSwiping || e.touches.length !== 1) return;
                // 缩放状态下不拦截（让平移手势正常工作）
                if (zoom > 1.05) return;
                touchStartX = touchMoveX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                isHSwipe = null;
                // 取消图片过渡，实现即时跟手
                swatchImg.style.transition = 'none';
            }, { passive: true });

            swatchCont.addEventListener('touchmove', function(e) {
                if (isSwiping || e.touches.length !== 1 || zoom > 1.05) return;
                touchMoveX = e.touches[0].clientX;
                var dx = touchMoveX - touchStartX;
                var dy = e.touches[0].clientY - touchStartY;
                // 判定滑动方向（只判定一次）
                if (isHSwipe === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
                    isHSwipe = Math.abs(dx) > Math.abs(dy);
                }
                if (!isHSwipe) return;
                e.preventDefault(); // 阻止 Safari 后退手势 / 页面滚动
                // 图片跟手水平位移
                swatchImg.style.transform = 'translate(' + dx + 'px, 0px) scale(1)';
            }, { passive: false });

            swatchCont.addEventListener('touchend', function(e) {
                if (zoom > 1.05 || isHSwipe === null || !isHSwipe) {
                    isHSwipe = null;
                    return;
                }
                var dx = touchMoveX - touchStartX;
                var absDx = Math.abs(dx);

                if (absDx < THRESHOLD || currentSwatchImages.length <= 1) {
                    // 未达阈值 → 弹回原位
                    swatchImg.style.transition = 'transform 0.18s ease';
                    swatchImg.style.transform = 'translate(0px, 0px) scale(1)';
                    isHSwipe = null;
                    return;
                }

                isSwiping = true;
                var dir = dx < 0 ? 1 : -1; // 左滑→下一张, 右滑→上一张
                var w = window.innerWidth;

                // ① 当前图滑出屏幕
                swatchImg.style.transition = 'transform 0.18s ease-in';
                swatchImg.style.transform = 'translate(' + (-dir * w) + 'px, 0px) scale(1)';

                setTimeout(function() {
                    // ② 切换索引 & 加载新图
                    currentSwatchIndex = (currentSwatchIndex + dir + currentSwatchImages.length) % currentSwatchImages.length;
                    swatchImg.src = currentSwatchImages[currentSwatchIndex];
                    // 更新计数器
                    var counter = document.getElementById('swatch-counter');
                    if (counter && currentSwatchImages.length > 1) {
                        counter.innerText = (currentSwatchIndex + 1) + ' / ' + currentSwatchImages.length;
                    }

                    // ③ 新图从对侧入场
                    swatchImg.style.transition = 'none';
                    swatchImg.style.transform = 'translate(' + (dir * w) + 'px, 0px) scale(1)';

                    // 强制回流后执行入场动画
                    void swatchImg.offsetWidth;
                    swatchImg.style.transition = 'transform 0.22s ease-out';
                    swatchImg.style.transform = 'translate(0px, 0px) scale(1)';

                    setTimeout(function() {
                        // ④ 动画结束，重置状态
                        zoom = 1;
                        offset = { x: 0, y: 0 };
                        swatchImg.style.transition = 'transform 0.05s linear';
                        isSwiping = false;
                    }, 230);
                }, 190);

                isHSwipe = null;
            }, { passive: true });
        })();
        
        function closeSwatchModal() {
            document.getElementById('swatchFullModal').classList.remove('active');
        }

        function toggleColor(colorCode, el) {
            if(!activeFabricCat || !fabricSelection[activeFabricCat] || !fabricSelection[activeFabricCat].activeName) return;
            const config = fabricSelection[activeFabricCat].configs[fabricSelection[activeFabricCat].activeName];
            
            const arr = config.colors;
            const idx = arr.indexOf(String(colorCode));
            
            if (idx > -1) { 
                arr.splice(idx, 1); 
                el.classList.remove('selected'); 
            } else { 
                arr.push(String(colorCode)); 
                el.classList.add('selected'); 
            }
            
            const textEl = document.getElementById('selected-colors-text');
            if (textEl) {
                if (arr.length === 0) { 
                    textEl.innerText = '未选择颜色'; textEl.style.color = '#999'; 
                } else { 
                    textEl.innerText = `已选色号 (${arr.length})：${arr.join(', ')}`; textEl.style.color = 'var(--primary-color)'; 
                }
            }
            
            updateFabricSummary();
        }

        // 实时同步定制表单数据到缓存，并处理地址栏展开
        function updateCustomFabricData() {
            if(!activeFabricCat || !fabricSelection[activeFabricCat].activeName) return;
            const config = fabricSelection[activeFabricCat].configs[fabricSelection[activeFabricCat].activeName];
            
            // 保存所有新字段
            config.customDesc = document.getElementById('custom-fabric-desc').value;
            config.comp = document.getElementById('custom-fabric-comp').value;
            config.gsm = document.getElementById('custom-fabric-gsm').value;
            config.colorReq = document.getElementById('custom-fabric-color').value;
            config.physical = document.getElementById('custom-fabric-physical').checked;
            config.trackingNo = document.getElementById('custom-fabric-tracking').value;
            
            // 控制寄样地址栏显示/隐藏
            const infoBox = document.getElementById('custom-fabric-address-info');
            config.physical ? infoBox.classList.remove('hidden') : infoBox.classList.add('hidden');
            
            updateFabricSummary();
        }

        // 切换全衬里/局部衬里
        function toggleFullLining(isFull) {
            if (!activeFabricCat || !fabricSelection[activeFabricCat] || !fabricSelection[activeFabricCat].activeName) return;
            const config = fabricSelection[activeFabricCat].configs[fabricSelection[activeFabricCat].activeName];
            
            // 更新数据
            config.fullLining = isFull;
            
            // UI 样式切换
            document.getElementById('lining-mode-full').classList.toggle('active', isFull);
            document.getElementById('lining-mode-partial').classList.toggle('active', !isFull);
            
            const partialArea = document.getElementById('lining-partial-area');
            partialArea.classList.toggle('hidden', isFull);
            
            if (!isFull) {
                // 选择局部里料时，滚动到文本框
                setTimeout(() => scrollElementToCenter('lining-partial-area'), 50);
            } else {
                // 切换回全衬里时，清空之前填写的局部要求
                config.liningPlacement = '';
                document.getElementById('lining-placement-remark').value = '';
            }
            
            updateFabricSummary();
        }
        
        // 实时同步局部里料位置描述
        function updateLiningPlacement() {
            if (!activeFabricCat || !fabricSelection[activeFabricCat] || !fabricSelection[activeFabricCat].activeName) return;
            const config = fabricSelection[activeFabricCat].configs[fabricSelection[activeFabricCat].activeName];
            config.liningPlacement = document.getElementById('lining-placement-remark').value.trim();
            updateFabricSummary();
        }

        function updateFabricSummary() {
            let html = '';
            let hasSelection = false;
        
            for (const key in fabricSelection) {
                const selection = fabricSelection[key];
                const catName = selection.originalCatName;
                const catDisplayName = _t(catName);
                let statusText = '<span style="color:#cbd5e1;">' + _t('未选') + '</span>';
                
                if (selection.activeName) {
                    hasSelection = true;
                    const config = selection.configs[selection.activeName];
                    const fabricData = window.globalFabricsMap[selection.activeName];
                    const displayName = (window.__lang === 'en' && fabricData && fabricData.name_en) ? fabricData.name_en : selection.activeName;
                    
                    if (selection.activeName === 'CUSTOM_SOURCING') {
                        statusText = `<span style="color:var(--primary-color); font-weight:600;">${_t('定制找样 / 开发')}</span>`;
                    } else {
                        if (config.mode === 'print') {
                            const typeName = config.printType === 'placement' ? _t('定位印花') : _t('无缝印花');
                            const refText = config.printRefColor ? ` | ${_t('对色:')} ${config.printRefColor}` : '';
                            const scaleText = config.printScale ? ` | ${_t('尺寸:')} ${config.printScale}` : '';
                            statusText = `${displayName}<br><span style="font-size:10px; color:var(--primary-color);">${typeName}${refText}${scaleText}</span>`;
                        } else {
                            const colorDisplay = config.colorText ? `${_t('色号:')} ${config.colorText}` : _t('待填色号');
                            statusText = `${displayName}<br><span style="font-size:10px; color:#64748b;">${colorDisplay}</span>`;
                        }
                    }
        
                    // --- 新增：里料的覆盖范围追加显示 ---
                    if (catName.includes('里料') || catName.includes('Lining')) {
                        if (config.fullLining === false) {
                            const placementText = config.liningPlacement ? config.liningPlacement.substring(0, 10) + '...' : _t('待补充说明');
                            statusText += `<br><span style="font-size:10px; color:#d97706; font-weight:600;">${_t('局部衬里:')} ${placementText}</span>`;
                        }
                    }
                }
                
                html += `<div style="font-size:12px; margin-bottom:10px; color:var(--text-main); text-align:right; line-height: 1.4;">
                            <span style="color:#94a3b8; font-size: 11px;">[${catDisplayName}]</span><br>
                            ${statusText}
                         </div>`;
            }
        
            // CMT 客供物料逻辑保持不变
            const isCmt = document.getElementById('fabric-cmt-check') && document.getElementById('fabric-cmt-check').checked;
            if (isCmt) {
                hasSelection = true;
                const trackingNo = document.getElementById('fabric-cmt-tracking').value.trim();
                const trackingText = trackingNo ? `${_t('单号:')} ${trackingNo}` : _t('待更新单号');
                
                html += `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px dashed #e2e8f0; font-size:12px; color:var(--text-main); text-align:right;">
                            <span style="color:var(--primary-color); font-weight:600;">${_t('客户自行提供物料 (CMT)')}</span><br>
                            <span style="font-size:10px; color:#f59e0b;">${trackingText}</span>
                         </div>`;
            }
        
            const sumFabricEl = document.getElementById('sum-fabric');
            if (sumFabricEl) {
                sumFabricEl.innerHTML = hasSelection ? html : _t('未选择');
                if (!hasSelection) sumFabricEl.removeAttribute('style');
            }
            validateFabric();
        }


        function switchHangtagMode(mode) {
            hangtagConfig.mode = mode;
            
            // 切换按钮状态
            document.getElementById('hangtag-mode-auto').classList.toggle('active', mode === 'auto');
            document.getElementById('hangtag-mode-custom').classList.toggle('active', mode === 'custom');
            
            // 切换内容显隐
            const autoHint = document.getElementById('hangtag-auto-hint');
            const customDetails = document.getElementById('hangtag-custom-details');
            
            if (mode === 'auto') {
                if(autoHint) autoHint.classList.remove('hidden');
                if(customDetails) customDetails.classList.add('hidden');
            } else {
                if(autoHint) autoHint.classList.add('hidden');
                if(customDetails) customDetails.classList.remove('hidden');
                
                // 向上滚动，将 Switcher 停留在 Stepper 底部
                setTimeout(() => {
                    scrollElementToTop('hangtag-mode-custom', 60);
                }, 50);
            }
            
            updateHangtagSummary();
        }


        function switchSubTab(paneId, el) {
            document.querySelectorAll('.sub-pane').forEach(p => p.classList.remove('active')); document.querySelectorAll('.sub-tab').forEach(t => t.classList.remove('active'));
            document.getElementById(`pane-${paneId}`).classList.add('active'); el.classList.add('active');

            // 切换到 bag/label 时重新定位配置面板 (restore 时 pane 为 display:none 导致 offsetTop=0)
            if (paneId === 'bag') {
                var _bagPanel = document.getElementById('bag-config-panel');
                var _bagContainer = document.getElementById('bag-list-container');
                var _selectedBag = _bagContainer && _bagContainer.querySelector('.bag-material.selected');
                if (_selectedBag && _bagPanel && !_bagPanel.classList.contains('hidden')) {
                    var _insertBefore = null;
                    var _cur = _selectedBag.nextElementSibling;
                    while (_cur) {
                        if (_cur.id === 'bag-config-panel') { _cur = _cur.nextElementSibling; continue; }
                        if (_cur.offsetTop > _selectedBag.offsetTop) { _insertBefore = _cur; break; }
                        _cur = _cur.nextElementSibling;
                    }
                    if (_insertBefore) _bagContainer.insertBefore(_bagPanel, _insertBefore);
                    else _bagContainer.appendChild(_bagPanel);
                    // 重算箭头位置指向选中卡片
                    var _arrow = _bagPanel.querySelector('.config-arrow');
                    if (_arrow) {
                        var _arrowPos = _selectedBag.getBoundingClientRect().left - _bagPanel.getBoundingClientRect().left + (_selectedBag.getBoundingClientRect().width / 2) - 8;
                        _arrow.style.left = _arrowPos + 'px';
                    }
                }
            }
            if (paneId === 'label') {
                var _lPanel = document.getElementById('label-config-panel');
                var _lGrid = document.getElementById('label-material-grid');
                var _selectedLabel = _lGrid && _lGrid.querySelector('.option-item.selected');
                if (_selectedLabel && _lPanel && !_lPanel.classList.contains('hidden')) {
                    var _insertBefore = null;
                    var _cur = _selectedLabel.nextElementSibling;
                    while (_cur) {
                        if (_cur.id === 'label-config-panel') { _cur = _cur.nextElementSibling; continue; }
                        if (_cur.offsetTop > _selectedLabel.offsetTop) { _insertBefore = _cur; break; }
                        _cur = _cur.nextElementSibling;
                    }
                    if (_insertBefore) _lGrid.insertBefore(_lPanel, _insertBefore);
                    else _lGrid.appendChild(_lPanel);
                }
            }
        }

        // 1. 辅料 CMT 复选框交互逻辑 (带平滑滚动与数据清理)
        function toggleTrimCmt(category, isChecked) {
            const infoBoxId = `cmt-info-${category}`;
            const infoBox = document.getElementById(infoBoxId);
            
            if (infoBox) {
                if (isChecked) {
                    infoBox.classList.remove('hidden');
                    // 展开时，平滑滚动至该信息框的中心位置
                    setTimeout(() => {
                        scrollElementToCenter(infoBoxId);
                    }, 50);
                } else {
                    infoBox.classList.add('hidden');
                    // 收起时，清空该分类下用户填写的 CMT 数据
                    const trackingInput = document.getElementById(`cmt-tracking-${category}`);
                    const descInput = document.getElementById(`cmt-desc-${category}`);
                    if (trackingInput) trackingInput.value = '';
                    if (descInput) descInput.value = '';
                    
                    // 清空上传的文件
                    cmtFilesData[category] = [];
                    const nameEl = document.getElementById(`cmt-filename-${category}`);
                    if (nameEl) nameEl.innerText = '点击上传';
                    renderCmtPreviews(category);
                }
            }
            
            // 包装袋特判：勾选 CMT 则隐藏默认的“无印包装提示”
            if (category === 'bag') {
                const defaultHint = document.getElementById('bag-default-hint');
                if (defaultHint) {
                    defaultHint.style.display = isChecked ? 'none' : 'flex';
                }
            }
            
            // 触发对应的侧边栏汇总更新
            updateTrimSummaryTrigger(category);
        }

        // 2. 路由触发器
        function updateTrimSummaryTrigger(category) {
            if(category === 'metal') updateMetalSummary();
            else if(category === 'pad') updatePadSummary();
            else if(category === 'bag') updateBagSummary();
            else if(category === 'hangtag') updateHangtagSummary();
            else if(category === 'label') updateLabelSummary();
            else if(category === 'hygiene') updateHygieneSummary();
            else if(category === 'other') updateOtherSummary();
        }
        
        // 3. 右侧汇总栏的 CMT 状态渲染器 (复用工具)
        function handleTrimDisabledSummary(category, stEl) {
            const cmtCheck = document.getElementById(`cmt-check-${category}`);
            if (cmtCheck && cmtCheck.checked) {
                const tracking = document.getElementById(`cmt-tracking-${category}`).value.trim();
                const descId = (category === 'fabric') ? 'fabric-cmt-desc' : `cmt-desc-${category}`;
                const descVal = document.getElementById(descId)?.value.trim();
                const fileCount = cmtFilesData[category].length;
                
                let detailHtml = descVal ? `<br><span style="font-size:10px; color:#b45309;">${_t('描述:')} ${descVal.substring(0, 12)}...</span>` : '<br><span style="font-size:10px; color:#ef4444;">' + _t('待写描述') + '</span>';
                let fileHtml = fileCount > 0 ? ` <span style="color:#10b981;">(${fileCount} ${_t('图')})</span>` : '';
        
                stEl.innerHTML = `
                    <div style="text-align:right;">
                        <span style="color:#d97706; font-weight:600;">${_t('客户自行提供 (CMT)')}</span>
                        ${detailHtml}${fileHtml}
                        <br><span style="font-size:10px; opacity:0.8; color:#92400e;">${tracking ? _t('单号:')+' '+tracking : _t('待填单号')}</span>
                    </div>`;
                validateTrims();
                return true; 
            }
            stEl.innerText = '不需要';
            stEl.style.color = '#64748b'; 
            stEl.style.fontWeight = 'normal';
            validateTrims();
            return false;
        }


        function toggleTrim(category, isNeeded) {
            const contentBox = document.getElementById(`content-${category}`);
            const cmtSection = document.getElementById(`cmt-section-${category}`);
            
            // 控制 CMT 区域显隐及重置
            if (cmtSection) {
                cmtSection.style.display = isNeeded ? 'none' : 'block';
                if (isNeeded) {
                    const cmtCheck = document.getElementById(`cmt-check-${category}`);
                    if (cmtCheck) {
                        cmtCheck.checked = false;
                        toggleTrimCmt(category, false); // 强制折叠地址框
                    }
                }
            }
        
            // 包装袋默认提示控制
            if (category === 'bag') {
                const defaultHint = document.getElementById('bag-default-hint');
                if (defaultHint) {
                    const isCmt = document.getElementById('cmt-check-bag')?.checked;
                    defaultHint.style.display = (isNeeded || isCmt) ? 'none' : 'flex';
                }
            }
        
            if (isNeeded) {
                contentBox.classList.remove('hidden');
                updateTrimSummaryTrigger(category);
            } else {
                contentBox.classList.add('hidden');
                const summaryText = document.getElementById(`sum-trim-${category}`);
                handleTrimDisabledSummary(category, summaryText);
            }
        }


       // ==========================================
        // 卫生贴逻辑 (Hygiene Sticker) - 自主定义增强版
        // ==========================================
        
        let hygieneConfig = {
            mode: 'auto',              // 主模式：auto 或 custom
            material: '透明 PET (标准)',
            shape: '通用葫芦形',
            size: '',
            designFiles: [],           // 印刷设计图
            shapeFiles: [],            // 异形定制刀模图
            applyFiles: [],            // 粘贴位置参考图
            remark: '',                // 印刷排版要求
            shapeRemark: '',           // 异形形状要求
            applyRemark: '',           // 粘贴规则
            noApply: false             // 是否不代贴标
        };


        // 控制自定义尺寸输入框的显隐
        function toggleHygieneCustomSize(isChecked) {
            const area = document.getElementById('hygiene-size-input-area');
            if (area) {
                area.classList.toggle('hidden', !isChecked);
                
                if (isChecked) {
                    // 展开时稍微向下滚动以便用户输入
                    setTimeout(() => scrollElementToCenter('hygiene-size-input-area'), 50);
                } else {
                    // 收起时清空已填写的尺寸，恢复默认状态
                    const sizeInput = document.getElementById('hygiene-custom-size');
                    if (sizeInput) sizeInput.value = '';
                    hygieneConfig.size = ''; // 同步清空数据
                }
            }
            updateHygieneSummary();
        }

        // 1. 切换主模式 (智能代配 / 自主定义细节)
        function switchHygieneMode(mode) {
            hygieneConfig.mode = mode;
            
            document.getElementById('hygiene-mode-auto').classList.toggle('active', mode === 'auto');
            document.getElementById('hygiene-mode-custom').classList.toggle('active', mode === 'custom');
            
            const autoHint = document.getElementById('hygiene-auto-hint');
            const customDetails = document.getElementById('hygiene-custom-details');
            
            if (mode === 'auto') {
                if(autoHint) autoHint.classList.remove('hidden');
                if(customDetails) customDetails.classList.add('hidden');
            } else {
                if(autoHint) autoHint.classList.add('hidden');
                if(customDetails) customDetails.classList.remove('hidden');
                setTimeout(() => scrollElementToTop('hygiene-mode-custom', 60), 50);
            }
            
            updateHygieneSummary();
        }
        
        // 2. 选择基础属性 (材质、形状) - 修复箭头对齐与面板搬运
        function selectHygieneAttr(attrType, value, el) {
            hygieneConfig[attrType] = value;
            
            if (attrType === 'material') {
                el.parentNode.querySelectorAll('.hygiene-mat').forEach(item => item.classList.remove('selected'));
                el.classList.add('selected');
            } 
            else if (attrType === 'shape') {
                const grid = document.getElementById('hygiene-shape-grid');
                grid.querySelectorAll('.hygiene-shape').forEach(item => item.classList.remove('selected'));
                el.classList.add('selected');
                
                const customArea = document.getElementById('hygiene-custom-shape-area');
                if (customArea) {
                    const isCustom = (value === '其他定制形状');
                    
                    if (isCustom) {
                        // 动态搬运面板到所点击卡片这一行的末尾
                        let insertBeforeNode = null;
                        let currentElement = el.nextElementSibling;
                        while (currentElement) {
                            if (currentElement.id === 'hygiene-custom-shape-area') { 
                                currentElement = currentElement.nextElementSibling; 
                                continue; 
                            }
                            if (currentElement.offsetTop > el.offsetTop) { 
                                insertBeforeNode = currentElement; 
                                break; 
                            }
                            currentElement = currentElement.nextElementSibling;
                        }
                        
                        if (insertBeforeNode) grid.insertBefore(customArea, insertBeforeNode);
                        else grid.appendChild(customArea);
                        
                        customArea.classList.remove('hidden');
                        
                        // 对齐箭头并滚动
                        setTimeout(() => {
                            const arrow = customArea.querySelector('.config-arrow');
                            if (arrow && el) {
                                const arrowPos = el.getBoundingClientRect().left - customArea.getBoundingClientRect().left + (el.getBoundingClientRect().width / 2) - 8;
                                arrow.style.left = `${arrowPos}px`;
                            }
                            scrollElementToCenter('hygiene-custom-shape-area');
                        }, 50);
                    } else {
                        // 隐藏并清空脏数据
                        customArea.classList.add('hidden');
                        const remarkInput = document.getElementById('hygiene-shape-remark');
                        if (remarkInput) remarkInput.value = '';
                    }
                }
            }
            
            updateHygieneSummary();
        }
        
        // 3. 控制粘贴规则区域的显隐
        function toggleHygieneApply(isChecked) {
            hygieneConfig.noApply = isChecked;
            const ruleArea = document.getElementById('hygiene-apply-rule-area');
            if (ruleArea) {
                ruleArea.classList.toggle('hidden', isChecked);
                if (!isChecked) setTimeout(() => scrollElementToCenter('hygiene-apply-rule-area'), 50);
            }
            updateHygieneSummary();
        }
        
        // 4. 统一处理多种文件上传
        function handleHygieneFiles(input, type) {
            const files = Array.from(input.files);
            let targetArray, nameId;
            
            if (type === 'design') { targetArray = hygieneConfig.designFiles; nameId = 'hygieneFileName'; }
            else if (type === 'shape') { targetArray = hygieneConfig.shapeFiles; nameId = 'hygieneShapeFileName'; }
            else if (type === 'apply') { targetArray = hygieneConfig.applyFiles; nameId = 'hygieneApplyFileName'; }
            
            files.forEach(file => {
                if (file.size > 20 * 1024 * 1024) { showMsg(`文件 ${file.name} 超过 20MB`, 'error'); return; }
                if (!targetArray.some(f => f.name === file.name && f.size === file.size)) {
                    targetArray.push(file);
                }
            });
            
            const nameEl = document.getElementById(nameId);
            if (nameEl) nameEl.innerText = targetArray.length > 0 ? `已选 ${targetArray.length} 个文件` : '点击上传';
            
            renderHygienePreviews(type);
            updateHygieneSummary();
            input.value = '';
        }
        
        // 5. 渲染预览图
        function renderHygienePreviews(type) {
            let gridId = '';
            if (type === 'design') gridId = 'hygienePreview';
            else if (type === 'shape') gridId = 'hygieneShapePreview';
            else if (type === 'apply') gridId = 'hygieneApplyPreview';
            
            const grid = document.getElementById(gridId);
            if(!grid) return;
            grid.innerHTML = '';
            
            let targetArray = [];
            if (type === 'design') targetArray = hygieneConfig.designFiles;
            else if (type === 'shape') targetArray = hygieneConfig.shapeFiles;
            else if (type === 'apply') targetArray = hygieneConfig.applyFiles;
        
            targetArray.forEach((file, index) => {
                const remote = isRemoteFile(file);
                const isImage = remote ? isImageMime(file.mime) : file.type.startsWith('image/');
                const ext = fileExt(file.name);
                const shortName = file.name.length > 6 ? file.name.substring(0,3) + '...' : file.name;
                
                let content;
                if (isImage) {
                    const src = remote ? remoteFileUrl(file) : URL.createObjectURL(file);
                    content = `<img src="${src}" onclick="openOemPreview(this.src, '${file.name}')" style="width:100%;height:100%;object-fit:cover;">`;
                } else {
                    content = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:10px;font-weight:bold;">${ext}</div>`;
                }
                    
                grid.insertAdjacentHTML('beforeend', `
                    <div class="oem-preview-item" style="border-radius:4px;">
                        ${content}
                        <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.5); color:#fff; font-size:8px; padding:1px; text-align:center; white-space:nowrap; overflow:hidden;">${shortName}</div>
                        <button type="button" class="oem-preview-remove" onclick="removeHygieneFile(${index}, '${type}')" style="width:16px;height:16px;font-size:12px;">&times;</button>
                    </div>
                `);
            });
        }
        
        // 6. 移除文件
        function removeHygieneFile(index, type) {
            let targetArray, nameId, defaultText;
            if (type === 'design') { targetArray = hygieneConfig.designFiles; nameId = 'hygieneFileName'; defaultText = '点击上传 AI / PDF / 高清图'; }
            else if (type === 'shape') { targetArray = hygieneConfig.shapeFiles; nameId = 'hygieneShapeFileName'; defaultText = '点击上传'; }
            else if (type === 'apply') { targetArray = hygieneConfig.applyFiles; nameId = 'hygieneApplyFileName'; defaultText = '点击上传'; }
        
            targetArray.splice(index, 1);
            const nameEl = document.getElementById(nameId);
            if (nameEl) nameEl.innerText = targetArray.length > 0 ? `已选 ${targetArray.length} 个文件` : defaultText;
            
            renderHygienePreviews(type);
            updateHygieneSummary();
        }
        
        // 7. 汇总数据更新
        function updateHygieneSummary() {
            const st = document.getElementById('sum-trim-hygiene');
            const isEnabled = document.querySelector('input[name="need_hygiene"][value="yes"]')?.checked;
            
            if (!isEnabled) {
                handleTrimDisabledSummary('hygiene', st);
                return;
            }
        
            if (hygieneConfig.mode === 'auto') {
                st.innerHTML = `<div style="text-align:right;"><span style="color:#10b981; font-weight:600;">红绣智能代配</span><br><span style="font-size:10px; opacity:0.8;">透明PET | 葫芦形 | 代贴标</span></div>`;
            } else {
                // 判断是否勾选了自定义尺寸，如果是才抓取输入框的值，否则就是默认
                const isCustomSize = document.getElementById('hygiene-custom-size-check')?.checked;
                if (isCustomSize) {
                    hygieneConfig.size = document.getElementById('hygiene-custom-size')?.value.trim() || '';
                } else {
                    hygieneConfig.size = '';
                }
                
                // 抓取其他数据
                hygieneConfig.remark = document.getElementById('hygiene-text')?.value.trim() || '';
                hygieneConfig.shapeRemark = document.getElementById('hygiene-shape-remark')?.value.trim() || '';
                hygieneConfig.applyRemark = document.getElementById('hygiene-apply-remark')?.value.trim() || '';
                
                const matText = hygieneConfig.material.split(' ')[0];
                const shapeText = hygieneConfig.shape === '其他定制形状' ? '异形定制' : hygieneConfig.shape;
                
                // 核心改动：如果没勾选或者没填，显示常规尺寸；否则显示填入的尺寸
                const sizeText = hygieneConfig.size ? `尺寸: ${hygieneConfig.size}` : '红绣常规尺寸';
                
                const serviceText = hygieneConfig.noApply ? '不代贴' : '工厂代贴';
                
                const hasContent = (hygieneConfig.remark !== '' || hygieneConfig.designFiles.length > 0) ? '已传内容' : '待补内容';
        
                st.innerHTML = `
                    <div style="text-align:right;">
                        ${matText} | ${shapeText}<br>
                        <span style="font-size:10px; opacity:0.8;">${sizeText} | ${serviceText}</span><br>
                        <span style="font-size:10px; opacity:0.8;">内容状态: ${hasContent}</span>
                    </div>`;
            }
            
            st.style.color = 'var(--primary-color)'; 
            st.style.fontWeight = 'bold';
            validateTrims();
        }

        // ==========================================
        // 标签逻辑 (Label) - 智能代配与自主定义版 (最新材质/尺寸/缝制动态联动)
        // ==========================================
        
        let labelConfig = {
            mode: 'auto',
            material: '印标',
            size: '',
            method: '对折环缝', // 默认选中项
            components: ['上装/连体'],
            placements: {
                'top': '领后中',
                'bottom': '后腰内中'
            },
            placementFiles: {
                'top': [],
                'bottom': []
            },
            isSplit: false,        
            splitRemark: '',       
            remark: '',          
            designFiles: [],      
            otherMatFiles: [],
            sewingRemark: '',    // 新增：缝制方式备注
            sewingFiles: []      // 新增：缝制方式附件
        };

        // 1. 切换服装部件 (多选控制，且至少保留一项)
        function toggleLabelComponent(compName, el) {
            let arr = labelConfig.components;
            
            // 如果只有一项且正是当前项，阻止取消（必选其一）
            if (arr.length === 1 && arr[0] === compName) {
                showToast('请至少保留一个打标部位', 'warning');
                return;
            }
        
            const idx = arr.indexOf(compName);
            if (idx > -1) {
                // 取消选中
                arr.splice(idx, 1);
                el.classList.remove('selected');
            } else {
                // 新增选中
                arr.push(compName);
                el.classList.add('selected');
            }
        
            labelConfig.components = arr;
            
            // 联动控制下方的网格显隐
            const topArea = document.getElementById('label-placement-top-area');
            const bottomArea = document.getElementById('label-placement-bottom-area');
            
            if (topArea) topArea.classList.toggle('hidden', !arr.includes('上装/连体'));
            if (bottomArea) bottomArea.classList.toggle('hidden', !arr.includes('下装/裤装'));
            
            // 滚动对齐
            if (arr.includes('下装/裤装') && idx === -1) {
                setTimeout(() => scrollElementToCenter('label-placement-bottom-area'), 50);
            }
            
            updateLabelSummary();
        }
        
        // 2. 选择具体安装位置 (按 top/bottom 独立记录并计算箭头指向)
        function selectLabelPlacement(gridType, posName, el) {
            // 记录数据
            labelConfig.placements[gridType] = posName;
            
            // 取消当前网格内所有卡片的选中状态
            const grid = document.getElementById(`label-placement-${gridType}-grid`);
            if (grid) {
                grid.querySelectorAll('.option-item').forEach(card => card.classList.remove('selected'));
                el.classList.add('selected');
            }
            
            // 控制对应网格内面板的显隐并计算箭头位置
            const customArea = document.getElementById(`label-placement-custom-${gridType}`);
            if (customArea) {
                const isCustom = (posName === '自定义其他位置');
                customArea.classList.toggle('hidden', !isCustom);
                
                if (isCustom) {
                    // 延迟计算以确保 DOM 更新完毕
                    setTimeout(() => {
                        const arrow = customArea.querySelector('.config-arrow');
                        if (arrow && el) {
                            // 计算小箭头的动态左偏移量 (居中对齐点击的卡片)
                            const arrowPos = el.getBoundingClientRect().left - customArea.getBoundingClientRect().left + (el.getBoundingClientRect().width / 2) - 8;
                            arrow.style.left = `${arrowPos}px`;
                        }
                        // 平滑滚动居中
                        scrollElementToCenter(`label-placement-custom-${gridType}`);
                    }, 50);
                } else {
                    // 收起时清空多余文本
                    const textInput = document.getElementById(`label-custom-${gridType}-text`);
                    if (textInput) textInput.value = '';
                }
            }
            
            updateLabelSummary();
        }

        function toggleLabelSplit(checked) {
            labelConfig.isSplit = checked;
            
            const area = document.getElementById('label-split-detail-area');
            if (area) {
                area.classList.toggle('hidden', !checked);
                if (checked) {
                    // 平滑滚动到输入框
                    setTimeout(() => scrollElementToCenter('label-split-detail-area'), 50);
                } else {
                    // 收起时清空文本框
                    const textarea = document.getElementById('label-split-remark');
                    if (textarea) textarea.value = '';
                    labelConfig.splitRemark = '';
                }
            }
            updateLabelSummary();
        }

        // 预设定义：确保与您要求的一致
        const labelMaterialTypes = [
            { name: '印标', desc: '100%无触感, 泳装首选', image: 'https://files.yiswim.cloud/uploads/img_12b71c3b-96ed-4d19-962c-af5d4d66bb8d_heattransfer.webp', icon: '' },
            { name: 'TPU标', desc: '高弹防水, 亲肤磨砂', image: 'https://files.yiswim.cloud/uploads/img_345e3377-f8d5-479d-9437-c0caaa1fe532_tpu.webp', icon: '' },
            { name: '织唛标', desc: '经典品牌感, 质感厚实', image: 'https://files.yiswim.cloud/uploads/img_b54b91f9-e177-46cf-a636-df595ea1baa8_zhimaibiao.webp', icon: '' },
            { name: '其他', desc: '缎面标/特种标定制', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14"/></svg>' }
        ];
        
        // 更新为仅保留3个选项，并加入图片属性
        const sewingMethods = [
            { name: '对折环缝', desc: '夹入侧缝/领缝', image: 'https://files.yiswim.cloud/uploads/img_ef81a321-0e3f-4f28-9e37-b55e7f85b1a9_double-side.webp', icon: '' },
            { name: '单边平缝', desc: '四周或单边车线', image: 'https://files.yiswim.cloud/uploads/img_d10c1d60-116f-4020-a85c-cdb20eddadec_single-side.webp', icon: '' },
            { name: '其他', desc: '自定义特殊缝制', icon: '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5v14M5 12h14"/></svg>' }
        ];

        // 初始化渲染
        document.addEventListener('DOMContentLoaded', () => {
            const materialGrid = document.getElementById('label-material-grid');
            if (materialGrid) {
                materialGrid.innerHTML = labelMaterialTypes.map(t => {
                    let imgHtml = '';
                    // 动态判断：如果有 image 属性就渲染真图，否则渲染灰色 svg 占位
                    if (t.image) {
                        imgHtml = `<div class="option-img-alt" style="height:140px; background:url('${t.image}') center/cover; border-bottom: 1px solid #e2e8f0;"></div>`;
                    } else {
                        imgHtml = `<div class="option-img-alt" style="height:140px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#94a3b8;">${t.icon}</div>`;
                    }
                    
                    return `
                    <div class="option-item metal-item ${labelConfig.material === t.name ? 'selected' : ''}" onclick="selectLabelMaterial('${t.name}', this)">
                        ${imgHtml}
                        <div class="option-info">
                            <h4>${t.name}</h4>
                            <p>${t.desc}</p>
                        </div>
                    </div>
                    `;
                }).join('');
            }
        
            const sewingGrid = document.getElementById('label-sewing-grid');
            if (sewingGrid) {
                sewingGrid.innerHTML = sewingMethods.map(m => {
                    let imgHtml = '';
                    if (m.image) {
                        imgHtml = `<div class="option-img-alt" style="height:140px; background:url('${m.image}') center/cover; border-bottom: 1px solid #e2e8f0;"></div>`;
                    } else {
                        imgHtml = `<div class="option-img-alt" style="height:140px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; color:#94a3b8;">${m.icon}</div>`;
                    }
                    return `
                    <div class="option-item metal-item ${labelConfig.method === m.name ? 'selected' : ''}" onclick="selectLabelSewing('${m.name}', this)">
                        ${imgHtml}
                        <div class="option-info">
                            <h4>${m.name}</h4>
                            <p>${m.desc}</p>
                        </div>
                    </div>
                    `;
                }).join('');
            }
        });


        function switchLabelMode(mode) {
            labelConfig.mode = mode;
            
            // UI 按钮切换
            document.querySelectorAll('#pane-label .mode-option').forEach(opt => opt.classList.remove('active'));
            const activeBtn = document.getElementById(`label-mode-${mode}`);
            if (activeBtn) activeBtn.classList.add('active');
            
            // 区域显隐切换
            const autoHint = document.getElementById('label-auto-hint');
            const customDetails = document.getElementById('label-custom-details');
            
            if (mode === 'auto') {
                if(autoHint) autoHint.classList.remove('hidden');
                if(customDetails) customDetails.classList.add('hidden');
            } else {
                if(autoHint) autoHint.classList.add('hidden');
                if(customDetails) customDetails.classList.remove('hidden');
                
                // 向上滚动，将 Switcher 停留在 Stepper 底部
                setTimeout(() => {
                    scrollElementToTop('label-mode-custom', 60);
                }, 50);
            }
            
            updateLabelSummary();
        }

        // 选择标签材质 (动态控制下方的尺寸、缝制方式及颜色成本提示)
        function selectLabelMaterial(name, el) {
            labelConfig.material = name;
            
            const gridContainer = document.getElementById('label-material-grid');
            const panel = document.getElementById('label-config-panel');
            
            if (!gridContainer || !panel) return;
        
            if (el.classList.contains('selected') && !panel.classList.contains('hidden')) {
                panel.classList.add('hidden');
                return;
            }
        
            gridContainer.querySelectorAll('.option-item').forEach(card => card.classList.remove('selected'));
            el.classList.add('selected');
        
            let insertBeforeNode = null;
            let currentElement = el.nextElementSibling;
            while (currentElement) {
                if (currentElement.id === 'label-config-panel') { 
                    currentElement = currentElement.nextElementSibling; 
                    continue; 
                }
                if (currentElement.offsetTop > el.offsetTop) { 
                    insertBeforeNode = currentElement; 
                    break; 
                }
                currentElement = currentElement.nextElementSibling;
            }
            
            if (insertBeforeNode) gridContainer.insertBefore(panel, insertBeforeNode);
            else gridContainer.appendChild(panel);
            
            panel.classList.remove('hidden');
        
            const otherMatArea = document.getElementById('label-material-other-area');
            const sizeSewingArea = document.getElementById('label-dynamic-size-sewing');
            const sizeArea = document.getElementById('label-size-area');
            const sewingArea = document.getElementById('label-sewing-area');
            
            // --- 新增：材质颜色成本动态提示控制 ---
            const warningBox = document.getElementById('label-material-color-warning');
            const warningText = document.getElementById('label-color-warning-text');
            
            let hasWarning = false;
            if (name === '印标') {
                hasWarning = true;
                warningText.innerHTML = (window.__lang === 'en')
                    ? "<strong>Cost reminder:</strong> Heat transfer labels are recommended in <strong>single color (Black or White)</strong>. Multi-color gradient or overprint designs incur higher plate fees and unit costs."
                    : "<strong>成本提醒：</strong>无感印标建议设计为 <strong>单色 (黑色或白色)</strong>。如需彩色渐变或多色套印，开版费及单价较高。";
            } else if (name === 'TPU标') {
                hasWarning = true;
                warningText.innerHTML = (window.__lang === 'en')
                    ? "<strong>Cost reminder:</strong> TPU labels are recommended in <strong>standard Black</strong>. Special base colors or colored text require higher MOQ and cost more."
                    : "<strong>成本提醒：</strong>TPU 柔感标建议选择 <strong>常规黑色</strong>。如需指定特殊底色或彩色字，需满足较高的起订量 (MOQ) 且成本较高。";
            }
            
            if (warningBox) {
                warningBox.classList.toggle('hidden', !hasWarning);
            }
            // -------------------------------------
        
            if (name === '其他') {
                if (otherMatArea) otherMatArea.classList.remove('hidden');
                if (sizeSewingArea) sizeSewingArea.classList.add('hidden');
            } else if (name === '印标') {
                if (otherMatArea) otherMatArea.classList.add('hidden');
                if (sizeSewingArea) sizeSewingArea.classList.remove('hidden');
                if (sizeArea) sizeArea.classList.remove('hidden');
                if (sewingArea) sewingArea.classList.add('hidden'); 
            } else {
                if (otherMatArea) otherMatArea.classList.add('hidden');
                if (sizeSewingArea) sizeSewingArea.classList.remove('hidden');
                if (sizeArea) sizeArea.classList.remove('hidden');
                if (sewingArea) sewingArea.classList.remove('hidden');
            }
        
            setTimeout(() => {
                const arrow = panel.querySelector('.config-arrow');
                if (arrow) {
                    const arrowPos = el.getBoundingClientRect().left - panel.getBoundingClientRect().left + (el.getBoundingClientRect().width / 2) - 8;
                    arrow.style.left = `${arrowPos}px`;
                }
                scrollElementToCenter('label-config-panel');
            }, 50);
            
            updateLabelSummary();
        }

        
        // 处理“其他”材质的文件上传
        function handleLabelMatFiles(input) {
            const files = Array.from(input.files);
            files.forEach(file => {
                if (file.size > 20 * 1024 * 1024) { showMsg(`文件 ${file.name} 超过 20MB`, 'error'); return; }
                if (!labelConfig.otherMatFiles.some(f => f.name === file.name && f.size === file.size)) {
                    labelConfig.otherMatFiles.push(file);
                }
            });
        
            const nameEl = document.getElementById('labelMatFileName');
            if (nameEl) nameEl.innerText = labelConfig.otherMatFiles.length > 0 ? `已选 ${labelConfig.otherMatFiles.length} 个文件` : '点击上传';
            
            renderLabelMatPreviews();
            updateLabelSummary();
            input.value = '';
        }
        
        function renderLabelMatPreviews() {
            const grid = document.getElementById('labelMatPreview');
            if(!grid) return;
            grid.innerHTML = '';
            
            labelConfig.otherMatFiles.forEach((file, index) => {
                const isImage = file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                let content = isImage 
                    ? `<img src="${URL.createObjectURL(file)}" onclick="openOemPreview(this.src, '${file.name}')" style="width:100%;height:100%;object-fit:cover;">` 
                    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:10px;font-weight:bold;">${ext}</div>`;
        
                grid.insertAdjacentHTML('beforeend', `
                    <div class="oem-preview-item" style="border-radius:4px;">
                        ${content}
                        <button type="button" class="oem-preview-remove" onclick="removeLabelMatFile(${index})" style="width:16px;height:16px;font-size:12px;">&times;</button>
                    </div>
                `);
            });
        }
        
        function removeLabelMatFile(index) {
            labelConfig.otherMatFiles.splice(index, 1);
            const nameEl = document.getElementById('labelMatFileName');
            if (nameEl) nameEl.innerText = labelConfig.otherMatFiles.length > 0 ? `已选 ${labelConfig.otherMatFiles.length} 个文件` : '点击上传';
            renderLabelMatPreviews();
            updateLabelSummary();
        }
        
        // 3. 选择缝制方式
        function selectLabelSewing(name, el) {
            labelConfig.method = name;
            const grid = document.getElementById('label-sewing-grid');
            grid.querySelectorAll('.option-item').forEach(c => c.classList.remove('selected'));
            el.classList.add('selected');
            
            const otherArea = document.getElementById('label-sewing-other-area');
            if (otherArea) {
                if (name === '其他') {
                    // 搬运面板到当前行下方
                    let insertBeforeNode = null;
                    let currentElement = el.nextElementSibling;
                    while (currentElement) {
                        if (currentElement.id === 'label-sewing-other-area') { 
                            currentElement = currentElement.nextElementSibling; 
                            continue; 
                        }
                        if (currentElement.offsetTop > el.offsetTop) { 
                            insertBeforeNode = currentElement; 
                            break; 
                        }
                        currentElement = currentElement.nextElementSibling;
                    }
                    
                    if (insertBeforeNode) grid.insertBefore(otherArea, insertBeforeNode);
                    else grid.appendChild(otherArea);
                    
                    otherArea.classList.remove('hidden');
                    
                    // 对齐小箭头并平滑滚动
                    setTimeout(() => {
                        const arrow = otherArea.querySelector('.config-arrow');
                        if (arrow) {
                            const arrowPos = el.getBoundingClientRect().left - otherArea.getBoundingClientRect().left + (el.getBoundingClientRect().width / 2) - 8;
                            arrow.style.left = `${arrowPos}px`;
                        }
                        scrollElementToCenter('label-sewing-other-area');
                    }, 50);
                } else {
                    otherArea.classList.add('hidden');
                    // 清除脏数据
                    const remarkInput = document.getElementById('label-sewing-remark');
                    if (remarkInput) remarkInput.value = '';
                    labelConfig.sewingRemark = '';
                }
            }
            
            updateLabelSummary();
        }

        function handleLabelSewingFiles(input) {
            const files = Array.from(input.files);
            files.forEach(file => {
                if (file.size > 20 * 1024 * 1024) { showMsg(`文件 ${file.name} 超过 20MB`, 'error'); return; }
                if (!labelConfig.sewingFiles.some(f => f.name === file.name && f.size === file.size)) {
                    labelConfig.sewingFiles.push(file);
                }
            });
        
            const nameEl = document.getElementById('labelSewingFileName');
            if (nameEl) nameEl.innerText = labelConfig.sewingFiles.length > 0 ? `已选 ${labelConfig.sewingFiles.length} 个文件` : '点击上传';
            
            renderLabelSewingPreviews();
            updateLabelSummary();
            input.value = '';
        }

        function renderLabelSewingPreviews() {
            const grid = document.getElementById('labelSewingPreview');
            if(!grid) return;
            grid.innerHTML = '';
            
            labelConfig.sewingFiles.forEach((file, index) => {
                const remote = isRemoteFile(file);
                const isImage = remote ? isImageMime(file.mime) : file.type.startsWith('image/');
                const ext = fileExt(file.name);
                let content;
                if (isImage) {
                    const src = remote ? remoteFileUrl(file) : URL.createObjectURL(file);
                    content = `<img src="${src}" onclick="openOemPreview(this.src, '${file.name}')" style="width:100%;height:100%;object-fit:cover;">`;
                } else {
                    content = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:10px;font-weight:bold;">${ext}</div>`;
                }
        
                grid.insertAdjacentHTML('beforeend', `
                    <div class="oem-preview-item" style="border-radius:4px;">
                        ${content}
                        <button type="button" class="oem-preview-remove" onclick="removeLabelSewingFile(${index})" style="width:16px;height:16px;font-size:12px;">&times;</button>
                    </div>
                `);
            });
        }

        function removeLabelSewingFile(index) {
            labelConfig.sewingFiles.splice(index, 1);
            const nameEl = document.getElementById('labelSewingFileName');
            if (nameEl) nameEl.innerText = labelConfig.sewingFiles.length > 0 ? `已选 ${labelConfig.sewingFiles.length} 个文件` : '点击上传';
            renderLabelSewingPreviews();
            updateLabelSummary();
        }

        
        // 6. 统一的全局文件上传处理
        function handleLabelFiles(input) {
            const files = Array.from(input.files);
            files.forEach(file => {
                if (file.size > 20 * 1024 * 1024) { showMsg(`文件 ${file.name} 超过 20MB`, 'error'); return; }
                if (!labelConfig.designFiles.some(f => f.name === file.name && f.size === file.size)) {
                    labelConfig.designFiles.push(file);
                }
            });
        
            const nameEl = document.getElementById('labelFileName');
            if (nameEl) nameEl.innerText = labelConfig.designFiles.length > 0 ? `已选 ${labelConfig.designFiles.length} 个文件` : '点击上传 AI / PDF / 高清图';
            
            renderLabelPreviews();
            updateLabelSummary();
            input.value = '';
        }
        
        // 7. 渲染全局预览图 (使用紧凑网格)
        function renderLabelPreviews() {
            const grid = document.getElementById('labelPreview');
            if(!grid) return;
            grid.innerHTML = '';
            
            labelConfig.designFiles.forEach((file, index) => {
                const remote = isRemoteFile(file);
                const isImage = remote ? isImageMime(file.mime) : file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                const shortName = file.name.length > 5 ? file.name.substring(0, 4) + '..' : file.name;
                const src = remote ? remoteFileUrl(file) : URL.createObjectURL(file);
                
                let content = isImage 
                    ? `<img src="${src}" onclick="openOemPreview(this.src, '${file.name}')" style="width:100%;height:100%;object-fit:cover;">` 
                    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:10px;font-weight:bold;border-radius:4px;">${ext}</div>`;
        
                grid.insertAdjacentHTML('beforeend', `
                    <div class="oem-preview-item" style="border-radius:4px;">
                        ${content}
                        <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.5); color:#fff; font-size:8px; padding:1px; text-align:center; white-space:nowrap; overflow:hidden;">${shortName}</div>
                        <button type="button" class="oem-preview-remove" onclick="removeLabelFile(${index})" style="width:16px;height:16px;font-size:12px;">&times;</button>
                    </div>
                `);
            });
        }
        
        // 8. 移除全局文件
        function removeLabelFile(index) {
            labelConfig.designFiles.splice(index, 1);
            const nameEl = document.getElementById('labelFileName');
            if (nameEl) nameEl.innerText = labelConfig.designFiles.length > 0 ? `已选 ${labelConfig.designFiles.length} 个文件` : '点击上传 AI / PDF / 高清图';
            
            renderLabelPreviews();
            updateLabelSummary();
        }

        // ==========================================
        // 标签逻辑：自定义位置图片上传处理
        // ==========================================
        function handleLabelPlacementFiles(input, posType) {
            const files = Array.from(input.files);
            let targetArray = labelConfig.placementFiles[posType];
            
            files.forEach(file => {
                if (file.size > 20 * 1024 * 1024) { showMsg(`文件 ${file.name} 超过 20MB`, 'error'); return; }
                if (!targetArray.some(f => f.name === file.name && f.size === file.size)) {
                    targetArray.push(file);
                }
            });
        
            const nameId = posType === 'top' ? 'labelPlacementTopFileName' : 'labelPlacementBottomFileName';
            const nameEl = document.getElementById(nameId);
            if (nameEl) nameEl.innerText = targetArray.length > 0 ? `已选 ${targetArray.length} 个文件` : '点击上传';
            
            renderLabelPlacementPreviews(posType);
            updateLabelSummary();
            input.value = '';
        }
        
        function renderLabelPlacementPreviews(posType) {
            const gridId = posType === 'top' ? 'labelPlacementTopPreview' : 'labelPlacementBottomPreview';
            const grid = document.getElementById(gridId);
            if (!grid) return;
            grid.innerHTML = '';
            
            const targetArray = labelConfig.placementFiles[posType];
            
            targetArray.forEach((file, index) => {
                const remote = isRemoteFile(file);
                const isImage = remote ? isImageMime(file.mime) : file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                const src = remote ? remoteFileUrl(file) : URL.createObjectURL(file);
                let content = isImage 
                    ? `<img src="${src}" onclick="openOemPreview(this.src, '${file.name}')" style="width:100%;height:100%;object-fit:cover;">` 
                    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:10px;font-weight:bold;border-radius:4px;">${ext}</div>`;
        
                grid.insertAdjacentHTML('beforeend', `
                    <div class="oem-preview-item" style="border-radius:4px;">
                        ${content}
                        <button type="button" class="oem-preview-remove" onclick="removeLabelPlacementFile(${index}, '${posType}')" style="width:16px;height:16px;font-size:12px;">&times;</button>
                    </div>
                `);
            });
        }
        
        function removeLabelPlacementFile(index, posType) {
            let targetArray = labelConfig.placementFiles[posType];
            targetArray.splice(index, 1);
            
            const nameId = posType === 'top' ? 'labelPlacementTopFileName' : 'labelPlacementBottomFileName';
            const nameEl = document.getElementById(nameId);
            if (nameEl) nameEl.innerText = targetArray.length > 0 ? `已选 ${targetArray.length} 个文件` : '点击上传';
            
            renderLabelPlacementPreviews(posType);
            updateLabelSummary();
        }
        
        // 9. 更新侧边栏汇总 (支持部件组合与主/洗水分开提示)
        function updateLabelSummary() {
            const st = document.getElementById('sum-trim-label');
            const isEnabled = document.querySelector('input[name="need_label"][value="yes"]')?.checked;
            
            if (!isEnabled) {
                handleTrimDisabledSummary('label', st);
                return;
            }
        
            // 抓取全局备注文本
            labelConfig.remark = document.getElementById('label-remark')?.value.trim() || '';
            const hasContent = (labelConfig.remark !== '' || labelConfig.designFiles.length > 0) ? _t('✓ 已传稿/内容') : _t('× 待补内容');
        
            if (labelConfig.mode === 'auto') {
                st.innerHTML = `<div style="text-align:right;"><span style="color:#10b981; font-weight:600;">${_t('红绣智能代配')}</span><br><span style="font-size:10px; opacity:0.8;">${_t('内容:')} ${hasContent}</span></div>`;
            } else {
                const sizeVal = document.getElementById('label-custom-size')?.value.trim() || '';
                labelConfig.size = sizeVal;
                
                // 抓取主洗标分开的详细备注
                const splitVal = document.getElementById('label-split-remark')?.value.trim() || '';
                labelConfig.splitRemark = splitVal;
        
                const matText = _t(labelConfig.material);
                let sizeText = '';
                let sewingText = '';
        
                if (labelConfig.material === '其他') {
                    sizeText = _t('尺寸与缝制详见描述');
                } else if (labelConfig.material === '印标') {
                    sizeText = sizeVal ? `${_t('尺寸:')} ${sizeVal}` : _t('尺寸待定');
                } else {
                    sizeText = sizeVal ? `${_t('尺寸:')} ${sizeVal}` : _t('尺寸待定');
                    
                    // 抓取并展示自定义缝制的描述
                    labelConfig.sewingRemark = document.getElementById('label-sewing-remark')?.value.trim() || '';
                    if (labelConfig.method === '其他') {
                        sewingText = labelConfig.sewingRemark ? ` | ${_t('自定义缝制')}` : ` | ${_t('缝制待说明')}`;
                    } else {
                        sewingText = ` | ${_t(labelConfig.method)}`;
                    }
                }
                
                // 组装多个部件的位置文本
                let placementHtml = '';
                const comps = labelConfig.components;
                
                if (comps.includes('上装/连体')) {
                    let pos = labelConfig.placements.top;
                    if (pos === '自定义其他位置') {
                        const customVal = document.getElementById('label-custom-top-text')?.value.trim();
                        pos = customVal ? customVal : _t('其他位置');
                    } else {
                        pos = _t(pos.split(' (')[0]);
                    }
                    placementHtml += `<span style="font-size:10px; opacity:0.8; display:block;">[${_t('上装')}] ${pos}${sewingText}</span>`;
                }
                
                if (comps.includes('下装/裤装')) {
                    let pos = labelConfig.placements.bottom;
                    if (pos === '自定义其他位置') {
                        const customVal = document.getElementById('label-custom-bottom-text')?.value.trim();
                        pos = customVal ? customVal : _t('其他位置');
                    } else {
                        pos = _t(pos.split(' (')[0]);
                    }
                    placementHtml += `<span style="font-size:10px; opacity:0.8; display:block;">[${_t('下装')}] ${pos}${sewingText}</span>`;
                }
        
                // --- 新增：主洗标分开标记 ---
                const splitText = labelConfig.isSplit ? '<span style="color:var(--primary-color);"> [' + _t('主洗标分开') + ']</span>' : '';
        
                st.innerHTML = `
                    <div style="text-align:right;">
                        ${matText}${splitText}<br>
                        ${placementHtml}
                        <span style="font-size:10px; opacity:0.8;">${sizeText} | ${hasContent}</span>
                    </div>`;
            }
            st.style.color = 'var(--primary-color)'; 
            st.style.fontWeight = 'bold';
            validateTrims();
        }

        

        // ==========================================
        // 其他辅料逻辑 (Other Trims)
        // ==========================================
        let otherConfig = {
            remark: '',
            files: []
        };
        
        function handleOtherFiles(input) {
            const files = Array.from(input.files);
            files.forEach(file => {
                if (file.size > 20 * 1024 * 1024) { showMsg(`文件 ${file.name} 超过 20MB`, 'error'); return; }
                if (!otherConfig.files.some(f => f.name === file.name && f.size === file.size)) {
                    otherConfig.files.push(file);
                }
            });
        
            const nameEl = document.getElementById('otherFileName');
            if (otherConfig.files.length > 0) {
                nameEl.innerText = `已选 ${otherConfig.files.length} 个文件`;
                nameEl.style.color = 'var(--primary-color)';
            } else {
                nameEl.innerText = '点击此处上传参考附件';
                nameEl.style.color = '#334155';
            }
        
            renderOtherPreviews();
            updateOtherSummary();
            input.value = ''; // 允许重复上传同名文件
        }
        
        function renderOtherPreviews() {
            const grid = document.getElementById('otherPreview');
            if(!grid) return;
            grid.innerHTML = '';
            otherConfig.files.forEach((file, index) => {
                const remote = isRemoteFile(file);
                const isImage = remote ? isImageMime(file.mime) : file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                const src = remote ? remoteFileUrl(file) : URL.createObjectURL(file);
                
                let content = isImage 
                    ? `<img src="${src}" onclick="openOemPreview(this.src, '${file.name}')">` 
                    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#e2e8f0;color:#475569;font-size:11px;font-weight:bold;border-radius:6px;">${ext}</div>`;
                
                grid.insertAdjacentHTML('beforeend', `
                    <div class="oem-preview-item" style="width:70px; height:70px; border-radius:6px;">
                        ${content}
                        <button type="button" class="oem-preview-remove" onclick="removeOtherFile(${index})">&times;</button>
                    </div>
                `);
            });
        }
        
        function removeOtherFile(index) {
            otherConfig.files.splice(index, 1);
            
            const nameEl = document.getElementById('otherFileName');
            if (otherConfig.files.length > 0) {
                nameEl.innerText = `已选 ${otherConfig.files.length} 个文件`;
                nameEl.style.color = 'var(--primary-color)';
            } else {
                nameEl.innerText = '点击此处上传参考附件';
                nameEl.style.color = '#334155';
            }
            
            renderOtherPreviews();
            updateOtherSummary();
        }
        
        function updateOtherSummary() {
            const st = document.getElementById('sum-trim-other');
            const isEnabled = document.querySelector('input[name="need_other"][value="yes"]').checked;
            
            if (!isEnabled) {
                handleTrimDisabledSummary('other', st);
                return;
            }
        
            otherConfig.remark = document.getElementById('other-remark').value;
            const hasText = otherConfig.remark.trim() !== '';
            const fileCount = otherConfig.files.length;
            
            if (!hasText && fileCount === 0) {
                st.innerHTML = `<span style="color:#f59e0b;">已开启 (待填写需求)</span>`;
                return;
            }
        
            const textStatus = hasText ? _t('有需求描述') : _t('无文字描述');
            const fileStatus = fileCount > 0 ? ` + ${fileCount} ${_t('附件')}` : '';
        
            st.innerHTML = `<div style="text-align:right;">${_t('定制特殊辅料')}<br><span style="font-size:10px; opacity:0.8;">${textStatus}${fileStatus}</span></div>`;
            st.style.color = 'var(--primary-color)'; 
            st.style.fontWeight = 'bold';
            validateTrims();
        }

        // ==========================================
        // 吊牌逻辑 (Hangtag)
        // ==========================================
        let hangtagConfig = {
            mode: 'auto',
            material: '白卡纸',
            weight: '400g',
            shape: '标准修长型 (约 4x9cm)',
            roundedCorner: false,
            crafts: ['无附加工艺'],
            stringType: '常规方块吊粒',
            stringColor: '白色',
            isSet: false,             // 新增：是否为子母牌
            setRemark: '',            // 新增：子母牌详细要求
            designFiles: [],
            shapeFiles: [],
            otherMatFiles: [],
            otherCraftFiles: [],
            stringFiles: []
        };

        // ==========================================
        // 吊牌属性单选逻辑 (处理 A, B, D 的卡片与颜色)
        // ==========================================
        function selectHangtagAttr(attrType, value, el) {
            hangtagConfig[attrType] = value;
            
            const container = el.parentNode;
            container.querySelectorAll('.option-item, .string-color-swatch').forEach(item => {
                item.classList.remove('selected');
            });
            el.classList.add('selected');
        
            // 1. 处理 A 材质 (含面板移动)
            if (attrType === 'material') {
                const weightArea = document.getElementById('hangtag-weight-area');
                
                // 点击前三项显示克重
                const isStandardMat = ['白卡纸', '铜版纸', '牛皮纸'].includes(value);
                if(weightArea) weightArea.classList.toggle('hidden', !isStandardMat);
                
                // 判断是否展开面板
                repositionHangtagPanel(el, 'hangtag-material-grid', 'hangtag-material-other-area', value === '其他');
            }
        
            // 2. 处理 B 形状 (含面板移动)
            if (attrType === 'shape') {
                const isCustom = (value === '尺寸或特殊异形定制');
                
                repositionHangtagPanel(el, 'hangtag-shape-grid', 'hangtag-custom-shape-area', isCustom);
                
                if (isCustom) {
                    const labelRemark = document.getElementById('label-shape-remark');
                    const labelFile = document.getElementById('label-shape-file');
                    if (labelRemark) labelRemark.innerText = "补充尺寸说明 / 异形要求 (必填)";
                    if (labelFile) labelFile.innerText = "刀模图/异形参考 (必填)";
                }
            }
        
            // 3. 处理 D 吊粒类型 (含面板移动)
            if (attrType === 'stringType') {
                const isCustomString = (value === '定制材质与形状');
                repositionHangtagPanel(el, 'hangtag-string-grid', 'hangtag-string-custom-area', isCustomString);
            }
        
            // 4. 处理 D 颜色联动 (保持原地显示，不需使用 Panel)
            if (attrType === 'stringColor') {
                const displayEl = document.getElementById('string-color-name-display');
                if (displayEl) displayEl.innerText = value;
                const colorOtherArea = document.getElementById('hangtag-string-color-other-area');
                if (colorOtherArea) {
                    colorOtherArea.classList.toggle('hidden', value !== '其他');
                    if(value === '其他') setTimeout(() => scrollElementToCenter('hangtag-string-color-other-area'), 50);
                }
            }
            
            updateHangtagSummary();
        }

        // 处理纸张克重选择
        function selectHangtagWeight(val, el) {
            hangtagConfig.weight = val;
            el.parentNode.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
            el.classList.add('selected');
            updateHangtagSummary();
        }

        /**
         * 将指定的元素平滑滚动到滚动容器的中心位置
         * @param {string} elementId 目标元素的ID
         */
        function scrollElementToCenter(elementId) {
            const element = document.getElementById(elementId);
            const scrollContainer = document.querySelector('.config-scroll-area');
            
            if (!element || !scrollContainer) return;
        
            // 获取元素和容器的尺寸/位置信息
            const elementRect = element.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();
        
            // 计算元素相对于容器顶部的位移
            const relativeTop = elementRect.top - containerRect.top;
            
            // 计算居中所需的滚动偏移量：
            // 目标滚动位置 = 当前滚动位置 + 元素相对位置 - (容器高度/2) + (元素高度/2)
            const scrollAmount = relativeTop - (containerRect.height / 2) + (elementRect.height / 2);
        
            // 执行平滑滚动
            scrollContainer.scrollBy({
                top: scrollAmount,
                behavior: 'smooth'
            });
        }

        /**
         * 将指定的元素平滑滚动到滚动容器的顶部附近 (贴近 Stepper 底部)
         * @param {string} elementId 目标元素的ID
         * @param {number} offset 距离顶部的预留间距(px)，用于显示上方的标题
         */
        function scrollElementToTop(elementId, offset = 60) {
            const element = document.getElementById(elementId);
            const scrollContainer = document.querySelector('.config-scroll-area');
            
            if (!element || !scrollContainer) return;
        
            // 获取元素和容器的尺寸与位置信息
            const elementRect = element.getBoundingClientRect();
            const containerRect = scrollContainer.getBoundingClientRect();
        
            // 计算元素相对于容器顶部的位移，并减去 offset 以预留头部空间
            const relativeTop = elementRect.top - containerRect.top;
            
            // 执行平滑滚动
            scrollContainer.scrollBy({
                top: relativeTop - offset,
                behavior: 'smooth'
            });
        }

        // ==========================================
        // 吊牌辅助：通用动态面板展开与移动函数
        // ==========================================
        function repositionHangtagPanel(el, gridId, panelId, show) {
            const grid = document.getElementById(gridId);
            const panel = document.getElementById(panelId);
            if (!grid || !panel || !el) return;
        
            if (!show) {
                panel.classList.add('hidden');
                return;
            }
        
            // 1. DOM 搬运：移动到当前点击行下方
            let insertBeforeNode = null;
            let currentElement = el.nextElementSibling;
            while (currentElement) {
                if (currentElement.id === panelId) { 
                    currentElement = currentElement.nextElementSibling; 
                    continue; 
                }
                if (currentElement.offsetTop > el.offsetTop) { 
                    insertBeforeNode = currentElement; 
                    break; 
                }
                currentElement = currentElement.nextElementSibling;
            }
            
            if (insertBeforeNode) {
                grid.insertBefore(panel, insertBeforeNode);
            } else {
                grid.appendChild(panel);
            }
        
            // 2. 显示面板
            panel.classList.remove('hidden');
        
            // 3. 计算箭头位置与滚动
            setTimeout(() => {
                const arrow = panel.querySelector('.config-arrow');
                if (arrow) {
                    const arrowPos = el.getBoundingClientRect().left - panel.getBoundingClientRect().left + (el.getBoundingClientRect().width / 2) - 8;
                    arrow.style.left = `${arrowPos}px`;
                }
                scrollElementToCenter(panelId);
            }, 50);
        }

        // ==========================================
        // 吊牌 C 区域工艺多选逻辑 (完美互斥与兜底版)
        // ==========================================
        function toggleHangtagCraft(val, el) {
            const grid = el.closest('.option-grid');
            if (!grid) return;
            
            // 获取网格内所有的选项卡片
            const allCards = Array.from(grid.querySelectorAll('.option-item'));
            
            // 智能查找代表“无附加工艺”的卡片DOM (通过文本匹配)
            const noneCard = allCards.find(card => (card.getAttribute('onclick') || '').includes('无附加工艺'));
        
            if (!hangtagConfig.crafts) hangtagConfig.crafts = ['无附加工艺'];
            let arr = hangtagConfig.crafts;
        
            if (val === '无附加工艺') {
                // 1. 如果点击了“无附加”，进入排他逻辑
                arr = ['无附加工艺']; // 数据重置
                allCards.forEach(card => card.classList.remove('selected')); // UI 全部熄灭
                el.classList.add('selected'); // 仅点亮自己
            } else {
                // 2. 如果点击了其他工艺，进入多选逻辑
                
                // 首先，检查数据中是否还有“无附加”，有则剔除
                const noneIdx = arr.indexOf('无附加工艺');
                if (noneIdx > -1) {
                    arr.splice(noneIdx, 1);
                }
                // 强制熄灭UI上的“无附加”卡片
                if (noneCard) noneCard.classList.remove('selected');
        
                // 处理当前点击项的选中/取消
                const currentIdx = arr.indexOf(val);
                if (currentIdx > -1) {
                    arr.splice(currentIdx, 1); // 已选中则移除
                    el.classList.remove('selected');
                } else {
                    arr.push(val); // 未选中则添加
                    el.classList.add('selected');
                }
        
                // 3. 兜底逻辑：如果用户取消了所有工艺，默认退回“无附加工艺”状态
                if (arr.length === 0) {
                    arr = ['无附加工艺'];
                    if (noneCard) noneCard.classList.add('selected');
                }
            }
        
            hangtagConfig.crafts = arr;
            
            // 联动控制“其他”面板的显隐与移动
            const needsOtherArea = arr.includes('其他');
            const otherEl = allCards.find(c => (c.getAttribute('onclick') || '').includes("'其他'"));
            
            // 如果选中了“其他”，就把配置面板挂载到“其他”卡片所在行的下方
            if (otherEl) {
                repositionHangtagPanel(otherEl, 'hangtag-craft-grid', 'hangtag-craft-other-area', needsOtherArea);
            }
        
            updateHangtagSummary(); // 更新侧边栏
        }


        // 控制子母牌区域显隐
        function toggleHangtagSet(checked) {
            hangtagConfig.isSet = checked;
            const area = document.getElementById('hangtag-set-detail-area');
            if (area) {
                area.classList.toggle('hidden', !checked);
                if (checked) {
                    // 平滑滚动到输入框
                    setTimeout(() => scrollElementToCenter('hangtag-set-detail-area'), 50);
                }
            }
            updateHangtagSummary();
        }

        function toggleHangtagRoundCorner(checked) {
            hangtagConfig.roundedCorner = checked;
            updateHangtagSummary();
        }

        // 修改文件处理函数，支持 string 类型
        function handleHangtagFiles(input, type) {
            const files = Array.from(input.files);
            let targetArray, nameId;
        
            if (type === 'design') { targetArray = hangtagConfig.designFiles; nameId = 'hangtagFileName'; }
            else if (type === 'shape') { targetArray = hangtagConfig.shapeFiles; nameId = 'hangtagShapeFileName'; }
            else if (type === 'material') { targetArray = hangtagConfig.otherMatFiles; nameId = 'hangtagMatFileName'; }
            else if (type === 'craft') { targetArray = hangtagConfig.otherCraftFiles; nameId = 'hangtagCraftFileName'; }
            else if (type === 'string') { targetArray = hangtagConfig.stringFiles; nameId = 'stringCustomFileName'; } // 新增
        
            files.forEach(file => {
                if (!targetArray.some(f => f.name === file.name)) targetArray.push(file);
            });
        
            const nameEl = document.getElementById(nameId);
            if (nameEl) nameEl.innerText = `已选 ${targetArray.length} 个文件`;
            
            renderHangtagPreviews(type);
            updateHangtagSummary();
            input.value = '';
        }

        function renderHangtagPreviews(type) {
            // 1. 映射 type 到 HTML 预览容器的 ID
            const gridMap = {
                'design': 'hangtagPreview',
                'shape': 'hangtagShapePreview',
                'material': 'hangtagMatPreview',
                'craft': 'hangtagCraftPreview',
                'string': 'stringCustomPreview' // 新增：吊粒定制预览容器
            };
            
            const gridId = gridMap[type];
            const grid = document.getElementById(gridId);
            if (!grid) return;
            
            grid.innerHTML = '';
            
            // 2. 匹配对应的数据源数组
            let actualFiles = [];
            if(type === 'design') actualFiles = hangtagConfig.designFiles;
            else if(type === 'shape') actualFiles = hangtagConfig.shapeFiles;
            else if(type === 'material') actualFiles = hangtagConfig.otherMatFiles;
            else if(type === 'craft') actualFiles = hangtagConfig.otherCraftFiles;
            else if(type === 'string') actualFiles = hangtagConfig.stringFiles; // 新增：指向吊粒文件数组
        
            // 3. 遍历并生成预览 HTML
            actualFiles.forEach((file, index) => {
                const remote = isRemoteFile(file);
                const isImage = remote ? isImageMime(file.mime) : file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                
                // 创建预览内容
                let previewContent = '';
                if (isImage) {
                    // 生成临时预览 URL
                    const url = remote ? remoteFileUrl(file) : URL.createObjectURL(file);
                    previewContent = `<img src="${url}" onclick="openOemPreview(this.src, '${file.name}')" style="cursor:zoom-in;">`;
                } else {
                    // 非图片文件显示图标
                    previewContent = `
                        <div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f1f5f9; color:#64748b; border-radius:6px;">
                            <span style="font-size:10px; font-weight:800; margin-bottom:2px;">${ext}</span>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
                        </div>`;
                }
        
                grid.insertAdjacentHTML('beforeend', `
                    <div class="oem-preview-item" id="preview-tag-${type}-${index}">
                        ${previewContent}
                        <div style="position:absolute; bottom:0; left:0; right:0; background:rgba(0,0,0,0.4); color:#fff; font-size:8px; padding:2px; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${file.name}</div>
                        <button type="button" class="oem-preview-remove" onclick="removeHangtagFile(${index}, '${type}')">&times;</button>
                    </div>
                `);
            });
        }


        function removeHangtagFile(index, type) {
            // 1. 获取正确的数据数组
            let targetArray;
            if(type === 'design') targetArray = hangtagConfig.designFiles;
            else if(type === 'shape') targetArray = hangtagConfig.shapeFiles;
            else if(type === 'material') targetArray = hangtagConfig.otherMatFiles;
            else if(type === 'craft') targetArray = hangtagConfig.otherCraftFiles;
            else if(type === 'string') targetArray = hangtagConfig.stringFiles; // 新增：操作吊粒数组
        
            // 2. 执行删除
            if (targetArray) {
                targetArray.splice(index, 1);
            }
            
            // 3. 更新界面上的“已选 X 个文件”提示文字
            const nameMap = {
                'design': 'hangtagFileName',
                'shape': 'hangtagShapeFileName',
                'material': 'hangtagMatFileName',
                'craft': 'hangtagCraftFileName',
                'string': 'stringCustomFileName' // 新增：吊粒上传按钮文字ID
            };
            
            const nameEl = document.getElementById(nameMap[type]);
            if (nameEl) {
                if (targetArray.length > 0) {
                    nameEl.innerText = `已选 ${targetArray.length} 个文件`;
                } else {
                    // 恢复默认提示
                    const defaultTextMap = {
                        'design': '点击上传 AI / PDF / 高清图',
                        'string': '点击上传',
                        'default': '点击上传参考文件'
                    };
                    nameEl.innerText = defaultTextMap[type] || defaultTextMap['default'];
                }
            }
            
            // 4. 重新渲染
            renderHangtagPreviews(type);
            updateHangtagSummary();
        }


        function updateHangtagSummary() {
            const st = document.getElementById('sum-trim-hangtag');
            const isEnabled = document.querySelector('input[name="need_hangtag"][value="yes"]').checked;
            
            if (!isEnabled) {
                handleTrimDisabledSummary('hangtag', st);
                return;
            }
        
            if (hangtagConfig.mode === 'auto') {
                const hasFile = hangtagConfig.designFiles.length > 0 ? _t('✓ 已传稿') : _t('× 待传稿');
                st.innerHTML = `<div style="text-align:right;"><span style="color:#10b981; font-weight:600;">${_t('红绣智能代配')}</span><br><span style="font-size:10px; opacity:0.8;">${_t('设计稿:')} ${hasFile}</span></div>`;
            } else {
                // 1. 材质与克重
                let matDisplay = _t(hangtagConfig.material.split(' ')[0]);
                if (!['其他'].includes(hangtagConfig.material)) {
                    matDisplay += ` (${hangtagConfig.weight})`;
                }
        
                // 2. 子母牌标记
                const setText = hangtagConfig.isSet ? '<span style="color:var(--primary-color);"> [' + _t('子母牌') + ']</span>' : '';
        
                // 3. 工艺多选处理
                const craftDisplay = hangtagConfig.crafts.map(c => _t(c)).join(', ');
        
                // 4. 颜色处理
                let colorDisplay = _t(hangtagConfig.stringColor);
                if (colorDisplay === '其他' || hangtagConfig.stringColor === '其他') {
                    const val = document.getElementById('hangtag-string-color-other')?.value.trim();
                    colorDisplay = val ? val : _t('其他色');
                }

                // 5. 吊粒类型精简提取 (修复点：将类型真正显示出来)
                let stringTypeDisplay = hangtagConfig.stringType;
                if (stringTypeDisplay.includes('方块')) stringTypeDisplay = _t('方块');
                else if (stringTypeDisplay.includes('子弹头')) stringTypeDisplay = _t('子弹头');
                else if (stringTypeDisplay.includes('定制')) stringTypeDisplay = _t('定制');
        
                const shapeDisplay = _t(hangtagConfig.shape.split(' ')[0]);
                st.innerHTML = `
                    <div style="text-align:right;">
                        ${matDisplay}${setText} | ${shapeDisplay}${hangtagConfig.roundedCorner ? ' [' + _t('圆角') + ']' : ''}<br>
                        <span style="font-size:10px; opacity:0.8;">${_t('工艺')}: ${craftDisplay}</span><br>
                        <span style="font-size:10px; opacity:0.8;">${_t('吊粒')}: ${colorDisplay} | ${stringTypeDisplay}</span>
                    </div>`;
            }
            st.style.color = 'var(--primary-color)';
            st.style.fontWeight = 'bold';
            validateTrims();
        }


        // ==========================================
        // 罩杯/胸垫逻辑 (Pads)
        // ==========================================
        
        function switchPadMode(mode) {
            padConfig.mode = mode;
            document.getElementById('pad-mode-auto').classList.toggle('active', mode === 'auto');
            document.getElementById('pad-mode-custom').classList.toggle('active', mode === 'custom');
            
            const autoHint = document.getElementById('pad-auto-hint');
            const customDetails = document.getElementById('pad-custom-details');
            
            if (mode === 'auto') {
                if(autoHint) autoHint.classList.remove('hidden');
                if(customDetails) customDetails.classList.add('hidden');
            } else {
                if(autoHint) autoHint.classList.add('hidden');
                if(customDetails) customDetails.classList.remove('hidden');
                setTimeout(() => scrollElementToTop('pad-mode-custom', 60), 50);
            }
            updatePadSummary();
        }

        function togglePadCustomShape(checked) {
            padConfig.customShape = checked;
            const customArea = document.getElementById('pad-shape-custom-area');
            if (customArea) {
                customArea.classList.toggle('hidden', !checked);
                if (checked) {
                    setTimeout(() => scrollElementToCenter('pad-shape-custom-area'), 50);
                } else {
                    const remarkEl = document.getElementById('pad-shape-remark');
                    if (remarkEl) remarkEl.value = '';
                }
            }
            updatePadSummary();
        }

        function selectPadAttr(attr, value, el) {
            padConfig[attr] = value;
            
            // 处理排他选中态
            const parent = el.parentNode;
            let itemSelector = attr === 'color' ? '.pad-color' : '.pad-thick';
            parent.querySelectorAll(itemSelector).forEach(c => c.classList.remove('selected'));
            el.classList.add('selected');
            
            // 颜色的特殊处理
            if (attr === 'color') {
                const display = document.getElementById('pad-color-display');
                if (display) display.innerText = value;
                
                const otherArea = document.getElementById('pad-color-other-area');
                if (otherArea) {
                    otherArea.classList.toggle('hidden', value !== '其他定制色');
                    if (value === '其他定制色') {
                        setTimeout(() => scrollElementToCenter('pad-color-other-area'), 50);
                    }
                }
            }
            
            updatePadSummary();
        }

        // 处理胸垫文件上传 (shape / other)
        function handlePadFiles(input, type) {
            const files = Array.from(input.files);
            let targetArray = type === 'shape' ? padConfig.shapeFiles : padConfig.otherFiles;
            let nameId = type === 'shape' ? 'padShapeFileName' : 'padOtherFileName';
            
            files.forEach(file => {
                if (file.size > 20 * 1024 * 1024) { showMsg(`文件 ${file.name} 超过 20MB`, 'error'); return; }
                if (!targetArray.some(f => f.name === file.name && f.size === file.size)) {
                    targetArray.push(file);
                }
            });
            
            const nameEl = document.getElementById(nameId);
            if (nameEl) nameEl.innerText = targetArray.length > 0 ? `已选 ${targetArray.length} 个文件` : '点击上传';
            
            renderPadPreviews(type);
            updatePadSummary();
            input.value = '';
        }

        function renderPadPreviews(type) {
            const gridId = type === 'shape' ? 'padShapePreview' : 'padOtherPreview';
            const grid = document.getElementById(gridId);
            if(!grid) return;
            grid.innerHTML = '';
            
            const targetArray = type === 'shape' ? padConfig.shapeFiles : padConfig.otherFiles;
            
            targetArray.forEach((file, index) => {
                const remote = isRemoteFile(file);
                const isImage = remote ? isImageMime(file.mime) : file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                const src = remote ? remoteFileUrl(file) : URL.createObjectURL(file);
                
                let content = isImage 
                    ? `<img src="${src}" onclick="openOemPreview(this.src, '${file.name}')" style="width:100%;height:100%;object-fit:cover;">` 
                    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:10px;font-weight:bold;">${ext}</div>`;
                    
                grid.insertAdjacentHTML('beforeend', `
                    <div class="oem-preview-item" style="border-radius:4px;">
                        ${content}
                        <button type="button" class="oem-preview-remove" onclick="removePadFile(${index}, '${type}')" style="width:16px;height:16px;font-size:12px;">&times;</button>
                    </div>
                `);
            });
        }

        function removePadFile(index, type) {
            let targetArray = type === 'shape' ? padConfig.shapeFiles : padConfig.otherFiles;
            let nameId = type === 'shape' ? 'padShapeFileName' : 'padOtherFileName';
            
            targetArray.splice(index, 1);
            
            const nameEl = document.getElementById(nameId);
            if (nameEl) nameEl.innerText = targetArray.length > 0 ? `已选 ${targetArray.length} 个文件` : '点击上传';
            
            renderPadPreviews(type);
            updatePadSummary();
        }

        function updatePadSummary() {
            const st = document.getElementById('sum-trim-pad');
            const isEnabled = document.querySelector('input[name="need_pad"][value="yes"]')?.checked;
            
            if (!isEnabled) {
                handleTrimDisabledSummary('pad', st);
                return;
            }

            if (padConfig.mode === 'auto') {
                st.innerHTML = `<div style="text-align:right;"><span style="color:#10b981; font-weight:600;">红绣智能代配</span><br><span style="font-size:10px; opacity:0.8;">自动适配版型 | 轻薄自然</span></div>`;
            } else {
                // 抓取文本数据
                padConfig.shapeRemark = document.getElementById('pad-shape-remark')?.value.trim() || '';
                padConfig.remark = document.getElementById('pad-remark')?.value.trim() || '';
                padConfig.otherColor = document.getElementById('pad-color-other')?.value.trim() || '';
                
                let colorText = padConfig.color.split(' ')[0];
                if (padConfig.color === '其他定制色') {
                    const val = document.getElementById('pad-color-other')?.value.trim();
                    colorText = val ? val : '其他定制色';
                }
                
                const thickText = padConfig.thickness.split(' ')[0];
                const shapeText = padConfig.customShape ? '<span style="color:var(--primary-color);">[异形开模]</span>' : '';
                const hasFileOrRemark = (padConfig.remark || padConfig.otherFiles.length > 0) ? '+特殊诉求' : '';
                
                st.innerHTML = `
                    <div style="text-align:right;">
                        ${thickText} | ${colorText} ${shapeText}<br>
                        <span style="font-size:10px; opacity:0.8;">匹配成衣版型 ${hasFileOrRemark}</span>
                    </div>`;
            }
            st.style.color = 'var(--primary-color)'; 
            st.style.fontWeight = 'bold';
            validateTrims();
        }


        // ==========================================
        // 金属饰品逻辑
        // ==========================================
        let metalConfig = {
            mode: 'auto', // 新增：默认智能代配
            finish: '亮金色',
            activeCategory: '', // 当前正在编辑的分类名
            details: {},
            categories: [],
            logoCustom: false,
            logoTypes: [], // 新增多选类型数组
            logoFiles: [],
            sourceFiles: []
        };

        function switchMetalMode(mode) {
            metalConfig.mode = mode;
            
            // 切换按钮样式
            document.getElementById('metal-mode-auto').classList.toggle('active', mode === 'auto');
            document.getElementById('metal-mode-custom').classList.toggle('active', mode === 'custom');
            
            // 切换内容显隐
            const autoHint = document.getElementById('metal-auto-hint');
            const customDetails = document.getElementById('metal-custom-details');
            
            if (mode === 'auto') {
                if(autoHint) autoHint.classList.remove('hidden');
                if(customDetails) customDetails.classList.add('hidden');
            } else {
                if(autoHint) autoHint.classList.add('hidden');
                if(customDetails) customDetails.classList.remove('hidden');
                
                // 向上滚动，将 Switcher 停留在 Stepper 底部
                setTimeout(() => {
                    scrollElementToTop('metal-mode-custom', 60);
                }, 50);
            }
            
            updateMetalSummary();
        }

        function toggleMetalLogoType(type, el) {
            const index = metalConfig.logoTypes.indexOf(type);
            if (index > -1) {
                metalConfig.logoTypes.splice(index, 1);
                el.classList.remove('selected');
            } else {
                metalConfig.logoTypes.push(type);
                el.classList.add('selected');
            }
            updateMetalSummary();
        }

        // 处理金属饰品文件上传 (参照 OEM 逻辑)
        function handleMetalFiles(input, type) {
            const files = Array.from(input.files);
            const targetArray = type === 'logo' ? metalConfig.logoFiles : metalConfig.sourceFiles;
            
            files.forEach(file => {
                if (file.size > 20 * 1024 * 1024) { showToast(`文件 ${file.name} 超过 20MB`, 'error'); return; }
                // 防止重复上传同一文件
                if (!targetArray.some(f => f.name === file.name && f.size === file.size)) {
                    targetArray.push(file);
                }
            });

            if (type === 'logo') {
                const nameEl = document.getElementById('metalLogoFileName');
                if (targetArray.length > 0) {
                    nameEl.innerText = targetArray.length === 1 ? targetArray[0].name : `已选 ${targetArray.length} 个文件`;
                    nameEl.style.color = 'var(--text-main)';
                } else {
                    nameEl.innerText = '未选择文件';
                    nameEl.style.color = '#94a3b8';
                }
            }
            
            renderMetalPreviews(type);
            updateMetalSummary();
            input.value = ''; // 清空 input 允许重复上传
        }

        // 渲染预览图
        function renderMetalPreviews(type) {
            const grid = document.getElementById(type === 'logo' ? 'metalLogoPreview' : 'metalSourcePreview');
            const files = type === 'logo' ? metalConfig.logoFiles : metalConfig.sourceFiles;
            grid.innerHTML = '';

            files.forEach((file, index) => {
                const remote = isRemoteFile(file);
                const isImage = remote ? isImageMime(file.mime) : file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                
                let content = '';
                if (isImage) {
                    const url = remote ? remoteFileUrl(file) : URL.createObjectURL(file);
                    content = `<img src="${url}" onclick="openOemPreview('${url}', '${file.name}')">`;
                } else {
                    content = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:10px;font-weight:bold;">${ext}</div>`;
                }

                grid.insertAdjacentHTML('beforeend', `
                    <div class="oem-preview-item" style="width:60px; height:60px;">
                        ${content}
                        <button type="button" class="oem-preview-remove" onclick="removeMetalFile('${type}', ${index})">&times;</button>
                    </div>
                `);
            });
        }

        function removeMetalFile(type, index) {
            const targetArray = type === 'logo' ? metalConfig.logoFiles : metalConfig.sourceFiles;
            targetArray.splice(index, 1);
            
            if (type === 'logo') {
                const nameEl = document.getElementById('metalLogoFileName');
                if (targetArray.length > 0) {
                    nameEl.innerText = targetArray.length === 1 ? targetArray[0].name : `已选 ${targetArray.length} 个文件`;
                } else {
                    nameEl.innerText = '未选择文件';
                    nameEl.style.color = '#94a3b8';
                }
            }
            
            renderMetalPreviews(type);
            updateMetalSummary();
        }

        function selectMetalAttr(attrType, value, el) {
            metalConfig[attrType] = value;
            const container = el.parentNode;
            container.querySelectorAll('.finish-item').forEach(item => item.classList.remove('selected'));
            el.classList.add('selected');
            updateMetalSummary();
        }

        // 2. 修改点击卡片的显示逻辑
        function toggleMetalCategory(catName, el) {
            const panel = document.getElementById('metal-config-panel');
            const grid = document.getElementById('metal-category-grid');
            
            if (!metalConfig.details[catName]) {
                metalConfig.details[catName] = { remark: '', styleFiles: [], logoNeeded: false, logoFiles: [] };
            }
        
            if (!metalConfig.categories.includes(catName)) {
                metalConfig.categories.push(catName);
                el.classList.add('selected');
                
                // --- 核心修复：增加安全性判断 ---
                const xBtn = el.querySelector('.file-remove');
                if (xBtn) xBtn.style.display = 'flex';
            }
            
            if (metalConfig.activeCategory === catName && !panel.classList.contains('hidden')) {
                panel.classList.add('hidden');
                return;
            }
        
            switchMetalPanelFocus(catName, el, grid, panel);
        }
        
        // 提取的辅助函数：用于移动和展开面板
        function switchMetalPanelFocus(catName, el, grid, panel) {
            metalConfig.activeCategory = catName;
        
            // 搬运面板到当前行下方
            let insertBeforeNode = null;
            let currentElement = el.nextElementSibling;
            while (currentElement) {
                if (currentElement.id === 'metal-config-panel') { currentElement = currentElement.nextElementSibling; continue; }
                if (currentElement.offsetTop > el.offsetTop) { insertBeforeNode = currentElement; break; }
                currentElement = currentElement.nextElementSibling;
            }
            if (insertBeforeNode) grid.insertBefore(panel, insertBeforeNode);
            else grid.appendChild(panel);
        
            // 填充面板数据
            loadMetalPanelData(catName);
            panel.classList.remove('hidden');
            
                // 调整箭头位置并平滑滚动
            setTimeout(() => {
                const arrow = panel.querySelector('.config-arrow');
                const arrowPos = el.getBoundingClientRect().left - panel.getBoundingClientRect().left + (el.getBoundingClientRect().width / 2) - 8;
                arrow.style.left = `${arrowPos}px`;
                
                // --- 新增滚动居中逻辑 ---
                const scrollArea = document.querySelector('.config-scroll-area');
                const header = panel.querySelector('.config-header');
                if (scrollArea && header) {
                    const scrollAreaRect = scrollArea.getBoundingClientRect();
                    const headerRect = header.getBoundingClientRect();
                    const scrollAmount = headerRect.top - scrollAreaRect.top - 80;
                    scrollArea.scrollBy({ top: scrollAmount, behavior: 'smooth' });
                }
            }, 50);
        }
        
        // 新增：一键清空所有金属明细的函数
        function clearMetalCustomDetails() {
            // 1. 清空数据
            metalConfig.categories = [];
            metalConfig.details = {};
            metalConfig.activeCategory = '';
            
            // 2. 隐藏面板与取消 UI 选中态（含 x 角标）
            document.getElementById('metal-config-panel').classList.add('hidden');
            document.querySelectorAll('#metal-category-grid .metal-item').forEach(item => {
                item.classList.remove('selected');
                const xBtn = item.querySelector('.file-remove');
                if (xBtn) xBtn.style.display = 'none';
            });
            
            // 3. 更新右侧侧边栏汇总
            updateMetalSummary();
        }

        
        // 2. 加载特定分类的数据到面板 UI
        function loadMetalPanelData(catName) {
            const data = metalConfig.details[catName];
            document.getElementById('metal-active-title').innerText = `配置：${catName}`;
            document.getElementById('metal-item-remark').value = data.remark;
            document.getElementById('metal-item-logo-check').checked = data.logoNeeded;
            document.getElementById('metal-item-logo-box').classList.toggle('hidden', !data.logoNeeded);
            
            renderMetalItemPreviews(catName, 'style');
            renderMetalItemPreviews(catName, 'logo');
            updateMetalSummary();
        }
        
        // 3. 实时同步输入框数据
        function updateMetalItemData() {
            const cat = metalConfig.activeCategory;
            if (!cat) return;
            metalConfig.details[cat].remark = document.getElementById('metal-item-remark').value;
            updateMetalSummary();
        }
        
        function toggleMetalLogoArea(checked) {
            const cat = metalConfig.activeCategory;
            if (!cat) return;
            metalConfig.details[cat].logoNeeded = checked;
            document.getElementById('metal-item-logo-box').classList.toggle('hidden', !checked);
            updateMetalSummary();
        }
        
        // 4. 处理文件上传 (适配各分类独立存储)
        function handleMetalItemFiles(input, type) {
            const cat = metalConfig.activeCategory;
            if (!cat) return;
            const files = Array.from(input.files);
            const targetArr = (type === 'logo') ? metalConfig.details[cat].logoFiles : metalConfig.details[cat].styleFiles;
        
            files.forEach(file => {
                // 加个文件大小限制防呆
                if (file.size > 20 * 1024 * 1024) { showMsg(`文件 ${file.name} 超过 20MB`, 'error'); return; }
                if (!targetArr.some(f => f.name === file.name)) targetArr.push(file);
            });
            
            renderMetalItemPreviews(cat, type);
            updateMetalSummary();
            
            // 核心修复：必须清空 input 的值，否则切换面板后无法触发 onchange 事件
            input.value = '';
        }

        // 1. 彻底删除分类的逻辑
        function removeMetalCategory(catName, event) {
            event.stopPropagation(); 
            // 已删除 confirm 提醒
        
            const index = metalConfig.categories.indexOf(catName);
            if (index > -1) metalConfig.categories.splice(index, 1);
            delete metalConfig.details[catName];
        
            const card = document.querySelector(`.metal-item[data-cat="${catName}"]`);
            if (card) {
                card.classList.remove('selected');
                // 安全性检查：只有找到元素才修改 style
                const xBtn = card.querySelector('.file-remove');
                if (xBtn) xBtn.style.display = 'none';
            }
        
            document.getElementById('metal-config-panel').classList.add('hidden');
            updateMetalSummary();
        }

        // 3. 修复预览图渲染 (去除固定 width)
        function renderMetalItemPreviews(cat, type) {
            const data = metalConfig.details[cat];
            const grid = document.getElementById(type === 'logo' ? 'metalItemLogoPreview' : 'metalItemStylePreview');
            if (!grid) return;
            grid.innerHTML = '';
            
            const files = (type === 'logo') ? data.logoFiles : data.styleFiles;
            files.forEach((file, index) => {
                const remote = isRemoteFile(file);
                const isImage = remote ? isImageMime(file.mime) : file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                const src = remote ? remoteFileUrl(file) : URL.createObjectURL(file);
                
                // 核心修复：如果是图片就渲染 img，否则渲染格式方块
                const content = isImage 
                    ? `<img src="${src}" onclick="openOemPreview(this.src, '${file.name}')">` 
                    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:10px;font-weight:bold;border-radius:4px;border:1px solid #e2e8f0;">${ext}</div>`;
        
                grid.insertAdjacentHTML('beforeend', `
                    <div class="oem-preview-item">
                        ${content}
                        <button type="button" class="oem-preview-remove" onclick="removeMetalItemFile('${cat}', '${type}', ${index})">&times;</button>
                    </div>`);
            });
        }
        
        function removeMetalItemFile(cat, type, index) {
            const targetArr = (type === 'logo') ? metalConfig.details[cat].logoFiles : metalConfig.details[cat].styleFiles;
            targetArr.splice(index, 1);
            renderMetalItemPreviews(cat, type);
            updateMetalSummary();
        }

        function updateMetalSummary() {
            const st = document.getElementById('sum-trim-metal');
            const isMetalEnabled = document.querySelector('input[name="need_metal"][value="yes"]').checked;
            
            if (!isMetalEnabled) {
                handleTrimDisabledSummary('metal', st);
                return;
            }
        
            const colorPart = metalConfig.finish.split(' ')[0];
            
            if (metalConfig.mode === 'auto') {
                // 代配模式下的精简汇总
                st.innerHTML = `<div style="text-align:right;">${colorPart}<br><span style="font-size:10px; color:#10b981; font-weight:600;">红绣智能代配</span></div>`;
            } else {
                const selectedCats = metalConfig.categories;
                if (selectedCats.length === 0) {
                    st.innerHTML = `<div style="text-align:right;">${colorPart}<br><span style="font-size:10px; color:#94a3b8;">待选择饰品</span></div>`;
                } else {
                    const detailText = selectedCats.map(c => {
                        const hasCustom = metalConfig.details[c].logoNeeded || metalConfig.details[c].styleFiles.length > 0;
                        return `<span style="font-size:10px; display:block;">- ${c}${hasCustom ? ' (已定制)' : ''}</span>`;
                    }).join('');
                    st.innerHTML = `<div style="text-align:right;">${colorPart}<br>${detailText}</div>`;
                }
            }
            validateTrims();
        }

        // 扩展 bagConfig 数据结构
        let bagConfig = { 
            material: '未选材质', 
            size: '未选尺寸', 
            print: '空白无印', 
            crafts: [], 
            designFiles: [] 
        };
        
        function renderBags(bags) {
            const container = document.getElementById('bag-list-container'); container.innerHTML = ''; 
            bags.forEach(bag => {
                const bagJson = JSON.stringify(bag).replace(/"/g, '&quot;');
                const imgHtml = (bag.image_urls && bag.image_urls.length > 0) 
                    ? `<img src="${bag.image_urls[0]}" class="option-img" loading="lazy">`
                    : `<div style="width:100%; aspect-ratio:1/1; background:#f8fafc; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:12px;">[暂无预览图]</div>`;

                // 简单的环保标识正则匹配
                const isEco = /环保|降解|回收|eco|biodegradable|recycled/i.test(bag.name + bag.description);
                const ecoBadge = isEco ? `<div class="eco-badge"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"/><path d="M16 8l-5.5 5.5L8 11"/></svg> ECO</div>` : '';

                container.insertAdjacentHTML('beforeend', `
                    <div class="option-item bag-material" onclick="onBagClick(${bagJson}, this)">
                        ${ecoBadge}
                        <div class="details-btn" onclick="event.stopPropagation(); openDetailModal(${bagJson})" title="查看详情">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        </div>
                        ${imgHtml}
                        <div class="option-info">
                            <h4>${(window.__lang === 'en' && bag.name_en) ? bag.name_en : bag.name}</h4>
                        </div>
                    </div>
                `);
            });
        }

        function onBagClick(bag, el) { 
            const panel = document.getElementById('bag-config-panel');
            const gridContainer = document.getElementById('bag-list-container');
            
            // 1. 处理面板折叠逻辑
            if (bagConfig.material === bag.name && !panel.classList.contains('hidden')) {
                panel.classList.add('hidden');
                return;
            }
        
            // 2. 选择当前材质并更新 UI 状态
            bagConfig.material = bag.name;
            bagConfig.materialEn = bag.name_en || bag.name;
            gridContainer.querySelectorAll('.bag-material').forEach(item => item.classList.remove('selected'));
            el.classList.add('selected');
        
            // 3. 动态计算 DOM 插入位置 (实现与面料/标签一致的换行下方展开)
            let insertBeforeNode = null;
            let currentElement = el.nextElementSibling;
            while (currentElement) {
                if (currentElement.id === 'bag-config-panel') { 
                    currentElement = currentElement.nextElementSibling; 
                    continue; 
                }
                // 检测换行：如果下一个元素的 top 坐标大于当前元素，说明它在下一行
                if (currentElement.offsetTop > el.offsetTop) { 
                    insertBeforeNode = currentElement; 
                    break; 
                }
                currentElement = currentElement.nextElementSibling;
            }
            
            if (insertBeforeNode) {
                gridContainer.insertBefore(panel, insertBeforeNode);
            } else {
                gridContainer.appendChild(panel);
            }
        
            // 4. 显示面板并渲染尺寸
            panel.classList.remove('hidden');
            
            // 核心修复：兼容取值单复数，并兼容纯字符串和数组
            let rawSizes = bag.size || bag.sizes || bag['尺寸'] || [];
            if (typeof rawSizes === 'string') {
                rawSizes = rawSizes.split(',').map(s => s.trim());
            }
            renderBagSizes(rawSizes);
            
            // 默认选中“红绣推荐”
            
            // 默认选中“红绣推荐”
            setTimeout(() => {
                const recommendCard = document.querySelector('.bag-size-card[onclick*="红绣推荐"]');
                if (recommendCard) recommendCard.click();
            }, 100);
        
            // 5. 调整面板小箭头位置
            setTimeout(() => {
                const arrow = panel.querySelector('.config-arrow');
                if (arrow) {
                    const arrowPos = el.getBoundingClientRect().left - panel.getBoundingClientRect().left + (el.getBoundingClientRect().width / 2) - 8;
                    arrow.style.left = `${arrowPos}px`;
                }
                // 滚动居中
                scrollElementToCenter('bag-config-panel');
            }, 50);
        
            updateBagSummary(); 
        }

        // 渲染包装袋尺寸选项 (修复内联样式覆盖问题)
        function renderBagSizes(sizes) {
            const container = document.getElementById('bag-size-container'); 
            if(!container) return;
            container.innerHTML = ''; 
            
            // 1. 增加“红绣推荐”卡片 (去除干扰的 inline style)
            container.insertAdjacentHTML('beforeend', `
                <div class="bag-size-card bag-size" onclick="selectBagAttr('size', '红绣推荐', this)">
                    <div class="size-val" style="font-size: 15px;">由红绣推荐</div>
                    <div class="size-scene">根据款式自动匹配</div>
                </div>
            `);
        
            // 2. 动态渲染具体尺寸
            if (sizes && sizes.length > 0) {
                sizes.forEach(size => {
                    let sceneDesc = _t("适配常规衣物");
                    const match = size.match(/(\d+)/);
                    if (match) {
                        const width = parseInt(match[1]);
                        if (width < 25) sceneDesc = _t("适合内衣/泳装/小配件");
                        else if (width >= 25 && width <= 32) sceneDesc = _t("适合常规T恤/背心");
                        else if (width > 32) sceneDesc = _t("适合卫衣/长裤/外套");
                    }
                    container.insertAdjacentHTML('beforeend', `
                        <div class="bag-size-card bag-size" onclick="selectBagAttr('size', '${size}', this)">
                            <div class="size-val">${size}</div>
                            <div class="size-scene">${sceneDesc}</div>
                        </div>
                    `);
                });
            }
            
            // 3. 增加“自定义尺寸”卡片
            container.insertAdjacentHTML('beforeend', `
                <div class="bag-size-card bag-size" onclick="selectBagAttr('size', '自定义尺寸', this)">
                    <div class="size-val" style="color:#64748b;">${_t('自定义规格')}</div>
                    <div class="size-scene">${_t('MOQ 5000起订')}</div>
                </div>
            `);
        }


        function selectBagAttr(attrType, displayName, el) {
            bagConfig[attrType] = displayName; 
            const selector = attrType === 'size' ? '.bag-size' : `.bag-${attrType}`;
            document.getElementById('content-bag').querySelectorAll(selector).forEach(item => item.classList.remove('selected')); 
            el.classList.add('selected'); 

            // 处理自定义尺寸输入框显隐
            if (attrType === 'size') {
                const customBox = document.getElementById('bag-custom-size-box');
                if (displayName === '自定义尺寸') {
                    customBox.classList.remove('hidden');
                } else {
                    customBox.classList.add('hidden');
                    // 清空输入
                    document.getElementById('bag-custom-width').value = '';
                    document.getElementById('bag-custom-height').value = '';
                }
            }
            
            updateBagSummary();
        }

        // 新增：处理自定义尺寸输入
        function updateBagCustomSize() {
            const w = document.getElementById('bag-custom-width').value.trim();
            const h = document.getElementById('bag-custom-height').value.trim();
            if (w && h) {
                bagConfig.size = `自定义: ${w}x${h}cm`;
            } else {
                bagConfig.size = '自定义尺寸 (未输入)';
            }
            updateBagSummary();
        }

        function toggleBagCraft(craft, el) {
            const index = bagConfig.crafts.indexOf(craft);
            if (index > -1) { bagConfig.crafts.splice(index, 1); el.classList.remove('selected'); } 
            else { bagConfig.crafts.push(craft); el.classList.add('selected'); }
            updateBagSummary();
        }

        function handleBagFiles(input) {
            const files = Array.from(input.files);
            files.forEach(file => {
                if (file.size > 20 * 1024 * 1024) { showToast(`文件 ${file.name} 超过 20MB`, 'error'); return; }
                if (!bagConfig.designFiles.some(f => f.name === file.name && f.size === file.size)) {
                    bagConfig.designFiles.push(file);
                }
            });
            renderBagPreviews();
            updateBagSummary();
            input.value = ''; 
        }

        // 专门处理包装袋印刷模式的选择与面板展开
        function selectBagPrintMode(modeName, el) {
            const panel = document.getElementById('bag-print-panel');
            const grid = document.getElementById('bag-print-grid');
            
            // 1. 设置数据与选中态
            bagConfig.print = modeName;
            grid.querySelectorAll('.bag-print').forEach(item => item.classList.remove('selected'));
            el.classList.add('selected');
        
            // 2. 逻辑判断：如果是“空白无印”，隐藏面板；否则显示面板
            if (modeName === '空白无印') {
                panel.classList.add('hidden');
            } else {
                // 搬运面板到当前行下方（包装袋印刷只有一行，其实直接 append 即可）
                grid.parentNode.insertBefore(panel, grid.nextSibling);
                panel.classList.remove('hidden');
                
                // 调整箭头位置
                setTimeout(() => {
                    const arrow = panel.querySelector('.config-arrow');
                    const arrowPos = el.getBoundingClientRect().left - panel.getBoundingClientRect().left + (el.getBoundingClientRect().width / 2) - 8;
                    arrow.style.left = `${arrowPos}px`;
                    
                    // 平滑滚动
                    const scrollArea = document.querySelector('.config-scroll-area');
                    const panelRect = panel.getBoundingClientRect();
                    if(scrollArea) scrollArea.scrollBy({ top: panelRect.top - 300, behavior: 'smooth' });
                }, 50);
            }
            
            updateBagSummary();
        }
        
        // 修改原有的 handleBagFiles 预览逻辑，去除固定 60px 限制
        function renderBagPreviews() {
            const grid = document.getElementById('bagDesignPreview');
            if(!grid) return;
            grid.innerHTML = '';
            bagConfig.designFiles.forEach((file, index) => {
                const remote = isRemoteFile(file);
                const isImage = remote ? isImageMime(file.mime) : file.type.startsWith('image/');
                const src = remote ? remoteFileUrl(file) : URL.createObjectURL(file);
                const content = isImage 
                    ? `<img src="${src}" onclick="openOemPreview(this.src, '${file.name}')">` 
                    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:10px;">DOC</div>`;
        
                grid.insertAdjacentHTML('beforeend', `
                    <div class="oem-preview-item">
                        ${content}
                        <button type="button" class="oem-preview-remove" onclick="removeBagFile(${index})">&times;</button>
                    </div>`);
            });
        }

        function removeBagFile(index) {
            bagConfig.designFiles.splice(index, 1);
            renderBagPreviews();
            updateBagSummary();
        }

        function updateBagSummary() {
            const st = document.getElementById('sum-trim-bag');
            const isBagEnabled = document.querySelector('input[name="need_bag"][value="yes"]');
            //if (!isBagEnabled || !isBagEnabled.checked) return; // 只有开启时才更新
            if (!isBagEnabled) {
                handleTrimDisabledSummary('bag', st);
                return;
            }

            if (bagConfig.material === '未选材质') { 
                st.innerText = _t('已开启 (待选择材质)'); 
                st.style.color = 'var(--primary-color)'; st.style.fontWeight = 'bold';
                return; 
            } 
            
            const matPart = (window.__lang === 'en' && bagConfig.materialEn) ? bagConfig.materialEn : bagConfig.material;
            const sizePart = bagConfig.size !== '未选尺寸' ? bagConfig.size.split(' ')[0] : _t('尺寸待定');
            
            // 组装工艺文字
            let printText = bagConfig.print === '空白无印' ? _t('无印') : _t(bagConfig.print);
            if (bagConfig.crafts.length > 0) printText += `+${bagConfig.crafts.length}${_t('工艺')}`;

            const hasFile = bagConfig.designFiles.length > 0 ? `<br><span style="font-size:10px; color:#10b981;">+${_t('已传设计图')}(${bagConfig.designFiles.length})</span>` : '';

            st.innerHTML = `<div style="text-align:right;">${matPart} | ${sizePart}<br><span style="font-size:10px; opacity:0.8;">${printText}</span>${hasFile}</div>`;
            st.style.color = 'var(--primary-color)'; 
            st.style.fontWeight = 'bold';
            validateTrims();
        }

        // ==========================================
        // 大货装箱与包装附件处理
        // ==========================================
        let bulkPackingFiles = [];
        
        function handleBulkPackingFiles(input) {
            const files = Array.from(input.files);
            files.forEach(file => {
                if (file.size > 20 * 1024 * 1024) { showMsg(`文件 ${file.name} 超过 20MB`, 'error'); return; }
                if (!bulkPackingFiles.some(f => f.name === file.name && f.size === file.size)) {
                    bulkPackingFiles.push(file);
                }
            });
        
            const nameEl = document.getElementById('bulkPackingFileName');
            nameEl.innerText = bulkPackingFiles.length > 0 ? `已选 ${bulkPackingFiles.length} 个文件` : '上传参考文件';
            
            renderBulkPackingPreviews();
            updateLogisticsSummary();
            input.value = '';
        }
        
        function renderBulkPackingPreviews() {
            const grid = document.getElementById('bulkPackingPreview');
            if(!grid) return;
            grid.innerHTML = '';
            bulkPackingFiles.forEach((file, index) => {
                const remote = isRemoteFile(file);
                const isImage = remote ? isImageMime(file.mime) : file.type.startsWith('image/');
                let content;
                if (isImage) {
                    const src = remote ? remoteFileUrl(file) : URL.createObjectURL(file);
                    content = `<img src="${src}" onclick="openOemPreview(this.src, '${file.name}')">`;
                } else {
                    content = `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:10px;">DOC</div>`;
                }
                
                grid.insertAdjacentHTML('beforeend', `
                    <div class="oem-preview-item" style="width:60px; height:60px;">
                        ${content}
                        <button type="button" class="oem-preview-remove" onclick="removeBulkPackingFile(${index})">&times;</button>
                    </div>
                `);
            });
        }
        
        function removeBulkPackingFile(index) {
            bulkPackingFiles.splice(index, 1);
            document.getElementById('bulkPackingFileName').innerText = bulkPackingFiles.length > 0 ? `已选 ${bulkPackingFiles.length} 个文件` : '上传参考文件';
            renderBulkPackingPreviews();
            updateLogisticsSummary();
        }

        // ==========================================
        // Step 5 最终综合附件处理
        // ==========================================
        let finalDocsFiles = [];
        
        function handleFinalDocsFiles(input) {
            const files = Array.from(input.files);
            files.forEach(file => {
                // 综合附件可能包含几十页的 PDF 或图包，限制放宽到 50MB
                if (file.size > 50 * 1024 * 1024) { 
                    showMsg(`文件 ${file.name} 超过 50MB 限制`, 'error'); 
                    return; 
                }
                if (!finalDocsFiles.some(f => f.name === file.name && f.size === file.size)) {
                    finalDocsFiles.push(file);
                }
            });
        
            const nameEl = document.getElementById('finalDocsFileName');
            if (finalDocsFiles.length > 0) {
                nameEl.innerText = `已成功添加 ${finalDocsFiles.length} 个综合附件`;
                nameEl.style.color = 'var(--primary-color)';
            } else {
                nameEl.innerText = '点击上传综合工艺单/企划书';
                nameEl.style.color = '#64748b';
            }
            
            renderFinalDocsPreviews();
            updateStep5Summary();
            input.value = '';
        }
        
        function renderFinalDocsPreviews() {
            const grid = document.getElementById('finalDocsPreview');
            if(!grid) return;
            grid.innerHTML = '';
            
            finalDocsFiles.forEach((file, index) => {
                const remote = isRemoteFile(file);
                const isImage = remote ? isImageMime(file.mime) : file.type.startsWith('image/');
                const ext = fileExt(file.name);
                
                let content;
                if (isImage) {
                    const src = remote ? remoteFileUrl(file) : URL.createObjectURL(file);
                    content = `<img src="${src}" onclick="openOemPreview(this.src, '${file.name}')">`;
                } else {
                    content = `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:11px;font-weight:800;border-radius:6px;border:1px solid #e2e8f0;"><span>${ext}</span></div>`;
                }
                
                grid.insertAdjacentHTML('beforeend', `
                    <div class="oem-preview-item" style="width:60px; height:60px; border-radius:6px;">
                        ${content}
                        <button type="button" class="oem-preview-remove" onclick="removeFinalDocsFile(${index})">&times;</button>
                    </div>
                `);
            });
        }
        
        function removeFinalDocsFile(index) {
            finalDocsFiles.splice(index, 1);
            const nameEl = document.getElementById('finalDocsFileName');
            if (finalDocsFiles.length > 0) {
                nameEl.innerText = `已成功添加 ${finalDocsFiles.length} 个综合附件`;
            } else {
                nameEl.innerText = '点击上传综合工艺单/企划书';
                nameEl.style.color = '#64748b';
            }
            renderFinalDocsPreviews();
            updateStep5Summary();
        }

        // ==========================================
        // 步骤 4: 交付逻辑 (物流与报价规划)
        // ==========================================
        let currentDeliveryMode = 'sample';
        // 1. 初始化对象 (仅需确认有 intentTerm 和 intentMethod)
        let sampleConfig = { 
            carrier: 'DHL/FedEx (红绣代办)', 
            needBulkQuote: false,
            intentTerm: 'DDP',
            intentMethod: 'Sea Freight (海运)'
        };
        let bulkLogisticsConfig = { term: 'DDP 双清包税', method: 'Sea' };
        
        function selectSampleAttr(attr, value, el) {
            sampleConfig[attr] = value;
            // 通用处理：清空同级选中态并标记当前选中
            const siblings = el.parentNode.children;
            for (let sibling of siblings) sibling.classList.remove('selected');
            el.classList.add('selected');
            
            updateLogisticsSummary();
        }
        
        // 切换大货意向评估区域的显隐与平滑滚动
        function toggleSampleBulkIntent(needed) {
            sampleConfig.needBulkQuote = needed;
            
            const intentFields = document.getElementById('sample-bulk-intent-fields');
            if (intentFields) {
                intentFields.classList.toggle('hidden', !needed);
                
                if (needed) {
                    // 延迟一点时间，确保元素已经从 hidden 状态中恢复并占位，然后执行平滑滚动居中
                    setTimeout(() => {
                        scrollElementToCenter('sample-bulk-intent-fields');
                    }, 50);
                } else {
                    // 如果用户取消勾选，为了避免产生脏数据，我们应当清空已填写的内容
                    const qtyInput = document.getElementById('sample-intent-qty');
                    const priceInput = document.getElementById('sample-intent-price');
                    if (qtyInput) qtyInput.value = '';
                    if (priceInput) priceInput.value = '';
                    
                    // 恢复默认选中状态（可选，视您的业务逻辑而定）
                    // selectSampleAttr('intentMethod', 'Sea Freight (海运)', document.querySelector('[onclick*="Sea Freight"]'));
                    // selectSampleAttr('intentTerm', 'DDP', document.querySelector('[onclick*="\'DDP\'"]'));
                }
            }
            
            updateLogisticsSummary();
        }

        
        function selectBulkLogistics(attr, value, el) {
            bulkLogisticsConfig[attr] = value;
            if (attr === 'method') {
                el.parentNode.querySelectorAll('.bulk-method').forEach(c => c.classList.remove('selected'));
                el.classList.add('selected');
            }
            updateLogisticsSummary();
        }
        
        // 2. 超强容错的汇总函数
        function updateLogisticsSummary() {
            const sumEl = document.getElementById('sum-shipping');
            if (!sumEl) return;
        
            if (currentDeliveryMode === 'sample') {
                // 目的地安全读取
                const destEl = document.getElementById('sample-destination');
                const dest = destEl ? (destEl.value || _t('待定国')) : _t('待定国');
                
                let totalItems = 0;
                let validRowsCount = 0;
                
                if (typeof sampleRows !== 'undefined' && sampleRows.length > 0) {
                    sampleRows.forEach(row => {
                        if (row.style && row.style !== "") validRowsCount++;
                        totalItems += parseInt(row.qty) || 0;
                    });
                }
        
                // 快递方式安全读取 (增加默认值防止 split 报错)
                const carrier = (sampleConfig && sampleConfig.carrier) ? _t(sampleConfig.carrier.split(' ')[0]) : _t('待定');

                let intentText = '';
                if (sampleConfig && sampleConfig.needBulkQuote) {
                    // 获取数量
                    const qtyEl = document.getElementById('sample-intent-qty');
                    const qtyText = (qtyEl && qtyEl.value) ? `${qtyEl.value} ${_t('件')}` : _t('数量待定');
                    
                    // 【新增】获取目标单价
                    const priceEl = document.getElementById('sample-intent-price');
                    const priceText = (priceEl && priceEl.value) ? `(${_t('目标')} $${priceEl.value})` : '';
        
                    const term = sampleConfig.intentTerm || 'DDP';
                    const method = sampleConfig.intentMethod ? sampleConfig.intentMethod.split(' ')[0] : 'Sea';
                    
                    // 将单价拼接到汇总文本中
                    intentText = `<br><span style="font-size:10px; color:var(--primary-color);">${_t('评估大货:')} ${qtyText} ${priceText} | ${term} | ${method}</span>`;
                }
        
                sumEl.innerHTML = `
                    <div style="text-align:right;">
                        <span style="color:var(--text-main); font-weight:700;">${_t('打样阶段')} (${dest})</span><br>
                        <span style="font-size:11px; color:#64748b;">${_t('清单:')} ${validRowsCount}${_t('项')} / ${_t('共')}${totalItems}${_t('件')} | ${_t('快递:')} ${carrier}</span>
                        ${intentText}
                    </div>
                `;
                
            } else {
                // 大货模式安全读取
                const destEl = document.getElementById('bulk-destination');
                const dest = destEl ? (destEl.value || _t('待定国')) : _t('待定国');
                
                const stylesEl = document.getElementById('bulk-style-count');
                const styles = stylesEl ? (stylesEl.value || '0') : '0';
                
                const qtyEl = document.getElementById('bulk-qty-per-style');
                const qty = qtyEl ? (qtyEl.value || '0') : '0';
                
                const sizeEl = document.getElementById('bulk-size-range');
                const sizeRange = (sizeEl && sizeEl.value) ? sizeEl.value.split(' ')[0] : _t('待定尺码');
                
                const term = (bulkLogisticsConfig && bulkLogisticsConfig.term) ? _t(bulkLogisticsConfig.term.split(' ')[0]) : 'DDP';
                const method = (bulkLogisticsConfig && bulkLogisticsConfig.method) ? bulkLogisticsConfig.method : 'Sea';
                
                // 在 updateLogisticsSummary 里的 bulk 模式分支中：
                let totalBulkQty = 0;
                let bulkStylesCount = 0;
                
                if (typeof bulkRows !== 'undefined') {
                    bulkRows.forEach(row => {
                        if (row.style) {
                            bulkStylesCount++;
                            totalBulkQty += (parseInt(row.qty) || 0);
                        }
                    });
                }
                
                // 获取填写的期望价格
                const targetPriceEl = document.getElementById('bulk-target-price');
                const targetPrice = (targetPriceEl && targetPriceEl.value) ? `(${_t('目标')} $${targetPriceEl.value})` : '';
                const hasPackingFiles = bulkPackingFiles.length > 0 ? `<br><span style="font-size:10px; color:#10b981;">+${_t('已传包装要求图')}(${bulkPackingFiles.length})</span>` : '';
        
                sumEl.innerHTML = `
                    <div style="text-align:right;">
                        <span style="color:var(--primary-color); font-weight:700;">${_t('大货订单')} (${dest})</span><br>
                        <span style="font-size:11px; color:#64748b;">${_t('清单:')} ${bulkStylesCount}${_t('款')} / ${_t('共')}${totalBulkQty}${_t('件')} ${targetPrice}</span><br>
                        <span style="font-size:10px; color:#94a3b8;">${_t(bulkLogisticsConfig.term)} | ${bulkLogisticsConfig.method}</span>
                    </div>
                `;

            }
            validateShipping();
        }

        let bulkRows = []; // 存储大货数据 [{style:'', qty:100, sizeDetail:'', desc:''}]
        
        // 1. 初始化或增加行
        function addBulkRow() {
            // 默认给一个满足最低起订量的初值
            bulkRows.push({ style: '', qty: 50, sizeDetail: '', desc: '' });
            renderBulkTable();
        }
        
        function removeBulkRow(index) {
            if (bulkRows.length > 1) {
                bulkRows.splice(index, 1);
            } else {
                bulkRows[0] = { style: '', qty: 50, sizeDetail: '', desc: '' };
            }
            renderBulkTable();
        }
        
        // 2. 核心渲染函数
        function renderBulkTable() {
            const tbody = document.getElementById('bulk-table-body');
            if(!tbody) return;
        
            const odmStyles = (typeof selectedOdmStyles !== 'undefined') ? selectedOdmStyles : [];
            const oemCountInput = document.getElementById('oem-collection-count');
            const oemCount = oemCountInput ? (parseInt(oemCountInput.value) || 0) : 0;
        
            let styleOptionsHtml = `<option value="">-- 请选择款式 --</option>`;
            odmStyles.forEach(name => {
                const val = `ODM: ${name}`;
                styleOptionsHtml += `<option value="${val}">${val}</option>`;
            });
            for (let i = 1; i <= oemCount; i++) {
                const val = `OEM-第 ${i} 款`;
                styleOptionsHtml += `<option value="${val}">${val}</option>`;
            }
        
            tbody.innerHTML = '';
            bulkRows.forEach((row, index) => {
                const tr = document.createElement('tr');
                
                // 处理选中态
                let currentOptions = styleOptionsHtml.replace(`value="${row.style}"`, `value="${row.style}" selected`);
        
                var _isEn = (window.__lang && window.__lang !== 'zh');
                tr.setAttribute('data-index', index + 1);
                tr.setAttribute('data-card-title', _isEn ? ('Bulk #' + (index + 1)) : ('大货项 #' + (index + 1)));

                tr.innerHTML = `
                    <td data-label="${_isEn ? 'Style' : '对应款式'}">
                        <select class="bulk-table-input" onchange="updateBulkRowData(${index}, 'style', this.value)">
                            ${currentOptions}
                        </select>
                    </td>
                    <td data-label="${_isEn ? 'Total Qty' : '总数量'}">
                        <input type="number" class="bulk-table-input" value="${row.qty}" min="0" 
                               onchange="validateMOQ(${index}, this.value)" 
                               oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                    </td>
                    <td data-label="${_isEn ? 'Size Details' : '尺码及数量明细'}">
                        <textarea class="bulk-table-input" placeholder="例：&#10;S: 20&#10;M: 50&#10;L: 30" 
                                  oninput="updateBulkRowData(${index}, 'sizeDetail', this.value)">${row.sizeDetail}</textarea>
                    </td>
                    <td data-label="${_isEn ? 'Notes' : '备注 / 描述'}">
                        <textarea class="bulk-table-input" placeholder="例：&#10;主体黑色，撞色滚边&#10;注意防水拉链" 
                                  oninput="updateBulkRowData(${index}, 'desc', this.value)">${row.desc}</textarea>
                    </td>
                    <td class="bulk-card-remove" style="text-align:center;">
                        <button type="button" class="btn-remove-row" onclick="removeBulkRow(${index})">&times;</button>
                    </td>
                `;
                tbody.appendChild(tr);
            });
            updateLogisticsSummary();
        }

        
        // 3. 起订量(MOQ)校验逻辑
        function validateMOQ(index, value) {
            const qty = parseInt(value) || 0;
            const style = bulkRows[index].style;
            
            let minAllowed = 50; // 默认按 ODM 算
            let typeName = "现有款式(ODM)";
        
            if (style.startsWith('OEM')) {
                minAllowed = 100;
                typeName = "自主设计(OEM)";
            }
        
            if (qty < minAllowed) {
                showMsg(`⚠️ 起订量提醒：\n您选择的是 ${typeName}，该类型单款最低起订量为 ${minAllowed} 件。\n\n系统已自动为您调整为最低起订量。`, 'warn');
                bulkRows[index].qty = minAllowed;
            } else {
                bulkRows[index].qty = qty;
            }
            
            renderBulkTable();
        }
        
        // 4. 更新基础数据
        function updateBulkRowData(index, field, value) {
            bulkRows[index][field] = value;
            
            // 如果修改的是款式，立刻根据款式类型校验一次当前数量是否达标
            if (field === 'style') {
                validateMOQ(index, bulkRows[index].qty);
            }
            
            updateLogisticsSummary();
        }

        let sampleRows = []; // 存储表格数据 [{style:'', type:'', size:'', qty:1, desc:''}]
        
        // 初始化：Step 4 激活时调用
        function initSampleTab() {
            // 1. 更新 ODM 数量徽章
            const odmCount = (typeof selectedOdmStyles !== 'undefined') ? selectedOdmStyles.length : 0;
            const badge = document.getElementById('odm-count-badge');
            if (badge) badge.innerText = odmCount;
            
            // 3. 渲染或初始化表格
            if (sampleRows.length === 0) {
                addSampleRow(); // 默认第一行
            } else {
                renderSampleTable();
            }
        }

        
        // 增加一行
        function addSampleRow() {
            const newRow = { style: '', type: '初样 (Proto)', size: 'M', qty: 1, desc: '' };
            sampleRows.push(newRow);
            renderSampleTable();
        }
        
        // 1. 完善后的删除行逻辑
        function removeSampleRow(index) {
            if (sampleRows.length > 1) {
                // 如果有多行，正常删除
                sampleRows.splice(index, 1);
            } else {
                // 【优化】如果只剩最后一行，点击删除则重置该行数据
                sampleRows[0] = { style: '', type: '初样 (Proto)', size: 'M', qty: 1, desc: '' };
                // 同时手动重置一下 OEM 数量（可选）
                // document.getElementById('oem-style-count').value = 0;
            }
            renderSampleTable();
        }
        
        // 当 ODM 或 OEM 数量变化时，刷新款式下拉列表而不重置表格
        function refreshSampleTableStyles() {
            renderSampleTable(); 
        }
        
        // 核心渲染函数 (修复下拉框状态丢失问题)
        function renderSampleTable() {
            const tbody = document.getElementById('sample-table-body');
            const odmStyles = (typeof selectedOdmStyles !== 'undefined') ? selectedOdmStyles : [];
            const oemCountInput = document.getElementById('oem-collection-count');
            const oemCount = oemCountInput ? (parseInt(oemCountInput.value) || 0) : 0;
        
            tbody.innerHTML = '';
            
            sampleRows.forEach((row, index) => {
                const tr = document.createElement('tr');
                
                // 【核心修复】直接在拼接字符串时注入 selected 状态
                let rowStyleOptions = `<option value="">-- 请选择款式 --</option>`;
                
                // styleFound 标记：用来检查用户以前选的款式现在还在不在列表里
                let styleFound = (row.style === ""); 
        
                odmStyles.forEach(name => {
                    const val = `ODM: ${name}`;
                    const isSelected = (row.style === val);
                    if (isSelected) styleFound = true;
                    rowStyleOptions += `<option value="${val}" ${isSelected ? 'selected' : ''}>${val}</option>`;
                });
        
                for (let i = 1; i <= oemCount; i++) {
                    const val = `OEM-第 ${i} 款`;
                    const isSelected = (row.style === val);
                    if (isSelected) styleFound = true;
                    rowStyleOptions += `<option value="${val}" ${isSelected ? 'selected' : ''}>${val}</option>`;
                }
        
                // 容错机制：如果之前选的款式被删除了（比如在第一步取消勾选），强行重置该行的款式为空
                if (!styleFound) {
                    row.style = "";
                }
        
                // 生成整行的 HTML，包含款式和类型的 selected 状态，以及尺码数量的 value
                var _isEn = (window.__lang && window.__lang !== 'zh');
                tr.setAttribute('data-index', index + 1);
                tr.setAttribute('data-card-title', _isEn ? ('Sample #' + (index + 1)) : ('打样项 #' + (index + 1)));
                tr.innerHTML = `
                    <td data-label="${_isEn ? 'Style' : '对应款式'}">
                        <select onchange="updateRowData(${index}, 'style', this.value)">
                            ${rowStyleOptions}
                        </select>
                    </td>
                    <td data-label="${_isEn ? 'Sample Type' : '样衣类型'}">
                        <select onchange="updateRowData(${index}, 'type', this.value)">
                            <option value="初样 (Proto)" ${row.type==='初样 (Proto)'?'selected':''}>初样 (Proto)</option>
                            <option value="正确样 (PP)" ${row.type==='正确样 (PP)'?'selected':''}>正确样 (PP)</option>
                        </select>
                    </td>
                    <td data-label="${_isEn ? 'Size' : '尺码'}">
                        <input type="text" list="common-sizes" value="${row.size}" placeholder="选或填" onchange="updateRowData(${index}, 'size', this.value)">
                    </td>
                    <td data-label="${_isEn ? 'Qty' : '数量'}">
                        <input type="number" value="${row.qty}" min="1" oninput="updateRowData(${index}, 'qty', this.value)">
                    </td>
                    <td data-label="${_isEn ? 'Notes' : '备注'}">
                        <input type="text" value="${row.desc}" placeholder="例: 黑色碎花款" oninput="updateRowData(${index}, 'desc', this.value)">
                    </td>
                    <td class="sample-card-remove" style="text-align:center;">
                        <button type="button" class="btn-remove-row" onclick="removeSampleRow(${index})">&times;</button>
                    </td>
                `;
        
                tbody.appendChild(tr);
            });
        
            updateLogisticsSummary();
            calculateSampleCost();
        }
        function openLabelComplianceModal() {
            document.getElementById('labelComplianceModal').classList.add('active');
        }
        function closeLabelComplianceModal() {
            document.getElementById('labelComplianceModal').classList.remove('active');
        }
        // 点击黑色半透明背景也能关闭
        document.getElementById('labelComplianceModal').addEventListener('click', function(e) { 
            if (e.target === this) closeLabelComplianceModal(); 
        });

        // 1. 弹窗控制
        function openSampleGuide() { document.getElementById('sampleGuideModal').classList.add('active'); }
        function closeSampleGuide() { document.getElementById('sampleGuideModal').classList.remove('active'); }

        // 收费标准弹窗控制
        function openFeeStandardModal() { document.getElementById('feeStandardModal').classList.add('active'); }
        function closeFeeStandardModal() { document.getElementById('feeStandardModal').classList.remove('active'); }

        // 起订量标准弹窗控制
        function openMoqStandardModal() { document.getElementById('moqStandardModal').classList.add('active'); }
        function closeMoqStandardModal() { document.getElementById('moqStandardModal').classList.remove('active'); }

        // 3. 确保款式数据更新时的健壮性
        // 实时更新数组数据（已移除重复行限制）
        function updateRowData(index, field, value) {
            if (!sampleRows[index]) return;
        
            // 1. 直接保存修改的数据，不再进行查重比对
            sampleRows[index][field] = value;
        
            // 2. 触发后续更新
            // 数量变化只需重算费用和更新汇总，不重绘表格（避免丢失焦点）
            calculateSampleCost();
            updateLogisticsSummary();
        }

        
        // 修改 switchDeliveryMode 的触发
        function switchDeliveryMode(mode) {
            currentDeliveryMode = mode;
            document.querySelectorAll('#step-4 .mode-option').forEach(opt => opt.classList.remove('active'));
            document.getElementById(`delivery-mode-${mode}`).classList.add('active');
            
            document.getElementById('pane-delivery-sample').classList.toggle('hidden', mode !== 'sample');
            document.getElementById('pane-delivery-bulk').classList.toggle('hidden', mode !== 'bulk');
            
            if (mode === 'sample') initSampleTab();
            else {
                if (bulkRows.length === 0) addBulkRow();
                else renderBulkTable();
            }
            updateLogisticsSummary();
        }

        // ==========================================
        // 打样费用计算核心逻辑
        // 规则：每款 $20制版 + $10管理 + 首件缝制费(按最贵类型) = 基础费
        //       初样 $40/款 = $20+$10+$10, 正确样 $50/款 = $20+$10+$20
        //       每款含2件免费(已包含在基础费中)，超出按件收缝制费
        //       同款多行合并计算，免费名额优先消耗贵的类型
        // ==========================================
        function calculateSampleCost() {
            const totalEl = document.getElementById('sample-fee-total');
            const detailsEl = document.getElementById('sample-fee-details');
            if (!totalEl || !detailsEl) return;

            const PATTERN_FEE = 20;
            const MANAGE_FEE = 10;
            const SEWING_PROTO = 10;
            const SEWING_PP = 20;
            const FREE_QTY = 2;

            // 按款式分组汇总
            const styleMap = {};
            sampleRows.forEach(row => {
                if (!row.style || row.style === '') return;
                if (!styleMap[row.style]) styleMap[row.style] = { protoQty: 0, ppQty: 0 };
                const qty = parseInt(row.qty) || 0;
                if (row.type.includes('Proto')) {
                    styleMap[row.style].protoQty += qty;
                } else {
                    styleMap[row.style].ppQty += qty;
                }
            });

            const styles = Object.keys(styleMap);

            if (styles.length === 0) {
                detailsEl.innerHTML = _t('请在上方清单中选择款式以预览费用...');
                totalEl.innerText = '$0.00';
                const w = document.getElementById('sample-extra-warning');
                if (w) w.classList.add('hidden');
                return;
            }

            let totalBase = 0;
            let totalExtraSewing = 0;
            let hasExtra = false;

            styles.forEach(style => {
                const { protoQty, ppQty } = styleMap[style];
                const totalQty = protoQty + ppQty;

                // 基础费 = 制版 + 管理 + 首件缝制(取最贵类型)
                const baseSewing = ppQty > 0 ? SEWING_PP : SEWING_PROTO;
                totalBase += PATTERN_FEE + MANAGE_FEE + baseSewing;

                // 超出2件的缝制费
                if (totalQty > FREE_QTY) {
                    // 免费名额优先消耗贵的 (PP)，让客户少付额外费用
                    let ppRemain = ppQty;
                    let protoRemain = protoQty;
                    let freeLeft = FREE_QTY;

                    const ppFree = Math.min(ppRemain, freeLeft);
                    ppRemain -= ppFree;
                    freeLeft -= ppFree;

                    const protoFree = Math.min(protoRemain, freeLeft);
                    protoRemain -= protoFree;

                    totalExtraSewing += ppRemain * SEWING_PP + protoRemain * SEWING_PROTO;
                    hasExtra = true;
                }
            });

            const grandTotal = totalBase + totalExtraSewing;

            let html = `
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span>${_t('基础打样费')} (${styles.length}${_t('款')})</span>
                    <span style="font-weight:600; color:#475569;">$${totalBase}.00</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                    <span style="color:#64748b;">${_t('含制版·管理·缝制，每款免费含2件')}</span>
                </div>`;

            if (totalExtraSewing > 0) {
                html += `
                <div style="display:flex; justify-content:space-between; padding-top:6px; border-top:1px dashed #e2e8f0;">
                    <span>${_t('超出缝制费')}</span>
                    <span style="font-weight:600; color:#ef4444;">+$${totalExtraSewing}.00</span>
                </div>`;
            }

            detailsEl.innerHTML = html;
            totalEl.innerText = `$${grandTotal.toFixed(2)}`;

            // 超量提示
            const warn = document.getElementById('sample-extra-warning');
            if (warn) hasExtra ? warn.classList.remove('hidden') : warn.classList.add('hidden');
        }


        // ==========================================
        // 6. 全局数据重置与清理
        // ==========================================
        function updateStep5Summary() {
            const sumEl = document.getElementById('sum-contact');
            if (!sumEl) return;
        
            const name = document.getElementById('final-contact-name')?.value.trim() || '';
            const brand = document.getElementById('final-brand-name')?.value.trim() || '';
            const remark = document.getElementById('final-remark')?.value.trim() || '';
            const filesCount = finalDocsFiles.length;
        
            let contactText = '待填写...';
            if (name || brand) {
                contactText = `<span style="color: var(--text-main); font-weight: 700;">${brand || '未命名品牌'}</span><br>${name || '未填姓名'}`;
            }
        
            let extraText = '';
            if (remark || filesCount > 0) {
                extraText = `<br><span style="font-size: 10px; color: var(--primary-color); font-weight: 600;">+ ${filesCount} 个附件 / ${remark ? '有补充说明' : '无补充说明'}</span>`;
            }
        
            sumEl.innerHTML = contactText + extraText;
            validateContact();
        }

        // --- 修复：OEM 模式一键清空逻辑（无弹窗打扰，完整覆盖 A 区域数据） ---
        function clearCurrentMode() {
            const isOdmActive = document.getElementById('mode-odm').classList.contains('active');
            
            if (isOdmActive) {
                // 【清空 ODM 逻辑】
                if (selectedOdmStyles.length === 0) return;
                
                selectedOdmStyles = [];
                odmCustomData = {};
                document.querySelectorAll('.style-item').forEach(item => item.classList.remove('selected'));
                document.querySelectorAll('.custom-badge').forEach(badge => badge.classList.remove('active'));
                
            } else {
                // 【清空 OEM 逻辑】
                
                // 1. 释放图片预览的 Blob 内存 (防止内存泄漏)
                ['tech', 'ref', 'size'].forEach(type => {
                    if (oemFilesData[type] && oemFilesData[type].length > 0) {
                        oemFilesData[type].forEach(file => {
                            if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
                        });
                    }
                });

                // 2. 清空全局数据对象
                oemFilesData = { tech: [], ref: [], size: [] };
                oemStyleDescriptions = []; // 清空款式简述数组
                
                // 3. 清空 DOM 输入与预览区域
                document.getElementById('oemRefPreview').innerHTML = '';
                document.getElementById('oemTechPreview').innerHTML = '';
                var oemSizePreviewEl = document.getElementById('oemSizePreview');
                if (oemSizePreviewEl) oemSizePreviewEl.innerHTML = '';
                document.getElementById('oem-remark').value = '';
                var oemSizeRemarkEl = document.getElementById('oem-size-remark');
                if (oemSizeRemarkEl) oemSizeRemarkEl.value = '';
                
                // --- 修复点：彻底清空 A. 项目基本信息 ---
                const collectionNameInput = document.getElementById('oem-collection-name');
                if (collectionNameInput) collectionNameInput.value = '';
                
                const projDescInput = document.getElementById('oem-project-desc');
                if (projDescInput) projDescInput.value = '';
                
                const collectionCountInput = document.getElementById('oem-collection-count');
                if (collectionCountInput) {
                    collectionCountInput.value = '0'; // 恢复默认值 0
                    renderOemStyleDescInputs(); // 触发联动，销毁下方的动态输入框，并同步 Step 4 的徽章
                }
                
                // 4. 清空寄样与物流单号
                const physicalCheckbox = document.getElementById('oem-physical');
                if (physicalCheckbox) {
                    physicalCheckbox.checked = false;
                    togglePhysicalInfo(false);
                }
                const addrInput = document.querySelector('#oem-address-info input');
                if (addrInput) addrInput.value = '';

                // 5. 清空 Checklist 必填核对单的打勾状态 (如果有的话)
                const checklists = document.querySelectorAll('.oem-checklist-item input[type="checkbox"]');
                checklists.forEach(cb => {
                    cb.checked = false;
                    if(cb.parentElement) cb.parentElement.style.background = 'transparent';
                });
                if (typeof syncOemCheckAllBtn === 'function') syncOemCheckAllBtn(); // 同步“一键全选”按钮状态
            }
            
            // 同步更新右侧侧边栏汇总
            updateCombinedStyleSummary();
        }

        async function clearAllSelections() {
            if (!(await showConfirm(_t('确定要清空所有已选配置并重头开始吗？')))) return;

            // 抑制重置过程中的 setDot 调用
            _resetting = true;
            Object.keys(dotActivated).forEach(k => delete dotActivated[k]);

            // 安全获取元素的辅助函数
            const _el = (id) => document.getElementById(id);
            const _q = (sel) => document.querySelector(sel);

            // 1. 重置 ODM/OEM
            selectedOdmStyles = []; 
            document.querySelectorAll('.style-item').forEach(item => item.classList.remove('selected'));
            const sumStyle = _el('sum-style'); if (sumStyle) sumStyle.innerText = '未选择';
            odmCustomData = {}; currentEditingStyle = '';

            document.querySelectorAll('.custom-badge').forEach(badge => badge.classList.remove('active'));
            
            oemFilesData = { tech: [], ref: [], size: [] };
            oemStyleDescriptions = [];
            const oemRefPreview = _el('oemRefPreview'); if (oemRefPreview) oemRefPreview.innerHTML = '';
            const oemTechPreview = _el('oemTechPreview'); if (oemTechPreview) oemTechPreview.innerHTML = '';
            const oemRemark = _el('oem-remark'); if (oemRemark) oemRemark.value = '';
            const oemCollName = _el('oem-collection-name'); if (oemCollName) oemCollName.value = '';
            const oemProjDesc = _el('oem-project-desc'); if (oemProjDesc) oemProjDesc.value = '';
            const oemCollCount = _el('oem-collection-count'); if (oemCollCount) { oemCollCount.value = '0'; renderOemStyleDescInputs(); }
            const oemPhysical = _el('oem-physical'); if (oemPhysical) { oemPhysical.checked = false; togglePhysicalInfo(false); }
            const oemAddr = _q('#oem-address-info input'); if(oemAddr) oemAddr.value = '';
            // 重置 OEM checklist
            document.querySelectorAll('.oem-checklist-item input[type="checkbox"]').forEach(cb => { cb.checked = false; if(cb.parentElement) cb.parentElement.style.background = 'transparent'; });
            if (typeof syncOemCheckAllBtn === 'function') syncOemCheckAllBtn();
            // 切换回 ODM 模式
            toggleStyleMode('existing');

            // 2. 重置面料
            for (let key in fabricSelection) {
                fabricSelection[key].activeName = '';
                fabricSelection[key].configs = {};
            }
            document.querySelectorAll('.fabric-item, .color-swatch').forEach(item => item.classList.remove('selected'));
            const fabricConfigPanel = _el('fabric-config-panel'); if (fabricConfigPanel) fabricConfigPanel.classList.add('hidden'); 
            const textEl = _el('selected-colors-text'); 
            if (textEl) {
                textEl.innerText = '未选择颜色'; 
                textEl.style.color = '#999';
            }
            const fabricRemark = _el('fabric-remark'); if (fabricRemark) fabricRemark.value = '';
            
            const sumFabric = _el('sum-fabric');
            if (sumFabric) { sumFabric.innerHTML = _t('未选择'); sumFabric.removeAttribute('style'); }

            // 3. 重置辅料
            ['metal', 'pad', 'bag', 'hangtag', 'label', 'hygiene', 'other'].forEach(category => {
                const noRadio = _q(`input[name="need_${category}"][value="no"]`);
                if(noRadio) noRadio.checked = true; toggleTrim(category, false); 
            });
            // 重置包装袋
            bagConfig = { material: '未选材质', size: '未选尺寸', print: '空白无印', crafts: [], designFiles: [] };
            document.querySelectorAll('.bag-material, .bag-size, .bag-print').forEach(item => item.classList.remove('selected'));
            document.querySelectorAll('#content-bag .chip').forEach(item => item.classList.remove('selected'));
            const bagConfigPanel = _el('bag-config-panel'); if (bagConfigPanel) bagConfigPanel.classList.add('hidden');
            const bagAdvanced = _el('bag-advanced-section'); if (bagAdvanced) bagAdvanced.classList.add('hidden');
            const bagDesignPreview = _el('bagDesignPreview'); if (bagDesignPreview) bagDesignPreview.innerHTML = '';
            const bagRemark = _el('bag-remark'); if (bagRemark) bagRemark.value = '';
            // 重置金属饰品
            metalConfig = { finish: '亮金色', categories: [], logoCustom: false, logoTypes: [], logoFiles: [], sourceFiles: [] };
            document.querySelectorAll('.finish-item').forEach(item => item.classList.remove('selected'));
            document.querySelectorAll('.finish-item')[0]?.classList.add('selected'); 
            document.querySelectorAll('.metal-item').forEach(item => item.classList.remove('selected'));
            document.querySelectorAll('.chip').forEach(item => item.classList.remove('selected'));
            const metalLogoNeeded = _el('metal-logo-needed');
            if (metalLogoNeeded) metalLogoNeeded.checked = false;
            const metalLogoConfig = _el('metal-logo-config');
            if (metalLogoConfig) metalLogoConfig.classList.add('hidden');
            const metalLogoFileName = _el('metalLogoFileName');
            if (metalLogoFileName) metalLogoFileName.innerText = '未选择文件';
            const metalLogoPreview = _el('metalLogoPreview');
            if (metalLogoPreview) metalLogoPreview.innerHTML = '';
            const metalSourcePreview = _el('metalSourcePreview');
            if (metalSourcePreview) metalSourcePreview.innerHTML = '';
            const sumTrimMetal = _el('sum-trim-metal');
            if (sumTrimMetal) { sumTrimMetal.innerText = _t('不需要'); sumTrimMetal.removeAttribute('style'); }
            const bagDesignFile = _el('bag-design-file'); if (bagDesignFile) bagDesignFile.value = '';

            // 重置吊牌
            hangtagConfig = { material: '经典白卡 (350g/500g)', shape: '标准修长型 (约 4x9cm)', stringMat: '通用塑料吊粒', stringColor: '白色', roundedCorner: false, crafts: [], designFiles: [], shapeFiles: [] };
            document.querySelectorAll('#content-hangtag .metal-item, #content-hangtag .hangtag-shape-card, #content-hangtag .hangtag-string-mat, #content-hangtag .string-color-swatch, #content-hangtag .chip').forEach(item => item.classList.remove('selected'));
            document.querySelectorAll('#content-hangtag .metal-item')[0]?.classList.add('selected');
            document.querySelectorAll('#content-hangtag .hangtag-shape-card')[0]?.classList.add('selected');
            document.querySelectorAll('#content-hangtag .hangtag-string-mat')[0]?.classList.add('selected');
            document.querySelectorAll('#content-hangtag .string-color-swatch')[0]?.classList.add('selected');
            const roundedCornerEl = _el('hangtag-rounded-corner');
            if (roundedCornerEl) roundedCornerEl.checked = false;
            const hangtagFileName = _el('hangtagFileName');
            if (hangtagFileName) { hangtagFileName.innerText = '选择矢量文件 (AI/PDF)'; hangtagFileName.style.color = '#94a3b8'; }
            const hangtagShapeFileName = _el('hangtagShapeFileName');
            if (hangtagShapeFileName) { hangtagShapeFileName.innerText = '上传参考文件'; hangtagShapeFileName.style.color = '#94a3b8'; }
            const hangtagPreview = _el('hangtagPreview'); if (hangtagPreview) hangtagPreview.innerHTML = '';
            const hangtagShapePreview = _el('hangtagShapePreview'); if (hangtagShapePreview) hangtagShapePreview.innerHTML = '';
            const hangtagRemark = _el('hangtag-remark'); if (hangtagRemark) hangtagRemark.value = '';
            const hangtagShapeRemark = _el('hangtag-shape-remark'); if (hangtagShapeRemark) hangtagShapeRemark.value = '';

            // 重置标签
            labelConfig = { mode: 'combined', brand: { type: '无感烫印标', size: '', method: '', colors: [] }, care: { type: '无感烫印标', size: '', method: '', colors: [] }, placement: '领后中', designFiles: [] };
            const sumTrimLabel = _el('sum-trim-label'); if (sumTrimLabel) sumTrimLabel.innerText = '不需要';
            const labelTextContent = _el('label-text-content'); if (labelTextContent) labelTextContent.value = '';
            const labelRemark = _el('label-remark'); if (labelRemark) labelRemark.value = '';
            const labelPreviewGrid = _el('labelPreviewGrid'); if (labelPreviewGrid) labelPreviewGrid.innerHTML = '';

            // 4. 重置下单交付
            currentDeliveryMode = 'sample';
            sampleRows = [];
            bulkRows = [];
            sampleConfig = { carrier: 'DHL/FedEx (红绣代办)', needBulkQuote: false, intentTerm: 'DDP', intentMethod: 'Sea Freight (海运)' };
            bulkLogisticsConfig = { term: 'DDP 双清包税', method: 'Sea' };
            bulkPackingFiles = [];
            // 清空输入框
            const sampleDest = _el('sample-destination'); if (sampleDest) sampleDest.value = '';
            const bulkDest = _el('bulk-destination'); if (bulkDest) bulkDest.value = '';
            const bulkPrice = _el('bulk-target-price'); if (bulkPrice) bulkPrice.value = '';
            const bulkShipRemark = _el('bulk-shipping-remark'); if (bulkShipRemark) bulkShipRemark.value = '';
            const bulkPackPreview = _el('bulkPackingPreview'); if (bulkPackPreview) bulkPackPreview.innerHTML = '';
            // 重置大货意向
            const intentChk = _el('sample-need-bulk-quote'); if (intentChk) intentChk.checked = false;
            const intentFields = _el('sample-bulk-intent-fields'); if (intentFields) intentFields.classList.add('hidden');
            const intentQty = _el('sample-intent-qty'); if (intentQty) intentQty.value = '';
            const intentPrice = _el('sample-intent-price'); if (intentPrice) intentPrice.value = '';
            // 清空选中态
            document.querySelectorAll('#pane-delivery-sample .option-item').forEach(item => item.classList.remove('selected'));
            document.querySelectorAll('#pane-delivery-bulk .option-item').forEach(item => item.classList.remove('selected'));
            document.querySelectorAll('.bulk-method').forEach(item => item.classList.remove('selected'));
            // 切回样衣模式并重新渲染
            switchDeliveryMode('sample');
            // 强制恢复交付摘要为初始状态
            const sumShipping = _el('sum-shipping'); if (sumShipping) { sumShipping.innerHTML = _t('未选择'); sumShipping.removeAttribute('style'); }

            // 5. 重置商业评估 (Step 5)
            const stageRadio = _q('input[name="project_stage"][value="concept"]');
            if (stageRadio) stageRadio.checked = true;
            const volumeRadio = _q('input[name="est_volume"][value="sample_only"]');
            if (volumeRadio) { volumeRadio.checked = true; updateSummaryVolume('仅开发样衣'); }
            
            // 清空所有 Step 5 的输入框
            [
                'plan_colors', 'plan_sizes', 'target_market', 'target_price', 'final_remark',
                'final-contact-name', 'final-contact-info', 'final-brand-name', 'final-website',
                'assign-sales', 'assign-pattern', 'assign-sewing', 'final-remark'
            ].forEach(id => {
                const el = _el(id); 
                if(el) el.value = '';
            });
            
            // 取消勾选保密协议
            const ndaAgree = _el('nda-agree');
            if(ndaAgree) ndaAgree.checked = false;
            if (typeof updateStep5Summary === 'function') updateStep5Summary();

            // 6. 所有圆点恢复灰色
            _resetting = false;
            document.querySelectorAll('.status-dot').forEach(d => d.classList.remove('ok', 'warn'));

            // 7. 清除侧边栏摘要元素的内联样式，使 CSS 类生效
            document.querySelectorAll('.summary-sidebar .value, .summary-sidebar .summary-sub-row .value').forEach(el => {
                el.removeAttribute('style');
            });

            // 8. 返回第一步
            if (currentStep !== 1) changeStep(1 - currentStep); 
        }

                // --- 新增：清空当前面料分类的选择 ---
        function clearCurrentFabric() {
            if (!activeFabricCat || !fabricSelection[activeFabricCat]) return;
            if (fabricSelection[activeFabricCat].activeName === '') return;

            // 1. 重置当前分类的数据 (colors和remark已经在清空configs时连带清空了)
            fabricSelection[activeFabricCat].activeName = '';
            fabricSelection[activeFabricCat].configs = {};

            // 2. 更新 UI：取消卡片选中状态，隐藏配置面板
            document.getElementById(activeFabricCat).querySelectorAll('.fabric-item').forEach(item => item.classList.remove('selected'));
            document.getElementById('fabric-config-panel').classList.add('hidden');
            
            // 3. 更新右侧侧边栏汇总
            updateFabricSummary();
        }

        // 控制面料客供物料 (CMT) 信息框的显隐，并平滑滚动
        function toggleFabricCmtInfo(isChecked) {
            const infoBox = document.getElementById('fabric-cmt-address-info');
            if (!infoBox) return;
        
            if (isChecked) {
                infoBox.classList.remove('hidden');
                // 展开后，略微延迟以确保 DOM 渲染完成，然后滚动到视野中心
                setTimeout(() => {
                    scrollElementToCenter('fabric-cmt-address-info');
                }, 50);
            } else {
                infoBox.classList.add('hidden');
                // 收起时清空所有关联的输入数据，保持数据整洁
                const trackingInput = document.getElementById('fabric-cmt-tracking');
                const descInput = document.getElementById('fabric-cmt-desc');
                if (trackingInput) trackingInput.value = '';
                if (descInput) descInput.value = '';
                
                // 清空上传的文件
                cmtFilesData['fabric'] = [];
                const nameEl = document.getElementById('fabricCmtFileName');
                if (nameEl) nameEl.innerText = '点击上传图片或 PDF 清单';
                renderCmtPreviews('fabric');
            }
            
            // 更新右侧侧边栏的汇总状态
            updateFabricSummary();
        }

