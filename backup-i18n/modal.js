/* ── Shared Modal: showMsg / showConfirm ── */
(function () {
    var ICONS = {
        error: '<div class="u-modal-icon-circle icon-error"><svg viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg></div>',
        success: '<div class="u-modal-icon-circle icon-success"><svg viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg></div>',
        info: '<div class="u-modal-icon-circle icon-info"><svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2" stroke-linecap="round"><path d="M12 16v-4"/><circle cx="12" cy="8" r="0.5" fill="#3b82f6"/></svg></div>',
        warn: '<div class="u-modal-icon-circle icon-warn"><svg viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round"><path d="M12 9v4"/><circle cx="12" cy="16" r="0.5" fill="#d97706"/></svg></div>'
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
