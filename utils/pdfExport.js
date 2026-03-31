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

function statusLabel(s) {
    const m = { pending: '待处理', processing: '处理中', quoted: '已报价', closed: '已关闭' };
    return m[s] || s || '待处理';
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
function buildFileTable(files, label) {
    if (!files || !files.length) return [];
    const rows = [
        [
            { text: '文件名', style: 'tableHeader' },
            { text: '大小', style: 'tableHeader' },
            { text: '分类', style: 'tableHeader' }
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

async function buildStyleSection(d, fileMap, odmStyleImages) {
    const odmArr = tryParse(d.odm_styles);
    const odmCustom = tryParse(d.odm_custom_data);
    const oemDescs = tryParse(d.oem_descriptions);
    const hasODM = Array.isArray(odmArr) && odmArr.length;
    const hasOEM = d.oem_project;
    if (!hasODM && !hasOEM) return [];

    const content = [sectionTitle('一、款式信息')];

    // ODM
    if (hasODM) {
        content.push({ text: '【ODM 已选款式】', bold: true, fontSize: 10, margin: [0, 4, 0, 4] });

        for (const name of odmArr) {
            const displayName = typeof name === 'object' ? (name.name || name.id || JSON.stringify(name)) : name;
            const items = [{ text: displayName, bold: true, fontSize: 10 }];

            // Remark
            let remark = '';
            if (odmCustom && typeof odmCustom === 'object') {
                const cd = odmCustom[displayName];
                if (cd && cd.remark) remark = cd.remark;
            }
            if (remark) items.push(kvRow('轻定制备注', remark));

            // Try to embed first ODM image
            const imgs = odmStyleImages[displayName];
            if (Array.isArray(imgs) && imgs.length) {
                const imgData = await fetchImageAsBase64(imgs[0], 150);
                if (imgData) {
                    items.push({ image: imgData, width: 120, margin: [0, 4, 0, 4] });
                }
            }

            // Custom files
            const customFiles = (fileMap['odmCustom'] || []).filter(f => f.sub_key === displayName);
            if (customFiles.length) {
                items.push({ text: '轻定制文件: ' + customFiles.map(f => f.orig_name).join(', '), fontSize: 8, color: '#64748b', margin: [0, 2, 0, 2] });
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
        content.push({ text: '【OEM 自主设计】', bold: true, fontSize: 10, margin: [0, 4, 0, 4] });
        content.push(kvRow('项目名称', d.oem_project));
        content.push(kvRow('款式数量', d.oem_style_count || '-'));

        if (Array.isArray(oemDescs) && oemDescs.length) {
            content.push(subTitle('款式描述'));
            oemDescs.forEach((desc, i) => {
                const text = typeof desc === 'object' ? JSON.stringify(desc) : desc;
                content.push({ text: `款 ${i + 1}: ${text}`, fontSize: 9, margin: [8, 2, 0, 2] });
            });
        }

        const oemFiles = fileMap['oem'] || [];
        if (oemFiles.length) {
            content.push(...buildFileTable(oemFiles, '设计文件'));
        }

        if (d.oem_remark) content.push(kvRow('备注', d.oem_remark));
        if (d.oem_physical_sample) {
            content.push(kvRow('寄送样衣', '已寄送' + (d.oem_tracking_no ? ' (单号: ' + d.oem_tracking_no + ')' : '')));
        }
    }

    content.push(divider());
    return content.filter(Boolean);
}

function buildFabricSection(d, fileMap) {
    const fab = tryParse(d.fabric_selection);
    if (!fab || typeof fab !== 'object' || !Object.keys(fab).length) return [];

    const content = [sectionTitle('二、面料信息')];
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
            const modeLabel = { solid: '纯色', print: '印花', custom: '开发/找样' }[mode] || mode;
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
                        let t = c.name || '-';
                        if (c.hex) t += ` (${c.hex})`;
                        if (c.pantone) t += ` ${c.pantone}`;
                        return t;
                    }).join(' / ');
                    content.push(kvRow('颜色', colorText));
                }
                if (cfg.colorText) content.push(kvRow('色彩描述', cfg.colorText));
            } else if (mode === 'print') {
                if (cfg.printType) content.push(kvRow('印花类型', cfg.printType === 'seamless' ? '满版印花' : '定位印花'));
                if (cfg.printRefColor) content.push(kvRow('参考底色', cfg.printRefColor));
                if (cfg.printScale) content.push(kvRow('缩放比例', cfg.printScale));
                // Print files
                const printKey = catKey + '__' + fabricName + '__print';
                let printFiles = fabricFiles.filter(f => f.sub_key === printKey);
                if (!printFiles.length) {
                    const baseKey = catKey + '__' + fabricName;
                    printFiles = fabricFiles.filter(f => f.sub_key === baseKey && f.mime_type && f.mime_type.startsWith('image/'));
                }
                if (printFiles.length) {
                    content.push({ text: '印花图案文件: ' + printFiles.map(f => f.orig_name).join(', '), fontSize: 8, color: '#64748b', margin: [0, 2, 0, 2] });
                }
            } else if (mode === 'custom') {
                if (cfg.customDesc) content.push(kvRow('需求描述', cfg.customDesc));
                if (cfg.comp) content.push(kvRow('成分', cfg.comp));
                if (cfg.gsm) content.push(kvRow('克重', cfg.gsm + ' g/m²'));
                if (cfg.colorReq) content.push(kvRow('颜色要求', cfg.colorReq));
                if (cfg.physical) content.push(kvRow('实物邮寄', '是' + (cfg.trackingNo ? ' (单号: ' + cfg.trackingNo + ')' : '')));
            }

            if (isLining) {
                if (cfg.fullLining != null) content.push(kvRow('全衬里', cfg.fullLining ? '是' : '否'));
                if (cfg.liningPlacement) content.push(kvRow('衬里位置', cfg.liningPlacement));
            }
            if (cfg.remark) content.push(kvRow(isLining ? '备注' : '拼色说明', cfg.remark));

            // Matched files
            const subKey = catKey + '__' + fabricName;
            const matched = fabricFiles.filter(f => f.sub_key === subKey);
            if (matched.length) {
                content.push({ text: '参考文件: ' + matched.map(f => f.orig_name).join(', '), fontSize: 8, color: '#64748b', margin: [0, 2, 0, 2] });
            }
        });
    });

    // CMT
    const cmtData = tryParse(d.cmt_enabled);
    const fabricCmt = cmtData && cmtData.fabric;
    const fabricCmtEnabled = fabricCmt === true || (fabricCmt && fabricCmt.enabled);
    if (fabricCmtEnabled) {
        content.push(subTitle('客户自行提供面料 (CMT)'));
        if (fabricCmt && fabricCmt.desc) content.push(kvRow('明细描述', fabricCmt.desc));
        if (fabricCmt && fabricCmt.trackingNo) content.push(kvRow('寄件单号', fabricCmt.trackingNo));
        if (cmtFabricFiles.length) {
            content.push({ text: '参考文件: ' + cmtFabricFiles.map(f => f.orig_name).join(', '), fontSize: 8, color: '#64748b', margin: [0, 2, 0, 2] });
        }
    }

    content.push(divider());
    return content.filter(Boolean);
}

