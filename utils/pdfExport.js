/**
 * PDF Export for Inquiry Details
 * Uses pdfmake to generate structured PDF documents with Chinese font support
 */
const PdfPrinter = require('pdfmake');
const https = require('https');
const http = require('http');
const sharp = require('sharp');
const { ensureFonts } = require('./fontLoader');

const FILE_BASE = 'https://files.yiswim.cloud/uploads/inquiries/';

/* ── i18n dictionary ── */
const I18N = {
    zh: {
        docTitle: '红绣服饰 · 询盘单',
        inquiryNo: '询盘编号',
        status: '状态',
        createdAt: '创建时间',
        deliveryMode: '交付模式',
        brand: '品牌',
        contact: '联系人',
        page: '第 {0} / {1} 页',
        generatedAt: '生成时间',
        // Status
        statusPending: '待处理', statusProcessing: '处理中', statusQuoted: '已报价', statusClosed: '已关闭',
        // Modes
        bulkOrder: '大货订单', sampleOrder: '样衣订单',
        // Section titles
        sec1: '一、款式信息', sec2: '二、面料信息', sec3: '三、辅料 / 包装', sec4: '四、交付信息', sec5: '五、联系信息', sec6: '六、附件清单',
        // Style
        odmSelected: '【ODM 已选款式】', oemDesign: '【OEM 自主设计】',
        customRemark: '轻定制备注', customFiles: '轻定制文件',
        projectName: '项目名称', styleCount: '款式数量', styleDesc: '款式描述',
        designFiles: '设计文件', remark: '备注', sampleShipping: '寄送样衣', shipped: '已寄送',
        // Fabric
        solid: '纯色', print: '印花', customSourcing: '开发/找样',
        color: '颜色', colorDesc: '色彩描述',
        printType: '印花类型', seamless: '满版印花', placement: '定位印花',
        printPatternFiles: '印花图案文件', refColor: '参考底色', printScale: '缩放比例',
        reqDesc: '需求描述', composition: '成分', gsm: '克重', colorReq: '颜色要求',
        physicalSend: '实物邮寄', fullLining: '全衬里', liningPlacement: '衬里位置',
        colorBlock: '拼色说明', refFiles: '参考文件',
        cmtFabric: '客户自行提供面料 (CMT)', detailDesc: '明细描述', trackingNo: '寄件单号',
        cmtFabricFiles: '客供面料文件',
        // Trims
        metalHardware: '五金配件', chestPad: '胸垫', packBag: '包装袋', hangTag: '吊牌',
        label: '标签', hygieneSticker: '卫生贴', other: '其他',
        mode: '模式', autoMode: '红绣标配', customMode: '客户自定义',
        surfaceFinish: '表面处理', logoCustom: 'LOGO定制', needed: '需要', logoType: 'LOGO类型',
        independentLogo: '独立LOGO',
        thickness: '厚度', customShape: '异形',
        material: '材质', size: '尺寸', printing: '印刷', craft: '工艺',
        designDesc: '设计描述', weight: '克重', shape: '形状', roundedCorner: '圆角',
        shapeDesc: '形状说明', craftDesc: '工艺说明', string: '吊绳', stringColor: '绳色',
        subBrand: '副牌', have: '有',
        sewMethod: '缝制方式', sewDesc: '缝制说明', components: '部件',
        position: '位置', mainWashSplit: '主标与洗水标', splitCustom: '分开定制', splitDesc: '分开说明',
        noStick: '免粘贴', shapeReq: '异形要求', stickRule: '粘贴规则',
        cmtSupply: '客户自行提供 (CMT)',
        attachments: '附件', cmtAttachments: 'CMT附件', otherFiles: '其他文件',
        // Shipping
        sampleDetail: '样衣明细', style: '款式', type: '类型', sizeCol: '尺码', qty: '数量',
        sampleLogistics: '样衣物流', carrier: '物流方式', needBulkQuote: '需大货报价',
        estBulkQty: '预估大货数量', pcs: '件', targetEXW: '期望EXW单价',
        tradeTerm: '贸易术语', shippingMethod: '运输方式', sampleDest: '样衣目的地',
        bulkDetail: '大货明细', sizeAlloc: '尺码分配',
        bulkLogistics: '大货物流', bulkDest: '大货目的地', targetPrice: '目标价格',
        packRemark: '包装备注', packRefFiles: '包装参考文件', techPlanFiles: '综合工艺单 / 企划书',
        // Contact
        contactPerson: '联系人', contactInfo: '联系方式', brandName: '品牌名称', website: '网站',
        overallRemark: '整体备注', ndaSigned: 'NDA 签署', signed: '已签署',
        // Files table
        fileName: '文件名', fileSize: '大小', fileCategory: '分类',
        yes: '是', no: '否',
    },
    en: {
        docTitle: 'Hongxiu Apparel · Inquiry Sheet',
        inquiryNo: 'Inquiry No.',
        status: 'Status',
        createdAt: 'Created',
        deliveryMode: 'Delivery Mode',
        brand: 'Brand',
        contact: 'Contact',
        page: 'Page {0} / {1}',
        generatedAt: 'Generated',
        statusPending: 'Pending', statusProcessing: 'Processing', statusQuoted: 'Quoted', statusClosed: 'Closed',
        bulkOrder: 'Bulk Order', sampleOrder: 'Sample Order',
        sec1: '1. Style Information', sec2: '2. Fabric Information', sec3: '3. Trims / Packaging', sec4: '4. Delivery Information', sec5: '5. Contact Information', sec6: '6. Attachments',
        odmSelected: '[ODM Selected Styles]', oemDesign: '[OEM Custom Design]',
        customRemark: 'Customization Remark', customFiles: 'Customization Files',
        projectName: 'Project Name', styleCount: 'Style Count', styleDesc: 'Style Descriptions',
        designFiles: 'Design Files', remark: 'Remark', sampleShipping: 'Sample Shipping', shipped: 'Shipped',
        solid: 'Solid', print: 'Print', customSourcing: 'Custom Sourcing',
        color: 'Color', colorDesc: 'Color Description',
        printType: 'Print Type', seamless: 'Seamless Pattern', placement: 'Placement Print',
        printPatternFiles: 'Print Pattern Files', refColor: 'Reference Color', printScale: 'Print Scale',
        reqDesc: 'Requirement', composition: 'Composition', gsm: 'GSM', colorReq: 'Color Requirement',
        physicalSend: 'Physical Sample', fullLining: 'Full Lining', liningPlacement: 'Lining Placement',
        colorBlock: 'Color Blocking Notes', refFiles: 'Reference Files',
        cmtFabric: 'Customer-Supplied Fabric (CMT)', detailDesc: 'Details', trackingNo: 'Tracking No.',
        cmtFabricFiles: 'CMT Fabric Files',
        metalHardware: 'Metal Hardware', chestPad: 'Chest Pad', packBag: 'Packaging Bag', hangTag: 'Hang Tag',
        label: 'Label', hygieneSticker: 'Hygiene Sticker', other: 'Other',
        mode: 'Mode', autoMode: 'Hongxiu Standard', customMode: 'Customer Custom',
        surfaceFinish: 'Surface Finish', logoCustom: 'Logo Custom', needed: 'Needed', logoType: 'Logo Type',
        independentLogo: 'Independent Logo',
        thickness: 'Thickness', customShape: 'Custom Shape',
        material: 'Material', size: 'Size', printing: 'Printing', craft: 'Craft',
        designDesc: 'Design Description', weight: 'Weight', shape: 'Shape', roundedCorner: 'Rounded Corner',
        shapeDesc: 'Shape Description', craftDesc: 'Craft Description', string: 'String', stringColor: 'String Color',
        subBrand: 'Sub-brand', have: 'Yes',
        sewMethod: 'Sewing Method', sewDesc: 'Sewing Description', components: 'Components',
        position: 'Position', mainWashSplit: 'Main & Wash Label', splitCustom: 'Separate Custom', splitDesc: 'Split Description',
        noStick: 'No Adhesive', shapeReq: 'Shape Requirement', stickRule: 'Adhesive Rule',
        cmtSupply: 'Customer-Supplied (CMT)',
        attachments: 'Attachments', cmtAttachments: 'CMT Attachments', otherFiles: 'Other Files',
        sampleDetail: 'Sample Details', style: 'Style', type: 'Type', sizeCol: 'Size', qty: 'Qty',
        sampleLogistics: 'Sample Logistics', carrier: 'Carrier', needBulkQuote: 'Bulk Quote Needed',
        estBulkQty: 'Est. Bulk Qty', pcs: 'pcs', targetEXW: 'Target EXW Price',
        tradeTerm: 'Trade Term', shippingMethod: 'Shipping Method', sampleDest: 'Sample Destination',
        bulkDetail: 'Bulk Details', sizeAlloc: 'Size Allocation',
        bulkLogistics: 'Bulk Logistics', bulkDest: 'Bulk Destination', targetPrice: 'Target Price',
        packRemark: 'Packing Remark', packRefFiles: 'Packing Reference Files', techPlanFiles: 'Tech Pack / Planning Docs',
        contactPerson: 'Contact', contactInfo: 'Contact Info', brandName: 'Brand Name', website: 'Website',
        overallRemark: 'Overall Remark', ndaSigned: 'NDA', signed: 'Signed',
        fileName: 'File Name', fileSize: 'Size', fileCategory: 'Category',
        yes: 'Yes', no: 'No',
    }
};

