/* ai.js — OpenRouter assistant: config, client, tools, validation, execution */
window.MOA = window.MOA || {};
(function (M) {
  "use strict";
  function S() { return M.state; }
  function has(v) { return v != null && String(v).trim() !== ''; }

  M.ai = {};

  /* ---------- config (kept OUT of M.state so the key never lands in exported JSON) ---------- */
  var CFG_K = 'moa.ai';
  /* multi-provider: each is OpenAI-compatible */
  M.ai.PROVIDERS = {
    openrouter: {
      label: 'OpenRouter', endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      referer: true, keyHint: 'sk-or-...', keysUrl: 'https://openrouter.ai/keys',
      models: [
        { id: 'meta-llama/llama-3.1-8b-instruct', label: 'Llama 3.1 8B (سريع)' },
        { id: 'mistralai/mistral-7b-instruct', label: 'Mistral 7B (سريع)' },
        { id: 'deepseek/deepseek-chat', label: 'DeepSeek V3 (أقوى)' },
        { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
        { id: 'qwen/qwen-2.5-72b-instruct', label: 'Qwen2.5 72B' }
      ]
    },
    groq: {
      label: 'Groq', endpoint: 'https://api.groq.com/openai/v1/chat/completions',
      referer: false, keyHint: 'gsk_...', keysUrl: 'https://console.groq.com/keys',
      models: [
        { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (فائق السرعة)' },
        { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
        { id: 'gemma2-9b-it', label: 'Gemma2 9B' },
        { id: 'qwen-2.5-32b', label: 'Qwen2.5 32B' }
      ]
    }
  };
  function provId() { return M.ai.getConfig().provider; }
  function keyName(p) { return 'moa.ai.key.' + p; }
  M.ai.getKey = function (provider) {
    provider = provider || provId();
    try {
      var v = localStorage.getItem(keyName(provider));
      if (!v && provider === 'openrouter') v = localStorage.getItem('moa.ai.key'); // legacy
      return v || '';
    } catch (e) { return ''; }
  };
  M.ai.setKey = function (provider, v) {
    if (arguments.length === 1) { v = provider; provider = provId(); }
    try { v ? localStorage.setItem(keyName(provider), v) : localStorage.removeItem(keyName(provider)); } catch (e) {}
  };
  M.ai.getConfig = function () {
    var c = {}; try { c = JSON.parse(localStorage.getItem(CFG_K) || '{}') || {}; } catch (e) {}
    if (!c.provider || !M.ai.PROVIDERS[c.provider]) c.provider = 'openrouter';
    var prov = M.ai.PROVIDERS[c.provider];
    if (!c.model) c.model = prov.models[0].id;
    return c;
  };
  M.ai.setConfig = function (patch) {
    var c = M.ai.getConfig();
    for (var k in patch) c[k] = patch[k];
    // when switching provider, default the model to that provider's first if not explicitly set
    if (patch.provider && !patch.model) c.model = M.ai.PROVIDERS[patch.provider].models[0].id;
    try { localStorage.setItem(CFG_K, JSON.stringify(c)); } catch (e) {}
    return c;
  };
  M.ai.models = function () { return M.ai.PROVIDERS[provId()].models; };

  /* ---------- tool schema (OpenAI/OpenRouter compatible) ---------- */
  function lists() { return S().lists; }
  M.ai.tools = function () {
    var L = lists();
    var taskProps = {
      task: { type: 'string', description: 'وصف المهمة' },
      owner: { type: 'string', enum: members(), description: 'المسؤول (من الفريق)' },
      priority: { type: 'string', enum: L.priorities },
      status: { type: 'string', enum: L.taskStatuses },
      domain: { type: 'string', enum: L.domains },
      contentId: { type: 'string', description: 'رقم المحتوى المرتبط مثل C-001' },
      start: { type: 'string', description: 'تاريخ البدء YYYY-MM-DD' },
      due: { type: 'string', description: 'تاريخ التسليم YYYY-MM-DD' },
      effort: { type: 'number', description: 'الجهد بالساعات' },
      notes: { type: 'string' }
    };
    var contentProps = {
      title: { type: 'string', description: 'عنوان/موضوع المحتوى' },
      platform: { type: 'string', enum: L.platforms },
      type: { type: 'string', enum: L.types },
      owner: { type: 'string', enum: members() },
      status: { type: 'string', enum: L.contentStatuses },
      week: { type: 'string', enum: L.weeks },
      date: { type: 'string', description: 'التاريخ المخطط YYYY-MM-DD' },
      publishedDate: { type: 'string', description: 'تاريخ النشر الفعلي YYYY-MM-DD' },
      notes: { type: 'string' }
    };
    function fn(name, desc, props, required) {
      return { type: 'function', function: { name: name, description: desc, parameters: { type: 'object', properties: props, required: required || [] } } };
    }
    var idProp = { id: { type: 'string', description: 'معرّف العنصر مثل T-003 أو C-002' } };
    function withId(props) { var o = { id: idProp.id }; for (var k in props) o[k] = props[k]; return o; }
    return [
      fn('add_task', 'إضافة مهمة جديدة', taskProps, ['task']),
      fn('update_task', 'تعديل مهمة قائمة بالمعرّف', withId(taskProps), ['id']),
      fn('delete_task', 'حذف مهمة بالمعرّف', idProp, ['id']),
      fn('add_content', 'إضافة عنصر محتوى جديد', contentProps, ['title']),
      fn('update_content', 'تعديل محتوى قائم بالمعرّف', withId(contentProps), ['id']),
      fn('delete_content', 'حذف محتوى بالمعرّف', idProp, ['id'])
    ];
  };

  function members() { return (S().team || []).map(function (m) { return m.member; }).filter(Boolean); }

  /* ---------- system prompt + compact state snapshot ---------- */
  function snapshot() {
    var k = M.kpis(), a = M.taskAlerts(), L = lists();
    function brief(arr, f) { return arr.slice(0, 40).map(f).join('\n'); }
    function brief2(arr, f) { return arr.slice(0, 25).map(f).join('\n'); }
    var tasks = brief2(S().tasks.filter(function (t) { return has(t.task); }), function (t) {
      return '- ' + t.id + ': ' + t.task + ' | المسؤول:' + (t.owner || '—') + ' | الأولوية:' + (t.priority || '—') +
        ' | البدء:' + (t.start || '—') + ' | التسليم:' + (t.due || '—') + ' | الحالة:' + (t.status || '—');
    });
    var content = brief2(S().content.filter(function (c) { return has(c.title); }), function (c) {
      return '- ' + c.id + ': ' + c.title + ' | المنصة:' + (c.platform || '—') + ' | المسؤول:' + (c.owner || '—') + ' | الحالة:' + (c.status || '—');
    });
    return [
      'تاريخ اليوم: ' + M.todayISO(),
      'مؤشرات: مهام=' + k.total + ' مكتملة=' + k.done + ' متأخرة=' + a.overdue + ' تستحق قريباً=' + a.dueSoon + ' محتوى=' + k.cTotal + ' منشور=' + k.pub,
      'الفريق: ' + (members().join('، ') || '—'),
      'القيم المسموحة:',
      '  أولويات: ' + L.priorities.join('، '),
      '  حالات المهام: ' + L.taskStatuses.join('، '),
      '  حالات المحتوى: ' + L.contentStatuses.join('، '),
      '  المنصات: ' + L.platforms.join('، '),
      '  أنواع المحتوى: ' + L.types.join('، '),
      '  المجالات: ' + L.domains.join('، '),
      '  الأسابيع: ' + L.weeks.join('، '),
      'المهام الحالية:\n' + (tasks || '(لا يوجد)'),
      'المحتوى الحالي:\n' + (content || '(لا يوجد)')
    ].join('\n');
  }
  function systemPrompt() {
    return 'أنت مساعد ذكي داخل تطبيق عربي لإدارة قسم التسويق (RTL). تتكلّم بالعربية باختصار ووضوح.\n' +
      'مهمتك: مساعدة المستخدم في تنظيم المحتوى والمهام، والإجابة التحليلية من اللقطة أدناه.\n' +
      'لإجراء أي تغيير (إضافة/تعديل/حذف) استخدم الأدوات المتاحة فقط، ولا تختلق معرّفات؛ استخدم المعرّفات من اللقطة.\n' +
      'التزم بالقيم المسموحة حرفياً. التواريخ بصيغة YYYY-MM-DD. إن نقص تفصيل مهم، اسأل بدل التخمين.\n' +
      'للأسئلة التحليلية (كم مهمة متأخرة؟ من الأكثر عبئاً؟) أجب نصياً بدون أدوات.\n' +
      'إن لم يدعم محيطك استدعاء الأدوات، أعِد بدلاً منها كتلة JSON واحدة بالشكل:\n' +
      '```json\n{"actions":[{"name":"add_task","arguments":{"task":"..."}}]}\n```\n\n' +
      '=== لقطة الحالة ===\n' + snapshot();
  }

  /* ---------- OpenAI-compatible client (OpenRouter / Groq) ---------- */
  function provider() { return M.ai.PROVIDERS[M.ai.getConfig().provider]; }
  function buildBody(messages, stream) {
    var cfg = M.ai.getConfig();
    var b = {
      model: cfg.model,
      messages: [{ role: 'system', content: systemPrompt() }].concat(messages),
      tools: M.ai.tools(),
      tool_choice: 'auto',
      temperature: 0.3,
      max_tokens: 800
    };
    if (cfg.provider === 'openrouter') b.provider = { sort: 'throughput' }; // OpenRouter-only routing hint
    if (stream) b.stream = true;
    return b;
  }
  function headers(key) {
    var h = { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' };
    if (provider().referer) { try { h['HTTP-Referer'] = location.origin; h['X-Title'] = 'Marketing Ops'; } catch (e) {} }
    return h;
  }

  M.ai.chat = function (messages) {
    var key = M.ai.getKey();
    if (!key) return Promise.reject(new Error('no-key'));
    return fetch(provider().endpoint, { method: 'POST', headers: headers(key), body: JSON.stringify(buildBody(messages, false)) })
      .then(function (r) {
        return r.json().then(function (j) {
          if (!r.ok) throw new Error((j && j.error && j.error.message) || ('HTTP ' + r.status));
          return j;
        });
      });
  };

  /* streaming variant — h = {onText(delta), onDone({content, tool_calls}), onError(err)} */
  M.ai.chatStream = function (messages, h) {
    var key = M.ai.getKey();
    if (!key) { h.onError(new Error('no-key')); return; }
    fetch(provider().endpoint, { method: 'POST', headers: headers(key), body: JSON.stringify(buildBody(messages, true)) })
      .then(function (resp) {
        if (!resp.ok || !resp.body || !resp.body.getReader) {
          return resp.json().catch(function () { return {}; }).then(function (j) {
            throw new Error((j && j.error && j.error.message) || ('HTTP ' + resp.status));
          });
        }
        var reader = resp.body.getReader(), dec = new TextDecoder(), buf = '';
        var content = '', toolMap = {}, finalized = false;
        function finalize() {
          if (finalized) return; finalized = true;
          var tcs = Object.keys(toolMap).map(function (k) {
            var s = toolMap[k]; return { id: s.id, type: 'function', function: { name: s.name, arguments: s.args } };
          });
          h.onDone({ content: content, tool_calls: tcs.length ? tcs : undefined });
        }
        function handle(data) {
          if (data === '[DONE]') { finalize(); return; }
          var j; try { j = JSON.parse(data); } catch (e) { return; }
          var d = j.choices && j.choices[0] && j.choices[0].delta;
          if (!d) return;
          if (d.content) { content += d.content; if (h.onText) h.onText(d.content); }
          if (d.tool_calls) d.tool_calls.forEach(function (tc) {
            var i = tc.index || 0, s = toolMap[i] || (toolMap[i] = { id: '', name: '', args: '' });
            if (tc.id) s.id = tc.id;
            if (tc.function) { if (tc.function.name) s.name = tc.function.name; if (tc.function.arguments) s.args += tc.function.arguments; }
          });
        }
        function pump() {
          return reader.read().then(function (res) {
            if (res.done) { finalize(); return; }
            buf += dec.decode(res.value, { stream: true });
            var parts = buf.split('\n'); buf = parts.pop();
            parts.forEach(function (line) {
              line = line.trim();
              if (line.indexOf('data:') === 0) handle(line.slice(5).trim());
            });
            return pump();
          });
        }
        return pump();
      })
      .catch(function (e) { if (h.onError) h.onError(e); });
  };

  /* ---------- parse a model reply into {text, actions[]} ---------- */
  M.ai.parseReply = function (msg) {
    var out = { text: (msg && msg.content) || '', actions: [] };
    if (msg && msg.tool_calls && msg.tool_calls.length) {
      msg.tool_calls.forEach(function (tc) {
        var args = {}; try { args = JSON.parse(tc.function.arguments || '{}'); } catch (e) {}
        out.actions.push({ name: tc.function.name, arguments: args, id: tc.id });
      });
      return out;
    }
    // fallback: a ```json {"actions":[...]} ``` block embedded in content
    var m = /```(?:json)?\s*([\s\S]*?)```/.exec(out.text);
    var raw = m ? m[1] : (out.text.indexOf('"actions"') >= 0 ? out.text : '');
    if (raw) {
      try {
        var obj = JSON.parse(raw);
        if (obj && obj.actions && obj.actions.length) {
          out.actions = obj.actions.map(function (a) { return { name: a.name, arguments: a.arguments || a.args || {} }; });
          if (m) out.text = out.text.replace(m[0], '').trim(); // strip the json block from shown text
        }
      } catch (e) {}
    }
    return out;
  };

  /* ---------- validate one action against the lists; returns {ok, clean, error} ---------- */
  var TASK_KEYS = ['task', 'owner', 'priority', 'status', 'domain', 'contentId', 'start', 'due', 'effort', 'notes'];
  var CONTENT_KEYS = ['title', 'platform', 'type', 'owner', 'status', 'week', 'date', 'publishedDate', 'notes'];
  var ENUMS = {
    priority: 'priorities', status_task: 'taskStatuses', status_content: 'contentStatuses',
    platform: 'platforms', type: 'types', domain: 'domains', week: 'weeks'
  };
  function inList(v, listKey) { return lists()[listKey].indexOf(v) >= 0; }
  function findById(arr, id) { for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i]; return null; }

  M.ai.validate = function (act) {
    var a = act.arguments || {}, name = act.name, errs = [], clean = {};
    function checkEnum(field, listKey) {
      if (has(a[field])) { if (inList(a[field], listKey)) clean[field] = a[field]; else errs.push('قيمة غير مسموحة لـ ' + field + ': ' + a[field]); }
    }
    function checkMember(field) {
      if (has(a[field])) { if (members().indexOf(a[field]) >= 0) clean[field] = a[field]; else errs.push('المسؤول غير موجود في الفريق: ' + a[field]); }
    }
    function checkDate(field) {
      if (has(a[field])) { if (/^\d{4}-\d{2}-\d{2}$/.test(a[field])) clean[field] = a[field]; else errs.push('تاريخ غير صالح لـ ' + field); }
    }
    var isTask = name.indexOf('task') >= 0;
    if (name === 'delete_task' || name === 'delete_content') {
      var arr = isTask ? S().tasks : S().content;
      if (!has(a.id) || !findById(arr, a.id)) errs.push('معرّف غير موجود: ' + (a.id || '—'));
      else clean.id = a.id;
      return { ok: !errs.length, clean: clean, error: errs.join('؛ '), name: name };
    }
    if (isTask) {
      if (name === 'update_task') { if (has(a.id) && findById(S().tasks, a.id)) clean.id = a.id; else errs.push('معرّف مهمة غير موجود: ' + (a.id || '—')); }
      if (name === 'add_task' && !has(a.task)) errs.push('وصف المهمة مطلوب');
      if (has(a.task)) clean.task = String(a.task);
      checkMember('owner'); checkEnum('priority', 'priorities'); checkEnum('status', 'taskStatuses');
      checkEnum('domain', 'domains'); checkDate('start'); checkDate('due');
      if (has(a.contentId)) { if (findById(S().content, a.contentId)) clean.contentId = a.contentId; else errs.push('محتوى مرتبط غير موجود: ' + a.contentId); }
      if (a.effort != null && a.effort !== '') { var n = parseFloat(a.effort); if (!isNaN(n)) clean.effort = n; }
      if (has(a.notes)) clean.notes = String(a.notes);
    } else {
      if (name === 'update_content') { if (has(a.id) && findById(S().content, a.id)) clean.id = a.id; else errs.push('معرّف محتوى غير موجود: ' + (a.id || '—')); }
      if (name === 'add_content' && !has(a.title)) errs.push('عنوان المحتوى مطلوب');
      if (has(a.title)) clean.title = String(a.title);
      checkMember('owner'); checkEnum('platform', 'platforms'); checkEnum('type', 'types');
      checkEnum('status', 'contentStatuses'); checkEnum('week', 'weeks'); checkDate('date'); checkDate('publishedDate');
      if (has(a.notes)) clean.notes = String(a.notes);
    }
    return { ok: !errs.length, clean: clean, error: errs.join('؛ '), name: name };
  };

  /* human-readable description of a validated action */
  M.ai.describe = function (name, c) {
    var t = { add_task: 'إضافة مهمة', update_task: 'تعديل مهمة', delete_task: 'حذف مهمة', add_content: 'إضافة محتوى', update_content: 'تعديل محتوى', delete_content: 'حذف محتوى' }[name] || name;
    var bits = [];
    ['id', 'task', 'title', 'owner', 'priority', 'status', 'platform', 'type', 'domain', 'week', 'start', 'due', 'date', 'publishedDate', 'effort', 'contentId', 'notes'].forEach(function (k) {
      if (c[k] != null && c[k] !== '') bits.push(k + ': ' + c[k]);
    });
    return t + (bits.length ? ' — ' + bits.join('، ') : '');
  };

  /* apply a validated action; returns an undo closure */
  M.ai.apply = function (name, c) {
    var arr, row, i, before;
    if (name === 'add_task') {
      row = { id: M.nextId(S().tasks, 'T'), task: '', contentId: '', domain: '', owner: '', priority: 'متوسطة', start: '', due: '', status: 'لم تبدأ', effort: '', notes: '' };
      for (var k in c) row[k] = c[k];
      S().tasks.push(row);
      return function () { var a = S().tasks; var j = a.indexOf(row); if (j >= 0) a.splice(j, 1); };
    }
    if (name === 'add_content') {
      row = { id: M.nextId(S().content, 'C'), date: '', week: '', platform: '', type: '', title: '', owner: '', status: 'فكرة', assetUrl: '', publishedDate: '', notes: '' };
      for (var k2 in c) row[k2] = c[k2];
      S().content.push(row);
      return function () { var a = S().content; var j = a.indexOf(row); if (j >= 0) a.splice(j, 1); };
    }
    if (name === 'update_task' || name === 'update_content') {
      arr = name === 'update_task' ? S().tasks : S().content; row = findById(arr, c.id);
      if (!row) return function () {};
      before = {}; for (var k3 in c) { if (k3 !== 'id') { before[k3] = row[k3]; row[k3] = c[k3]; } }
      return function () { for (var k in before) row[k] = before[k]; };
    }
    if (name === 'delete_task' || name === 'delete_content') {
      arr = name === 'delete_task' ? S().tasks : S().content; row = findById(arr, c.id); i = arr.indexOf(row);
      if (i < 0) return function () {};
      arr.splice(i, 1);
      return function () { arr.splice(i, 0, row); };
    }
    return function () {};
  };

})(window.MOA);
