/* state.js — localStorage persistence, import/export */
window.MOA = window.MOA || {};
(function (M) {
  "use strict";
  var KEY = 'moa.v1';
  M.state = null;

  function clone(o){ return JSON.parse(JSON.stringify(o)); }
  function todayISO(){
    var d=new Date(), z=function(n){return String(n).padStart(2,'0');};
    return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());
  }
  M.todayISO = todayISO;

  function migrate(s){
    if(!s.version) s.version=1;
    s.content=s.content||[]; s.tasks=s.tasks||[]; s.team=s.team||[];
    s.lists=Object.assign(clone(M.LISTS), s.lists||{});
    s.settings=Object.assign({period:'يونيو 2026',updatedAt:todayISO()}, s.settings||{});
    s.settings.targets=Object.assign({published:10,completion:80,content:12}, s.settings.targets||{});
    s.settings.history = s.settings.history || {};
    return s;
  }

  /* record a KPI snapshot for the current month (for honest month-over-month deltas) */
  function captureSnapshot(){
    if(!M.state || !M.kpis) return;
    var k=M.kpis(), mo=todayISO().slice(0,7); // YYYY-MM
    M.state.settings.history = M.state.settings.history || {};
    M.state.settings.history[mo] = {
      total:k.total, done:k.done, prog:k.prog, late:k.late,
      cTotal:k.cTotal, pub:k.pub, completion:Math.round(k.completion*100), rate:Math.round(k.rate*100)
    };
  }
  M.captureSnapshot = captureSnapshot;

  M.load = function(){
    try{
      var raw=localStorage.getItem(KEY);
      if(raw){ M.state=migrate(JSON.parse(raw)); return M.state; }
    }catch(e){ console.warn('load failed', e); }
    M.state=migrate(clone(M.SEED));
    M.save();
    return M.state;
  };

  M.save = function(){
    if(!M.state) return;
    M.state.settings.updatedAt = todayISO();
    captureSnapshot();
    try{ localStorage.setItem(KEY, JSON.stringify(M.state)); }
    catch(e){ console.warn('save failed', e); }
    if(M.onSaved) M.onSaved();
  };

  M.resetToExamples = function(){ M.state=migrate(clone(M.SEED)); M.save(); };
  M.clearAll = function(){
    M.state.content=[]; M.state.tasks=[]; M.state.team=[]; M.save();
  };

  function download(blob, name){
    var url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download=name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
  }

  /* CSV export (UTF-8 BOM so Excel reads Arabic correctly) */
  function csvCell(v){
    var s=(v==null?'':String(v));
    return /[",\n\r]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s;
  }
  M.exportCSV = function(rows, columns, filename){
    var head=columns.map(function(c){return csvCell(c.label);}).join(',');
    var body=rows.map(function(r){
      return columns.map(function(c){return csvCell(r[c.key]);}).join(',');
    }).join('\r\n');
    var blob=new Blob(['﻿'+head+'\r\n'+body], {type:'text/csv;charset=utf-8;'});
    download(blob, filename+'-'+todayISO()+'.csv');
  };

  M.exportJSON = function(){
    var blob=new Blob([JSON.stringify(M.state,null,2)],{type:'application/json'});
    download(blob, 'نظام-التسويق-'+todayISO()+'.json');
  };

  M.importJSON = function(file, done){
    var r=new FileReader();
    r.onload=function(){
      try{
        var obj=JSON.parse(r.result);
        if(!obj || (!obj.content && !obj.tasks && !obj.team)) throw new Error('bad shape');
        M.state=migrate(obj); M.save(); done(true);
      }catch(e){ console.warn(e); done(false); }
    };
    r.onerror=function(){ done(false); };
    r.readAsText(file);
  };

  /* id generator: prefix 'C' or 'T' -> next free, zero-padded to 3 */
  M.nextId = function(arr, prefix){
    var max=0;
    arr.forEach(function(o){
      var m=/^[A-Za-z]+-(\d+)$/.exec(o.id||'');
      if(m){ var n=parseInt(m[1],10); if(n>max) max=n; }
    });
    return prefix+'-'+String(max+1).padStart(3,'0');
  };

})(window.MOA);
