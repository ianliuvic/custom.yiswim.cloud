/**
 * i18n Refactor: Chinese-native → English-native (v2 - word-boundary safe)
 * 
 * Key improvement: Only replaces Chinese text when NOT surrounded by other
 * Chinese characters, preventing garbled partial replacements.
 */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

// ============================================================
// STEP 1: Parse dictionaries from i18n.js
// ============================================================
console.log('=== Parsing i18n.js dictionaries ===');
const raw = fs.readFileSync(path.join(ROOT, 'public/i18n.js'), 'utf-8');

function ues(s) {
    return s
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');
}

// Re-escape for writing to JS source
function esc(s) {
    return s
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t');
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

console.log(`  dict: ${Object.keys(dicts.dict).length}`);
console.log(`  jsDynamic: ${Object.keys(dicts.jsDynamic).length}`);
console.log(`  fragments: ${Object.keys(fragDict).length}`);
console.log(`  combined: ${Object.keys(mainDict).length}`);

// Also extract richDict for manual reference
const richDictRaw = [];
const richMatch = raw.match(/var richDict = \[([\s\S]*?)\];/);
if (richMatch) {
    const entries = richMatch[1].matchAll(/\{\s*m:\s*'((?:[^'\\]|\\.)*)'\s*,\s*h:\s*'((?:[^'\\]|\\.)*)'\s*\}/g);
    for (const e of entries) {
        richDictRaw.push({ m: e[1], h: e[2] });
    }
}
console.log(`  richDict: ${richDictRaw.length} entries`);

// Sort keys: longest Chinese first
const zhKeys = Object.keys(mainDict)
    .filter(k => /[\u4e00-\u9fff]/.test(k))
    .sort((a, b) => b.length - a.length);

const zhFragKeys = Object.keys(fragDict)
    .filter(k => /[\u4e00-\u9fff]/.test(k))
    .sort((a, b) => b.length - a.length);

// ============================================================
// Helper: Escape regex special chars
// ============================================================
function escRx(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================
// STEP 2: Convert files with word-boundary-safe replacement
// ============================================================

/**
 * Replace Chinese key with English value ONLY when the key is NOT
 * embedded inside a larger Chinese text block.
 * Uses negative lookbehind/lookahead for Chinese chars.
 */
function safeReplace(content, zhKey, enVal) {
    // Build regex with Chinese word boundaries
    const escaped = escRx(zhKey);
    const regex = new RegExp(
        `(?<![\\u4e00-\\u9fff])${escaped}(?![\\u4e00-\\u9fff])`,
        'g'
    );
    return content.replace(regex, enVal);
}

function convertFile(fp) {
    if (!fs.existsSync(fp)) { console.log(`  [SKIP] ${path.basename(fp)} not found`); return; }
    let c = fs.readFileSync(fp, 'utf-8');
    const orig = c;

    // 2a. Protect & flip EJS ternaries
    //     Pattern 1: lng === 'en' ? 'X' : 'Y'
    //     Pattern 2: typeof lng !== 'undefined' && lng === 'en' ? 'X' : 'Y'
    const tmap = {};
    let ti = 0;
    
    // Pattern 1: simple
    c = c.replace(
        /<%=\s*lng\s*===\s*'en'\s*\?\s*'([^']*)'\s*:\s*'([^']*)'\s*%>/g,
        (_, enVal, zhVal) => {
            const ph = `\x00TERN${ti++}\x00`;
            tmap[ph] = `<%= lng === 'zh' ? '${zhVal}' : '${enVal}' %>`;
            return ph;
        }
    );
    
    // Pattern 2: typeof guard (landing.ejs)
    c = c.replace(
        /<%=\s*typeof\s+lng\s*!==\s*'undefined'\s*&&\s*lng\s*===\s*'en'\s*\?\s*'([^']*)'\s*:\s*'([^']*)'\s*%>/g,
        (_, enVal, zhVal) => {
            const ph = `\x00TERN${ti++}\x00`;
            tmap[ph] = `<%= lng === 'zh' ? '${zhVal}' : '${enVal}' %>`;
            return ph;
        }
    );
    
    // Pattern 3: typeof guard with double quotes (landing.ejs)
    c = c.replace(
        /<%=\s*typeof\s+lng\s*!==\s*'undefined'\s*&&\s*lng\s*===\s*'en'\s*\?\s*"([^"]*)"\s*:\s*'([^']*)'\s*%>/g,
        (_, enVal, zhVal) => {
            const ph = `\x00TERN${ti++}\x00`;
            tmap[ph] = `<%= lng === 'zh' ? '${zhVal}' : '${enVal}' %>`;
            return ph;
        }
    );
    
    // Pattern 4: multiline typeof ternaries (landing.ejs forgot-box help text)
    c = c.replace(
        /<%=\s*typeof\s+lng\s*!==\s*'undefined'\s*&&\s*lng\s*===\s*'en'\s*\n\s*\?\s*'([^']*)'\s*\n?\s*:\s*'([^']*)'\s*%>/g,
        (_, enVal, zhVal) => {
            const ph = `\x00TERN${ti++}\x00`;
            tmap[ph] = `<%= lng === 'zh' ? '${zhVal}' : '${enVal}' %>`;
            return ph;
        }
    );
    
    // Also protect already-flipped ternaries (lng === 'zh') from having their Chinese replaced
    c = c.replace(
        /<%=\s*lng\s*===\s*'zh'\s*\?\s*'([^']*)'\s*:\s*'([^']*)'\s*%>/g,
        (_, zhVal, enVal) => {
            const ph = `\x00TERNZ${ti++}\x00`;
            tmap[ph] = `<%= lng === 'zh' ? '${zhVal}' : '${enVal}' %>`;
            return ph;
        }
    );
    
    // Protect special ternary: (lng === 'en' ? 'Guest' : '访客')
    c = c.replace(
        /\(lng\s*===\s*'en'\s*\?\s*'([^']*)'\s*:\s*'([^']*)'\s*\)/g,
        (_, enVal, zhVal) => {
            const ph = `\x00TERNP${ti++}\x00`;
            tmap[ph] = `(lng === 'zh' ? '${zhVal}' : '${enVal}')`;
            return ph;
        }
    );
    
    // Protect __lang ternaries in inline JS
    c = c.replace(
        /window\.__lang\s*===\s*'en'\s*\?\s*'([^']*)'\s*:\s*'([^']*)'/g,
        (_, enVal, zhVal) => {
            const ph = `\x00TERNJ${ti++}\x00`;
            tmap[ph] = `window.__lang === 'zh' ? '${zhVal}' : '${enVal}'`;
            return ph;
        }
    );

    // 2b. Replace Chinese → English using dict (longest keys first, word-boundary safe)
    let replCount = 0;
    for (const k of zhKeys) {
        if (c.includes(k)) {
            const before = c;
            c = safeReplace(c, k, mainDict[k]);
            if (c !== before) replCount++;
        }
    }
    for (const k of zhFragKeys) {
        if (c.includes(k)) {
            const before = c;
            c = safeReplace(c, k, fragDict[k]);
            if (c !== before) replCount++;
        }
    }

    // 2c. Restore all protected ternaries
    for (const [ph, val] of Object.entries(tmap)) {
        c = c.split(ph).join(val);
    }

    if (c !== orig) {
        fs.writeFileSync(fp, c, 'utf-8');
    }

    // Report remaining Chinese (excluding comments)
    const remAll = c.match(/[\u4e00-\u9fff]+/g) || [];
    const remUniq = [...new Set(remAll)];
    console.log(`  ${path.basename(fp)}: ${replCount} replacements, ${ti} ternaries, ${remUniq.length} unique Chinese groups left`);
    if (remUniq.length > 0 && remUniq.length <= 20) {
        console.log(`    ${remUniq.join(' | ')}`);
    } else if (remUniq.length > 20) {
        console.log(`    ${remUniq.slice(0, 20).join(' | ')} ... (${remUniq.length} total)`);
    }
}

