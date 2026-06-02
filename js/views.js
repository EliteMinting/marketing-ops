/* views.js — render each view */
window.MOA = window.MOA || {};
(function (M) {
  "use strict";
  function el(t, c) { var e = document.createElement(t); if (c) e.className = c; return e; }
  function S() { return M.state; }
  function members() { return S().team.map(function (m) { return m.member; }).filter(Boolean); }
  function contentIds() { return S().content.map(function (c) { return c.id; }).filter(Boolean); }
  function head(title, desc) {
    var h = el('div', 'view-head');
    h.innerHTML = '<div><div class="view-title">' + title + '</div><div class="view-desc">' + desc + '</div></div>';
    return h;
  }
  function save() { M.save(); }

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
    var card = M.tables.render(S().content, schema, {
      onChange: save,
      onAdd: function () { S().content.push({ id: M.nextId(S().content, 'C'), date: '', week: '', platform: '', type: '', title: '', owner: '', status: 'فكرة', assetUrl: '', publishedDate: '', notes: '' }); save(); M.showView('content'); },
      onDelete: function (row) { var a = S().content; a.splice(a.indexOf(row), 1); save(); M.showView('content'); M.toast('تم حذف الصف', 'info'); },
      addLabel: 'إضافة محتوى'
    });
    c.appendChild(head('خطة المحتوى', 'تقويم المحتوى — أعطِ كل عنصر رقماً (C-00X) لربط المهام به'));
    c.appendChild(card);
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
      { key: 'due', label: 'تاريخ التسليم', type: 'date' },
      { key: 'status', label: 'الحالة', pill: true, source: function () { return S().lists.taskStatuses; } },
      { key: 'effort', label: 'الجهد (ساعات)', type: 'number' },
      { key: 'overdue', label: 'متأخرة؟', type: 'computed', compute: function (r) { return M.isOverdue(r) ? { text: 'متأخرة', cls: 'tag-late' } : { text: '' }; } },
      { key: 'notes', label: 'ملاحظات', type: 'text' }
    ];
    var card = M.tables.render(S().tasks, schema, {
      rowClass: function (r) { return M.isOverdue(r) ? 'is-late' : ''; },
      onChange: function (row, key) { save(); if (key === 'due' || key === 'status') M.showView('tasks'); },
      onAdd: function () { S().tasks.push({ id: M.nextId(S().tasks, 'T'), task: '', contentId: '', domain: '', owner: '', priority: 'متوسطة', due: '', status: 'لم تبدأ', effort: '', notes: '' }); save(); M.showView('tasks'); },
      onDelete: function (row) { var a = S().tasks; a.splice(a.indexOf(row), 1); save(); M.showView('tasks'); M.toast('تم حذف المهمة', 'info'); },
      addLabel: 'إضافة مهمة'
    });
    c.appendChild(head('المهام', 'اربط المهمة بالمحتوى، وحدّد المسؤول والأولوية والحالة — التأخير يُحسب تلقائياً'));
    c.appendChild(card);
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