function buildTrimsSection(d, fileMap) {
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
        if (mode) sub.push(kvRow('模式', mode === 'auto' ? '红绣标配' : '客户自定义'));

        // Type-specific fields
        switch (td.key) {
            case 'metal_config':
                if (cfg.finish) sub.push(kvRow('表面处理', cfg.finish));
                if (cfg.logoCustom) {
                    sub.push(kvRow('LOGO定制', '需要'));
                    if (Array.isArray(cfg.logoTypes) && cfg.logoTypes.length) sub.push(kvRow('LOGO类型', cfg.logoTypes.join(', ')));
                }
                if (cfg.details && cfg.categories && cfg.categories.length) {
                    cfg.categories.forEach(catName => {
                        const detail = cfg.details[catName];
                        if (!detail) return;
                        sub.push({ text: `  ${catName}`, bold: true, fontSize: 9, margin: [8, 3, 0, 2] });
                        if (detail.remark) sub.push(kvRow('备注', detail.remark));
                        if (detail.logoNeeded) sub.push(kvRow('独立LOGO', '需要'));
                    });
                }
                break;
            case 'pad_config':
                if (cfg.thickness) sub.push(kvRow('厚度', cfg.thickness));
                if (cfg.color) {
                    let cd = cfg.color;
                    if (cfg.color === '其他定制色' && cfg.otherColor) cd = cfg.otherColor + '（定制色）';
                    sub.push(kvRow('颜色', cd));
                }
                if (cfg.customShape) sub.push(kvRow('异形', '是' + (cfg.shapeRemark ? ' (' + cfg.shapeRemark + ')' : '')));
                break;
            case 'bag_config':
                if (cfg.material) sub.push(kvRow('材质', cfg.material));
                if (cfg.size) sub.push(kvRow('尺寸', cfg.size));
                if (cfg.print) sub.push(kvRow('印刷', cfg.print));
                if (Array.isArray(cfg.crafts) && cfg.crafts.length) sub.push(kvRow('工艺', cfg.crafts.join(', ')));
                break;
            case 'hangtag_config':
                if (cfg.remark) sub.push(kvRow('设计描述', cfg.remark));
                if (mode !== 'auto') {
                    let matText = cfg.material || '';
                    if (matText === '其他' && cfg.materialRemark) matText = cfg.materialRemark + '（其他）';
                    if (matText) sub.push(kvRow('材质', matText));
                    if (cfg.weight) sub.push(kvRow('克重', cfg.weight));
                    if (cfg.shape) sub.push(kvRow('形状', cfg.shape));
                    if (cfg.roundedCorner) sub.push(kvRow('圆角', '是'));
                    if (cfg.shapeRemark) sub.push(kvRow('形状说明', cfg.shapeRemark));
                    if (Array.isArray(cfg.crafts) && cfg.crafts.length) sub.push(kvRow('工艺', cfg.crafts.join(', ')));
                    if (cfg.craftRemark) sub.push(kvRow('工艺说明', cfg.craftRemark));
                    let strType = cfg.stringType || '';
                    if (strType === '定制材质与形状' && cfg.stringRemark) strType = cfg.stringRemark + '（定制）';
                    if (strType) sub.push(kvRow('吊绳', strType));
                    let strColor = cfg.stringColor || '';
                    if (strColor === '其他' && cfg.stringColorOther) strColor = cfg.stringColorOther + '（其他）';
                    if (strColor) sub.push(kvRow('绳色', strColor));
                    if (cfg.isSet) sub.push(kvRow('副牌', '有' + (cfg.setRemark ? ' (' + cfg.setRemark + ')' : '')));
                }
                break;
            case 'label_config':
                if (cfg.remark) sub.push(kvRow('设计描述', cfg.remark));
                if (mode !== 'auto') {
                    if (cfg.material) sub.push(kvRow('材质', cfg.material));
                    if (cfg.size) sub.push(kvRow('尺寸', cfg.size));
                    if (cfg.method) sub.push(kvRow('缝制方式', cfg.method));
                    if (cfg.sewingRemark) sub.push(kvRow('缝制说明', cfg.sewingRemark));
                    if (Array.isArray(cfg.components) && cfg.components.length) sub.push(kvRow('部件', cfg.components.join(', ')));
                    if (cfg.placements) {
                        Object.keys(cfg.placements).forEach(k => {
                            sub.push(kvRow('位置 (' + k + ')', cfg.placements[k]));
                        });
                    }
                    const isSplit = cfg.isSplit || cfg.isSet;
                    if (isSplit) {
                        sub.push(kvRow('主标与洗水标', '分开定制'));
                        if (cfg.splitRemark) sub.push(kvRow('分开说明', cfg.splitRemark));
                    }
                }
                break;
            case 'hygiene_config':
                if (cfg.material) sub.push(kvRow('材质', cfg.material));
                if (cfg.shape) sub.push(kvRow('形状', cfg.shape));
                if (cfg.size) sub.push(kvRow('尺寸', cfg.size));
                if (cfg.noApply) sub.push(kvRow('免粘贴', '是'));
                if (cfg.shapeRemark) sub.push(kvRow('异形要求', cfg.shapeRemark));
                if (cfg.applyRemark) sub.push(kvRow('粘贴规则', cfg.applyRemark));
                break;
        }

        // General remark (skip hangtag/label which already show it as 设计描述)
        if (cfg.remark && td.key !== 'hangtag_config' && td.key !== 'label_config') {
            sub.push(kvRow('备注', cfg.remark));
        }

        // CMT
        if (cmtEnabled) {
            sub.push({ text: '客户自行提供 (CMT)', fontSize: 9, bold: true, color: '#ea580c', margin: [0, 4, 0, 2] });
            if (cmtInfo && cmtInfo.desc) sub.push(kvRow('明细描述', cmtInfo.desc));
            if (cmtInfo && cmtInfo.trackingNo) sub.push(kvRow('寄件单号', cmtInfo.trackingNo));
        }

        // Trim files
        if (trimFiles.length) {
            sub.push({ text: '附件: ' + trimFiles.map(f => f.orig_name).join(', '), fontSize: 8, color: '#64748b', margin: [0, 2, 0, 2] });
        }
        if (cmtFiles.length) {
            sub.push({ text: 'CMT附件: ' + cmtFiles.map(f => f.orig_name).join(', '), fontSize: 8, color: '#64748b', margin: [0, 2, 0, 2] });
        }

        items.push(...sub);
    });

    if (items.length === 0) return [];

    const content = [sectionTitle('三、辅料 / 包装')];
    content.push(...items);
    content.push(divider());
    return content.filter(Boolean);
}

