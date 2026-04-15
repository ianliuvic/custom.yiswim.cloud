/**
 * Generate the new i18n.js with reversed dictionaries (English→Chinese)
 * for the English-native architecture.
 */
const fs = require('fs');
const path = require('path');
const ROOT = __dirname;

// Load reversed dicts
const rev = JSON.parse(fs.readFileSync(path.join(ROOT, 'temp-reversed-dict.json'), 'utf-8'));
const richPairs = JSON.parse(fs.readFileSync(path.join(ROOT, 'temp-rich-pairs.json'), 'utf-8'));

// Also load original richDict for entries we couldn't extract zh_html for
const raw = fs.readFileSync(path.join(ROOT, 'public/i18n.js'), 'utf-8');

function esc(s) {
    return s
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\r\n/g, '\\n')
        .replace(/\r/g, '\\n')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t');
}

function escSingle(s) {
    return s
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\r\n/g, '\\n')
        .replace(/\r/g, '\\n')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t');
}

// Build dict entries string
function buildDict(obj, indent) {
    const entries = Object.entries(obj)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([en, zh]) => `${indent}"${esc(en)}": "${esc(zh)}"`)
        .join(',\n');
    return entries;
}

// Build richDict entries string
function buildRichDict() {
    return richPairs
        .map(p => `        { m: '${escSingle(p.m_en)}', h: '${escSingle(p.zh_html)}' }`)
        .join(',\n');
}

