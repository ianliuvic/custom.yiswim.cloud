/**
 * Extract richDict Chinese innerHTML from backup EJS for each richDict entry.
 * Output: temp-rich-pairs.json with [{m_en, en_html, zh_html}] for the new i18n.js
 */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

// Parse richDict from i18n.js
const raw = fs.readFileSync(path.join(ROOT, 'public/i18n.js'), 'utf-8');
function uesSingle(s) {
    return s
        .replace(/\\u([0-9a-fA-F]{4})/g, (_, c) => String.fromCharCode(parseInt(c, 16)))
        .replace(/\\n/g, '\n').replace(/\\t/g, '\t')
        .replace(/\\'/g, "'").replace(/\\\\/g, '\\');
}

const richEntries = [];
const richStart = raw.indexOf('var richDict = [');
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
console.log(`Parsed ${richEntries.length} richDict entries`);

// Load backup EJS
const backup = fs.readFileSync(path.join(ROOT, 'backup-i18n/custom.ejs'), 'utf-8');
const backupLines = backup.split('\n');

const INLINE_TAGS = new Set(['strong', 'em', 'b', 'i', 'br', 'img', 'a', 'code', 'small']);
function stripTags(s) { return s.replace(/<[^>]+>/g, ''); }

const pairs = [];
let matched = 0;

for (const entry of richEntries) {
    const { m, h } = entry;
    
    // Find the line in backup containing marker m
    let found = false;
    for (let li = 0; li < backupLines.length; li++) {
        const line = backupLines[li];
        const hasRaw = line.includes(m);
        const hasStripped = !hasRaw && stripTags(line).includes(m);
        if (!hasRaw && !hasStripped) continue;
        
        // Find the container element
        const mIdx = hasRaw ? line.indexOf(m) : 0;
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
            // Check previous line
            for (let prev = li - 1; prev >= Math.max(0, li - 5); prev--) {
                const pl = backupLines[prev];
                const tags = [...pl.matchAll(/<(span|p|li|div|td|dd|section|label)(\s[^>]*)?>(?!.*<\/\1>)/gi)];
                if (tags.length > 0) {
                    const lastTag = tags[tags.length - 1];
                    tagName = lastTag[1].toLowerCase();
                    const closeTag = '</' + tagName + '>';
                    let endLi = -1;
                    for (let nx = li; nx < Math.min(backupLines.length, li + 15); nx++) {
                        if (backupLines[nx].includes(closeTag)) { endLi = nx; break; }
                    }
                    if (endLi !== -1) {
                        const openIdx = pl.lastIndexOf('<' + lastTag[1]);
                        const openEnd = pl.indexOf('>', openIdx) + 1;
                        // Extract Chinese innerHTML
                        let zhHtml = pl.substring(openEnd);
                        for (let mid = prev + 1; mid < endLi; mid++) zhHtml += '\n' + backupLines[mid];
                        const ci = backupLines[endLi].indexOf(closeTag);
                        zhHtml += '\n' + backupLines[endLi].substring(0, ci);
                        zhHtml = zhHtml.trim();
                        
                        // Build English marker from h value
                        const enText = stripTags(h).replace(/\s+/g, ' ').trim();
                        const enMarker = enText.substring(0, 30);
                        
                        pairs.push({ m_en: enMarker, en_html: h, zh_html: zhHtml });
                        found = true;
                        matched++;
                    }
                    break;
                }
            }
            if (found) break;
            continue;
        }
        
        // Extract Chinese innerHTML from container on this line
        const closeTag = '</' + tagName + '>';
        let closeIdx = line.lastIndexOf(closeTag);
        if (closeIdx < mIdx) closeIdx = -1;
        
        let zhHtml;
        if (closeIdx !== -1) {
            // Single line
            const innerStart = line.indexOf('>', tagStart) + 1;
            zhHtml = line.substring(innerStart, closeIdx);
        } else {
            // Multi-line
            const innerStart = line.indexOf('>', tagStart) + 1;
            zhHtml = line.substring(innerStart);
            let endLi = -1;
            for (let nx = li + 1; nx < Math.min(backupLines.length, li + 15); nx++) {
                if (backupLines[nx].includes(closeTag)) { endLi = nx; break; }
            }
            if (endLi !== -1) {
                for (let mid = li + 1; mid < endLi; mid++) zhHtml += '\n' + backupLines[mid];
                const ci = backupLines[endLi].indexOf(closeTag);
                zhHtml += '\n' + backupLines[endLi].substring(0, ci);
            }
        }
        
        if (zhHtml) {
            zhHtml = zhHtml.trim();
            const enText = stripTags(h).replace(/\s+/g, ' ').trim();
            const enMarker = enText.substring(0, 30);
            pairs.push({ m_en: enMarker, en_html: h, zh_html: zhHtml });
            found = true;
            matched++;
        }
        break;
    }
    
    if (!found) {
        console.log(`  MISS: m="${m.substring(0,30)}"`);
    }
}

console.log(`Matched ${matched} / ${richEntries.length} entries`);
fs.writeFileSync(path.join(ROOT, 'temp-rich-pairs.json'), JSON.stringify(pairs, null, 2), 'utf-8');
console.log(`Saved to temp-rich-pairs.json`);
