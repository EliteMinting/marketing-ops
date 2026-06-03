/* charts.js — dependency-free inline-SVG charts (RTL-aware) */
window.MOA = window.MOA || {};
(function (M) {
  "use strict";
  var H = M.HEX, FONT = "Tajawal, 'Segoe UI', sans-serif";
  function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }

  /* themed neutrals — read from CSS variables so charts follow light/dark.
     Status colors stay from M.HEX (pastels work on both backgrounds). */
  function cssVar(name, fallback) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return v || fallback;
    } catch (e) { return fallback; }
  }
  function N() {
    return {
      ink: cssVar('--ink', H.ink),
      muted: cssVar('--muted', H.muted),
      track: cssVar('--c-track', H.track),
      grid: cssVar('--c-grid', H.grid)
    };
  }

  /* ring / donut with centered % */
  M.donut = function (pct, hex) {
    pct = Math.max(0, Math.min(1, pct || 0));
    var n = N();
    var r = 54, cx = 64, cy = 64, C = 2 * Math.PI * r, len = pct * C;
    return '<svg viewBox="0 0 128 128" class="chart-svg" style="max-width:180px;margin:auto">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + n.track + '" stroke-width="14"/>' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + hex + '" stroke-width="14" stroke-linecap="round" stroke-dasharray="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" transform="rotate(-90 ' + cx + ' ' + cy + ')"><animate attributeName="stroke-dasharray" from="0 ' + C.toFixed(2) + '" to="' + len.toFixed(2) + ' ' + (C - len).toFixed(2) + '" dur="0.7s" fill="freeze"/></circle>' +
      '<text x="' + cx + '" y="' + cy + '" text-anchor="middle" dominant-baseline="central" font-family="' + FONT + '" font-size="26" font-weight="800" fill="' + n.ink + '">' + Math.round(pct * 100) + '%</text>' +
      '</svg>';
  };

  /* line trend: data=[{week,weekly,cum}] ; RTL: week 1 at right */
  M.lineTrend = function (data) {
    var nu = N();
    var W = 360, Ht = 188, pL = 18, pR = 18, pT = 18, pB = 34;
    var n = data.length, maxY = Math.max.apply(null, data.map(function (d) { return d.cum; }).concat([1]));
    var x = function (i) { return (W - pR) - i * ((W - pL - pR) / Math.max(1, n - 1)); };
    var y = function (v) { return (Ht - pB) - (v / maxY) * (Ht - pT - pB); };
    var base = Ht - pB;
    var g = '', i, ty;
    /* gridlines + y labels (0, mid, max) */
    [0, maxY / 2, maxY].forEach(function (v) {
      ty = y(v);
      g += '<line x1="' + pL + '" y1="' + ty + '" x2="' + (W - pR) + '" y2="' + ty + '" stroke="' + nu.grid + '" stroke-width="1"/>';
      g += '<text x="' + (W - pR + 0) + '" y="' + (ty - 3) + '" font-family="' + FONT + '" font-size="9" fill="' + nu.muted + '" text-anchor="end">' + Math.round(v) + '</text>';
    });
    var ptsW = data.map(function (d, i) { return x(i) + ',' + y(d.weekly); }).join(' ');
    var ptsC = data.map(function (d, i) { return x(i) + ',' + y(d.cum); }).join(' ');
    var area = 'M ' + x(0) + ',' + base + ' L ' + data.map(function (d, i) { return x(i) + ',' + y(d.cum); }).join(' L ') + ' L ' + x(n - 1) + ',' + base + ' Z';
    var dots = '', labels = '';
    for (i = 0; i < n; i++) {
      dots += '<circle cx="' + x(i) + '" cy="' + y(data[i].cum) + '" r="3" fill="' + nu.ink + '"/>';
      dots += '<circle cx="' + x(i) + '" cy="' + y(data[i].weekly) + '" r="2.5" fill="' + H.progress + '"/>';
      labels += '<text x="' + x(i) + '" y="' + (Ht - 12) + '" font-family="' + FONT + '" font-size="9.5" fill="' + nu.muted + '" text-anchor="middle">' + data[i].week.replace('الأسبوع ', 'أ') + '</text>';
    }
    return '<svg viewBox="0 0 ' + W + ' ' + Ht + '" class="chart-svg">' +
      '<defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + nu.ink + '" stop-opacity="0.16"/><stop offset="1" stop-color="' + nu.ink + '" stop-opacity="0"/></linearGradient></defs>' +
      g +
      '<path d="' + area + '" fill="url(#area)"/>' +
      '<polyline points="' + ptsC + '" fill="none" stroke="' + nu.ink + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      '<polyline points="' + ptsW + '" fill="none" stroke="' + H.progress + '" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>' +
      dots + labels +
      '</svg>';
  };

  /* horizontal bars: items=[{label,value,color?}] grow from the right (RTL) */
  M.hbars = function (items, defKey) {
    var nu = N();
    var W = 340, rowH = 26, gap = 14, padT = 6, labelW = 66, valW = 24;
    var trackR = W - labelW - 6, trackL = valW, trackW = trackR - trackL;
    var max = Math.max.apply(null, items.map(function (d) { return d.value; }).concat([1]));
    var Ht = padT * 2 + items.length * (rowH + gap) - gap;
    var s = '', yy;
    items.forEach(function (d, i) {
      yy = padT + i * (rowH + gap);
      var bw = (d.value / max) * trackW, bx = trackR - bw;
      var hex = M.HEX[d.color || defKey || 'progress'];
      s += '<rect x="' + trackL + '" y="' + yy + '" width="' + trackW + '" height="' + rowH + '" rx="7" fill="' + nu.track + '"/>';
      s += '<rect x="' + bx.toFixed(1) + '" y="' + yy + '" width="' + Math.max(2, bw).toFixed(1) + '" height="' + rowH + '" rx="7" fill="' + hex + '"/>';
      s += '<text x="' + (W - 2) + '" y="' + (yy + rowH / 2) + '" font-family="' + FONT + '" font-size="12" font-weight="600" fill="' + nu.ink + '" text-anchor="end" dominant-baseline="central">' + d.label + '</text>';
      s += '<text x="' + (trackL - 4) + '" y="' + (yy + rowH / 2) + '" font-family="' + FONT + '" font-size="11.5" font-weight="700" fill="' + nu.muted + '" text-anchor="end" dominant-baseline="central">' + d.value + '</text>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + Ht + '" class="chart-svg">' + s + '</svg>';
  };

  M.statusBars = function (items) { return M.hbars(items); };

  /* small ring (for capacity cards) */
  function miniRing(pct, hex) {
    pct = Math.max(0, Math.min(1, pct || 0));
    var nu = N(), r = 18, c = 22, C = 2 * Math.PI * r, len = pct * C;
    return '<svg viewBox="0 0 44 44" width="44" height="44" style="direction:ltr">' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' + nu.track + '" stroke-width="5"/>' +
      '<circle cx="' + c + '" cy="' + c + '" r="' + r + '" fill="none" stroke="' + hex + '" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + len.toFixed(1) + ' ' + (C - len).toFixed(1) + '" transform="rotate(-90 ' + c + ' ' + c + ')"/></svg>';
  }
  /* team capacity cards: items=[{name, open, content, effort}] — HTML (theme-aware via CSS vars) */
  M.capacityCards = function (items) {
    if (!items.length) return '<div class="empty" style="padding:24px">أضِف أعضاء الفريق لعرض هذا الرسم.</div>';
    var maxLoad = Math.max.apply(null, items.map(function (m) { return m.open; }).concat([1]));
    return '<div class="cap-list">' + items.map(function (m) {
      var ratio = m.open / maxLoad;
      var hex = ratio >= 0.99 ? H.late : (ratio >= 0.6 ? H.hold : H.progress);
      var ch = (String(m.name || '').trim()[0]) || '؟';
      return '<div class="cap-row">' +
        '<div class="cap-ring">' + miniRing(ratio, hex) + '<span class="cap-ring-num">' + m.open + '</span></div>' +
        '<div class="cap-info"><div class="cap-name">' + esc(m.name) + '</div>' +
        '<div class="cap-meta">' + m.open + ' مهام مفتوحة · ' + m.effort + ' س جهد · ' + m.content + ' محتوى</div></div>' +
        '<div class="cap-av">' + esc(ch) + '</div></div>';
    }).join('') + '</div>';
  };

  /* single stacked proportion bar + legend: items=[{label,value,color}] */
  M.statusStack = function (items) {
    var total = items.reduce(function (s, d) { return s + d.value; }, 0);
    if (!total) return '<div class="empty" style="padding:24px">لا توجد مهام بعد.</div>';
    var seg = items.filter(function (d) { return d.value > 0; }).map(function (d) {
      return '<span class="stk-seg" style="width:' + (d.value / total * 100) + '%;background:var(--' + d.color + ')" title="' + esc(d.label) + ': ' + d.value + '"></span>';
    }).join('');
    var legend = items.map(function (d) {
      return '<span class="stk-leg"><i style="background:var(--' + d.color + ')"></i>' + esc(d.label) + ' <b>' + d.value + '</b></span>';
    }).join('');
    return '<div class="stk-bar">' + seg + '</div><div class="stk-legend">' + legend + '</div>';
  };

  /* vertical rounded-top bars (monochrome, one highlighted) — items=[{label,value,highlight?}] */
  M.vbars = function (items, opts) {
    opts = opts || {};
    var nu = N();
    var W = 380, H = 210, pT = 16, pB = 30, pL = 22, pR = 10;
    var max = Math.max.apply(null, items.map(function (d) { return d.value; }).concat([1]));
    var innerW = W - pL - pR, innerH = H - pT - pB, base = H - pB;
    var slot = innerW / Math.max(1, items.length);
    var bw = Math.min(slot * 0.52, 30);
    var g = '';
    [0, max / 2, max].forEach(function (v) {
      var y = base - (v / max) * innerH;
      g += '<line x1="' + pL + '" y1="' + y + '" x2="' + (W - pR) + '" y2="' + y + '" stroke="' + nu.grid + '" stroke-width="1"/>';
      g += '<text x="' + (W - pR + 2) + '" y="' + (y - 3) + '" font-family="' + FONT + '" font-size="9" fill="' + nu.muted + '" text-anchor="end">' + Math.round(v) + '</text>';
    });
    var bars = '';
    items.forEach(function (d, i) {
      var cx = (W - pR) - (i + 0.5) * slot;           // RTL: first item at right
      var h = Math.max(3, (d.value / max) * innerH);
      var x = cx - bw / 2, y = base - h;
      var fill = d.highlight ? (opts.hl || nu.muted) : (opts.fill || nu.ink);
      bars += '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="7" fill="' + fill + '"/>';
      bars += '<text x="' + cx.toFixed(1) + '" y="' + (H - 10) + '" font-family="' + FONT + '" font-size="10" font-weight="' + (d.highlight ? '800' : '600') + '" fill="' + (d.highlight ? nu.ink : nu.muted) + '" text-anchor="middle">' + d.label + '</text>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="chart-svg">' + g + bars + '</svg>';
  };

})(window.MOA);
