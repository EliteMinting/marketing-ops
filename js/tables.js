/* tables.js — generic editable table engine */
window.MOA = window.MOA || {};
(function (M) {
  "use strict";
  function el(t, c) { var e = document.createElement(t); if (c) e.className = c; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var ICON_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>';

  M.tables = {};
  /* schema col: {key,label,type,source,compute,pill,cls,placeholder}
     type: id|text|number|date|url|select|computed */
  M.tables.render = function (rows, schema, opts) {
    opts = opts || {};
    var card = el('div', 'table-card');
    var scroll = el('div', 'table-scroll');

    function change(row, key, value, tr) { row[key] = value; if (opts.onChange) opts.onChange(row, key, value, tr); }

    function buildCell(row, col, tr) {
      var v = row[col.key];
      if (col.type === 'computed') {
        var r = col.compute(row);
        var span = el('span', r.cls || 'cell-computed');
        span.innerHTML = esc(r.text) + (r.sub ? '<span class="mini">' + esc(r.sub) + '</span>' : '');
        return span;
      }
      if (col.type === 'select' || col.pill) {
        var sel = document.createElement('select');
        sel.className = col.pill ? ('pill-select p-' + M.colorKey(v)) : 'cell-select';
        var list = (typeof col.source === 'function' ? col.source(row) : col.source) || [];
        var blank = document.createElement('option'); blank.value = ''; blank.textContent = '—'; sel.appendChild(blank);
        if (v && list.indexOf(v) < 0) list = [v].concat(list);
        list.forEach(function (o) { var op = document.createElement('option'); op.value = o; op.textContent = o; sel.appendChild(op); });
        sel.value = v || '';
        sel.addEventListener('change', function () {
          change(row, col.key, sel.value, tr);
          if (col.pill) sel.className = 'pill-select p-' + M.colorKey(sel.value);
        });
        return sel;
      }
      var inp = document.createElement('input');
      inp.className = 'cell-input' + (col.cls ? ' ' + col.cls : '');
      inp.value = v == null ? '' : v;
      if (col.placeholder) inp.placeholder = col.placeholder;
      if (col.type === 'date') inp.type = 'date';
      else if (col.type === 'number') { inp.type = 'number'; inp.min = '0'; inp.className += ' cell-num'; }
      else if (col.type === 'url') { inp.type = 'url'; inp.placeholder = col.placeholder || 'https://'; }
      else inp.type = 'text';
      if (col.type === 'id') inp.className += ' cell-id';
      var ev = (col.type === 'date' || col.type === 'number') ? 'change' : 'input', deb;
      inp.addEventListener(ev, function () {
        var val = col.type === 'number' ? (inp.value === '' ? '' : parseFloat(inp.value)) : inp.value;
        if (ev === 'input') { clearTimeout(deb); deb = setTimeout(function () { change(row, col.key, val, tr); }, 300); }
        else change(row, col.key, val, tr);
      });
      return inp;
    }

    function buildRow(row, idx) {
      var tr = el('tr');
      if (opts.rowClass) { var rc = opts.rowClass(row); if (rc) tr.className = rc; }
      schema.forEach(function (col) {
        var td = el('td'); td.setAttribute('data-label', col.label);
        td.appendChild(buildCell(row, col, tr));
        tr.appendChild(td);
      });
      var tdA = el('td', 'col-actions'); tdA.setAttribute('data-label', '');
      if (opts.onDelete) {
        var del = el('button', 'row-del'); del.title = 'حذف'; del.innerHTML = ICON_TRASH;
        del.onclick = function () { opts.onDelete(row, idx); };
        tdA.appendChild(del);
      }
      tr.appendChild(tdA);
      return tr;
    }

    if (!rows.length) {
      var em = el('div', 'empty');
      em.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/></svg><div>لا توجد بيانات بعد — أضِف أول صف.</div>';
      card.appendChild(em);
    } else {
      var table = el('table', 'data');
      var thead = el('thead'), htr = el('tr');
      var sortKey = null, sortDir = 1, ths = {};

      function cellVal(row, col) {
        if (col.type === 'computed') { try { return col.compute(row).text || ''; } catch (e) { return ''; } }
        return row[col.key];
      }
      function cmp(a, b, col) {
        var va = cellVal(a, col), vb = cellVal(b, col);
        if (col.type === 'number') return (parseFloat(va) || 0) - (parseFloat(vb) || 0);
        return String(va == null ? '' : va).localeCompare(String(vb == null ? '' : vb), 'ar', { numeric: true });
      }
      function indicators() {
        schema.forEach(function (col) {
          var th = ths[col.key]; if (!th) return;
          th.querySelector('.sort-ind').textContent = (sortKey === col.key) ? (sortDir > 0 ? ' ▲' : ' ▼') : '';
        });
      }
      var tbody = el('tbody');
      function renderBody() {
        var display = rows.slice();
        if (sortKey) {
          var col = schema.filter(function (c) { return c.key === sortKey; })[0];
          if (col) display.sort(function (a, b) { return cmp(a, b, col) * sortDir; });
        }
        tbody.innerHTML = '';
        display.forEach(function (row, idx) { tbody.appendChild(buildRow(row, idx)); });
      }

      schema.forEach(function (col) {
        var th = el('th');
        th.innerHTML = '<span>' + esc(col.label) + '</span><span class="sort-ind"></span>';
        if (col.type !== 'id') {
          th.classList.add('sortable');
          th.addEventListener('click', function () {
            if (sortKey === col.key) sortDir = -sortDir; else { sortKey = col.key; sortDir = 1; }
            renderBody(); indicators();
          });
        }
        ths[col.key] = th; htr.appendChild(th);
      });
      htr.appendChild(el('th', 'col-actions'));
      thead.appendChild(htr); table.appendChild(thead);
      renderBody();
      table.appendChild(tbody);
      scroll.appendChild(table); card.appendChild(scroll);
    }

    if (opts.onAdd) {
      var foot = el('div'); foot.style.padding = '12px';
      var add = el('button', 'btn btn-soft btn-sm');
      add.innerHTML = '＋ ' + (opts.addLabel || 'إضافة صف');
      add.onclick = opts.onAdd; foot.appendChild(add); card.appendChild(foot);
    }
    return card;
  };

})(window.MOA);
