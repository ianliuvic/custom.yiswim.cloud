/* ── Shared Modal: showMsg / showConfirm ── */
(function () {
    var ICONS = {
        error: '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" stroke="#ef4444" stroke-width="3"/><path d="M16 16l16 16M32 16L16 32" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/></svg>',
        success: '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" stroke="#22c55e" stroke-width="3"/><path d="M14 25l7 7 13-14" stroke="#22c55e" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        info: '<svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" stroke="#3b82f6" stroke-width="3"/><path d="M24 22v12" stroke="#3b82f6" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="15" r="2" fill="#3b82f6"/></svg>',
        warn: '<svg viewBox="0 0 48 48" fill="none"><path d="M24 4L2 44h44L24 4z" stroke="#f59e0b" stroke-width="3" stroke-linejoin="round"/><path d="M24 20v10" stroke="#f59e0b" stroke-width="3" stroke-linecap="round"/><circle cx="24" cy="36" r="2" fill="#f59e0b"/></svg>'
    };

    function createOverlay() {
        var overlay = document.createElement('div');
        overlay.className = 'u-modal-overlay';
        return overlay;
    }

    function closeModal(overlay, value, resolve) {
        overlay.classList.remove('visible');
        setTimeout(function () {
            if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
            if (resolve) resolve(value);
        }, 250);
    }

    /**
     * showMsg(text, type) - replaces alert()
     * @param {string} text
     * @param {string} [type='info'] - 'error'|'success'|'info'|'warn'
     * @returns {Promise<void>}
     */
    window.showMsg = function (text, type) {
        type = type || 'info';
        return new Promise(function (resolve) {
            var overlay = createOverlay();
            overlay.innerHTML =
                '<div class="u-modal-box">' +
                    '<div class="u-modal-icon">' + (ICONS[type] || ICONS.info) + '</div>' +
                    '<div class="u-modal-text"></div>' +
                    '<div class="u-modal-actions">' +
                        '<button class="u-modal-btn u-modal-btn-primary">\u786E\u5B9A</button>' +
                    '</div>' +
                '</div>';
            overlay.querySelector('.u-modal-text').textContent = text;
            var btn = overlay.querySelector('.u-modal-btn-primary');
            btn.onclick = function () { closeModal(overlay, undefined, resolve); };
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) closeModal(overlay, undefined, resolve);
            });
            document.body.appendChild(overlay);
            requestAnimationFrame(function () {
                requestAnimationFrame(function () { overlay.classList.add('visible'); });
            });
            btn.focus();
        });
    };

    /**
     * showConfirm(text) - replaces confirm()
     * @param {string} text
     * @returns {Promise<boolean>}
     */
    window.showConfirm = function (text) {
        return new Promise(function (resolve) {
            var overlay = createOverlay();
            overlay.innerHTML =
                '<div class="u-modal-box">' +
                    '<div class="u-modal-icon">' + ICONS.warn + '</div>' +
                    '<div class="u-modal-text"></div>' +
                    '<div class="u-modal-actions">' +
                        '<button class="u-modal-btn u-modal-btn-cancel">\u53D6\u6D88</button>' +
                        '<button class="u-modal-btn u-modal-btn-primary">\u786E\u5B9A</button>' +
                    '</div>' +
                '</div>';
            overlay.querySelector('.u-modal-text').textContent = text;
            var btns = overlay.querySelectorAll('.u-modal-btn');
            btns[0].onclick = function () { closeModal(overlay, false, resolve); };
            btns[1].onclick = function () { closeModal(overlay, true, resolve); };
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) closeModal(overlay, false, resolve);
            });
            document.body.appendChild(overlay);
            requestAnimationFrame(function () {
                requestAnimationFrame(function () { overlay.classList.add('visible'); });
            });
            btns[1].focus();
        });
    };
})();
