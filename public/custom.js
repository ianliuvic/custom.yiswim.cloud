        // 全局 CMT 数据管理
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
                if (file.size > 20 * 1024 * 1024) { alert(`文件 ${file.name} 超过 20MB`); return; }
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
                const isImage = file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                
                // 缩短文件名显示，避免在小方块里撑开
                const shortName = file.name.length > 6 ? file.name.substring(0, 3) + '...' : file.name;
        
                let content = isImage 
                    ? `<img src="${URL.createObjectURL(file)}" onclick="openOemPreview(this.src, '${file.name}')" style="width:100%; height:100%; object-fit:cover;">` 
                    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:10px;font-weight:bold;border-radius:4px;">${ext}</div>`;
        
                // 注意：这里移除了 div 上的 style="width:50px; height:50px;"，改由 CSS 类 .tight-preview-grid 控制
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
                }
            } catch (error) { console.warn('加载数据API未就绪，使用静态展示框架:', error); }
        });

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
                    <input type="checkbox" style="width: 16px; height: 16px; accent-color: var(--primary-color); margin: 0 12px 0 0; cursor: pointer; flex-shrink: 0;" onchange="this.parentElement.style.background = this.checked ? '#fff' : 'transparent'; syncOemCheckAllBtn();">
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
                        alert(_t("⚠️ 提交前置校验失败：\n\n您提交了自主设计 (OEM) 需求，为避免后期版型开发与大货生产出现工艺偏差，请务必逐一勾选确认「核心工艺与细节确认单」中的所有必填核对项。"));
                        
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
            
            if (currentDeliveryMode === 'sample') renderSampleTable();
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
            const hasOemFiles = oemFilesData.tech.length > 0 || oemFilesData.ref.length > 0;
            const oemRemark = document.getElementById('oem-remark').value.trim();
            const collectionName = document.getElementById('oem-collection-name') ? document.getElementById('oem-collection-name').value.trim() : '';
            const collectionCount = document.getElementById('oem-collection-count') ? parseInt(document.getElementById('oem-collection-count').value) : 0;
            const oemPhysical = document.getElementById('oem-physical').checked; // 新增：获取寄样勾选状态
            if (hasOemFiles || oemRemark !== '' || oemPhysical || collectionName !== '') {
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
                    html += `<span style="font-size: 11px; color: #64748b; display:block;">- ${_t('已传:')} ${oemFilesData.ref.length}${_t('图 /')} ${oemFilesData.tech.length}${_t('文件')}</span>`;
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
                if (!hasOemFiles && !oemPhysical && oemRemark !== '') {
                    html += `<span style="font-size: 11px; color: #64748b; display:block;">- ${_t('仅文字需求说明')}</span>`;
                }
                html += `</div>`;
            }
        
            if (html === '') {
                sumStyleEl.innerText = '未选择';
            } else {
                sumStyleEl.innerHTML = `<div style="text-align: right; line-height: 1.4;">${html}</div>`;
            }
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
                listContainer.insertAdjacentHTML('beforeend', `
                    <div class="file-item"><div class="file-info"><div class="file-icon ${iconClass}">${ext.substring(0, 3)}</div><div class="file-details"><span class="file-name" title="${file.name}">${file.name}</span><span class="file-size">${formatBytes(file.size)}</span></div></div><button class="file-remove" onclick="removeModalFile(${index})"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
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
            if (alertMsg) alert(alertMsg);
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
            
            const oemRemarkEl = document.getElementById('oem-remark');
            const hasRemark = oemRemarkEl && oemRemarkEl.value.trim() !== '';
            
            const physicalEl = document.getElementById('oem-physical');
            const hasPhysical = physicalEl && physicalEl.checked;
            
            // 只要有任何一项满足，就认为用户有 OEM 需求
            return hasRef || hasTech || hasRemark || hasPhysical;
        }

        // ==========================================
        // 3. OEM 自主设计模块
        // ==========================================
        let oemFilesData = { tech: [], ref: [] }; 
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
                if (file.size > MAX_FILE_SIZE) { alert(`文件 ${file.name} 超过 20MB`); return; }
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
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = (e) => addOemPreviewItem(type, e.target.result, file.name, idx, true);
                    reader.readAsDataURL(file);
                } else { addOemPreviewItem(type, null, file.name, idx, false, file.name.split('.').pop().toUpperCase()); }
            });
            updateCombinedStyleSummary();
        }

        document.addEventListener('DOMContentLoaded', () => {
            ['Tech', 'Ref'].forEach(type => {
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
                alert(_t('抱歉，该项目暂无高清预览图。'));
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
        function changeStep(n) {
            // 隐藏当前步骤
            document.getElementById(`step-${currentStep}`).classList.add('hidden'); 
            document.getElementById(`step-${currentStep}-label`).classList.remove('active');
            
            // 更新当前步数
            currentStep += n;
            
            // 显示新步骤
            document.getElementById(`step-${currentStep}`).classList.remove('hidden'); 
            document.getElementById(`step-${currentStep}-label`).classList.add('active');
            
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
        }

        // --- 最终表单提交出口 (新增) ---
        function submitForm() {
            // 1. 获取 Step 5 的必填项
            const contactName = document.getElementById('final-contact-name').value.trim();
            const contactInfo = document.getElementById('final-contact-info').value.trim();
            const brandName = document.getElementById('final-brand-name').value.trim();
            const ndaChecked = document.getElementById('nda-agree').checked;
        
            // 2. 基础合法性校验
            if (!contactName || !contactInfo || !brandName) {
                alert(_t("请完整填写商业身份档案中的必填项 (*)，以便我们能联系到您。"));
                // 如果不在第五步，自动切过去
                if (currentStep !== 5) changeStep(5 - currentStep);
                return;
            }
        
            if (!ndaChecked) {
                alert(_t("提交前请阅读并勾选同意商业保密协议 (NDA)。"));
                return;
            }
        
            // 3. 数据构造 (合并之前的表格数据、物流数据等)
            const finalOrderData = {
                identity: {
                    name: contactName,
                    contact: contactInfo,
                    brand: brandName,
                    website: document.getElementById('final-website').value
                },
                assignment: {
                    sales: document.getElementById('assign-sales').value,
                    patternMaker: document.getElementById('assign-pattern').value,
                    sampleMaker: document.getElementById('assign-sewing').value
                },
                // 这里继承之前步骤定义的全局变量
                config: {
                    styles: selectedOdmStyles,
                    sampleList: sampleRows, // 第四步的打样表格
                    bulkList: bulkRows,     // 第四步的大货表格
                    deliveryMode: currentDeliveryMode, // sample or bulk
                    // ... 其他面料、辅料数据 ...
                },
                finalRemark: document.getElementById('final-remark').value,
                finalDocs: finalDocsFiles // 提交这个数组给后端
            };
        
            console.log("🚀 正式提交询盘数据:", finalOrderData);
        
            // 4. 执行提交动画
            const nextBtn = document.getElementById('nextBtn');
            nextBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="animation: rotate 1s linear infinite; margin-right:8px;">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                </svg> 正在加密传输并分派团队...`;
            nextBtn.disabled = true;
        
            // 模拟后端响应
            setTimeout(() => {
                alert(_t("✅ 提交成功！\n\n您的需求编号为: HX20240508001\n专属业务经理将在 24 小时内为您提供正式报价。"));
                // window.location.reload(); // 或者跳转到成功页
            }, 1500);
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

                    if (isCustomSourcing) {
                        // 定制找样逻辑
                        document.getElementById('selected-fabric-display').innerText = `${selection.originalCatName}：定制开发/全球找样`;
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
                        document.getElementById('selected-fabric-display').innerText = `${selection.originalCatName}：${selection.activeName}`;
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
                if (file.size > 20 * 1024 * 1024) { alert(`印花文件 ${file.name} 超过 20MB`); return; }
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
                const isImage = file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                
                if (isImage) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        grid.insertAdjacentHTML('beforeend', `
                            <div class="oem-preview-item">
                                <img src="${e.target.result}" onclick="openOemPreview(this.src, '${file.name}')" style="cursor:zoom-in;">
                                <button type="button" class="oem-preview-remove" onclick="removePrintFile(${index})">&times;</button>
                            </div>`);
                    };
                    reader.readAsDataURL(file);
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
                if (file.size > 20 * 1024 * 1024) { alert(`文件 ${file.name} 超过 20MB`); return; }
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

            // 新增：控制里料专属的颜色提示框
            const liningHintBox = document.getElementById('lining-color-hint');
            if (liningHintBox) {
                liningHintBox.classList.toggle('hidden', !isLining);
            }
        
            if (isCustomSourcing) {
                // A. 定制找样模式 UI
                [modeSwitcher, solidArea, printArea].forEach(area => area?.classList.add('hidden'));
                customForm.classList.remove('hidden');
                document.getElementById('selected-fabric-display').innerText = `${selection.originalCatName}：定制开发/全球找样`;
                
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
                document.getElementById('selected-fabric-display').innerText = `${selection.originalCatName}：${name}`;
                
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
                if (file.size > 20 * 1024 * 1024) { alert(`文件 ${file.name} 超过 20MB`); return; }
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
                const isImage = file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                
                const content = isImage 
                    ? `<img src="${URL.createObjectURL(file)}" onclick="openOemPreview(this.src, '${file.name}')" style="cursor:zoom-in;">`
                    : `<div style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f1f5f9; color:#64748b; font-size:10px; font-weight:bold;">${ext}</div>`;
                    
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
        function updateSolidColorInput() {
            if(!activeFabricCat || !fabricSelection[activeFabricCat] || !fabricSelection[activeFabricCat].activeName) return;
            const config = fabricSelection[activeFabricCat].configs[fabricSelection[activeFabricCat].activeName];
            config.colorText = document.getElementById('fabric-color-input').value.trim();
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
                alert(_t('该面料暂未配置高清物理色卡照片，请直接填写您需要的色号或颜色描述。'));
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
                sumFabricEl.innerHTML = hasSelection ? html : '<div style="text-align:right; font-size:12px; color:#94a3b8;">' + _t('未选') + '</div>';
            }
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
                return true; 
            }
            stEl.innerText = '不需要';
            stEl.style.color = '#64748b'; 
            stEl.style.fontWeight = 'normal';
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
                if (file.size > 20 * 1024 * 1024) { alert(`文件 ${file.name} 超过 20MB`); return; }
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
                const isImage = file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                const shortName = file.name.length > 6 ? file.name.substring(0,3) + '...' : file.name;
                
                let content = isImage 
                    ? `<img src="${URL.createObjectURL(file)}" onclick="openOemPreview(this.src, '${file.name}')" style="width:100%;height:100%;object-fit:cover;">` 
                    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:10px;font-weight:bold;">${ext}</div>`;
                    
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
            labelConfig.isSet = checked; // 与吊牌统一使用类似的概念
            
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
                warningText.innerHTML = "<strong>成本提醒：</strong>无感印标建议设计为 <strong>单色 (黑色或白色)</strong>。如需彩色渐变或多色套印，开版费及单价较高。";
            } else if (name === 'TPU标') {
                hasWarning = true;
                warningText.innerHTML = "<strong>成本提醒：</strong>TPU 柔感标建议选择 <strong>常规黑色</strong>。如需指定特殊底色或彩色字，需满足较高的起订量 (MOQ) 且成本较高。";
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
                if (file.size > 20 * 1024 * 1024) { alert(`文件 ${file.name} 超过 20MB`); return; }
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
                if (file.size > 20 * 1024 * 1024) { alert(`文件 ${file.name} 超过 20MB`); return; }
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
                const isImage = file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                let content = isImage 
                    ? `<img src="${URL.createObjectURL(file)}" onclick="openOemPreview(this.src, '${file.name}')" style="width:100%;height:100%;object-fit:cover;">` 
                    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:10px;font-weight:bold;">${ext}</div>`;
        
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
                if (file.size > 20 * 1024 * 1024) { alert(`文件 ${file.name} 超过 20MB`); return; }
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
                const isImage = file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                const shortName = file.name.length > 5 ? file.name.substring(0, 4) + '..' : file.name;
                
                let content = isImage 
                    ? `<img src="${URL.createObjectURL(file)}" onclick="openOemPreview(this.src, '${file.name}')" style="width:100%;height:100%;object-fit:cover;">` 
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
                if (file.size > 20 * 1024 * 1024) { alert(`文件 ${file.name} 超过 20MB`); return; }
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
                const isImage = file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                let content = isImage 
                    ? `<img src="${URL.createObjectURL(file)}" onclick="openOemPreview(this.src, '${file.name}')" style="width:100%;height:100%;object-fit:cover;">` 
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
            const hasContent = (labelConfig.remark !== '' || labelConfig.designFiles.length > 0) ? '✓ 已传稿/内容' : '× 待补内容';
        
            if (labelConfig.mode === 'auto') {
                st.innerHTML = `<div style="text-align:right;"><span style="color:#10b981; font-weight:600;">红绣智能代配</span><br><span style="font-size:10px; opacity:0.8;">内容: ${hasContent}</span></div>`;
            } else {
                const sizeVal = document.getElementById('label-custom-size')?.value.trim() || '';
                labelConfig.size = sizeVal;
                
                // 抓取主洗标分开的详细备注
                const splitVal = document.getElementById('label-split-remark')?.value.trim() || '';
                labelConfig.splitRemark = splitVal;
        
                const matText = labelConfig.material;
                let sizeText = '';
                let sewingText = '';
        
                if (matText === '其他') {
                    sizeText = '尺寸与缝制详见描述';
                } else if (matText === '印标') {
                    sizeText = sizeVal ? `尺寸: ${sizeVal}` : '尺寸待定';
                } else {
                    sizeText = sizeVal ? `尺寸: ${sizeVal}` : '尺寸待定';
                    
                    // 抓取并展示自定义缝制的描述
                    labelConfig.sewingRemark = document.getElementById('label-sewing-remark')?.value.trim() || '';
                    if (labelConfig.method === '其他') {
                        sewingText = labelConfig.sewingRemark ? ' | 自定义缝制' : ' | 缝制待说明';
                    } else {
                        sewingText = ` | ${labelConfig.method}`;
                    }
                }
                
                // 组装多个部件的位置文本
                let placementHtml = '';
                const comps = labelConfig.components;
                
                if (comps.includes('上装/连体')) {
                    let pos = labelConfig.placements.top;
                    if (pos === '自定义其他位置') {
                        const customVal = document.getElementById('label-custom-top-text')?.value.trim();
                        pos = customVal ? customVal : '其他位置';
                    } else {
                        pos = pos.split(' (')[0];
                    }
                    placementHtml += `<span style="font-size:10px; opacity:0.8; display:block;">[上装] ${pos}${sewingText}</span>`;
                }
                
                if (comps.includes('下装/裤装')) {
                    let pos = labelConfig.placements.bottom;
                    if (pos === '自定义其他位置') {
                        const customVal = document.getElementById('label-custom-bottom-text')?.value.trim();
                        pos = customVal ? customVal : '其他位置';
                    } else {
                        pos = pos.split(' (')[0];
                    }
                    placementHtml += `<span style="font-size:10px; opacity:0.8; display:block;">[下装] ${pos}${sewingText}</span>`;
                }
        
                // --- 新增：主洗标分开标记 ---
                const splitText = labelConfig.isSet ? '<span style="color:var(--primary-color);"> [主洗标分开]</span>' : '';
        
                st.innerHTML = `
                    <div style="text-align:right;">
                        ${matText}${splitText}<br>
                        ${placementHtml}
                        <span style="font-size:10px; opacity:0.8;">${sizeText} | ${hasContent}</span>
                    </div>`;
            }
            st.style.color = 'var(--primary-color)'; 
            st.style.fontWeight = 'bold';
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
                if (file.size > 20 * 1024 * 1024) { alert(`文件 ${file.name} 超过 20MB`); return; }
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
                const isImage = file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                
                let content = isImage 
                    ? `<img src="${URL.createObjectURL(file)}" onclick="openOemPreview(this.src, '${file.name}')">` 
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
        
            const textStatus = hasText ? '有需求描述' : '无文字描述';
            const fileStatus = fileCount > 0 ? ` + ${fileCount}附件` : '';
        
            st.innerHTML = `<div style="text-align:right;">定制特殊辅料<br><span style="font-size:10px; opacity:0.8;">${textStatus}${fileStatus}</span></div>`;
            st.style.color = 'var(--primary-color)'; 
            st.style.fontWeight = 'bold';
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
            const noneCard = allCards.find(card => card.innerText.includes('无附加工艺'));
        
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
            const otherEl = allCards.find(c => c.innerText.includes('其他'));
            
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
                const isImage = file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                
                // 创建预览内容
                let previewContent = '';
                if (isImage) {
                    // 生成临时预览 URL
                    const url = URL.createObjectURL(file);
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
                const hasFile = hangtagConfig.designFiles.length > 0 ? '✓ 已传稿' : '× 待传稿';
                st.innerHTML = `<div style="text-align:right;"><span style="color:#10b981; font-weight:600;">红绣智能代配</span><br><span style="font-size:10px; opacity:0.8;">设计稿: ${hasFile}</span></div>`;
            } else {
                // 1. 材质与克重
                let matDisplay = hangtagConfig.material.split(' ')[0];
                if (!['其他'].includes(hangtagConfig.material)) {
                    matDisplay += ` (${hangtagConfig.weight})`;
                }
        
                // 2. 子母牌标记
                const setText = hangtagConfig.isSet ? '<span style="color:var(--primary-color);"> [子母牌]</span>' : '';
        
                // 3. 工艺多选处理
                const craftDisplay = hangtagConfig.crafts.join(', ');
        
                // 4. 颜色处理
                let colorDisplay = hangtagConfig.stringColor;
                if (colorDisplay === '其他') {
                    const val = document.getElementById('hangtag-string-color-other')?.value.trim();
                    colorDisplay = val ? val : '其他色';
                }

                // 5. 吊粒类型精简提取 (修复点：将类型真正显示出来)
                let stringTypeDisplay = hangtagConfig.stringType;
                if (stringTypeDisplay.includes('方块')) stringTypeDisplay = '方块';
                else if (stringTypeDisplay.includes('子弹头')) stringTypeDisplay = '子弹头';
                else if (stringTypeDisplay.includes('定制')) stringTypeDisplay = '定制';
        
                st.innerHTML = `
                    <div style="text-align:right;">
                        ${matDisplay}${setText} | ${hangtagConfig.shape.split(' ')[0]}${hangtagConfig.roundedCorner ? ' [圆角]' : ''}<br>
                        <span style="font-size:10px; opacity:0.8;">工艺: ${craftDisplay}</span><br>
                        <span style="font-size:10px; opacity:0.8;">吊粒: ${colorDisplay} | ${stringTypeDisplay}</span>
                    </div>`;
            }
            st.style.color = 'var(--primary-color)';
            st.style.fontWeight = 'bold';
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
                if (file.size > 20 * 1024 * 1024) { alert(`文件 ${file.name} 超过 20MB`); return; }
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
                const isImage = file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                
                let content = isImage 
                    ? `<img src="${URL.createObjectURL(file)}" onclick="openOemPreview(this.src, '${file.name}')" style="width:100%;height:100%;object-fit:cover;">` 
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
                const isImage = file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                
                let content = '';
                if (isImage) {
                    const url = URL.createObjectURL(file);
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
            if (!confirm(_t('确定要清空下方已选择的所有金属明细吗？'))) return;
            
            // 1. 清空数据
            metalConfig.categories = [];
            metalConfig.details = {};
            metalConfig.activeCategory = '';
            
            // 2. 隐藏面板与取消 UI 选中态
            document.getElementById('metal-config-panel').classList.add('hidden');
            document.querySelectorAll('#metal-category-grid .metal-item').forEach(item => {
                item.classList.remove('selected');
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
                if (file.size > 20 * 1024 * 1024) { alert(`文件 ${file.name} 超过 20MB`); return; }
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
                const isImage = file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                
                // 核心修复：如果是图片就渲染 img，否则渲染格式方块
                const content = isImage 
                    ? `<img src="${URL.createObjectURL(file)}" onclick="openOemPreview(this.src, '${file.name}')">` 
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
                    let sceneDesc = "适配常规衣物";
                    const match = size.match(/(\d+)/);
                    if (match) {
                        const width = parseInt(match[1]);
                        if (width < 25) sceneDesc = "适合内衣/泳装/小配件";
                        else if (width >= 25 && width <= 32) sceneDesc = "适合常规T恤/背心";
                        else if (width > 32) sceneDesc = "适合卫衣/长裤/外套";
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
                    <div class="size-val" style="color:#64748b;">自定义规格</div>
                    <div class="size-scene">MOQ 5000起订</div>
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
                const isImage = file.type.startsWith('image/');
                const content = isImage 
                    ? `<img src="${URL.createObjectURL(file)}" onclick="openOemPreview(this.src, '${file.name}')">` 
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
                st.innerText = '已开启 (待选择材质)'; 
                st.style.color = 'var(--primary-color)'; st.style.fontWeight = 'bold';
                return; 
            } 
            
            const matPart = bagConfig.material;
            const sizePart = bagConfig.size !== '未选尺寸' ? bagConfig.size.split(' ')[0] : '尺寸待定';
            
            // 组装工艺文字
            let printText = bagConfig.print === '空白无印' ? '无印' : bagConfig.print;
            if (bagConfig.crafts.length > 0) printText += `+${bagConfig.crafts.length}工艺`;

            const hasFile = bagConfig.designFiles.length > 0 ? `<br><span style="font-size:10px; color:#10b981;">+已传设计图(${bagConfig.designFiles.length})</span>` : '';

            st.innerHTML = `<div style="text-align:right;">${matPart} | ${sizePart}<br><span style="font-size:10px; opacity:0.8;">${printText}</span>${hasFile}</div>`;
            st.style.color = 'var(--primary-color)'; 
            st.style.fontWeight = 'bold';
        }

        // ==========================================
        // 大货装箱与包装附件处理
        // ==========================================
        let bulkPackingFiles = [];
        
        function handleBulkPackingFiles(input) {
            const files = Array.from(input.files);
            files.forEach(file => {
                if (file.size > 20 * 1024 * 1024) { alert(`文件 ${file.name} 超过 20MB`); return; }
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
                const isImage = file.type.startsWith('image/');
                const content = isImage 
                    ? `<img src="${URL.createObjectURL(file)}" onclick="openOemPreview(this.src, '${file.name}')">` 
                    : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:10px;">DOC</div>`;
                
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
                    alert(`文件 ${file.name} 超过 50MB 限制`); 
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
                const isImage = file.type.startsWith('image/');
                const ext = file.name.split('.').pop().toUpperCase();
                
                let content = isImage 
                    ? `<img src="${URL.createObjectURL(file)}" onclick="openOemPreview(this.src, '${file.name}')">` 
                    : `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#f1f5f9;color:#64748b;font-size:11px;font-weight:800;border-radius:6px;border:1px solid #e2e8f0;"><span>${ext}</span></div>`;
                
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
                const dest = destEl ? (destEl.value || '待定国') : '待定国';
                
                let totalItems = 0;
                let validRowsCount = 0;
                
                if (typeof sampleRows !== 'undefined' && sampleRows.length > 0) {
                    sampleRows.forEach(row => {
                        if (row.style && row.style !== "") validRowsCount++;
                        totalItems += parseInt(row.qty) || 0;
                    });
                }
        
                // 快递方式安全读取 (增加默认值防止 split 报错)
                const carrier = (sampleConfig && sampleConfig.carrier) ? sampleConfig.carrier.split(' ')[0] : '待定';

                let intentText = '';
                if (sampleConfig && sampleConfig.needBulkQuote) {
                    // 获取数量
                    const qtyEl = document.getElementById('sample-intent-qty');
                    const qtyText = (qtyEl && qtyEl.value) ? `${qtyEl.value}件` : '数量待定';
                    
                    // 【新增】获取目标单价
                    const priceEl = document.getElementById('sample-intent-price');
                    const priceText = (priceEl && priceEl.value) ? `(目标 $${priceEl.value})` : '';
        
                    const term = sampleConfig.intentTerm || 'DDP';
                    const method = sampleConfig.intentMethod ? sampleConfig.intentMethod.split(' ')[0] : '海运';
                    
                    // 将单价拼接到汇总文本中
                    intentText = `<br><span style="font-size:10px; color:var(--primary-color);">评估大货: ${qtyText} ${priceText} | ${term} | ${method}</span>`;
                }
        
                sumEl.innerHTML = `
                    <div style="text-align:right;">
                        <span style="color:var(--text-main); font-weight:700;">打样阶段 (${dest})</span><br>
                        <span style="font-size:11px; color:#64748b;">清单: ${validRowsCount}项 / 共${totalItems}件 | 快递: ${carrier}</span>
                        ${intentText}
                    </div>
                `;
                
            } else {
                // 大货模式安全读取
                const destEl = document.getElementById('bulk-destination');
                const dest = destEl ? (destEl.value || '待定国') : '待定国';
                
                const stylesEl = document.getElementById('bulk-style-count');
                const styles = stylesEl ? (stylesEl.value || '0') : '0';
                
                const qtyEl = document.getElementById('bulk-qty-per-style');
                const qty = qtyEl ? (qtyEl.value || '0') : '0';
                
                const sizeEl = document.getElementById('bulk-size-range');
                const sizeRange = (sizeEl && sizeEl.value) ? sizeEl.value.split(' ')[0] : '待定尺码';
                
                const term = (bulkLogisticsConfig && bulkLogisticsConfig.term) ? bulkLogisticsConfig.term.split(' ')[0] : 'DDP';
                const method = (bulkLogisticsConfig && bulkLogisticsConfig.method) ? bulkLogisticsConfig.method : '海运';
                
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
                const targetPrice = (targetPriceEl && targetPriceEl.value) ? `(目标 $${targetPriceEl.value})` : '';
                const hasPackingFiles = bulkPackingFiles.length > 0 ? `<br><span style="font-size:10px; color:#10b981;">+已传包装要求图(${bulkPackingFiles.length})</span>` : '';
        
                sumEl.innerHTML = `
                    <div style="text-align:right;">
                        <span style="color:var(--primary-color); font-weight:700;">大货订单 (${dest})</span><br>
                        <span style="font-size:11px; color:#64748b;">清单: ${bulkStylesCount}款 / 共${totalBulkQty}件 ${targetPrice}</span><br>
                        <span style="font-size:10px; color:#94a3b8;">${bulkLogisticsConfig.term} | ${bulkLogisticsConfig.method}</span>
                    </div>
                `;

            }
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
        
                tr.innerHTML = `
                    <td>
                        <select class="bulk-table-input" onchange="updateBulkRowData(${index}, 'style', this.value)">
                            ${currentOptions}
                        </select>
                    </td>
                    <td>
                        <input type="number" class="bulk-table-input" value="${row.qty}" min="0" 
                               onchange="validateMOQ(${index}, this.value)" 
                               oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                    </td>
                    <td>
                        <textarea class="bulk-table-input" placeholder="例：&#10;S: 20&#10;M: 50&#10;L: 30" 
                                  oninput="updateBulkRowData(${index}, 'sizeDetail', this.value)">${row.sizeDetail}</textarea>
                    </td>
                    <td>
                        <textarea class="bulk-table-input" placeholder="例：&#10;主体黑色，撞色滚边&#10;注意防水拉链" 
                                  oninput="updateBulkRowData(${index}, 'desc', this.value)">${row.desc}</textarea>
                    </td>
                    <td style="text-align:center;">
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
                alert(`⚠️ 起订量提醒：\n您选择的是 ${typeName}，该类型单款最低起订量为 ${minAllowed} 件。\n\n系统已自动为您调整为最低起订量。`);
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
            const newRow = { style: '', type: '初版样 (Proto)', size: 'M', qty: 1, desc: '' };
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
                sampleRows[0] = { style: '', type: '初版样 (Proto)', size: 'M', qty: 1, desc: '' };
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
            
            let hasHighQty = false; // 标记是否存在数量 > 2 的行
        
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
                tr.innerHTML = `
                    <td>
                        <select onchange="updateRowData(${index}, 'style', this.value)">
                            ${rowStyleOptions}
                        </select>
                    </td>
                    <td>
                        <select onchange="updateRowData(${index}, 'type', this.value)">
                            <option value="初版样 (Proto)" ${row.type==='初版样 (Proto)'?'selected':''}>初版样 (Proto)</option>
                            <option value="修改/试穿样 (Fit)" ${row.type==='修改/试穿样 (Fit)'?'selected':''}>修改/试穿样 (Fit)</option>
                            <option value="正确/产前样 (PP)" ${row.type==='正确/产前样 (PP)'?'selected':''}>正确/产前样 (PP)</option>
                        </select>
                    </td>
                    <td>
                        <input type="text" list="common-sizes" value="${row.size}" placeholder="选或填" onchange="updateRowData(${index}, 'size', this.value)">
                    </td>
                    <td>
                        <input type="number" value="${row.qty}" min="1" oninput="updateRowData(${index}, 'qty', this.value)">
                    </td>
                    <td>
                        <input type="text" value="${row.desc}" placeholder="例: 黑色碎花款" oninput="updateRowData(${index}, 'desc', this.value)">
                    </td>
                    <td style="text-align:center;">
                        <button type="button" class="btn-remove-row" onclick="removeSampleRow(${index})">&times;</button>
                    </td>
                `;
                
                // 检查收费预警
                if (parseInt(row.qty) > 2) {
                    hasHighQty = true;
                }
        
                tbody.appendChild(tr);
            });
        
            // 处理收费预警框显隐
            const warningEl = document.getElementById('sample-qty-warning');
            if (warningEl) {
                if (hasHighQty) {
                    warningEl.classList.remove('hidden');
                } else {
                    warningEl.classList.add('hidden');
                }
            }
        
            calculateSampleCost(); 
            updateLogisticsSummary();
        }

        // 标签合规提示弹窗控制
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
            // 如果修改的是数量，需要重绘表格以触发布板费预警（数量>2件）
            if (field === 'qty') {
                renderSampleTable(); 
            } else {
                // 其他字段修改（如款式、尺码、描述等）只需更新汇总和费用
                calculateSampleCost();
                updateLogisticsSummary();
            }
        }

        
        // 修改 switchDeliveryMode 的触发
        function switchDeliveryMode(mode) {
            currentDeliveryMode = mode;
            document.querySelectorAll('#step-4 .mode-option').forEach(opt => opt.classList.remove('active'));
            document.getElementById(`delivery-mode-${mode}`).classList.add('active');
            
            document.getElementById('pane-delivery-sample').classList.toggle('hidden', mode !== 'sample');
            document.getElementById('pane-delivery-bulk').classList.toggle('hidden', mode !== 'bulk');
            
            if (mode === 'sample') initSampleTab();
            updateLogisticsSummary();
        }

        // ==========================================
        // 打样费用计算核心逻辑
        // ==========================================
        // 3. 优化计算逻辑 (确保能抓取到最新值)
        function calculateSampleCost() {
            const totalEl = document.getElementById('sample-fee-total');
            const detailsEl = document.getElementById('sample-fee-details');
            if (!totalEl || !detailsEl) return;
        
            const RATES = { PATTERN_OEM: 20, GRADING: 10, DEV_MANAGE: 10, SEWING_PROTO: 10, SEWING_FIT_PP: 20, LOGO_SETUP: 25, PRINT_SETUP: 10 };
        
            let totalPattern = 0, totalManage = 0, totalGrading = 0, totalSewing = 0, totalOptional = 0;
            const uniqueStyles = new Set();
            let hasHighQty = false;
        
            sampleRows.forEach(row => {
                if (!row.style || row.style === "") return;
                
                uniqueStyles.add(row.style);
                
                // 计算件数费
                const qty = parseInt(row.qty) || 0;
                const sewingRate = row.type.includes('Proto') ? RATES.SEWING_PROTO : RATES.SEWING_FIT_PP;
                totalSewing += sewingRate * qty;
                
                if (qty > 2) hasHighQty = true;
            });
        
            uniqueStyles.forEach(styleName => {
                totalManage += RATES.DEV_MANAGE;
                totalGrading += RATES.GRADING;
                if (styleName.startsWith('OEM')) totalPattern += RATES.PATTERN_OEM;
            });
        
            // 这里可以根据实际需要开启印花/Logo检测...
            // (逻辑同上一步)
        
            const grandTotal = totalPattern + totalManage + totalGrading + totalSewing + totalOptional;
        
            // 更新 UI
            if (uniqueStyles.size === 0) {
                detailsEl.innerHTML = "尚未添加任何款式到打样清单...";
                totalEl.innerText = "$0.00";
            } else {
                // 优化费用明细输出格式
                detailsEl.innerHTML = `
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span>基础开发与管理 (${uniqueStyles.size}款)</span>
                        <span style="font-weight:600; color:#475569;">$${totalManage + totalGrading}.00</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
                        <span>OEM 新版制版费</span>
                        <span style="font-weight:600; color:#475569;">$${totalPattern}.00</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; padding-top:6px; border-top:1px dashed #e2e8f0;">
                        <span>样衣制作工时费 (总计)</span>
                        <span style="font-weight:600; color:#475569;">$${totalSewing}.00</span>
                    </div>
                `;
                totalEl.innerText = `$${grandTotal.toFixed(2)}`;
            }
        
            // 预警框显隐
            const warn = document.getElementById('sample-qty-warning');
            if (warn) hasHighQty ? warn.classList.remove('hidden') : warn.classList.add('hidden');
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
                ['tech', 'ref'].forEach(type => {
                    if (oemFilesData[type] && oemFilesData[type].length > 0) {
                        oemFilesData[type].forEach(file => {
                            if (file.previewUrl) URL.revokeObjectURL(file.previewUrl);
                        });
                    }
                });

                // 2. 清空全局数据对象
                oemFilesData = { tech: [], ref: [] };
                oemStyleDescriptions = []; // 清空款式简述数组
                
                // 3. 清空 DOM 输入与预览区域
                document.getElementById('oemRefPreview').innerHTML = '';
                document.getElementById('oemTechPreview').innerHTML = '';
                document.getElementById('oem-remark').value = '';
                
                // --- 修复点：彻底清空 A. 项目基本信息 ---
                const collectionNameInput = document.getElementById('oem-collection-name');
                if (collectionNameInput) collectionNameInput.value = '';
                
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

        function clearAllSelections() {
            if (!confirm(_t('确定要清空所有已选配置并重头开始吗？'))) return;

            // 安全获取元素的辅助函数
            const _el = (id) => document.getElementById(id);
            const _q = (sel) => document.querySelector(sel);

            // 1. 重置 ODM/OEM
            selectedOdmStyles = []; 
            document.querySelectorAll('.style-item').forEach(item => item.classList.remove('selected'));
            const sumStyle = _el('sum-style'); if (sumStyle) sumStyle.innerText = '未选择';
            odmCustomData = {}; currentEditingStyle = '';

            document.querySelectorAll('.custom-badge').forEach(badge => badge.classList.remove('active'));
            
            oemFilesData = { tech: [], ref: [] };
            const oemRefPreview = _el('oemRefPreview'); if (oemRefPreview) oemRefPreview.innerHTML = '';
            const oemTechPreview = _el('oemTechPreview'); if (oemTechPreview) oemTechPreview.innerHTML = '';
            const oemRemark = _el('oem-remark'); if (oemRemark) oemRemark.value = '';
            const oemPhysical = _el('oem-physical'); if (oemPhysical) { oemPhysical.checked = false; togglePhysicalInfo(false); }
            const oemAddr = _q('#oem-address-info input'); if(oemAddr) oemAddr.value = '';

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
            
            let resetHtml = '';
            for (let key in fabricSelection) {
                resetHtml += `<div style="font-size:12px; margin-bottom:4px; color:var(--text-main); text-align:right;">${fabricSelection[key].originalCatName}: 未选</div>`;
            }
            const sumFabric = _el('sum-fabric'); if (sumFabric) sumFabric.innerHTML = resetHtml || '未选';

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
            if (sumTrimMetal) { sumTrimMetal.innerText = '不需要'; sumTrimMetal.style.color = '#666'; sumTrimMetal.style.fontWeight = 'normal'; }
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

            // 4. 重置物流
            const logDest = _el('logistics-destination'); if (logDest) logDest.value = '';
            const tradeTerm = _q('input[name="trade_term"][value="DDP"]') || _q('input[name="bulk_trade_term"][value="DDP"]');
            if (tradeTerm) tradeTerm.checked = true;
            const logSinglePack = _el('logistics-single-pack'); if (logSinglePack) logSinglePack.selectedIndex = 0;
            const logCartonRule = _el('logistics-carton-rule'); if (logCartonRule) logCartonRule.selectedIndex = 0;
            const logRemark = _el('logistics-remark'); if (logRemark) logRemark.value = '';
            
            document.querySelectorAll('.logistics-method').forEach((item, idx) => {
                if(idx === 2) item.classList.add('selected');
                else item.classList.remove('selected');
            });
            
            document.querySelectorAll('.logistics-addon').forEach(item => item.classList.remove('selected'));
            
            logisticsConfig = { term: 'DDP 双清包税到门', method: 'Sea Freight (海运快船)', addons: [] };
            if (typeof updateLogisticsSummary === 'function') updateLogisticsSummary();

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

            // 6. 返回第一步
            if (currentStep !== 1) changeStep(1 - currentStep); 
        }

                // --- 新增：清空当前面料分类的选择 ---
        function clearCurrentFabric() {
            if (!activeFabricCat || !fabricSelection[activeFabricCat]) return;
            if (fabricSelection[activeFabricCat].activeName === '') return; // 修正：判断 activeName
            
            const catName = fabricSelection[activeFabricCat].originalCatName;
            if (!confirm(_t(`确定要清空 [${catName}] 的选择吗？`))) return; // 建议加上防误触提示

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