function getT(lang) {
    const dict = I18N[lang] || I18N.zh;
    return (key, ...args) => {
        let s = dict[key] || I18N.zh[key] || key;
        args.forEach((v, i) => { s = s.replace('{' + i + '}', v); });
        return s;
    };
}

/* ── Helpers ── */
function tryParse(v) {
    if (v == null) return null;
    if (typeof v === 'object') return v;
    try { return JSON.parse(v); } catch { return v; }
}

function fmtDate(s) {
    if (!s) return '-';
    const d = new Date(s);
    const pad = n => n < 10 ? '0' + n : String(n);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
}

function statusLabel(s, t) {
    const m = { pending: t('statusPending'), processing: t('statusProcessing'), quoted: t('statusQuoted'), closed: t('statusClosed') };
    return m[s] || s || t('statusPending');
}

function formatSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/* ── Fetch remote image as base64 data URI (with timeout & size limit) ── */
function fetchImageAsBase64(url, maxWidth = 200) {
    return new Promise((resolve) => {
        const timer = setTimeout(() => resolve(null), 8000);
        const proto = url.startsWith('https') ? https : http;
        const doRequest = (reqUrl) => {
            proto.get(reqUrl, (res) => {
                if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                    doRequest(res.headers.location);
                    return;
                }
                if (res.statusCode !== 200) { clearTimeout(timer); resolve(null); return; }
                const chunks = [];
                let totalSize = 0;
                res.on('data', (chunk) => {
                    totalSize += chunk.length;
                    if (totalSize > 5 * 1024 * 1024) { res.destroy(); clearTimeout(timer); resolve(null); return; }
                    chunks.push(chunk);
                });
                res.on('end', async () => {
                    clearTimeout(timer);
                    try {
                        const buf = Buffer.concat(chunks);
                        // Resize with sharp for smaller PDF
                        const resized = await sharp(buf)
                            .resize({ width: maxWidth, withoutEnlargement: true })
                            .jpeg({ quality: 70 })
                            .toBuffer();
                        resolve('data:image/jpeg;base64,' + resized.toString('base64'));
                    } catch { resolve(null); }
                });
                res.on('error', () => { clearTimeout(timer); resolve(null); });
            }).on('error', () => { clearTimeout(timer); resolve(null); });
        };
        doRequest(url);
    });
}

