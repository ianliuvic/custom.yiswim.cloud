/**
 * Extract the 18 missed richDict Chinese HTML from backup.
 * Searches for Chinese markers in backup EJS and extracts the containing element's innerHTML.
 */
const fs = require('fs');
const path = require('path');

const backup = fs.readFileSync(path.join(__dirname, 'backup-i18n/custom.ejs'), 'utf-8');
const lines = backup.split('\n');

// Load old richDict
const oldSrc = fs.readFileSync(path.join(__dirname, 'backup-i18n/i18n.js'), 'utf-8');
const rdMatch = oldSrc.match(/var\s+richDict\s*=\s*\[([\s\S]*?)\];/);
const re = /\{\s*m:\s*'([^']+)',\s*h:\s*'([^']+)'\s*\}/g;
const allOld = [];
let m;
while (m = re.exec(rdMatch[1])) {
    allOld.push({ m_zh: m[1], h_en: m[2] });
}

// Load already matched
const matched = JSON.parse(fs.readFileSync(path.join(__dirname, 'temp-rich-pairs.json'), 'utf-8'));
const matchedSet = new Set(matched.map(r => r.m_en));

// Find missed entries
const missed = allOld.filter(e => {
    const tc = e.h_en.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 30);
    return !matchedSet.has(tc);
});

console.log(`Processing ${missed.length} missed entries...\n`);

// For each missed entry, find the line in backup containing the Chinese marker,
// then extract the full element's innerHTML
const results = [];

for (const entry of missed) {
    const marker = entry.m_zh;
    // Unescape unicode sequences
    const actualMarker = marker.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    
    // Find line containing marker
    let foundLine = -1;
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes(actualMarker)) {
            foundLine = i;
            break;
        }
    }
    
    if (foundLine === -1) {
        console.log(`MISS: "${actualMarker}" not found in backup`);
        continue;
    }
    
    // Search backwards for opening tag
    let startLine = foundLine;
    let depth = 0;
    const inlineTags = new Set(['STRONG', 'SPAN', 'EM', 'B', 'BR', 'I', 'SUB', 'SUP']);
    
    for (let i = foundLine; i >= Math.max(0, foundLine - 20); i--) {
        const line = lines[i];
        // Check for opening tags (skip inline ones)
        const openMatch = line.match(/<(\w+)[\s>]/);
        if (openMatch) {
            const tag = openMatch[1].toUpperCase();
            if (!inlineTags.has(tag)) {
                startLine = i;
                break;
            }
        }
    }
    
    // Search forwards for closing tag from marker line
    let endLine = foundLine;
    const openLine = lines[startLine];
    const tagMatch = openLine.match(/<(\w+)[\s>]/);
    if (tagMatch) {
        const tag = tagMatch[1];
        const closeTag = `</${tag}>`;
        let depth2 = 0;
        const openRe = new RegExp(`<${tag}[\\s>]`, 'gi');
        const closeRe = new RegExp(`</${tag}>`, 'gi');
        
        for (let i = startLine; i < Math.min(lines.length, foundLine + 40); i++) {
            const line = lines[i];
            const opens = (line.match(openRe) || []).length;
            const closes = (line.match(closeRe) || []).length;
            depth2 += opens - closes;
            if (depth2 <= 0 && i >= foundLine) {
                endLine = i;
                break;
            }
        }
    }
    
    // Extract innerHTML
    const fullBlock = lines.slice(startLine, endLine + 1).join('\n');
    // Strip the outermost tag
    const innerMatch = fullBlock.match(/^[^>]*>([\s\S]*)<\/\w+>\s*$/);
    const innerHTML = innerMatch ? innerMatch[1].trim() : fullBlock;
    
    const m_en = entry.h_en.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().substring(0, 30);
    
    console.log(`FOUND: "${actualMarker.substring(0,30)}" at line ${foundLine+1}`);
    console.log(`  EN marker: "${m_en}"`);
    console.log(`  ZH HTML (first 80): ${innerHTML.substring(0,80).replace(/\n/g, '\\n')}...`);
    console.log();
    
    results.push({
        m_en: m_en,
        en_html: entry.h_en,
        zh_html: innerHTML
    });
}

console.log(`\nExtracted: ${results.length} / ${missed.length}`);

// Merge with existing matched entries
const allPairs = [...matched, ...results];
fs.writeFileSync(path.join(__dirname, 'temp-rich-pairs.json'), JSON.stringify(allPairs, null, 2), 'utf-8');
console.log(`Total pairs saved: ${allPairs.length}`);