// Generate the complete i18n.js
const output = `/**
 * Client-side i18n translation engine (English-native)
 * DOM text replacement: walks text nodes and replaces English → Chinese
 * when the user's language is set to Chinese.
 */
(function () {
    'use strict';

    var LANG = window.__lang || 'en';

    // Hide page when switching to Chinese to avoid English flash
    if (LANG !== 'en') {
        var _i18nStyle = document.createElement('style');
        _i18nStyle.textContent = 'body{opacity:0!important;transition:opacity .15s}';
        (document.head || document.documentElement).appendChild(_i18nStyle);
    }
    function _revealPage() {
        if (_i18nStyle && _i18nStyle.parentNode) {
            _i18nStyle.parentNode.removeChild(_i18nStyle);
        }
    }

    // ==================== English → Chinese dictionary ====================
    var dict = {
${buildDict(rev.dict, '        ')}
    };

    // Dynamic content translations (JS-generated text)
    var jsDynamic = {
${buildDict(rev.jsDynamic, '        ')}
    };

    // Fragment translations for partial string replacement
    var fragments = {
${buildDict(rev.fragments, '        ')}
    };

    // Rich text translations (elements with inline HTML)
    var richDict = [
${buildRichDict()}
    ];

    // ==================== Engine ====================

    // Merge jsDynamic into dict
    for (var k in jsDynamic) {
        if (jsDynamic.hasOwnProperty(k) && !dict[k]) {
            dict[k] = jsDynamic[k];
        }
    }

    // Pre-sorted keys for partial matching (longest first)
    var _sortedKeys = null;
    function getSortedKeys() {
        if (_sortedKeys) return _sortedKeys;
        var allKeys = {};
        var k;
        for (k in dict) { if (dict.hasOwnProperty(k)) allKeys[k] = dict[k]; }
        for (k in fragments) { if (fragments.hasOwnProperty(k)) allKeys[k] = fragments[k]; }
        _sortedKeys = Object.keys(allKeys).sort(function(a, b) { return b.length - a.length; });
        _sortedKeys._map = allKeys;
        return _sortedKeys;
    }

    // Build a Set of exact dict keys for fast lookup
    var _dictKeySet = null;
    function getDictKeySet() {
        if (_dictKeySet) return _dictKeySet;
        _dictKeySet = new Set(Object.keys(dict));
        return _dictKeySet;
    }

    /**
     * Translate an English string to Chinese.
     * Supports exact match and partial replacement.
     */
    function _t(text) {
        if (LANG === 'en' || !text) return text;
        // Exact match
        if (dict[text]) return dict[text];
        var trimmed = text.trim();
        if (dict[trimmed]) return dict[trimmed];

        // Partial replacement for strings containing known English phrases
        var keys = getSortedKeys();
        var map = keys._map;
        var result = text;
        var changed = false;
        for (var i = 0; i < keys.length; i++) {
            if (result.indexOf(keys[i]) !== -1) {
                result = result.split(keys[i]).join(map[keys[i]]);
                changed = true;
            }
        }
        return changed ? result : text;
    }

    /**
     * Translate elements containing inline HTML (<strong>, <span>, etc.)
     */
    function translateRichElements(root) {
        if (LANG === 'en' || richDict.length === 0) return;
        root = root || document.body;
        var els = Array.prototype.slice.call(root.querySelectorAll('div, span, p, li, td, label, h5'));
        els.reverse();
        for (var i = 0; i < els.length; i++) {
            var el = els[i];
            if (el.getAttribute('data-i18n-done')) continue;
            if (el.querySelector('[data-i18n-done]')) continue;
            var tag = el.tagName;
            if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEXTAREA') continue;
            var hasInline = false;
            for (var c = 0; c < el.children.length; c++) {
                var ct = el.children[c].tagName;
                if (ct === 'STRONG' || ct === 'SPAN' || ct === 'EM' || ct === 'B') {
                    hasInline = true;
                    break;
                }
            }
            if (!hasInline) continue;
            var tc = el.textContent;
            if (!tc) continue;
            var norm = tc.replace(/\\s+/g, ' ').trim();
            for (var j = 0; j < richDict.length; j++) {
                if (norm.indexOf(richDict[j].m) !== -1) {
                    el.innerHTML = richDict[j].h;
                    el.setAttribute('data-i18n-done', '1');
                    break;
                }
            }
        }
    }

    /**
     * Walk all text nodes and replace English text with Chinese.
     */
    function translateDOM(root) {
        if (LANG === 'en') return;
        root = root || document.body;

        // First pass: rich elements with inline HTML
        translateRichElements(root);

        // Second pass: individual text nodes
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        var node;
        var replacements = [];
        var keySet = getDictKeySet();

        while (node = walker.nextNode()) {
            var text = node.nodeValue;
            if (!text || !text.trim()) continue;
            var parent = node.parentNode;
            if (!parent) continue;
            var ptag = parent.tagName;
            if (ptag === 'SCRIPT' || ptag === 'STYLE' || ptag === 'TEXTAREA') continue;

            var trimmed = text.trim();

            // Exact match (most common case)
            if (dict[trimmed]) {
                var leading = text.match(/^\\s*/)[0];
                var trailing = text.match(/\\s*$/)[0];
                replacements.push({ node: node, value: leading + dict[trimmed] + trailing });
                continue;
            }

            // Partial replacement: check if text contains any known key
            var newText = text;
            var changed = false;
            var sortedKeys = getSortedKeys();
            var map = sortedKeys._map;
            for (var i = 0; i < sortedKeys.length; i++) {
                if (newText.indexOf(sortedKeys[i]) !== -1) {
                    newText = newText.split(sortedKeys[i]).join(map[sortedKeys[i]]);
                    changed = true;
                }
            }
            if (changed) {
                replacements.push({ node: node, value: newText });
            }
        }

        for (var r = 0; r < replacements.length; r++) {
            replacements[r].node.nodeValue = replacements[r].value;
        }

        // Translate placeholder, title, and alt attributes
        var elements = root.querySelectorAll('[placeholder], [title], [alt]');
        for (var e = 0; e < elements.length; e++) {
            var el = elements[e];
            ['placeholder', 'title', 'alt'].forEach(function(attr) {
                var val = el.getAttribute(attr);
                if (val) {
                    var translated = _t(val);
                    if (translated !== val) {
                        el.setAttribute(attr, translated);
                    }
                }
            });
        }

        // Translate <option> text
        var options = root.querySelectorAll('option');
        for (var o = 0; o < options.length; o++) {
            var optText = options[o].textContent.trim();
            if (dict[optText]) {
                options[o].textContent = dict[optText];
            }
        }
    }

    /**
     * MutationObserver for dynamically inserted content
     */
    function observeDOM() {
        if (LANG === 'en') return;
        var pendingNodes = [];
        var translateTimer = null;

        var observer = new MutationObserver(function (mutations) {
            var hasNew = false;
            for (var i = 0; i < mutations.length; i++) {
                var mutation = mutations[i];
                if (mutation.addedNodes.length > 0) {
                    for (var j = 0; j < mutation.addedNodes.length; j++) {
                        var added = mutation.addedNodes[j];
                        if (added.nodeType === Node.ELEMENT_NODE) {
                            pendingNodes.push(added);
                            hasNew = true;
                        } else if (added.nodeType === Node.TEXT_NODE) {
                            var val = added.nodeValue;
                            if (val && val.trim()) {
                                var translated = _t(val.trim());
                                if (translated !== val.trim()) {
                                    var lead = val.match(/^\\s*/)[0];
                                    var trail = val.match(/\\s*$/)[0];
                                    added.nodeValue = lead + translated + trail;
                                }
                            }
                        }
                    }
                }
                if (mutation.type === 'characterData') {
                    var target = mutation.target;
                    if (target.nodeType === Node.TEXT_NODE && target.parentNode) {
                        var pTag = target.parentNode.tagName;
                        if (pTag !== 'SCRIPT' && pTag !== 'STYLE' && pTag !== 'TEXTAREA') {
                            var tv = target.nodeValue;
                            if (tv && tv.trim()) {
                                var tr = _t(tv.trim());
                                if (tr !== tv.trim()) {
                                    var ld = tv.match(/^\\s*/)[0];
                                    var tl = tv.match(/\\s*$/)[0];
                                    target.nodeValue = ld + tr + tl;
                                }
                            }
                        }
                    }
                }
            }
            if (hasNew && !translateTimer) {
                translateTimer = setTimeout(function () {
                    var nodes = pendingNodes.slice();
                    pendingNodes = [];
                    translateTimer = null;
                    for (var n = 0; n < nodes.length; n++) {
                        translateDOM(nodes[n]);
                    }
                }, 50);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    // ==================== Language Toggle ====================
    function setLanguage(lng) {
        fetch('/api/set-language', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lng: lng })
        }).then(function () {
            window.location.reload();
        });
    }

    // ==================== Init ====================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            translateDOM();
            _revealPage();
            observeDOM();
        });
    } else {
        translateDOM();
        _revealPage();
        observeDOM();
    }

    window.addEventListener('load', function () {
        setTimeout(function () { translateDOM(); }, 300);
        setTimeout(function () { translateDOM(); }, 1000);
    });

    // Tagged template for strings with dynamic parts (compat stub)
    function _tf(strings) {
        var values = Array.prototype.slice.call(arguments, 1);
        var full = '';
        for (var i = 0; i < strings.length; i++) {
            full += strings[i];
            if (i < values.length) full += values[i];
        }
        return _t(full);
    }

    // Expose globals
    window._t = _t;
    window._tf = _tf;
    window.translateDOM = translateDOM;
    window.setLanguage = setLanguage;
    window.__i18nDict = dict;
})();
`;

// Write the new i18n.js
const outPath = path.join(ROOT, 'public/i18n-new.js');
fs.writeFileSync(outPath, output, 'utf-8');
console.log(`Generated ${outPath}`);
console.log(`  dict: ${Object.keys(rev.dict).length} entries`);
console.log(`  jsDynamic: ${Object.keys(rev.jsDynamic).length} entries`);
console.log(`  fragments: ${Object.keys(rev.fragments).length} entries`);
console.log(`  richDict: ${richPairs.length} entries`);
console.log(`  Total lines: ${output.split('\n').length}`);