/* ── pdfmake style shortcuts ── */
function sectionTitle(text) {
    return { text, style: 'sectionTitle', margin: [0, 16, 0, 6] };
}

function subTitle(text) {
    return { text, style: 'subTitle', margin: [0, 10, 0, 4] };
}

function kvRow(label, value) {
    if (!value || value === '-') return null;
    return {
        columns: [
            { text: label, width: 100, style: 'kvLabel' },
            { text: String(value), width: '*', style: 'kvValue' }
        ],
        margin: [0, 2, 0, 2]
    };
}

function divider() {
    return {
        canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 0.5, lineColor: '#e2e8f0' }],
        margin: [0, 8, 0, 8]
    };
}

/* ── Build file list table ── */
function buildFileTable(files, label, t) {
    if (!files || !files.length) return [];
    const rows = [
        [
            { text: t('fileName'), style: 'tableHeader' },
            { text: t('fileSize'), style: 'tableHeader' },
            { text: t('fileCategory'), style: 'tableHeader' }
        ]
    ];
    files.forEach(f => {
        rows.push([
            { text: f.orig_name || '-', fontSize: 8 },
            { text: formatSize(f.size_bytes), fontSize: 8 },
            { text: f.category + (f.sub_key ? '/' + f.sub_key : ''), fontSize: 8 }
        ]);
    });
    const result = [];
    if (label) result.push(subTitle(label));
    result.push({
        table: { headerRows: 1, widths: ['*', 60, 100], body: rows },
        layout: 'lightHorizontalLines',
        margin: [0, 2, 0, 6]
    });
    return result;
}

/* ═══════════════════════════════════════════════
   Section Builders - mirror the 5 sections in user.js
   ═══════════════════════════════════════════════ */

async function buildStyleSection(d, fileMap, odmStyleImages, t) {
    const odmArr = tryParse(d.odm_styles);
    const odmCustom = tryParse(d.odm_custom_data);
    const oemDescs = tryParse(d.oem_descriptions);
    const hasODM = Array.isArray(odmArr) && odmArr.length;
    const hasOEM = d.oem_project;
    if (!hasODM && !hasOEM) return [];

    const content = [sectionTitle(t('sec1'))];

    // ODM
    if (hasODM) {
        content.push({ text: t('odmSelected'), bold: true, fontSize: 10, margin: [0, 4, 0, 4] });

        for (const name of odmArr) {
            const displayName = typeof name === 'object' ? (name.name || name.id || JSON.stringify(name)) : name;
            const items = [{ text: displayName, bold: true, fontSize: 10 }];

            let remark = '';
            if (odmCustom && typeof odmCustom === 'object') {
                const cd = odmCustom[displayName];
                if (cd && cd.remark) remark = cd.remark;
            }
            if (remark) items.push(kvRow(t('customRemark'), remark));

            const imgs = odmStyleImages[displayName];
            if (Array.isArray(imgs) && imgs.length) {
                const imgData = await fetchImageAsBase64(imgs[0], 150);
                if (imgData) {
                    items.push({ image: imgData, width: 120, margin: [0, 4, 0, 4] });
                }
            }

            const customFiles = (fileMap['odmCustom'] || []).filter(f => f.sub_key === displayName);
            if (customFiles.length) {
                items.push({ text: t('customFiles') + ': ' + customFiles.map(f => f.orig_name).join(', '), fontSize: 8, color: '#64748b', margin: [0, 2, 0, 2] });
            }

            content.push({
                stack: items,
                margin: [8, 4, 0, 8],
                unbreakable: true
            });
        }
    }

    // OEM
    if (hasOEM) {
        if (hasODM) content.push(divider());
        content.push({ text: t('oemDesign'), bold: true, fontSize: 10, margin: [0, 4, 0, 4] });
        content.push(kvRow(t('projectName'), d.oem_project));
        content.push(kvRow(t('styleCount'), d.oem_style_count || '-'));

        if (Array.isArray(oemDescs) && oemDescs.length) {
            content.push(subTitle(t('styleDesc')));
            oemDescs.forEach((desc, i) => {
                const text = typeof desc === 'object' ? JSON.stringify(desc) : desc;
                content.push({ text: `${t('style')} ${i + 1}: ${text}`, fontSize: 9, margin: [8, 2, 0, 2] });
            });
        }

        const oemFiles = fileMap['oem'] || [];
        if (oemFiles.length) {
            content.push(...buildFileTable(oemFiles, t('designFiles'), t));
        }

        if (d.oem_remark) content.push(kvRow(t('remark'), d.oem_remark));
        if (d.oem_physical_sample) {
            content.push(kvRow(t('sampleShipping'), t('shipped') + (d.oem_tracking_no ? ' (' + t('trackingNo') + ': ' + d.oem_tracking_no + ')' : '')));
        }
    }

    content.push(divider());
    return content.filter(Boolean);
}

