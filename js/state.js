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
    return s;
  }

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
    try{ localStorage.setItem(KEY, JSON.stringify(M.state)); }
    catch(e){ console.warn('save failed', e); }
    if(M.onSaved) M.onSaved();
  };

  M.resetToExamples = function(){ M.state=migrate(clone(M.SEED)); M.save(); };
  M.clearAll = function(){
    M.state.content=[]; M.state.tasks=[]; M.state.team=[]; M.save();
  };

  M.exportJSON = function(){
    var blob=new Blob([JSON.stringify(M.state,null,2)],{type:'application/json'});
    var url=URL.createObjectURL(blob), a=document.createElement('a');
    a.href=url; a.download='نظام-التسويق-'+todayISO()+'.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){URL.revokeObjectURL(url);},1000);
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