function buildShippingSection(d, fileMap) {
    const content = [sectionTitle('四、交付信息')];
    const isSample = d.delivery_mode !== 'bulk';
    content.push(kvRow('交付模式', isSample ? '样衣订单' : '大货订单'));

    if (isSample) {
        const sampleRows = tryParse(d.sample_rows);
        if (Array.isArray(sampleRows) && sampleRows.length) {
            content.push(subTitle('样衣明细'));
            const tableBody = [
                [
                    { text: '款式', style: 'tableHeader' },
                    { text: '类型', style: 'tableHeader' },
                    { text: '尺码', style: 'tableHeader' },
                    { text: '数量', style: 'tableHeader' },
                    { text: '备注', style: 'tableHeader' }
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
            content.push(subTitle('样衣物流'));
            if (sampleCfg.carrier) content.push(kvRow('物流方式', sampleCfg.carrier));
            if (sampleCfg.needBulkQuote) {
                content.push(kvRow('需大货报价', '是'));
                if (sampleCfg.intentQty) content.push(kvRow('预估大货数量', sampleCfg.intentQty + ' 件'));
                if (sampleCfg.intentPrice) content.push(kvRow('期望EXW单价', '$' + sampleCfg.intentPrice));
                if (sampleCfg.intentTerm) content.push(kvRow('贸易术语', sampleCfg.intentTerm));
                if (sampleCfg.intentMethod) content.push(kvRow('运输方式', sampleCfg.intentMethod));
            }
        }
        if (d.sample_dest) content.push(kvRow('样衣目的地', d.sample_dest));
    } else {
        const bulkRows = tryParse(d.bulk_rows);
        if (Array.isArray(bulkRows) && bulkRows.length) {
            content.push(subTitle('大货明细'));
            const tableBody = [
                [
                    { text: '款式', style: 'tableHeader' },
                    { text: '数量', style: 'tableHeader' },
                    { text: '尺码分配', style: 'tableHeader' },
                    { text: '备注', style: 'tableHeader' }
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
            content.push(subTitle('大货物流'));
            if (bulkLog.term) content.push(kvRow('贸易术语', bulkLog.term));
            if (bulkLog.method) content.push(kvRow('运输方式', bulkLog.method));
        }
        if (d.bulk_dest) content.push(kvRow('大货目的地', d.bulk_dest));
        if (d.bulk_target_price) content.push(kvRow('目标价格', d.bulk_target_price));
        if (d.bulk_packing_remark) content.push(kvRow('包装备注', d.bulk_packing_remark));

        const bpFiles = fileMap['bulkPacking'] || [];
        if (bpFiles.length) {
            content.push(...buildFileTable(bpFiles, '包装参考文件'));
        }
    }

    const fdFiles = fileMap['finalDocs'] || [];
    if (fdFiles.length) {
        content.push(...buildFileTable(fdFiles, '综合工艺单 / 企划书'));
    }

    content.push(divider());
    return content.filter(Boolean);
}

function buildContactSection(d) {
    if (!d.contact_name && !d.brand_name) return [];
    const content = [sectionTitle('五、联系信息')];
    if (d.contact_name) content.push(kvRow('联系人', d.contact_name));
    if (d.contact_info) content.push(kvRow('联系方式', d.contact_info));
    if (d.brand_name) content.push(kvRow('品牌名称', d.brand_name));
    if (d.website) content.push(kvRow('网站', d.website));
    if (d.final_remark) content.push(kvRow('整体备注', d.final_remark));
    if (d.nda_agreed_at) content.push(kvRow('NDA 签署', '已签署 ' + fmtDate(d.nda_agreed_at)));
    content.push(divider());
    return content.filter(Boolean);
}

function buildFilesSection(files) {
    if (!files || !files.length) return [];
    return [sectionTitle('六、附件清单'), ...buildFileTable(files)];
}

/* ═══════════════════════════════════════════════
   Main export function
   ═══════════════════════════════════════════════ */
async function generateInquiryPDF(inquiry, files, odmStyleImages) {
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
    const styleContent = await buildStyleSection(inquiry, fileMap, odmStyleImages);
    const fabricContent = buildFabricSection(inquiry, fileMap);
    const trimsContent = buildTrimsSection(inquiry, fileMap);
    const shippingContent = buildShippingSection(inquiry, fileMap);
    const contactContent = buildContactSection(inquiry);

    // All files list
    const shownCats = ['odmCustom', 'oem', 'fabric', 'cmt', 'metal', 'pad', 'bag', 'hangtag', 'label', 'hygiene', 'other', 'bulkPacking', 'finalDocs'];
    const allFiles = files || [];
    const filesContent = buildFilesSection(allFiles);

    // Header info block
    const headerBlock = [
        {
            table: {
                widths: ['*'],
                body: [[{
                    stack: [
                        { text: '红绣服饰 · 询盘单', style: 'docTitle' },
                        {
                            columns: [
                                { text: [{ text: '询盘编号: ', bold: true }, inquiry.inquiry_no || '-'], fontSize: 10 },
                                { text: [{ text: '状态: ', bold: true }, statusLabel(inquiry.status)], fontSize: 10, alignment: 'right' }
                            ],
                            margin: [0, 8, 0, 4]
                        },
                        {
                            columns: [
                                { text: [{ text: '创建时间: ', bold: true }, fmtDate(inquiry.created_at)], fontSize: 9, color: '#64748b' },
                                { text: [{ text: '交付模式: ', bold: true }, inquiry.delivery_mode === 'bulk' ? '大货订单' : '样衣订单'], fontSize: 9, color: '#64748b', alignment: 'right' }
                            ],
                            margin: [0, 0, 0, 2]
                        },
                        ...(inquiry.brand_name || inquiry.contact_name ? [{
                            columns: [
                                inquiry.brand_name ? { text: [{ text: '品牌: ', bold: true }, inquiry.brand_name], fontSize: 9, color: '#64748b' } : {},
                                inquiry.contact_name ? { text: [{ text: '联系人: ', bold: true }, inquiry.contact_name], fontSize: 9, color: '#64748b', alignment: 'right' } : {}
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
                { text: `第 ${currentPage} / ${pageCount} 页`, alignment: 'left', fontSize: 8, color: '#94a3b8' },
                { text: '生成时间: ' + fmtDate(new Date()), alignment: 'right', fontSize: 8, color: '#94a3b8' }
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