function buildFabricSection(d, fileMap, t) {
    const fab = tryParse(d.fabric_selection);
    if (!fab || typeof fab !== 'object' || !Object.keys(fab).length) return [];

    const content = [sectionTitle(t('sec2'))];
    const fabricFiles = fileMap['fabric'] || [];
    const cmtFabricFiles = (fileMap['cmt'] || []).filter(f => f.sub_key === 'fabric');

    Object.keys(fab).forEach(catKey => {
        const cat = fab[catKey];
        if (!cat || !cat.configs) return;
        const originalCat = cat.originalCatName || catKey;
        const isLining = /里料|[Ll]ining/.test(originalCat);
        const configs = cat.configs;

        Object.keys(configs).forEach(fabricName => {
            const cfg = configs[fabricName];
            if (!cfg) return;
            const isCS = fabricName === 'CUSTOM_SOURCING';
            const mode = isCS ? 'custom' : (cfg.mode || 'solid');
            const modeLabel = { solid: t('solid'), print: t('print'), custom: t('customSourcing') }[mode] || mode;
            const cardTitle = isCS ? originalCat : fabricName;

            content.push({
                text: [
                    { text: cardTitle, bold: true, fontSize: 10 },
                    { text: `  [${modeLabel}]`, fontSize: 9, color: '#6366f1' },
                    !isCS && originalCat ? { text: `  (${originalCat})`, fontSize: 8, color: '#94a3b8' } : {}
                ],
                margin: [0, 6, 0, 4]
            });

            if (mode === 'solid') {
                const colors = cfg.colors;
                if (Array.isArray(colors) && colors.length) {
                    const colorText = colors.map(c => {
                        let s = c.name || '-';
                        if (c.hex) s += ` (${c.hex})`;
                        if (c.pantone) s += ` ${c.pantone}`;
                        return s;
                    }).join(' / ');
                    content.push(kvRow(t('color'), colorText));
                }
                if (cfg.colorText) content.push(kvRow(t('colorDesc'), cfg.colorText));
            } else if (mode === 'print') {
                if (cfg.printType) content.push(kvRow(t('printType'), cfg.printType === 'seamless' ? t('seamless') : t('placement')));
                if (cfg.printRefColor) content.push(kvRow(t('refColor'), cfg.printRefColor));
                if (cfg.printScale) content.push(kvRow(t('printScale'), cfg.printScale));
                const printKey = catKey + '__' + fabricName + '__print';
                let printFiles = fabricFiles.filter(f => f.sub_key === printKey);
                if (!printFiles.length) {
                    const baseKey = catKey + '__' + fabricName;
                    printFiles = fabricFiles.filter(f => f.sub_key === baseKey && f.mime_type && f.mime_type.startsWith('image/'));
                }
                if (printFiles.length) {
                    content.push({ text: t('printPatternFiles') + ': ' + printFiles.map(f => f.orig_name).join(', '), fontSize: 8, color: '#64748b', margin: [0, 2, 0, 2] });
                }
            } else if (mode === 'custom') {
                if (cfg.customDesc) content.push(kvRow(t('reqDesc'), cfg.customDesc));
                if (cfg.comp) content.push(kvRow(t('composition'), cfg.comp));
                if (cfg.gsm) content.push(kvRow(t('gsm'), cfg.gsm + ' g/m²'));
                if (cfg.colorReq) content.push(kvRow(t('colorReq'), cfg.colorReq));
                if (cfg.physical) content.push(kvRow(t('physicalSend'), t('yes') + (cfg.trackingNo ? ' (' + t('trackingNo') + ': ' + cfg.trackingNo + ')' : '')));
            }

            if (isLining) {
                if (cfg.fullLining != null) content.push(kvRow(t('fullLining'), cfg.fullLining ? t('yes') : t('no')));
                if (cfg.liningPlacement) content.push(kvRow(t('liningPlacement'), cfg.liningPlacement));
            }
            if (cfg.remark) content.push(kvRow(isLining ? t('remark') : t('colorBlock'), cfg.remark));

            const subKey = catKey + '__' + fabricName;
            const matched = fabricFiles.filter(f => f.sub_key === subKey);
            if (matched.length) {
                content.push({ text: t('refFiles') + ': ' + matched.map(f => f.orig_name).join(', '), fontSize: 8, color: '#64748b', margin: [0, 2, 0, 2] });
            }
        });
    });

    // CMT
    const cmtData = tryParse(d.cmt_enabled);
    const fabricCmt = cmtData && cmtData.fabric;
    const fabricCmtEnabled = fabricCmt === true || (fabricCmt && fabricCmt.enabled);
    if (fabricCmtEnabled) {
        content.push(subTitle(t('cmtFabric')));
        if (fabricCmt && fabricCmt.desc) content.push(kvRow(t('detailDesc'), fabricCmt.desc));
        if (fabricCmt && fabricCmt.trackingNo) content.push(kvRow(t('trackingNo'), fabricCmt.trackingNo));
        if (cmtFabricFiles.length) {
            content.push({ text: t('refFiles') + ': ' + cmtFabricFiles.map(f => f.orig_name).join(', '), fontSize: 8, color: '#64748b', margin: [0, 2, 0, 2] });
        }
    }

    content.push(divider());
    return content.filter(Boolean);
}

