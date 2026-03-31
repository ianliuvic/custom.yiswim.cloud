/* ── Shared modal helpers (replace native alert / confirm) ── */
(function () {
    'use strict';

    var _modalIcons = {
        error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="9 12 12 15 16 10"/></svg>',
        info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        warn:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
    };

    function _createModal(iconType, text, buttons) {
        var overlay = document.createElement('div');
        overlay.className = 'u-modal-overlay';
        overlay.innerHTML =
            '<div class="u-modal-box">' +
            '<div class="u-modal-icon ' + iconType + '">' + _modalIcons[iconType] + '</div>' +
            '<div class="u-modal-text">' + text.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
            '<div class="u-modal-actions">' + buttons + '</div>' +
            '</div>';
        document.body.appendChild(overlay);
        requestAnimationFrame(function () { overlay.classList.add('active'); });
        return overlay;
    }

    function _closeModal(overlay) {
        overlay.classList.remove('active');
        setTimeout(function () { overlay.remove(); }, 200);
    }

    window.showMsg = function showMsg(text, type) {
        type = type || 'info';
        return new Promise(function (resolve) {
            var overlay = _createModal(type, text,
                '<button class="u-modal-btn primary" data-action="ok">确定</button>');
            var btn = overlay.querySelector('[data-action="ok"]');
            btn.onclick = function () { _closeModal(overlay); resolve(); };
            overlay.addEventListener('click', function (e) { if (e.target === overlay) { _closeModal(overlay); resolve(); } });
            btn.focus();
        });
    };

    window.showConfirm = function showConfirm(text) {
        return new Promise(function (resolve) {
            var overlay = _createModal('warn', text,
                '<button class="u-modal-btn cancel" data-action="no">取消</button>' +
                '<button class="u-modal-btn primary" data-action="yes">确定</button>');
            function close(val) { _closeModal(overlay); resolve(val); }
            overlay.querySelector('[data-action="yes"]').onclick = function () { close(true); };
            overlay.querySelector('[data-action="no"]').onclick = function () { close(false); };
            overlay.addEventListener('click', function (e) { if (e.target === overlay) close(false); });
            overlay.querySelector('[data-action="yes"]').focus();
        });
    };
})();
