/* views.js — render each view */
window.MOA = window.MOA || {};
(function (M) {
  "use strict";
  function el(t, c) { var e = document.createElement(t); if (c) e.className = c; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (ch) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]; }); }
  function S() { return M.state; }
  function members() { return S().team.map(function (m) { return m.member; }).filter(Boolean); }
  function contentIds() { return S().content.map(function (c) { return c.id; }).filter(Boolean); }
  function head(title, desc) {
    var h = el('div', 'view-head');
    h.innerHTML = '<div><div class="view-title">' + title + '</div><div class="view-desc">' + desc + '</div></div>';
    return h;
  }
  function save() { M.save(); }

  /* ---------- filtering (kept out of saved state) ---------- */
  var contentFilter = { q: '', owner: '', platform: '', status: '', week: '' };
  var taskFilter = { q: '', owner: '', status: '', priority: '' };
  function txt(v) { return String(v == null ? '' : v).toLowerCase(); }
  function anyActive(f) { return Object.keys(f).some(function (k) { return f[k]; }); }
  function filterContent(arr) {
    var f = contentFilter, q = txt(f.q);
    return arr.filter(function (r) {
      if (f.owner && r.owner !== f.owner) return false;
      if (f.platform && r.platform !== f.platform) return false;
      if (f.status && r.status !== f.status) return false;
      if (f.week && r.week !== f.week) return false;
      if (q && txt(r.title).indexOf(q) < 0 && txt(r.notes).indexOf(q) < 0) return false;
      return true;
    });
  }
  function filterTasks(arr) {
    var f = taskFilter, q = txt(f.q);
    return arr.filter(function (r) {
      if (f.owner && r.owner !== f.owner) return false;
      if (f.status && r.status !== f.status) return false;
      if (f.priority && r.priority !== f.priority) return false;
      if (q && txt(r.task).indexOf(q) < 0 && txt(r.notes).indexOf(q) < 0) return false;
      return true;
    });
  }
  /* build a search input that re-renders only the table host (keeps focus) */
  function filterSearch(value, placeholder, onChange) {
    var inp = el('input', 'filter-input'); inp.type = 'search';
    inp.placeholder = placeholder; inp.value = value || '';
    var deb;
    inp.addEventListener('input', function () { clearTimeout(deb); deb = setTimeout(function () { onChange(inp.value); }, 250); });
    return inp;
  }
  function filterSelect(value, list, placeholder, onChange) {
    var sel = el('select', 'filter-select');
    var blank = document.createElement('option'); blank.value = ''; blank.textContent = placeholder; sel.appendChild(blank);
    (list || []).forEach(function (o) { var op = document.createElement('option'); op.value = o; op.textContent = o; sel.appendChild(op); });
    sel.value = value || '';
    sel.addEventListener('change', function () { onChange(sel.value); });
    return sel;
  }

  M.currentView = 'dashboard';
  M.views = {};

  /* ---------- Dashboard ---------- */
  M.views.dashboard = function (c) {
    var k = M.kpis();
    var cards = [
      ['total', 'إجمالي المهام', k.total, ''],
      ['done', 'مكتملة', k.done, ''],
      ['prog', 'قيد التنفيذ', k.prog, ''],
      ['late', 'متأخرة', k.late, k.late ? 'تحتاج انتباه' : 'لا يوجد'],
      ['pub', 'محتوى منشور', k.pub, ''],
      ['rate', 'نسبة النشر', Math.round(k.rate * 100) + '%', '']
    ];
    var kpi = cards.map(function (x) {
      return '<div class="card kpi kpi--' + x[0] + '"><div class="kpi-accent"></div>' +
        '<div class="kpi-label">' + x[1] + '</div><div class="kpi-num">' + x[2] + '</div>' +
        (x[3] ? '<div class="kpi-foot">' + x[3] + '</div>' : '') + '</div>';
    }).join('');
    var trend = M.weeklyTrend();
    var work = M.workload();
    var status = M.statusDistribution();
    var legend = '<div class="legend"><span><i style="background:' + M.HEX.progress + '"></i> أسبوعي</span><span><i style="background:' + M.HEX.ink + '"></i> تراكمي</span></div>';
    var emptyMini = '<div class="empty" style="padding:24px">أضِف أعضاء الفريق لعرض هذا الرسم.</div>';
    var wrap = el('div', 'wrap');
    wrap.innerHTML =
      '<div class="grid kpis">' + kpi + '</div>' +
      '<div class="grid charts">' +
      '<div class="card col-3"><div class="card-title">إنجاز المهام</div><div class="donut-wrap">' + M.donut(k.completion, M.HEX.approved) + '<div class="donut-cap">' + k.done + ' من ' + k.total + ' مهمة</div></div></div>' +
      '<div class="card col-3"><div class="card-title">نشر المحتوى</div><div class="donut-wrap">' + M.donut(k.publish, M.HEX.done) + '<div class="donut-cap">' + k.pub + ' من ' + k.cTotal + ' محتوى</div></div></div>' +
      '<div class="card col-6"><div class="card-title">المحتوى عبر الأسابيع</div>' + M.lineTrend(trend) + legend + '</div>' +
      '<div class="card col-6"><div class="card-title">عبء العمل لكل عضو <span style="font-weight:500;color:var(--muted);font-size:12px">مهام مفتوحة</span></div>' + (work.length ? M.hbars(work, 'progress') : emptyMini) + '</div>' +
      '<div class="card col-6"><div class="card-title">توزيع حالات المهام</div>' + M.statusBars(status) + '</div>' +
      '</div>';
    c.appendChild(head('لوحة التحكم', 'نظرة عامة لحظية على أداء الفريق — تتحدّث تلقائياً مع كل تعديل'));
    c.appendChild(wrap);
  };

  /* ---------- Content ---------- */
  M.views.content = function (c) {
    var schema = [
      { key: 'id', label: 'رقم المحتوى', type: 'id' },
      { key: 'date', label: 'التاريخ', type: 'date' },
      { key: 'week', label: 'الأسبوع', type: 'select', source: function () { return S().lists.weeks; } },
      { key: 'platform', label: 'المنصة', type: 'select', source: function () { return S().lists.platforms; } },
      { key: 'type', label: 'نوع المحتوى', type: 'select', source: function () { return S().lists.types; } },
      { key: 'title', label: 'الموضوع / العنوان', type: 'text', placeholder: 'العنوان…' },
      { key: 'owner', label: 'المسؤول', type: 'select', source: members },
      { key: 'status', label: 'الحالة', pill: true, source: function () { return S().lists.contentStatuses; } },
      { key: 'assetUrl', label: 'رابط الأصل', type: 'url' },
      { key: 'publishedDate', label: 'تاريخ النشر الفعلي', type: 'date' },
      { key: 'notes', label: 'ملاحظات', type: 'text' }
    ];
    var opts = {
      onChange: save,
      onAdd: function () { S().content.push({ id: M.nextId(S().content, 'C'), date: '', week: '', platform: '', type: '', title: '', owner: '', status: 'فكرة', assetUrl: '', publishedDate: '', notes: '' }); save(); M.showView('content'); },
      onDelete: function (row) { var a = S().content; a.splice(a.indexOf(row), 1); save(); M.showView('content'); M.toast('تم حذف الصف', 'info'); },
      addLabel: 'إضافة محتوى'
    };
    c.appendChild(head('خطة المحتوى', 'تقويم المحتوى — أعطِ كل عنصر رقماً (C-00X) لربط المهام به'));

    var clr = el('button', 'btn btn-soft btn-sm'); clr.textContent = 'مسح الفلاتر';
    clr.onclick = function () { contentFilter = { q: '', owner: '', platform: '', status: '', week: '' }; M.showView('content'); };

    var host = el('div');
    function renderTable() {
      clr.style.display = anyActive(contentFilter) ? '' : 'none';
      host.innerHTML = '';
      var rows = filterContent(S().content);
      if (!rows.length && anyActive(contentFilter)) {
        var em = el('div', 'empty'); em.textContent = 'لا توجد نتائج مطابقة للفلاتر.';
        host.appendChild(em);
      } else {
        host.appendChild(M.tables.render(rows, schema, opts));
      }
    }
    var bar = el('div', 'filter-bar');
    bar.appendChild(filterSearch(contentFilter.q, 'بحث في العنوان أو الملاحظات…', function (v) { contentFilter.q = v; renderTable(); }));
    bar.appendChild(filterSelect(contentFilter.owner, members(), 'كل المسؤولين', function (v) { contentFilter.owner = v; renderTable(); }));
    bar.appendChild(filterSelect(contentFilter.platform, S().lists.platforms, 'كل المنصات', function (v) { contentFilter.platform = v; renderTable(); }));
    bar.appendChild(filterSelect(contentFilter.status, S().lists.contentStatuses, 'كل الحالات', function (v) { contentFilter.status = v; renderTable(); }));
    bar.appendChild(filterSelect(contentFilter.week, S().lists.weeks, 'كل الأسابيع', function (v) { contentFilter.week = v; renderTable(); }));
    bar.appendChild(clr);
    c.appendChild(bar);
    c.appendChild(host);
    renderTable();
  };

  /* ---------- Tasks ---------- */
  M.views.tasks = function (c) {
    var schema = [
      { key: 'id', label: 'رقم المهمة', type: 'id' },
      { key: 'task', label: 'المهمة', type: 'text', placeholder: 'وصف المهمة…' },
      { key: 'contentId', label: 'مرتبطة بالمحتوى', type: 'select', source: contentIds },
      { key: 'domain', label: 'المجال', type: 'select', source: function () { return S().lists.domains; } },
      { key: 'owner', label: 'المسؤول', type: 'select', source: members },
      { key: 'priority', label: 'الأولوية', pill: true, source: function () { return S().lists.priorities; } },
      { key: 'start', label: 'تاريخ البدء', type: 'date' },
      { key: 'due', label: 'تاريخ التسليم', type: 'date' },
      { key: 'status', label: 'الحالة', pill: true, source: function () { return S().lists.taskStatuses; } },
      { key: 'effort', label: 'الجهد (ساعات)', type: 'number' },
      { key: 'overdue', label: 'متأخرة؟', type: 'computed', compute: function (r) { return M.isOverdue(r) ? { text: 'متأخرة', cls: 'tag-late' } : { text: '' }; } },
      { key: 'notes', label: 'ملاحظات', type: 'text' }
    ];
    var opts = {
      rowClass: function (r) { return M.isOverdue(r) ? 'is-late' : ''; },
      onChange: function (row, key) { save(); if (key === 'due' || key === 'status') M.showView('tasks'); },
      onAdd: function () { S().tasks.push({ id: M.nextId(S().tasks, 'T'), task: '', contentId: '', domain: '', owner: '', priority: 'متوسطة', start: '', due: '', status: 'لم تبدأ', effort: '', notes: '' }); save(); M.showView('tasks'); },
      onDelete: function (row) { var a = S().tasks; a.splice(a.indexOf(row), 1); save(); M.showView('tasks'); M.toast('تم حذف المهمة', 'info'); },
      addLabel: 'إضافة مهمة'
    };
    c.appendChild(head('المهام', 'اربط المهمة بالمحتوى، وحدّد المسؤول والأولوية والحالة — التأخير يُحسب تلقائياً'));

    var clr = el('button', 'btn btn-soft btn-sm'); clr.textContent = 'مسح الفلاتر';
    clr.onclick = function () { taskFilter = { q: '', owner: '', status: '', priority: '' }; M.showView('tasks'); };

    var host = el('div');
    function renderTable() {
      clr.style.display = anyActive(taskFilter) ? '' : 'none';
      host.innerHTML = '';
      var rows = filterTasks(S().tasks);
      if (!rows.length && anyActive(taskFilter)) {
        var em = el('div', 'empty'); em.textContent = 'لا توجد نتائج مطابقة للفلاتر.';
        host.appendChild(em);
      } else {
        host.appendChild(M.tables.render(rows, schema, opts));
      }
    }
    var bar = el('div', 'filter-bar');
    bar.appendChild(filterSearch(taskFilter.q, 'بحث في المهمة أو الملاحظات…', function (v) { taskFilter.q = v; renderTable(); }));
    bar.appendChild(filterSelect(taskFilter.owner, members(), 'كل المسؤولين', function (v) { taskFilter.owner = v; renderTable(); }));
    bar.appendChild(filterSelect(taskFilter.status, S().lists.taskStatuses, 'كل الحالات', function (v) { taskFilter.status = v; renderTable(); }));
    bar.appendChild(filterSelect(taskFilter.priority, S().lists.priorities, 'كل الأولويات', function (v) { taskFilter.priority = v; renderTable(); }));
    bar.appendChild(clr);
    c.appendChild(bar);
    c.appendChild(host);
    renderTable();
  };

  /* ---------- Team ---------- */
  M.views.team = function (c) {
    var schema = [
      { key: 'member', label: 'العضو', type: 'text', placeholder: 'الاسم' },
      { key: 'role', label: 'الدور', type: 'text' },
      { key: 'area', label: 'المجال / المحاور', type: 'text' },
      { key: 'open', label: 'مهام مفتوحة', type: 'computed', compute: function (r) { return { text: String(M.teamComputed(r.member).open), sub: 'محسوب' }; } },
      { key: 'cnt', label: 'محتوى مُسند', type: 'computed', compute: function (r) { return { text: String(M.teamComputed(r.member).content), sub: 'محسوب' }; } },
      { key: 'eff', label: 'إجمالي الجهد', type: 'computed', compute: function (r) { var e = M.teamComputed(r.member).effort; return { text: e + ' س', sub: 'محسوب' }; } }
    ];
    var card = M.tables.render(S().team, schema, {
      onChange: save,
      onAdd: function () { S().team.push({ member: '', role: '', area: '' }); save(); M.showView('team'); },
      onDelete: function (row) { var a = S().team; a.splice(a.indexOf(row), 1); save(); M.showView('team'); M.toast('تم حذف العضو', 'info'); },
      addLabel: 'إضافة عضو'
    });
    c.appendChild(head('الفريق', 'الأعضاء وأدوارهم — أعمدة العبء تُحسب تلقائياً من المهام والمحتوى'));
    c.appendChild(card);
  };

  /* ---------- Settings ---------- */
  function listCard(title, key) {
    var card = el('div', 'card list-editor');
    var ttl = el('div', 'card-title'); ttl.textContent = title; card.appendChild(ttl);
    var arr = S().lists[key];
    arr.forEach(function (val, i) {
      var row = el('div', 'le-row');
      var inp = el('input'); inp.value = val;
      inp.addEventListener('input', function () { arr[i] = inp.value; M.saveQuiet(); });
      var del = el('button', 'row-del'); del.style.opacity = '1'; del.innerHTML = '✕';
      del.title = 'حذف'; del.onclick = function () { arr.splice(i, 1); save(); M.showView('settings'); };
      row.appendChild(inp); row.appendChild(del); card.appendChild(row);
    });
    var add = el('button', 'btn btn-soft btn-sm'); add.style.marginTop = '6px';
    add.innerHTML = '＋ إضافة'; add.onclick = function () { arr.push(''); save(); M.showView('settings'); };
    card.appendChild(add);
    return card;
  }

  M.views.settings = function (c) {
    c.appendChild(head('الإعدادات والقوائم', 'حرّر مفردات القوائم المنسدلة وأدِر بياناتك'));
    var wrap = el('div', 'wrap');

    // data controls
    var dc = el('div', 'card');
    dc.innerHTML = '<div class="card-title">البيانات</div>';
    var per = el('div', 'le-row'); per.style.maxWidth = '320px';
    per.innerHTML = '<span style="color:var(--muted);font-size:13px">الفترة:</span>';
    var pin = el('input'); pin.value = S().settings.period || '';
    pin.addEventListener('input', function () { S().settings.period = pin.value; M.saveQuiet(); var pc = document.getElementById('periodChip'); if (pc) pc.textContent = pin.value; });
    per.appendChild(pin); dc.appendChild(per);
    var zone = el('div', 'danger-zone');
    var bExp = el('button', 'btn btn-ghost btn-sm'); bExp.textContent = 'تصدير JSON'; bExp.onclick = function () { M.exportJSON(); M.toast('تم تصدير البيانات', 'ok'); };
    var bImp = el('button', 'btn btn-ghost btn-sm'); bImp.textContent = 'استيراد JSON'; bImp.onclick = function () { document.getElementById('importFile').click(); };
    var bRes = el('button', 'btn btn-soft btn-sm'); bRes.textContent = 'إعادة لبيانات المثال';
    bRes.onclick = function () { M.confirm('إعادة التعيين', 'سيُستبدل كل المحتوى ببيانات المثال. متابعة؟', function () { M.resetToExamples(); M.showView('settings'); M.toast('تمت الإعادة لبيانات المثال', 'ok'); }); };
    var bClr = el('button', 'btn btn-danger btn-sm'); bClr.textContent = 'مسح كل البيانات';
    bClr.onclick = function () { M.confirm('مسح الكل', 'سيُحذف كل المحتوى والمهام والفريق (تبقى القوائم). متابعة؟', function () { M.clearAll(); M.showView('settings'); M.toast('تم مسح البيانات', 'ok'); }); };
    zone.appendChild(bExp); zone.appendChild(bImp); zone.appendChild(bRes); zone.appendChild(bClr);
    dc.appendChild(zone);
    wrap.appendChild(dc);

    // lists
    var grid = el('div', 'settings-grid'); grid.style.marginTop = '16px';
    [['الأسابيع', 'weeks'], ['المنصات', 'platforms'], ['أنواع المحتوى', 'types'], ['المجالات', 'domains'],
    ['الأولويات', 'priorities'], ['حالات المهام', 'taskStatuses'], ['حالات المحتوى', 'contentStatuses']]
      .forEach(function (p) { grid.appendChild(listCard(p[0], p[1])); });
    wrap.appendChild(grid);
    c.appendChild(wrap);
  };

  /* ---------- Help ---------- */
  M.views.help = function (c) {
    var steps = [
      'ابدأ من «الإعدادات والقوائم»: عدّل أو أضِف القيم (منصات، حالات، مجالات) — تتحدّث القوائم المنسدلة فوراً.',
      'أدخل أعضاء الفريق في «الفريق». تُحسب أعمدة «مهام مفتوحة / محتوى مُسند / الجهد» تلقائياً.',
      'في «خطة المحتوى» أعطِ كل عنصر رقم محتوى (C-00X) واختر المنصة والنوع والمسؤول والحالة.',
      'في «المهام» اربط كل مهمة برقم المحتوى المناسب، وحدّد المسؤول والأولوية وتاريخ التسليم. عمود «متأخرة؟» يظهر تلقائياً.',
      '«لوحة التحكم» تتحدّث تلقائياً: المؤشرات + دوائر الإنجاز + اتجاه المحتوى + عبء العمل + توزيع الحالات.',
      'كل تعديل يُحفظ تلقائياً في متصفحك. للمشاركة أو النسخ الاحتياطي: «تصدير JSON» ثم «استيراد JSON» على جهاز آخر.'
    ];
    var legend = [
      ['مكتملة / منشور', 'done'], ['قيد التنفيذ / الإعداد', 'progress'], ['قيد المراجعة', 'review'],
      ['معتمدة / جاهز للنشر', 'approved'], ['لم تبدأ / فكرة', 'idle'], ['معلّقة / مؤجّل', 'hold'], ['متأخرة / عالية', 'late']
    ];
    var wrap = el('div', 'wrap');
    var hl = '<div class="help-list">' + steps.map(function (s, i) {
      return '<div class="help-step"><div class="help-num">' + (i + 1) + '</div><div>' + s + '</div></div>';
    }).join('') + '</div>';
    var lk = '<div class="card" style="margin-top:20px"><div class="card-title">مفتاح ألوان الحالات</div><div class="legend-key">' +
      legend.map(function (l) { return '<div class="lk"><span class="sw" style="background:var(--' + l[1] + ')"></span>' + l[0] + '</div>'; }).join('') + '</div></div>';
    var note = '<div class="card" style="margin-top:16px;color:var(--muted);font-size:13px">ملاحظة: البيانات محفوظة في متصفحك على هذا الجهاز فقط (localStorage). استخدم «تصدير/استيراد» للنقل بين الأجهزة أو المشاركة مع الفريق.</div>';
    wrap.innerHTML = hl + lk + note;
    c.appendChild(head('كيفية الاستخدام', 'دليل سريع لتشغيل النظام'));
    c.appendChild(wrap);
  };

  /* ---------- Content Calendar ---------- */
  var calMonth = null; // {y, m}  m is 0-based
  var MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  var WEEKDAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  function pad2(n) { return String(n).padStart(2, '0'); }
  function isoDate(y, m, d) { return y + '-' + pad2(m + 1) + '-' + pad2(d); }

  M.views.calendar = function (c) {
    var tp = M.todayISO().split('-');
    if (!calMonth) calMonth = { y: +tp[0], m: +tp[1] - 1 };
    var y = calMonth.y, m = calMonth.m;

    c.appendChild(head('تقويم المحتوى', 'عرض شهري حسب تاريخ النشر (أو التاريخ المخطط) — انقر على عنصر لفتحه في خطة المحتوى'));
    var wrap = el('div', 'wrap');

    // month navigation bar
    var nav = el('div', 'cal-nav');
    var prev = el('button', 'btn btn-ghost btn-sm'); prev.innerHTML = '‹ الشهر السابق';
    var next = el('button', 'btn btn-ghost btn-sm'); next.innerHTML = 'الشهر التالي ›';
    var title = el('div', 'cal-title'); title.textContent = MONTHS_AR[m] + ' ' + y;
    prev.onclick = function () { calMonth = m === 0 ? { y: y - 1, m: 11 } : { y: y, m: m - 1 }; M.showView('calendar'); };
    next.onclick = function () { calMonth = m === 11 ? { y: y + 1, m: 0 } : { y: y, m: m + 1 }; M.showView('calendar'); };
    nav.appendChild(prev); nav.appendChild(title); nav.appendChild(next);
    wrap.appendChild(nav);

    // group content by effective date (publishedDate || date)
    var byDate = {}, monthCount = 0, prefix = isoDate(y, m, 1).slice(0, 7);
    S().content.forEach(function (it) {
      var d = it.publishedDate || it.date;
      if (!d) return;
      (byDate[d] = byDate[d] || []).push(it);
      if (d.slice(0, 7) === prefix) monthCount++;
    });

    var grid = el('div', 'cal-grid');
    WEEKDAYS_AR.forEach(function (w) { var h = el('div', 'cal-dow'); h.textContent = w; grid.appendChild(h); });

    var firstDow = new Date(y, m, 1).getDay();         // 0=Sunday
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var today = M.todayISO();
    var i;
    for (i = 0; i < firstDow; i++) grid.appendChild(el('div', 'cal-cell cal-other-month'));
    for (var d = 1; d <= daysInMonth; d++) {
      var iso = isoDate(y, m, d);
      var cell = el('div', 'cal-cell' + (iso === today ? ' is-today' : ''));
      var dn = el('div', 'cal-daynum'); dn.textContent = d; cell.appendChild(dn);
      (byDate[iso] || []).forEach(function (it) {
        var ev = el('button', 'cal-event p-' + M.colorKey(it.status));
        ev.textContent = it.title || it.id || '—';
        ev.title = (it.id ? it.id + ' · ' : '') + (it.platform || '') + (it.status ? ' · ' + it.status : '');
        ev.onclick = function () { M.showView('content'); };
        cell.appendChild(ev);
      });
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);
    if (monthCount === 0) {
      var note = el('div', 'cal-empty'); note.textContent = 'لا يوجد محتوى مجدول لهذا الشهر.';
      wrap.appendChild(note);
    }
    c.appendChild(wrap);
  };

  /* ---------- Kanban board (tasks) ---------- */
  M.views.kanban = function (c) {
    c.appendChild(head('لوحة كانبان', 'اسحب المهمة بين الأعمدة لتغيير حالتها — المهام المتأخّرة بإطار أحمر'));
    var statuses = S().lists.taskStatuses;
    var board = el('div', 'kanban');
    var draggingId = null;

    statuses.forEach(function (st) {
      var inCol = S().tasks.filter(function (t) { return t.status === st && (t.task || '').trim(); });
      var col = el('div', 'kb-col');

      var ch = el('div', 'kb-head');
      ch.innerHTML = '<span class="kb-col-title">' + esc(st) + '</span><span class="kb-count">' + inCol.length + '</span>';
      col.appendChild(ch);

      var body = el('div', 'kb-body');
      inCol.forEach(function (t) {
        var card = el('div', 'kb-card' + (M.isOverdue(t) ? ' is-late' : ''));
        card.draggable = true;
        var pr = t.priority ? '<span class="kb-pill p-' + M.colorKey(t.priority) + '">' + esc(t.priority) + '</span>' : '';
        var owner = t.owner ? '<span class="kb-owner">' + esc(t.owner) + '</span>' : '';
        var link = t.contentId ? '<span class="kb-link">' + esc(t.contentId) + '</span>' : '';
        var due = t.due ? '<span class="kb-due' + (M.isOverdue(t) ? ' is-late' : '') + '">' + esc(t.due) + '</span>' : '';
        card.innerHTML = '<div class="kb-task">' + esc(t.task) + '</div>' +
          '<div class="kb-meta">' + owner + pr + link + '</div>' +
          (due ? '<div class="kb-foot">' + due + '</div>' : '');
        card.addEventListener('dragstart', function (e) {
          draggingId = t.id; card.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          try { e.dataTransfer.setData('text/plain', t.id); } catch (_) {}
        });
        card.addEventListener('dragend', function () { draggingId = null; card.classList.remove('dragging'); });
        body.appendChild(card);
      });
      col.appendChild(body);

      var add = el('button', 'kb-add'); add.innerHTML = '＋ مهمة';
      add.onclick = function () {
        S().tasks.push({ id: M.nextId(S().tasks, 'T'), task: '', contentId: '', domain: '', owner: '', priority: 'متوسطة', start: '', due: '', status: st, effort: '', notes: '' });
        save(); M.showView('tasks');
      };
      col.appendChild(add);

      col.addEventListener('dragover', function (e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; col.classList.add('drag-over'); });
      col.addEventListener('dragleave', function () { col.classList.remove('drag-over'); });
      col.addEventListener('drop', function (e) {
        e.preventDefault(); col.classList.remove('drag-over');
        var id = draggingId || (e.dataTransfer && e.dataTransfer.getData('text/plain'));
        if (!id) return;
        var t = S().tasks.filter(function (x) { return x.id === id; })[0];
        if (t && t.status !== st) { t.status = st; save(); M.showView('kanban'); }
      });
      board.appendChild(col);
    });
    c.appendChild(board);
  };

  /* ---------- Gantt timeline (tasks) ---------- */
  function dnum(iso) {
    if (!iso) return NaN;
    var p = String(iso).split('-');
    if (p.length !== 3) return NaN;
    var t = Date.UTC(+p[0], +p[1] - 1, +p[2]);
    return isNaN(t) ? NaN : Math.floor(t / 86400000);
  }
  function fmtDay(num) {
    var d = new Date(num * 86400000);
    return pad2(d.getUTCMonth() + 1) + '/' + pad2(d.getUTCDate());
  }

  M.views.gantt = function (c) {
    c.appendChild(head('المخطط الزمني', 'المهام كأشرطة على محور زمني (من تاريخ البدء إلى التسليم) — المتأخّرة بالأحمر، والخط العمودي هو اليوم'));
    var wrap = el('div', 'wrap');

    // collect plottable tasks (have text + at least one valid date)
    var items = [];
    S().tasks.forEach(function (t) {
      if (!(t.task || '').trim()) return;
      var ds = dnum(t.start), dd = dnum(t.due);
      if (isNaN(ds) && isNaN(dd)) return;
      var s = isNaN(ds) ? dd : ds, e = isNaN(dd) ? ds : dd;
      if (s > e) { var tmp = s; s = e; e = tmp; }
      items.push({ t: t, s: s, e: e });
    });

    if (!items.length) {
      var em = el('div', 'empty'); em.textContent = 'أضِف تواريخ بدء/تسليم للمهام لعرض المخطط الزمني.';
      wrap.appendChild(em); c.appendChild(wrap); return;
    }

    items.sort(function (a, b) { return a.s - b.s || a.e - b.e; });
    var minD = items[0].s, maxD = items[0].e;
    items.forEach(function (it) { if (it.s < minD) minD = it.s; if (it.e > maxD) maxD = it.e; });
    minD -= 1; maxD += 1;                 // padding
    var span = Math.max(1, maxD - minD);
    var pct = function (d) { return ((d - minD) / span) * 100; };

    // date scale ticks (~6, aligned gridlines reuse the same fractions)
    var TICKS = 6, ticks = [];
    for (var i = 0; i <= TICKS; i++) { var f = i / TICKS; ticks.push({ f: f, label: fmtDay(Math.round(minD + f * span)) }); }
    function gridHTML() {
      return ticks.map(function (tk) { return '<span class="gantt-grid" style="left:' + (tk.f * 100) + '%"></span>'; }).join('');
    }

    var today = dnum(M.todayISO());
    var todayLine = (today >= minD && today <= maxD)
      ? '<span class="gantt-today" style="left:' + pct(today) + '%" title="اليوم"></span>' : '';

    var board = el('div', 'gantt');

    // header: scale
    var hd = el('div', 'gantt-row gantt-head');
    hd.innerHTML = '<div class="gantt-label gantt-scale-label">المهمة</div>' +
      '<div class="gantt-track gantt-scale">' + gridHTML() +
      ticks.map(function (tk) { return '<span class="gantt-tick" style="left:' + (tk.f * 100) + '%">' + tk.label + '</span>'; }).join('') +
      '</div>';
    board.appendChild(hd);

    // rows
    items.forEach(function (it) {
      var t = it.t, late = M.isOverdue(t);
      var row = el('div', 'gantt-row');
      var label = el('div', 'gantt-label');
      label.innerHTML = '<span class="gantt-task">' + esc(t.task) + '</span>' +
        '<span class="gantt-sub">' + (t.owner ? esc(t.owner) + ' · ' : '') + fmtDay(it.s) + ' → ' + fmtDay(it.e) + '</span>';
      var track = el('div', 'gantt-track');
      var left = pct(it.s), width = Math.max(((it.e - it.s + 1) / span) * 100, 1.5);
      var bar = '<span class="gantt-bar p-' + M.colorKey(t.status) + (late ? ' is-late' : '') + '"' +
        ' style="left:' + left + '%;width:' + width + '%"' +
        ' title="' + esc(t.task) + ' · ' + esc(t.status || '') + '"></span>';
      track.innerHTML = gridHTML() + todayLine + bar;
      row.appendChild(label); row.appendChild(track);
      board.appendChild(row);
    });
    var scroll = el('div', 'gantt-scroll'); scroll.appendChild(board);
    wrap.appendChild(scroll);

    // status legend
    var legend = [['مكتملة/منشور', 'done'], ['قيد التنفيذ', 'progress'], ['قيد المراجعة', 'review'],
    ['معتمدة', 'approved'], ['لم تبدأ', 'idle'], ['معلّقة', 'hold'], ['متأخرة', 'late']];
    var leg = el('div', 'gantt-legend');
    leg.innerHTML = legend.map(function (l) { return '<span class="gl"><i style="background:var(--' + l[1] + ')"></i>' + l[0] + '</span>'; }).join('');
    wrap.appendChild(leg);

    c.appendChild(wrap);
  };

  /* ---------- nav ---------- */
  M.showView = function (name) {
    if (!M.views[name]) name = 'dashboard';
    M.currentView = name;
    var c = document.getElementById('view'); c.innerHTML = '';
    M.views[name](c); c.scrollTop = 0;
    var items = document.querySelectorAll('.nav-item');
    for (var i = 0; i < items.length; i++) items[i].classList.toggle('is-active', items[i].getAttribute('data-view') === name);
    document.getElementById('sidenav').classList.remove('open');
    document.getElementById('scrim').classList.remove('show');
  };

})(window.MOA);