function buildTrimsSection(d, fileMap, t) {
    const trimDefs = [
        { key: 'metal_config', cat: 'metal', name: t('metalHardware') },
        { key: 'pad_config', cat: 'pad', name: t('chestPad') },
        { key: 'bag_config', cat: 'bag', name: t('packBag') },
        { key: 'hangtag_config', cat: 'hangtag', name: t('hangTag') },
        { key: 'label_config', cat: 'label', name: t('label') },
        { key: 'hygiene_config', cat: 'hygiene', name: t('hygieneSticker') },
        { key: 'other_config', cat: 'other', name: t('other') }
    ];

    const cmtData = tryParse(d.cmt_enabled) || {};
    const items = [];

    trimDefs.forEach(td => {
        const val = tryParse(d[td.key]);
        const cmtInfo = cmtData[td.cat];
        const cmtEnabled = cmtInfo === true || (cmtInfo && cmtInfo.enabled);
        const hasConfig = val && typeof val === 'object' && Object.keys(val).length;
        if (!hasConfig && !cmtEnabled) return;

        const trimFiles = fileMap[td.cat] || [];
        const cmtFiles = (fileMap['cmt'] || []).filter(f => f.sub_key === td.cat);
        const cfg = hasConfig ? val : {};

        const sub = [];
        sub.push({ text: `▪ ${td.name}`, bold: true, fontSize: 10, margin: [0, 6, 0, 3] });

        const mode = cfg.mode;
        if (mode) sub.push(kvRow(t('mode'), mode === 'auto' ? t('autoMode') : t('customMode')));

        // Type-specific fields
        switch (td.key) {
            case 'metal_config':
                if (cfg.finish) sub.push(kvRow(t('surfaceFinish'), cfg.finish));
                if (cfg.logoCustom) {
                    sub.push(kvRow(t('logoCustom'), t('needed')));
                    if (Array.isArray(cfg.logoTypes) && cfg.logoTypes.length) sub.push(kvRow(t('logoType'), cfg.logoTypes.join(', ')));
                }
                if (cfg.details && cfg.categories && cfg.categories.length) {
                    cfg.categories.forEach(catName => {
                        const detail = cfg.details[catName];
                        if (!detail) return;
                        sub.push({ text: `  ${catName}`, bold: true, fontSize: 9, margin: [8, 3, 0, 2] });
                        if (detail.remark) sub.push(kvRow(t('remark'), detail.remark));
                        if (detail.logoNeeded) sub.push(kvRow(t('independentLogo'), t('needed')));
                    });
                }
                break;
            case 'pad_config':
                if (cfg.thickness) sub.push(kvRow(t('thickness'), cfg.thickness));
                if (cfg.color) {
                    let cd = cfg.color;
                    if (cfg.color === '其他定制色' && cfg.otherColor) cd = cfg.otherColor + ' (' + t('customMode') + ')';
                    sub.push(kvRow(t('color'), cd));
                }
                if (cfg.customShape) sub.push(kvRow(t('customShape'), t('yes') + (cfg.shapeRemark ? ' (' + cfg.shapeRemark + ')' : '')));
                break;
            case 'bag_config':
                if (cfg.material) sub.push(kvRow(t('material'), cfg.material));
                if (cfg.size) sub.push(kvRow(t('size'), cfg.size));
                if (cfg.print) sub.push(kvRow(t('printing'), cfg.print));
                if (Array.isArray(cfg.crafts) && cfg.crafts.length) sub.push(kvRow(t('craft'), cfg.crafts.join(', ')));
                break;
            case 'hangtag_config':
                if (cfg.remark) sub.push(kvRow(t('designDesc'), cfg.remark));
                if (mode !== 'auto') {
                    let matText = cfg.material || '';
                    if (matText === '其他' && cfg.materialRemark) matText = cfg.materialRemark + ' (' + t('other') + ')';
                    if (matText) sub.push(kvRow(t('material'), matText));
                    if (cfg.weight) sub.push(kvRow(t('weight'), cfg.weight));
                    if (cfg.shape) sub.push(kvRow(t('shape'), cfg.shape));
                    if (cfg.roundedCorner) sub.push(kvRow(t('roundedCorner'), t('yes')));
                    if (cfg.shapeRemark) sub.push(kvRow(t('shapeDesc'), cfg.shapeRemark));
                    if (Array.isArray(cfg.crafts) && cfg.crafts.length) sub.push(kvRow(t('craft'), cfg.crafts.join(', ')));
                    if (cfg.craftRemark) sub.push(kvRow(t('craftDesc'), cfg.craftRemark));
                    let strType = cfg.stringType || '';
                    if (strType === '定制材质与形状' && cfg.stringRemark) strType = cfg.stringRemark + ' (' + t('customMode') + ')';
                    if (strType) sub.push(kvRow(t('string'), strType));
                    let strColor = cfg.stringColor || '';
                    if (strColor === '其他' && cfg.stringColorOther) strColor = cfg.stringColorOther + ' (' + t('other') + ')';
                    if (strColor) sub.push(kvRow(t('stringColor'), strColor));
                    if (cfg.isSet) sub.push(kvRow(t('subBrand'), t('have') + (cfg.setRemark ? ' (' + cfg.setRemark + ')' : '')));
                }
                break;
            case 'label_config':
                if (cfg.remark) sub.push(kvRow(t('designDesc'), cfg.remark));
                if (mode !== 'auto') {
                    if (cfg.material) sub.push(kvRow(t('material'), cfg.material));
                    if (cfg.size) sub.push(kvRow(t('size'), cfg.size));
                    if (cfg.method) sub.push(kvRow(t('sewMethod'), cfg.method));
                    if (cfg.sewingRemark) sub.push(kvRow(t('sewDesc'), cfg.sewingRemark));
                    if (Array.isArray(cfg.components) && cfg.components.length) sub.push(kvRow(t('components'), cfg.components.join(', ')));
                    if (cfg.placements) {
                        Object.keys(cfg.placements).forEach(k => {
                            sub.push(kvRow(t('position') + ' (' + k + ')', cfg.placements[k]));
                        });
                    }
                    const isSplit = cfg.isSplit || cfg.isSet;
                    if (isSplit) {
                        sub.push(kvRow(t('mainWashSplit'), t('splitCustom')));
                        if (cfg.splitRemark) sub.push(kvRow(t('splitDesc'), cfg.splitRemark));
                    }
                }
                break;
            case 'hygiene_config':
                if (cfg.material) sub.push(kvRow(t('material'), cfg.material));
                if (cfg.shape) sub.push(kvRow(t('shape'), cfg.shape));
                if (cfg.size) sub.push(kvRow(t('size'), cfg.size));
                if (cfg.noApply) sub.push(kvRow(t('noStick'), t('yes')));
                if (cfg.shapeRemark) sub.push(kvRow(t('shapeReq'), cfg.shapeRemark));
                if (cfg.applyRemark) sub.push(kvRow(t('stickRule'), cfg.applyRemark));
                break;
        }

        // General remark (skip hangtag/label which already show it as designDesc)
        if (cfg.remark && td.key !== 'hangtag_config' && td.key !== 'label_config') {
            sub.push(kvRow(t('remark'), cfg.remark));
        }

        // CMT
        if (cmtEnabled) {
            sub.push({ text: t('cmtSupply'), fontSize: 9, bold: true, color: '#ea580c', margin: [0, 4, 0, 2] });
            if (cmtInfo && cmtInfo.desc) sub.push(kvRow(t('detailDesc'), cmtInfo.desc));
            if (cmtInfo && cmtInfo.trackingNo) sub.push(kvRow(t('trackingNo'), cmtInfo.trackingNo));
        }

        // Trim files
        if (trimFiles.length) {
            sub.push({ text: t('attachments') + ': ' + trimFiles.map(f => f.orig_name).join(', '), fontSize: 8, color: '#64748b', margin: [0, 2, 0, 2] });
        }
        if (cmtFiles.length) {
            sub.push({ text: t('cmtAttachments') + ': ' + cmtFiles.map(f => f.orig_name).join(', '), fontSize: 8, color: '#64748b', margin: [0, 2, 0, 2] });
        }

        items.push(...sub);
    });

    if (items.length === 0) return [];

    const content = [sectionTitle(t('sec3'))];
    content.push(...items);
    content.push(divider());
    return content.filter(Boolean);
}