console.log('\n=== Converting EJS files ===');
for (const n of ['custom', 'landing', 'user', 'login', 'reset', 'privacy', 'admin']) {
    convertFile(path.join(ROOT, `views/${n}.ejs`));
}

console.log('\n=== Converting JS files (not i18n.js) ===');
for (const n of ['custom', 'user', 'modal', 'admin']) {
    convertFile(path.join(ROOT, `public/${n}.js`));
}

// ============================================================
// STEP 3: Generate reversed dicts
// ============================================================
console.log('\n=== Generating reversed dictionaries ===');

const revDict = {};
for (const [zh, en] of Object.entries(dicts.dict)) {
    if (/[\u4e00-\u9fff]/.test(zh) && en.trim()) {
        if (!revDict[en] || zh.length > revDict[en].length) revDict[en] = zh;
    }
}

const revJsDynamic = {};
for (const [zh, en] of Object.entries(dicts.jsDynamic)) {
    if (/[\u4e00-\u9fff]/.test(zh) && en.trim()) {
        if (!revJsDynamic[en] || zh.length > revJsDynamic[en].length) revJsDynamic[en] = zh;
    }
}

const revFragments = {};
for (const [zh, en] of Object.entries(fragDict)) {
    if (en.trim()) {
        if (!revFragments[en] || zh.length > revFragments[en].length) revFragments[en] = zh;
    }
}

console.log(`  revDict: ${Object.keys(revDict).length}`);
console.log(`  revJsDynamic: ${Object.keys(revJsDynamic).length}`);
console.log(`  revFragments: ${Object.keys(revFragments).length}`);

fs.writeFileSync(
    path.join(ROOT, 'temp-reversed-dict.json'),
    JSON.stringify({ dict: revDict, jsDynamic: revJsDynamic, fragments: revFragments }, null, 2),
    'utf-8'
);

console.log('\n=== Done! ===');
