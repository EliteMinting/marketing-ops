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

  /* header sync */
  function updateHeader() {
    var s = M.state.settings || {};
    $('updatedAt').textContent = 'آخر تحديث: ' + (s.updatedAt || '—');
    $('periodChip').textContent = s.period || '—';
  }
  M.onSaved = updateHeader;
  M.saveQuiet = M.save;

  /* toast */
  M.toast = function (msg, type) {
    var w = $('toastWrap'), t = document.createElement('div');
    t.className = 'toast ' + (type || 'ok');
    t.innerHTML = '<i></i><span>' + msg + '</span>';
    w.appendChild(t);
    setTimeout(function () { t.style.opacity = '0'; t.style.transition = '.3s'; setTimeout(function () { t.remove(); }, 320); }, 2200);
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
    M.showView('dashboard');

    // nav
    var items = document.querySelectorAll('.nav-item');
    for (var i = 0; i < items.length; i++) {
      items[i].addEventListener('click', function () { M.showView(this.getAttribute('data-view')); });
    }
    // mobile nav
    $('navToggle').addEventListener('click', function () {
      $('sidenav').classList.toggle('open'); $('scrim').classList.toggle('show');
    });
    $('scrim').addEventListener('click', function () {
      $('sidenav').classList.remove('open'); $('scrim').classList.remove('show');
    });
    // theme toggle
    $('themeToggle').addEventListener('click', M.toggleTheme);
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
