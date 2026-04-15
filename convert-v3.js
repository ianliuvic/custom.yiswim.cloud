/**
 * i18n Refactor v3: Complete conversion with richDict handling
 */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

// ============================================================
// STEP 1: Parse all dictionaries from i18n.js
// ============================================================
console.log('=== Parsing i18n.js ===');
const raw = fs.readFileSync(path.join(ROOT, 'public/i18n.js'), 'utf-8');

function ues(s) {
    return s
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
        .replace(/\\n/g, '\n').replace(/\\t/g, '\t')
        .replace(/\\"/g, '"').replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}
function uesSingle(s) {
    return s
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
        .replace(/\\n/g, '\n').replace(/\\t/g, '\t')
        .replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

const dicts = { dict: {}, jsDynamic: {}, fragments: {} };
let active = null;
for (const line of raw.split('\n')) {
    const t = line.trim();
    if (t.startsWith('var dict = {'))       { active = 'dict'; continue; }
    if (t.startsWith('var jsDynamic = {'))   { active = 'jsDynamic'; continue; }
    if (t.startsWith('var fragments = {'))   { active = 'fragments'; continue; }
    if (t.startsWith('var richDict') || t.startsWith('// Merge') || t.startsWith('var _sorted')) { active = null; continue; }
    if (active && t === '};') { active = null; continue; }
    if (active) {
        const m = t.match(/^"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"[,]?\s*(?:\/\/.*)?$/);
        if (m) dicts[active][ues(m[1])] = ues(m[2]);
    }
}
const mainDict = { ...dicts.dict, ...dicts.jsDynamic };
const fragDict = dicts.fragments;
console.log(`  dict=${Object.keys(dicts.dict).length} jsDynamic=${Object.keys(dicts.jsDynamic).length} frag=${Object.keys(fragDict).length}`);

// Parse richDict with state machine
const richEntries = [];
const richStart = raw.indexOf('var richDict = [');
if (richStart !== -1) {
    const richEnd = raw.indexOf('];', richStart);
    const richSrc = raw.substring(richStart, richEnd + 2);
    let pos = 0;
    while (pos < richSrc.length) {
        const mStart = richSrc.indexOf("m: '", pos);
        if (mStart === -1) break;
        let mVal = '', i = mStart + 4;
        while (i < richSrc.length) {
            if (richSrc[i] === '\\' && i + 1 < richSrc.length) { mVal += richSrc[i] + richSrc[i+1]; i += 2; }
            else if (richSrc[i] === "'") break;
            else { mVal += richSrc[i]; i++; }
        }
        const hStart = richSrc.indexOf("h: '", i);
        if (hStart === -1) { pos = i+1; continue; }
        let hVal = '', j = hStart + 4;
        while (j < richSrc.length) {
            if (richSrc[j] === '\\' && j + 1 < richSrc.length) { hVal += richSrc[j] + richSrc[j+1]; j += 2; }
            else if (richSrc[j] === "'") break;
            else { hVal += richSrc[j]; j++; }
        }
        richEntries.push({ m: uesSingle(mVal), h: uesSingle(hVal) });
        pos = j + 1;
    }
}
console.log(`  richDict=${richEntries.length}`);

const zhKeys = Object.keys(mainDict).filter(k => /[\u4e00-\u9fff]/.test(k)).sort((a, b) => b.length - a.length);
const zhFragKeys = Object.keys(fragDict).filter(k => /[\u4e00-\u9fff]/.test(k)).sort((a, b) => b.length - a.length);

function escRx(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function safeReplace(content, zhKey, enVal) {
    return content.replace(new RegExp(`(?<![\\u4e00-\\u9fff])${escRx(zhKey)}(?![\\u4e00-\\u9fff])`, 'g'), enVal);
}

// Manual translations
const manualDict = {
    '步骤 1: 款式定义': 'Step 1: Style Definition',
    '步骤 1：款式定义': 'Step 1: Style Definition',
    '步骤 2: 面料与里料': 'Step 2: Shell & Lining',
    '步骤 2：面料与里料': 'Step 2: Shell & Lining',
    '步骤 3: 辅料': 'Step 3: Trims & Accessories',
    '步骤 3：辅料': 'Step 3: Trims & Accessories',
    '步骤 4: 交付规划': 'Step 4: Delivery Planning',
    '步骤 4：交付规划': 'Step 4: Delivery Planning',
    '步骤 5: 需求确认与提交': 'Step 5: Review & Submit',
    '步骤 5：需求确认与提交': 'Step 5: Review & Submit',
    '分支 A: 打样模式': 'Branch A: Sampling Mode',
    '分支 A：打样模式': 'Branch A: Sampling Mode',
    '分支 B: 大货模式': 'Branch B: Bulk Production Mode',
    '分支 B：大货模式': 'Branch B: Bulk Production Mode',
    '返回第一步': 'Back to Step 1',
    '查看定制详情': 'View Customization Details',
    '请勿关闭页面': 'Please do not close this page',
    '新增：罩杯/胸垫面板': 'New: Cup/Pad Panel',
    '隐私权政策': 'Privacy Policy',
    '管理后台': 'Admin Panel',
    '返回前台': 'Back to Site',
    '全部': 'All',
    '正常': 'Active',
    '已删除': 'Deleted',
    '搜索': 'Search',
    '批量恢复': 'Batch Restore',
    '批量彻底删除': 'Batch Hard Delete',
    '取消选择': 'Clear Selection',
    '暂无数据': 'No data',
    '恢复': 'Restore',
    '彻底删除': 'Hard Delete',
    '上一页': 'Previous',
    '下一页': 'Next',
    '确认弹窗': 'Confirmation Dialog',
    '确认': 'Confirm',
    '返回询盘': 'Back to Inquiries',
    '退出': 'Log Out',
    '修改询盘': 'Edit Inquiry',
    '修改': 'Edit',
    '左侧占位': 'left spacer',
    '右侧占位': 'right spacer',
    '左侧占位符': 'left placeholder',
    '右侧占位符': 'right placeholder',
};

// Tag-stripped helper for richDict matching
function stripTags(s) { return s.replace(/<[^>]+>/g, ''); }

// ============================================================
// richDict replacer
// ============================================================
const INLINE_TAGS = new Set(['strong', 'em', 'b', 'i', 'br', 'img', 'a', 'code', 'small']);

function applyRichDict(content) {
    let applied = 0;

    for (const { m, h } of richEntries) {
        // Check both raw content and tag-stripped content
        const hasRaw = content.includes(m);
        const hasStripped = !hasRaw && stripTags(content).includes(m);
        if (!hasRaw && !hasStripped) continue;

        // Process ALL occurrences of this marker (not just first)
        let safety = 0;
        while ((content.includes(m) || stripTags(content).includes(m)) && safety++ < 20) {
            const lines = content.split('\n');
            let found = false;

            for (let li = 0; li < lines.length; li++) {
                // Match on raw text OR tag-stripped text
                const lineHasMarker = lines[li].includes(m) || stripTags(lines[li]).includes(m);
                if (!lineHasMarker) continue;
                const line = lines[li];
                const mIdx = line.includes(m) ? line.indexOf(m) : stripTags(line).indexOf(m);

                let tagStart = -1, tagName = '';
                let k = mIdx - 1;
                while (k >= 0) {
                    if (line[k] === '>') {
                        let tS = k;
                        while (tS > 0 && line[tS - 1] !== '<') tS--;
                        tS--;
                        if (tS < 0) { k--; continue; }
                        const tag = line.substring(tS, k + 1);
                        if (tag.startsWith('</')) { k = tS - 1; continue; }
                        const tn = (tag.match(/^<(\w+)/) || [])[1];
                        if (!tn) { k = tS - 1; continue; }
                        if (INLINE_TAGS.has(tn.toLowerCase())) { k = tS - 1; continue; }
                        tagName = tn.toLowerCase();
                        tagStart = tS;
                        break;
                    }
                    k--;
                }

                if (!tagName) {
                    for (let prev = li - 1; prev >= Math.max(0, li - 5); prev--) {
                        const pl = lines[prev];
                        const tags = [...pl.matchAll(/<(span|p|li|div|td|dd|section|label)(\s[^>]*)?>(?!.*<\/\1>)/gi)];
                        if (tags.length > 0) {
                            const lastTag = tags[tags.length - 1];
                            tagName = lastTag[1].toLowerCase();
                            const closeTag = '</' + tagName + '>';
                            let endLi = -1;
                            for (let nx = li; nx < Math.min(lines.length, li + 15); nx++) {
                                if (lines[nx].includes(closeTag)) { endLi = nx; break; }
                            }
                            if (endLi !== -1) {
                                const openIdx = pl.lastIndexOf('<' + lastTag[1]);
                                const openEnd = pl.indexOf('>', openIdx) + 1;
                                lines[prev] = pl.substring(0, openEnd) + h;
                                for (let mid = prev + 1; mid < endLi; mid++) lines[mid] = '';
                                const ci = lines[endLi].indexOf(closeTag);
                                lines[endLi] = lines[endLi].substring(ci);
                                found = true;
                            }
                            break;
                        }
                    }
                    if (found) { content = lines.join('\n'); applied++; break; }
                    // If we can't find the container, skip this line to avoid infinite loop
                    break;
                }

                const closeTag = '</' + tagName + '>';
                let closeIdx = line.lastIndexOf(closeTag);
                if (closeIdx < mIdx) closeIdx = -1;

                if (closeIdx === -1) {
                    let endLi = -1;
                    for (let nx = li + 1; nx < Math.min(lines.length, li + 15); nx++) {
                        if (lines[nx].includes(closeTag)) { endLi = nx; break; }
                    }
                    if (endLi !== -1) {
                        const innerStart = line.indexOf('>', tagStart) + 1;
                        lines[li] = line.substring(0, innerStart) + h;
                        for (let mid = li + 1; mid < endLi; mid++) lines[mid] = '';
                        const ci = lines[endLi].indexOf(closeTag);
                        lines[endLi] = lines[endLi].substring(ci);
                        found = true;
                    }
                } else {
                    const innerStart = line.indexOf('>', tagStart) + 1;
                    lines[li] = line.substring(0, innerStart) + h + line.substring(closeIdx);
                    found = true;
                }

                if (found) { content = lines.join('\n'); applied++; }
                break; // move to next while iteration to re-split lines
            }
            if (!found) break; // no more matches possible
        }
    }
    return { content, applied };
}

// ============================================================
// File converter
// ============================================================
function convertFile(fp) {
    if (!fs.existsSync(fp)) { console.log(`  [SKIP] ${path.basename(fp)}`); return; }
    let c = fs.readFileSync(fp, 'utf-8');
    const orig = c;

    // Protect & flip ternaries
    const tmap = {};
    let ti = 0;
    c = c.replace(/<%=\s*lng\s*===\s*'en'\s*\?\s*'([^']*)'\s*:\s*'([^']*)'\s*%>/g,
        (_, en, zh) => { const p = `\x00T${ti++}\x00`; tmap[p] = `<%= lng === 'zh' ? '${zh}' : '${en}' %>`; return p; });
    c = c.replace(/<%=\s*typeof\s+lng\s*!==\s*'undefined'\s*&&\s*lng\s*===\s*'en'\s*\?\s*'([^']*)'\s*:\s*'([^']*)'\s*%>/g,
        (_, en, zh) => { const p = `\x00T${ti++}\x00`; tmap[p] = `<%= lng === 'zh' ? '${zh}' : '${en}' %>`; return p; });
    c = c.replace(/<%=\s*typeof\s+lng\s*!==\s*'undefined'\s*&&\s*lng\s*===\s*'en'\s*\?\s*"([^"]*)"\s*:\s*'([^']*)'\s*%>/g,
        (_, en, zh) => { const p = `\x00T${ti++}\x00`; tmap[p] = `<%= lng === 'zh' ? '${zh}' : '${en}' %>`; return p; });
    c = c.replace(/<%=\s*typeof\s+lng\s*!==\s*'undefined'\s*&&\s*lng\s*===\s*'en'\s*\n\s*\?\s*'([^']*)'\s*\n?\s*:\s*'([^']*)'\s*%>/g,
        (_, en, zh) => { const p = `\x00T${ti++}\x00`; tmap[p] = `<%= lng === 'zh' ? '${zh}' : '${en}' %>`; return p; });
    c = c.replace(/\(lng\s*===\s*'en'\s*\?\s*'([^']*)'\s*:\s*'([^']*)'\s*\)/g,
        (_, en, zh) => { const p = `\x00T${ti++}\x00`; tmap[p] = `(lng === 'zh' ? '${zh}' : '${en}')`; return p; });
    c = c.replace(/window\.__lang\s*===\s*'en'\s*\?\s*'([^']*)'\s*:\s*'([^']*)'/g,
        (_, en, zh) => { const p = `\x00T${ti++}\x00`; tmap[p] = `window.__lang === 'zh' ? '${zh}' : '${en}'`; return p; });

    // Apply richDict FIRST
    const { content: c2, applied: richCount } = applyRichDict(c);
    c = c2;

    // Manual translations - use safeReplace for word-boundary safety
    let manualCount = 0;
    const manualKeys = Object.keys(manualDict).sort((a, b) => b.length - a.length);
    for (const zh of manualKeys) {
        if (c.includes(zh)) { const b = c; c = safeReplace(c, zh, manualDict[zh]); if (c !== b) manualCount++; }
    }

    // Dict replacements (word-boundary safe, longest first)
    let dictCount = 0;
    for (const k of zhKeys) {
        if (c.includes(k)) { const b = c; c = safeReplace(c, k, mainDict[k]); if (c !== b) dictCount++; }
    }
    for (const k of zhFragKeys) {
        if (c.includes(k)) { const b = c; c = safeReplace(c, k, fragDict[k]); if (c !== b) dictCount++; }
    }

    // Restore ternaries
    for (const [ph, val] of Object.entries(tmap)) { c = c.split(ph).join(val); }

    if (c !== orig) fs.writeFileSync(fp, c, 'utf-8');

    // Report remaining
    const allLines = c.split('\n');
    const rem = [];
    for (let i = 0; i < allLines.length; i++) {
        const l = allLines[i];
        if (!/[\u4e00-\u9fff]/.test(l)) continue;
        const t = l.trim();
        if (t.startsWith('<!--') || t.startsWith('//') || t.startsWith('/*') || t.startsWith('*')) continue;
        if (/lng\s*===\s*'zh'\s*\?/.test(l) || /lng\s*===\s*'en'\s*\?/.test(l) || /__lang\s*===/.test(l)) continue;
        rem.push({ ln: i + 1, text: t.substring(0, 140) });
    }
    console.log(`  ${path.basename(fp)}: rich=${richCount} manual=${manualCount} dict=${dictCount} terns=${ti} remain=${rem.length}`);
    rem.slice(0, 15).forEach(r => console.log(`    L${r.ln}: ${r.text}`));
    if (rem.length > 15) console.log(`    ... (${rem.length} total)`);
}

console.log('\n=== Converting EJS ===');
['custom', 'landing', 'user', 'login', 'reset', 'privacy', 'admin'].forEach(n =>
    convertFile(path.join(ROOT, `views/${n}.ejs`)));
console.log('\n=== Converting JS ===');
['custom', 'user', 'modal', 'admin'].forEach(n =>
    convertFile(path.join(ROOT, `public/${n}.js`)));

// Reversed dicts
console.log('\n=== Reversed dicts ===');
const rev = { dict: {}, jsDynamic: {}, fragments: {} };
for (const [zh, en] of Object.entries(dicts.dict)) {
    if (/[\u4e00-\u9fff]/.test(zh) && en.trim()) { if (!rev.dict[en] || zh.length > rev.dict[en].length) rev.dict[en] = zh; }
}
for (const [zh, en] of Object.entries(dicts.jsDynamic)) {
    if (/[\u4e00-\u9fff]/.test(zh) && en.trim()) { if (!rev.jsDynamic[en] || zh.length > rev.jsDynamic[en].length) rev.jsDynamic[en] = zh; }
}
for (const [zh, en] of Object.entries(fragDict)) {
    if (en.trim()) { if (!rev.fragments[en] || zh.length > rev.fragments[en].length) rev.fragments[en] = zh; }
}
console.log(`  dict=${Object.keys(rev.dict).length} jsDynamic=${Object.keys(rev.jsDynamic).length} frag=${Object.keys(rev.fragments).length}`);
fs.writeFileSync(path.join(ROOT, 'temp-reversed-dict.json'), JSON.stringify(rev, null, 2), 'utf-8');
console.log('\nDone!');