function buildShippingSection(d, fileMap, t) {
    const content = [sectionTitle(t('sec4'))];
    const isSample = d.delivery_mode !== 'bulk';
    content.push(kvRow(t('deliveryMode'), isSample ? t('sampleOrder') : t('bulkOrder')));

    if (isSample) {
        const sampleRows = tryParse(d.sample_rows);
        if (Array.isArray(sampleRows) && sampleRows.length) {
            content.push(subTitle(t('sampleDetail')));
            const tableBody = [
                [
                    { text: t('style'), style: 'tableHeader' },
                    { text: t('type'), style: 'tableHeader' },
                    { text: t('sizeCol'), style: 'tableHeader' },
                    { text: t('qty'), style: 'tableHeader' },
                    { text: t('remark'), style: 'tableHeader' }
                ]
            ];
            sampleRows.forEach(r => {
                tableBody.push([
                    { text: r.style || '-', fontSize: 8 },
                    { text: r.type || '-', fontSize: 8 },
                    { text: r.size || '-', fontSize: 8 },
                    { text: String(r.qty || '-'), fontSize: 8 },
                    { text: r.desc || '-', fontSize: 8 }
                ]);
            });
            content.push({
                table: { headerRows: 1, widths: ['*', 60, 60, 40, '*'], body: tableBody },
                layout: 'lightHorizontalLines',
                margin: [0, 2, 0, 6]
            });
        }

        const sampleCfg = tryParse(d.sample_config);
        if (sampleCfg && typeof sampleCfg === 'object' && Object.keys(sampleCfg).length) {
            content.push(subTitle(t('sampleLogistics')));
            if (sampleCfg.carrier) content.push(kvRow(t('carrier'), sampleCfg.carrier));
            if (sampleCfg.needBulkQuote) {
                content.push(kvRow(t('needBulkQuote'), t('yes')));
                if (sampleCfg.intentQty) content.push(kvRow(t('estBulkQty'), sampleCfg.intentQty + ' ' + t('pcs')));
                if (sampleCfg.intentPrice) content.push(kvRow(t('targetEXW'), '$' + sampleCfg.intentPrice));
                if (sampleCfg.intentTerm) content.push(kvRow(t('tradeTerm'), sampleCfg.intentTerm));
                if (sampleCfg.intentMethod) content.push(kvRow(t('shippingMethod'), sampleCfg.intentMethod));
            }
        }
        if (d.sample_dest) content.push(kvRow(t('sampleDest'), d.sample_dest));
    } else {
        const bulkRows = tryParse(d.bulk_rows);
        if (Array.isArray(bulkRows) && bulkRows.length) {
            content.push(subTitle(t('bulkDetail')));
            const tableBody = [
                [
                    { text: t('style'), style: 'tableHeader' },
                    { text: t('qty'), style: 'tableHeader' },
                    { text: t('sizeAlloc'), style: 'tableHeader' },
                    { text: t('remark'), style: 'tableHeader' }
                ]
            ];
            bulkRows.forEach(r => {
                tableBody.push([
                    { text: r.style || '-', fontSize: 8 },
                    { text: String(r.qty || '-'), fontSize: 8 },
                    { text: r.sizeDetail || '-', fontSize: 8 },
                    { text: r.desc || '-', fontSize: 8 }
                ]);
            });
            content.push({
                table: { headerRows: 1, widths: ['*', 50, '*', '*'], body: tableBody },
                layout: 'lightHorizontalLines',
                margin: [0, 2, 0, 6]
            });
        }

        const bulkLog = tryParse(d.bulk_logistics);
        if (bulkLog && typeof bulkLog === 'object' && Object.keys(bulkLog).length) {
            content.push(subTitle(t('bulkLogistics')));
            if (bulkLog.term) content.push(kvRow(t('tradeTerm'), bulkLog.term));
            if (bulkLog.method) content.push(kvRow(t('shippingMethod'), bulkLog.method));
        }
        if (d.bulk_dest) content.push(kvRow(t('bulkDest'), d.bulk_dest));
        if (d.bulk_target_price) content.push(kvRow(t('targetPrice'), d.bulk_target_price));
        if (d.bulk_packing_remark) content.push(kvRow(t('packRemark'), d.bulk_packing_remark));

        const bpFiles = fileMap['bulkPacking'] || [];
        if (bpFiles.length) {
            content.push(...buildFileTable(bpFiles, t('packRefFiles'), t));
        }
    }

    const fdFiles = fileMap['finalDocs'] || [];
    if (fdFiles.length) {
        content.push(...buildFileTable(fdFiles, t('techPlanFiles'), t));
    }

    content.push(divider());
    return content.filter(Boolean);
}

