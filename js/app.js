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

  /* unread messages badge (sidebar «الرسائل» + mobile «المزيد» dot) */
  function setMsgBadge(n) {
    [['msgBadge', 'nav-badge'], ['msgBadgeBn', 'dot-badge']].forEach(function (p) {
      var b = $(p[0]); if (!b) return;
      if (n > 0) { b.textContent = p[1] === 'dot-badge' ? '' : n; b.hidden = false; b.className = p[1] + ' badge-late'; b.title = n + ' رسالة غير مقروءة'; }
      else { b.hidden = true; b.textContent = ''; }
    });
  }
  M.refreshMsgBadge = function () {
    if (!M.cloud || !M.cloud.available() || !M.cloud.user()) { setMsgBadge(0); return; }
    M.cloud.getMyTeam().then(function (team) {
      if (!team) { setMsgBadge(0); return; }
      M.cloud.startMessages(team.team_id);
      var since = '1970-01-01T00:00:00Z';
      try { since = localStorage.getItem('moa.msg.read.' + team.team_id) || since; } catch (e) {}
      M.cloud.countUnread(team.team_id, since).then(setMsgBadge);
    });
  };

  M.onSaved = function () { updateHeader(); M.refreshBadges(); if (M.cloud) M.cloud.scheduleSync(); };

  /* ---------- account / cloud auth UI ---------- */
  function authErr(msg, mode) {
    msg = String(msg || '');
    if (/Invalid login credentials/i.test(msg)) return mode === 'signin'
      ? 'بيانات الدخول غير صحيحة. إن كانت أول مرة استخدم «إنشاء حساب»، وتأكّد من تأكيد بريدك وصحّة كلمة المرور.'
      : 'تعذّر إنشاء الحساب — تحقّق من البيانات.';
    if (/Email not confirmed/i.test(msg)) return 'لم يُؤكَّد بريدك بعد — افتح رابط التأكيد في بريدك، أو أوقف «Confirm email» في إعدادات Supabase.';
    if (/already registered|already exists/i.test(msg)) return 'هذا البريد مسجّل مسبقاً — استخدم تبويب «دخول».';
    if (/(at least|6 characters|password)/i.test(msg)) return 'كلمة المرور قصيرة (٦ أحرف على الأقل).';
    if (/rate|too many/i.test(msg)) return 'محاولات كثيرة — انتظر قليلاً ثم أعد المحاولة.';
    return 'تعذّر: ' + msg;
  }
  var authModal;
  function buildAuthModal() {
    if (authModal) return authModal;
    authModal = document.createElement('div');
    authModal.className = 'modal auth-modal';
    authModal.innerHTML =
      '<h3 id="authTitle">تسجيل الدخول</h3>' +
      '<div class="auth-tabs"><button class="auth-tab is-active" data-mode="signin">دخول</button><button class="auth-tab" data-mode="signup">إنشاء حساب</button></div>' +
      '<button class="btn-google" id="authGoogle"><svg viewBox="0 0 48 48" width="18" height="18"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.1 0 24 0 14.6 0 6.4 5.4 2.5 13.2l7.9 6.1C12.3 13.2 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.1 24.6c0-1.6-.1-3.1-.4-4.6H24v9.1h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.2-3.9 6.6-9.6 6.6-17z"/><path fill="#FBBC05" d="M10.4 28.3c-.5-1.5-.8-3-.8-4.8s.3-3.3.8-4.8l-7.9-6.1C.9 16.1 0 19.9 0 23.5s.9 7.4 2.5 10.9l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.1 0 11.3-2 15-5.5l-7.1-5.5c-2 1.3-4.6 2.1-7.9 2.1-6.3 0-11.7-3.7-13.6-9.8l-7.9 6.1C6.4 42.6 14.6 48 24 48z"/></svg><span>المتابعة عبر Google</span></button>' +
      '<div class="auth-or"><span>أو</span></div>' +
      '<input class="auth-inp" id="authEmail" type="email" placeholder="البريد الإلكتروني" autocomplete="email">' +
      '<input class="auth-inp" id="authPw" type="password" placeholder="كلمة المرور (٦+ أحرف)">' +
      '<div class="auth-msg" id="authMsg"></div>' +
      '<div class="modal-actions"><button class="btn btn-primary" id="authSubmit">دخول</button><button class="btn btn-ghost" id="authCancel">إلغاء</button></div>' +
      '<div class="auth-note">تُحفظ بياناتك السحابية مرتبطة بحسابك (لكل مستخدم بياناته). بدون تسجيل دخول يعمل الموقع محلياً كالمعتاد.</div>';
    document.body.appendChild(authModal);
    var mode = 'signin';
    function setMode(m) {
      mode = m;
      authModal.querySelectorAll('.auth-tab').forEach(function (t) { t.classList.toggle('is-active', t.getAttribute('data-mode') === m); });
      $('authTitle').textContent = m === 'signin' ? 'تسجيل الدخول' : 'إنشاء حساب';
      $('authSubmit').textContent = m === 'signin' ? 'دخول' : 'إنشاء حساب';
      $('authMsg').textContent = '';
    }
    authModal.querySelectorAll('.auth-tab').forEach(function (t) { t.onclick = function () { setMode(t.getAttribute('data-mode')); }; });
    function close() { authModal.classList.remove('show'); $('scrim').classList.remove('show'); }
    authModal._open = function () { setMode('signin'); $('authEmail').value = ''; $('authPw').value = ''; $('authMsg').textContent = ''; authModal.classList.add('show'); $('scrim').classList.add('show'); setTimeout(function () { $('authEmail').focus(); }, 0); };
    authModal._close = close;
    $('authCancel').onclick = close;
    $('authGoogle').onclick = function () {
      $('authMsg').textContent = 'جارٍ التحويل إلى Google…';
      M.cloud.signInWithGoogle().then(function (res) {
        if (res && res.error) $('authMsg').textContent = 'تعذّر فتح Google: ' + (res.error.message || '');
      }).catch(function (e) { $('authMsg').textContent = 'تعذّر فتح Google: ' + (e && e.message || ''); });
    };
    $('authSubmit').onclick = function () {
      var email = $('authEmail').value.trim(), pw = $('authPw').value;
      if (!email || pw.length < 6) { $('authMsg').textContent = 'أدخل بريداً صحيحاً وكلمة مرور (٦ أحرف على الأقل).'; return; }
      $('authSubmit').disabled = true; $('authMsg').textContent = 'جارٍ…';
      var p = mode === 'signin' ? M.cloud.signIn(email, pw) : M.cloud.signUp(email, pw);
      p.then(function (res) {
        $('authSubmit').disabled = false;
        if (res.error) { $('authMsg').textContent = authErr(res.error.message, mode); return; }
        if (mode === 'signup' && res.data && !res.data.session) { $('authMsg').textContent = 'تم الإنشاء — تحقّق من بريدك لتأكيد الحساب، أو أوقف «Confirm email» في إعدادات Supabase ثم سجّل الدخول.'; return; }
        close(); M.toast('مرحباً بك 👋', 'ok');
      }).catch(function (e) { $('authSubmit').disabled = false; $('authMsg').textContent = 'تعذّر الاتصال: ' + (e && e.message || ''); });
    };
    return authModal;
  }
  function refreshAvatar(u) {
    var a = $('btnAccount'); if (!a) return;
    if (u) { a.classList.add('is-auth'); a.title = u.email || 'الحساب'; a.innerHTML = '<span>' + ((u.email || '؟')[0] || '؟').toUpperCase() + '</span>'; }
    else { a.classList.remove('is-auth'); a.title = 'تسجيل الدخول'; a.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>'; }
  }
  M.accountClick = function () {
    if (!M.cloud || !M.cloud.available()) { M.toast('المزامنة السحابية غير متاحة الآن (تحقّق من الاتصال).', 'info'); return; }
    var u = M.cloud.user();
    if (u) { M.confirm('الحساب', 'مسجّل الدخول: ' + (u.email || '') + ' — تسجيل الخروج؟', function () { M.cloud.signOut(); M.toast('تم تسجيل الخروج', 'info'); }); }
    else { buildAuthModal()._open(); }
  };
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

    // optional cloud auth + sync + team messaging
    if (M.cloud) {
      M.cloud.onAuth(function (u) {
        refreshAvatar(u);
        if (u && authModal) authModal._close();
        if (u) { M.refreshMsgBadge(); }
        else { if (M.cloud.stopMessages) M.cloud.stopMessages(); setMsgBadge(0); }
      });
      M.cloud.onIncoming = function (m) {
        var u = M.cloud.user(); if (!u || m.sender_id === u.id) return;
        if (M.currentView === 'messages') return;
        M.refreshMsgBadge(); M.toast('📩 رسالة جديدة', 'info');
      };
      M.cloud.init();
      refreshAvatar(M.cloud.user());
      M.refreshMsgBadge();
    }
    var acc = $('btnAccount'); if (acc) acc.addEventListener('click', M.accountClick);

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
