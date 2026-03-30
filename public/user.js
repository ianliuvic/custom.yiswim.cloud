/* ============ User Center ============ */
(function () {
    'use strict';

    const FILE_BASE = 'https://files.yiswim.cloud/uploads/inquiries/';
    let currentPage = 1;

    /* ---------- Tab switching ---------- */
    window.switchTab = function (tab) {
        document.querySelectorAll('.u-tab').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.u-menu-item').forEach(el => el.classList.remove('active'));
        document.getElementById('tab-' + tab).classList.add('active');
        document.querySelector('.u-menu-item[data-tab="' + tab + '"]').classList.add('active');
        if (tab === 'inquiries') closeDetail();
    };

    /* ---------- Language ---------- */
    window.setLanguage = function (lng) {
        document.cookie = 'lng=' + lng + ';path=/;max-age=31536000';
        location.reload();
    };

    /* ---------- Inquiry list ---------- */
    window.loadInquiries = async function (page) {
        page = page || 1;
        currentPage = page;
        const listEl = document.getElementById('inquiry-list');
        const pagEl = document.getElementById('inquiry-pagination');
        listEl.innerHTML = '<div class="u-loading">加载中...</div>';
        pagEl.innerHTML = '';

        try {
            const res = await fetch('/api/my-inquiries?page=' + page);
            const json = await res.json();
            if (!json.success) throw new Error(json.message);

            const rows = json.data;
            const pag = json.pagination;

            if (rows.length === 0) {
                listEl.innerHTML =
                    '<div class="u-empty">' +
                    '<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
                    '<p>暂无询盘记录</p>' +
                    '<a href="/" class="u-btn-primary">+ 新建询盘</a>' +
                    '</div>';
                return;
            }

            listEl.innerHTML = rows.map(function (r) {
                var desc = buildDesc(r);
                return (
                    '<div class="u-inquiry-card" onclick="openDetail(' + r.id + ')">' +
                    '<div class="u-inquiry-card-left">' +
                    '<div class="u-inquiry-no">' + esc(r.inquiry_no) + '</div>' +
                    '<div class="u-inquiry-meta">' + desc + '</div>' +
                    '</div>' +
                    '<div class="u-inquiry-card-right">' +
                    '<span class="u-status-tag u-status-' + esc(r.status) + '">' + statusLabel(r.status) + '</span>' +
                    '<span style="font-size:12px;color:#94a3b8">' + fmtDate(r.created_at) + '</span>' +
                    '</div>' +
                    '</div>'
                );
            }).join('');

            // pagination
            if (pag.totalPages > 1) {
                var btns = '';
                btns += '<button class="u-page-btn" onclick="loadInquiries(' + (page - 1) + ')"' + (page <= 1 ? ' disabled' : '') + '>&lsaquo;</button>';
                for (var i = 1; i <= pag.totalPages; i++) {
                    btns += '<button class="u-page-btn' + (i === page ? ' active' : '') + '" onclick="loadInquiries(' + i + ')">' + i + '</button>';
                }
                btns += '<button class="u-page-btn" onclick="loadInquiries(' + (page + 1) + ')"' + (page >= pag.totalPages ? ' disabled' : '') + '>&rsaquo;</button>';
                pagEl.innerHTML = btns;
            }
        } catch (e) {
            listEl.innerHTML = '<div class="u-loading" style="color:#dc2626">加载失败：' + esc(e.message) + '</div>';
        }
    };

    function buildDesc(r) {
        var parts = [];
        // ODM styles count
        var odm = tryParse(r.odm_styles);
        if (Array.isArray(odm) && odm.length) parts.push('ODM: ' + odm.length + '款');
        // OEM
        if (r.oem_project) parts.push('OEM: ' + esc(r.oem_project));
        if (r.oem_style_count) parts.push(r.oem_style_count + '款');
        // contact / brand
        if (r.brand_name) parts.push(esc(r.brand_name));
        if (r.contact_name) parts.push(esc(r.contact_name));
        // delivery
        if (r.delivery_mode) parts.push(r.delivery_mode === 'bulk' ? '大货' : '样衣');
        return parts.map(function (p) { return '<span>' + p + '</span>'; }).join('');
    }

    /* ---------- Detail ---------- */
    window.openDetail = async function (id) {
        var listEl = document.getElementById('inquiry-list');
        var pagEl = document.getElementById('inquiry-pagination');
        var titleEl = document.querySelector('.u-page-title');
        var panel = document.getElementById('inquiry-detail');
        var titleH = document.getElementById('detail-title');
        var statusEl = document.getElementById('detail-status');
        var content = document.getElementById('detail-content');

        listEl.style.display = 'none';
        pagEl.style.display = 'none';
        titleEl.style.display = 'none';
        panel.style.display = 'block';
        content.innerHTML = '<div class="u-loading">加载中...</div>';

        try {
            var res = await fetch('/api/inquiry/' + id);
            var json = await res.json();
            if (!json.success) throw new Error(json.message);

            var d = json.data;
            titleH.textContent = d.inquiry_no;
            statusEl.className = 'u-status-tag u-status-' + d.status;
            statusEl.textContent = statusLabel(d.status);

            var html = '';

            // Section 1: Style
            html += sectionStart('款式信息');
            var odmArr = tryParse(d.odm_styles);
            if (Array.isArray(odmArr) && odmArr.length) {
                html += row('ODM 款式', odmArr.map(function (s) { return typeof s === 'object' ? (s.name || s.id || JSON.stringify(s)) : s; }).join(', '));
            }
            var odmCustom = tryParse(d.odm_custom_data);
            if (odmCustom && Object.keys(odmCustom).length) {
                html += row('ODM 定制数据', '<pre style="margin:0;white-space:pre-wrap;font-size:12px">' + esc(JSON.stringify(odmCustom, null, 2)) + '</pre>');
            }
            if (d.oem_project) html += row('OEM 项目', esc(d.oem_project));
            if (d.oem_style_count) html += row('OEM 款数', d.oem_style_count);
            var oemDescs = tryParse(d.oem_descriptions);
            if (Array.isArray(oemDescs) && oemDescs.length) {
                html += row('OEM 描述', oemDescs.map(function (x) { return esc(typeof x === 'object' ? JSON.stringify(x) : x); }).join('<br>'));
            }
            var oemCk = tryParse(d.oem_checklist);
            if (Array.isArray(oemCk) && oemCk.length) {
                html += row('OEM Checklist', oemCk.map(function (x) { return esc(typeof x === 'string' ? x : JSON.stringify(x)); }).join(', '));
            }
            if (d.oem_remark) html += row('OEM 备注', esc(d.oem_remark));
            html += sectionEnd();

            // Section 2: Fabric
            html += sectionStart('面料信息');
            var fab = tryParse(d.fabric_selection);
            if (fab && typeof fab === 'object') {
                Object.keys(fab).forEach(function (k) {
                    var v = fab[k];
                    html += row(esc(k), esc(typeof v === 'object' ? JSON.stringify(v) : String(v)));
                });
            }
            html += sectionEnd();

            // Section 3: Trims / Accessories
            html += sectionStart('辅料 / 包装');
            var trimFields = [
                ['cmt_enabled', 'CMT'],
                ['metal_config', '五金'],
                ['pad_config', '胸垫'],
                ['bag_config', '包装袋'],
                ['hangtag_config', '吊牌'],
                ['label_config', '标签'],
                ['hygiene_config', '卫生贴'],
                ['other_config', '其他']
            ];
            trimFields.forEach(function (pair) {
                var val = tryParse(d[pair[0]]);
                if (val && typeof val === 'object' && Object.keys(val).length) {
                    html += row(pair[1], '<pre style="margin:0;white-space:pre-wrap;font-size:12px">' + esc(JSON.stringify(val, null, 2)) + '</pre>');
                }
            });
            html += sectionEnd();

            // Section 4: Shipping
            html += sectionStart('交付信息');
            html += row('交付模式', d.delivery_mode === 'bulk' ? '大货' : '样衣');
            var sampleRows = tryParse(d.sample_rows);
            if (Array.isArray(sampleRows) && sampleRows.length) {
                html += row('样衣明细', '<pre style="margin:0;white-space:pre-wrap;font-size:12px">' + esc(JSON.stringify(sampleRows, null, 2)) + '</pre>');
            }
            var sampleCfg = tryParse(d.sample_config);
            if (sampleCfg && Object.keys(sampleCfg).length) {
                html += row('样衣配置', '<pre style="margin:0;white-space:pre-wrap;font-size:12px">' + esc(JSON.stringify(sampleCfg, null, 2)) + '</pre>');
            }
            if (d.sample_dest) html += row('样衣目的地', esc(d.sample_dest));
            var bulkRows = tryParse(d.bulk_rows);
            if (Array.isArray(bulkRows) && bulkRows.length) {
                html += row('大货明细', '<pre style="margin:0;white-space:pre-wrap;font-size:12px">' + esc(JSON.stringify(bulkRows, null, 2)) + '</pre>');
            }
            var bulkLog = tryParse(d.bulk_logistics);
            if (bulkLog && Object.keys(bulkLog).length) {
                html += row('大货物流', '<pre style="margin:0;white-space:pre-wrap;font-size:12px">' + esc(JSON.stringify(bulkLog, null, 2)) + '</pre>');
            }
            if (d.bulk_dest) html += row('大货目的地', esc(d.bulk_dest));
            if (d.bulk_target_price) html += row('目标价格', esc(d.bulk_target_price));
            if (d.bulk_packing_remark) html += row('包装备注', esc(d.bulk_packing_remark));
            html += sectionEnd();

            // Section 5: Contact
            html += sectionStart('联系信息');
            if (d.contact_name) html += row('联系人', esc(d.contact_name));
            if (d.contact_info) html += row('联系方式', esc(d.contact_info));
            if (d.brand_name) html += row('品牌', esc(d.brand_name));
            if (d.website) html += row('网站', '<a href="' + esc(d.website) + '" target="_blank" rel="noopener noreferrer">' + esc(d.website) + '</a>');
            if (d.final_remark) html += row('备注', esc(d.final_remark));
            if (d.nda_agreed_at) html += row('NDA 签署', fmtDate(d.nda_agreed_at));
            html += sectionEnd();

            // Files
            if (d.files && d.files.length) {
                html += sectionStart('附件（' + d.files.length + '）');
                html += '<div class="u-file-list">';
                d.files.forEach(function (f) {
                    var url = FILE_BASE + encodeURIComponent(f.stored_name);
                    html += '<a href="' + url + '" target="_blank" rel="noopener noreferrer" class="u-file-tag">' +
                        '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>' +
                        esc(f.orig_name) + '</a>';
                });
                html += '</div>';
                html += sectionEnd();
            }

            // Timestamps
            html += sectionStart('时间线');
            html += row('创建时间', fmtDate(d.created_at));
            if (d.modified_at) html += row('最后修改', fmtDate(d.modified_at));
            html += sectionEnd();

            content.innerHTML = html;
        } catch (e) {
            content.innerHTML = '<div class="u-loading" style="color:#dc2626">加载失败：' + esc(e.message) + '</div>';
        }
    };

    window.closeDetail = function () {
        document.getElementById('inquiry-detail').style.display = 'none';
        document.getElementById('inquiry-list').style.display = '';
        document.getElementById('inquiry-pagination').style.display = '';
        document.querySelector('.u-page-title').style.display = '';
    };

    /* ---------- Change password ---------- */
    window.handleChangePwd = async function (e) {
        e.preventDefault();
        var msg = document.getElementById('pwd-msg');
        var cur = document.getElementById('currentPwd').value;
        var np = document.getElementById('newPwd').value;
        var cp = document.getElementById('confirmPwd').value;

        if (np !== cp) {
            msg.className = 'u-form-msg error';
            msg.textContent = '两次输入的新密码不一致';
            return false;
        }
        if (np.length < 8) {
            msg.className = 'u-form-msg error';
            msg.textContent = '新密码至少需要8位';
            return false;
        }

        msg.className = 'u-form-msg';
        msg.textContent = '提交中...';

        try {
            var res = await fetch('/api/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentPassword: cur, newPassword: np })
            });
            var json = await res.json();
            if (json.success) {
                msg.className = 'u-form-msg success';
                msg.textContent = '密码修改成功';
                document.getElementById('changePwdForm').reset();
            } else {
                msg.className = 'u-form-msg error';
                msg.textContent = json.message || '修改失败';
            }
        } catch (err) {
            msg.className = 'u-form-msg error';
            msg.textContent = '网络错误，请重试';
        }
        return false;
    };

    /* ---------- Helpers ---------- */
    function esc(s) {
        if (s == null) return '';
        var d = document.createElement('div');
        d.textContent = String(s);
        return d.innerHTML;
    }

    function tryParse(v) {
        if (v == null) return null;
        if (typeof v === 'object') return v;
        try { return JSON.parse(v); } catch (e) { return v; }
    }

    function fmtDate(s) {
        if (!s) return '-';
        var d = new Date(s);
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }
    function pad(n) { return n < 10 ? '0' + n : String(n); }

    function statusLabel(s) {
        var m = { pending: '待处理', processing: '处理中', quoted: '已报价', closed: '已关闭' };
        return m[s] || s || '待处理';
    }

    function sectionStart(title) {
        return '<div class="u-detail-section"><h4>' + title + '</h4>';
    }
    function sectionEnd() { return '</div>'; }
    function row(label, value) {
        return '<div class="u-detail-row"><label>' + label + '</label><span>' + (value || '-') + '</span></div>';
    }

    /* ---------- Init ---------- */
    loadInquiries(1);
})();