function buildContactSection(d, t) {
    if (!d.contact_name && !d.brand_name) return [];
    const content = [sectionTitle(t('sec5'))];
    if (d.contact_name) content.push(kvRow(t('contactPerson'), d.contact_name));
    if (d.contact_info) content.push(kvRow(t('contactInfo'), d.contact_info));
    if (d.brand_name) content.push(kvRow(t('brandName'), d.brand_name));
    if (d.website) content.push(kvRow(t('website'), d.website));
    if (d.final_remark) content.push(kvRow(t('overallRemark'), d.final_remark));
    if (d.nda_agreed_at) content.push(kvRow(t('ndaSigned'), t('signed') + ' ' + fmtDate(d.nda_agreed_at)));
    content.push(divider());
    return content.filter(Boolean);
}

function buildFilesSection(files, t) {
    if (!files || !files.length) return [];
    return [sectionTitle(t('sec6')), ...buildFileTable(files, null, t)];
}

/* ═══════════════════════════════════════════════
   Main export function
   ═══════════════════════════════════════════════ */
async function generateInquiryPDF(inquiry, files, odmStyleImages, lang) {
    const t = getT(lang || 'zh');
    const fontPaths = await ensureFonts();

    const printer = new PdfPrinter({
        NotoSansSC: {
            normal: fontPaths.regular,
            bold: fontPaths.bold,
            italics: fontPaths.regular,
            bolditalics: fontPaths.bold,
        }
    });

    // Build file map
    const fileMap = {};
    (files || []).forEach(f => {
        const cat = f.category || 'other';
        if (!fileMap[cat]) fileMap[cat] = [];
        fileMap[cat].push(f);
    });

    // Build sections
    const styleContent = await buildStyleSection(inquiry, fileMap, odmStyleImages, t);
    const fabricContent = buildFabricSection(inquiry, fileMap, t);
    const trimsContent = buildTrimsSection(inquiry, fileMap, t);
    const shippingContent = buildShippingSection(inquiry, fileMap, t);
    const contactContent = buildContactSection(inquiry, t);

    // All files list
    const allFiles = files || [];
    const filesContent = buildFilesSection(allFiles, t);

    // Header info block
    const headerBlock = [
        {
            table: {
                widths: ['*'],
                body: [[{
                    stack: [
                        { text: t('docTitle'), style: 'docTitle' },
                        {
                            columns: [
                                { text: [{ text: t('inquiryNo') + ': ', bold: true }, inquiry.inquiry_no || '-'], fontSize: 10 },
                                { text: [{ text: t('status') + ': ', bold: true }, statusLabel(inquiry.status, t)], fontSize: 10, alignment: 'right' }
                            ],
                            margin: [0, 8, 0, 4]
                        },
                        {
                            columns: [
                                { text: [{ text: t('createdAt') + ': ', bold: true }, fmtDate(inquiry.created_at)], fontSize: 9, color: '#64748b' },
                                { text: [{ text: t('deliveryMode') + ': ', bold: true }, inquiry.delivery_mode === 'bulk' ? t('bulkOrder') : t('sampleOrder')], fontSize: 9, color: '#64748b', alignment: 'right' }
                            ],
                            margin: [0, 0, 0, 2]
                        },
                        ...(inquiry.brand_name || inquiry.contact_name ? [{
                            columns: [
                                inquiry.brand_name ? { text: [{ text: t('brand') + ': ', bold: true }, inquiry.brand_name], fontSize: 9, color: '#64748b' } : {},
                                inquiry.contact_name ? { text: [{ text: t('contact') + ': ', bold: true }, inquiry.contact_name], fontSize: 9, color: '#64748b', alignment: 'right' } : {}
                            ]
                        }] : [])
                    ],
                    margin: [12, 10, 12, 10]
                }]]
            },
            layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => '#cbd5e1',
                vLineColor: () => '#cbd5e1',
            },
            margin: [0, 0, 0, 12]
        }
    ];

    const docDefinition = {
        defaultStyle: {
            font: 'NotoSansSC',
            fontSize: 9,
            lineHeight: 1.3,
        },
        styles: {
            docTitle: {
                fontSize: 16,
                bold: true,
                color: '#1e293b',
            },
            sectionTitle: {
                fontSize: 12,
                bold: true,
                color: '#1e293b',
            },
            subTitle: {
                fontSize: 10,
                bold: true,
                color: '#475569',
            },
            kvLabel: {
                fontSize: 9,
                color: '#64748b',
            },
            kvValue: {
                fontSize: 9,
                color: '#1e293b',
            },
            tableHeader: {
                fontSize: 8,
                bold: true,
                color: '#475569',
                fillColor: '#f8fafc',
            }
        },
        pageSize: 'A4',
        pageMargins: [40, 40, 40, 50],
        footer: (currentPage, pageCount) => ({
            columns: [
                { text: t('page', currentPage, pageCount), alignment: 'left', fontSize: 8, color: '#94a3b8' },
                { text: t('generatedAt') + ': ' + fmtDate(new Date()), alignment: 'right', fontSize: 8, color: '#94a3b8' }
            ],
            margin: [40, 10, 40, 0]
        }),
        content: [
            ...headerBlock,
            ...styleContent,
            ...fabricContent,
            ...trimsContent,
            ...shippingContent,
            ...contactContent,
            ...filesContent,
        ]
    };

    return new Promise((resolve, reject) => {
        const doc = printer.createPdfKitDocument(docDefinition);
        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        doc.end();
    });
}

module.exports = { generateInquiryPDF };
