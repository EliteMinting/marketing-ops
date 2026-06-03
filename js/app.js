/* app.js — bootstrap, navigation, toast, modal, import/export wiring */
(function (M) {
  "use strict";
  function $(id) { return document.getElementById(id); }

  /* theme (stored separately from user data) */
  var THEME_KEY = 'moa.theme';
  function currentTheme() { try { return localStorage.getItem(THEME_KEY) || 'light'; } catch (e) { return 'light'; } }
  function applyTheme(t) {
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
  }
  applyTheme(currentTheme()); // apply as early as the script runs to limit flash
  M.toggleTheme = function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    applyTheme(next);
    if (M.currentView) M.showView(M.currentView); // re-render so charts pick up themed neutrals
  };

  /* print / PDF — prints the current view as a clean report via the browser */
  M.printReport = function () {
    var root = document.documentElement;
    var wasDark = root.getAttribute('data-theme') === 'dark';
    // charts bake their colors in at render time, so re-render in light for print
    if (wasDark) { root.removeAttribute('data-theme'); if (M.currentView) M.showView(M.currentView); }

    var s = (M.state && M.state.settings) || {};
    var active = document.querySelector('.nav-item.is-active span:not([class])');
    var viewName = active ? active.textContent : '';
    var ph = $('printHeader');
    if (ph) {
      ph.innerHTML =
        '<div class="ph-top"><div class="ph-brand">نظام تنظيم قسم التسويق</div>' +
        '<div class="ph-meta">الفترة: <b>' + (s.period || '—') + '</b> · تاريخ التقرير: <b>' + (s.updatedAt || '') + '</b></div></div>' +
        '<div class="ph-title">' + viewName + '</div>';
    }

    // window.print() blocks until the print dialog is dismissed, so restore right after
    window.print();
    if (wasDark) { root.setAttribute('data-theme', 'dark'); if (M.currentView) M.showView(M.currentView); }
  };

  var reduceMotion = false;
  try { reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  /* dismiss the splash overlay */
  function dismissSplash() {
    var s = $('splash'); if (!s) return;
    s.classList.add('is-done');
    setTimeout(function () { if (s.parentNode) s.remove(); }, 450);
  }

  /* count-up animation for KPI numbers (e.g. "12" or "33%") */
  M.animateCounts = function (root) {
    if (!root) return;
    var els = root.querySelectorAll('.kpi-num');
    els.forEach(function (el) {
      var m = /^(\d+)(%?)$/.exec(el.textContent.trim());
      if (!m) return;
      var target = parseInt(m[1], 10), suffix = m[2];
      if (reduceMotion || target === 0) { el.textContent = target + suffix; return; }
      var dur = 650, t0 = performance.now();
      function step(now) {
        var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * e) + suffix;
        if (p < 1) requestAnimationFrame(step);
      }
      el.textContent = '0' + suffix;
      requestAnimationFrame(step);
    });
  };

  /* header sync (period chip/updated were moved out of the topbar; settings still holds them) */
  function updateHeader() {
    var s = (M.state && M.state.settings) || {};
    var pc = $('periodChip'); if (pc) pc.textContent = s.period || '—';
    var up = $('updatedAt'); if (up) up.textContent = 'آخر تحديث: ' + (s.updatedAt || '—');
  }

  /* task alert badge on the «المهام» nav items (sidebar + bottom bar + topbar bell) */
  M.refreshBadges = function () {
    if (!M.state) return;
    var a = M.taskAlerts();
    [['tasksBadge', 'nav-badge'], ['tasksBadgeBn', 'bn-badge'], ['alertsBadge', 'dot-badge']].forEach(function (p) {
      var b = $(p[0]); if (!b) return;
      if (a.overdue > 0) { b.textContent = a.overdue; b.hidden = false; b.className = p[1] + ' badge-late'; b.title = a.overdue + ' مهمة متأخرة'; }
      else if (a.dueSoon > 0) { b.textContent = a.dueSoon; b.hidden = false; b.className = p[1] + ' badge-soon'; b.title = a.dueSoon + ' مهمة تستحق قريباً'; }
      else { b.hidden = true; b.textContent = ''; }
    });
  };

  M.onSaved = function () { updateHeader(); M.refreshBadges(); };
  M.saveQuiet = M.save;

  /* toast */
  function dismissToast(t) { t.style.opacity = '0'; t.style.transition = '.3s'; setTimeout(function () { t.remove(); }, 320); }
  M.toast = function (msg, type) {
    var w = $('toastWrap'), t = document.createElement('div');
    t.className = 'toast ' + (type || 'ok');
    t.innerHTML = '<i></i><span>' + msg + '</span>';
    w.appendChild(t);
    setTimeout(function () { dismissToast(t); }, 2200);
  };

  /* toast with an «تراجع» (undo) action — used for safe deletes */
  M.toastUndo = function (msg, onUndo) {
    var w = $('toastWrap'), t = document.createElement('div');
    t.className = 'toast info';
    t.innerHTML = '<i></i><span>' + msg + '</span>';
    var btn = document.createElement('button');
    btn.className = 'toast-action'; btn.textContent = 'تراجع';
    var to = setTimeout(function () { dismissToast(t); }, 6000);
    btn.onclick = function () { clearTimeout(to); dismissToast(t); onUndo(); };
    t.appendChild(btn);
    w.appendChild(t);
  };

  /* modal confirm */
  var modal;
  function ensureModal() {
    if (modal) return;
    modal = document.createElement('div'); modal.className = 'modal';
    modal.innerHTML = '<h3></h3><p></p><div class="modal-actions"><button class="btn btn-primary" data-ok>تأكيد</button><button class="btn btn-ghost" data-cancel>إلغاء</button></div>';
    document.body.appendChild(modal);
  }
  M.confirm = function (title, msg, onYes) {
    ensureModal();
    modal.querySelector('h3').textContent = title;
    modal.querySelector('p').textContent = msg;
    var scrim = $('scrim');
    function close() { modal.classList.remove('show'); scrim.classList.remove('show'); }
    modal.querySelector('[data-ok]').onclick = function () { close(); onYes(); };
    modal.querySelector('[data-cancel]').onclick = close;
    scrim.onclick = close;
    modal.classList.add('show'); scrim.classList.add('show');
  };

  /* boot */
  document.addEventListener('DOMContentLoaded', function () {
    M.load();
    updateHeader();
    M.refreshBadges();
    M.showView('dashboard');
    setTimeout(dismissSplash, reduceMotion ? 250 : 950);

    // nav — covers the desktop sidebar, the mobile bottom bar, and the «المزيد» sheet
    var navItems = document.querySelectorAll('[data-view]');
    for (var i = 0; i < navItems.length; i++) {
      navItems[i].addEventListener('click', function () { closeSheet(); M.showView(this.getAttribute('data-view')); });
    }
    // «المزيد» bottom sheet
    function openSheet() { $('moreSheet').classList.add('open'); $('sheetScrim').classList.add('show'); }
    function closeSheet() { var s = $('moreSheet'); if (s) s.classList.remove('open'); var sc = $('sheetScrim'); if (sc) sc.classList.remove('show'); }
    M.closeSheet = closeSheet;
    var bnMore = $('bnMore'); if (bnMore) bnMore.addEventListener('click', openSheet);
    var sheetScrim = $('sheetScrim'); if (sheetScrim) sheetScrim.addEventListener('click', closeSheet);
    // global search
    var gs = $('globalSearch');
    if (gs) {
      var deb;
      gs.addEventListener('input', function () {
        clearTimeout(deb);
        deb = setTimeout(function () {
          M.searchQuery = gs.value;
          if (gs.value.trim()) M.showView('search');
          else if (M.currentView === 'search') M.showView('dashboard');
        }, 200);
      });
    }
    // topbar bell -> tasks ; AI CTA -> assistant
    var bell = $('btnAlerts'); if (bell) bell.addEventListener('click', function () { M.showView('tasks'); });
    var cta = $('ctaAssistant'); if (cta) cta.addEventListener('click', function () { M.showView('assistant'); });
    // theme toggle
    $('themeToggle').addEventListener('click', M.toggleTheme);
    // print / PDF
    $('btnPdf').addEventListener('click', M.printReport);
    // export / import
    $('btnExport').addEventListener('click', function () { M.exportJSON(); M.toast('تم تصدير البيانات', 'ok'); });
    $('btnImport').addEventListener('click', function () { $('importFile').click(); });
    $('importFile').addEventListener('change', function (e) {
      var f = e.target.files[0]; if (!f) return;
      M.importJSON(f, function (ok) {
        if (ok) { updateHeader(); M.showView(M.currentView); M.toast('تم استيراد البيانات', 'ok'); }
        else M.toast('ملف غير صالح', 'err');
        e.target.value = '';
      });
    });
  });
})(window.MOA);
