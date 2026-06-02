/* compute.js — all derived values (never stored) */
window.MOA = window.MOA || {};
(function (M) {
  "use strict";
  function S(){ return M.state; }
  function has(v){ return v!=null && String(v).trim()!==''; }

  M.isOverdue = function(t){
    return has(t.due) && t.due < M.todayISO() && t.status!=='مكتملة' && has(t.task);
  };

  M.kpis = function(){
    var t=S().tasks, c=S().content;
    var total=t.filter(function(x){return has(x.task);}).length;
    var done=t.filter(function(x){return x.status==='مكتملة';}).length;
    var prog=t.filter(function(x){return x.status==='قيد التنفيذ';}).length;
    var late=t.filter(M.isOverdue).length;
    var cTotal=c.filter(function(x){return has(x.title);}).length;
    var pub=c.filter(function(x){return x.status==='منشور';}).length;
    return {
      total:total, done:done, prog:prog, late:late,
      cTotal:cTotal, pub:pub,
      rate: cTotal? pub/cTotal : 0,
      completion: total? done/total : 0,
      publish: cTotal? pub/cTotal : 0
    };
  };

  M.teamComputed = function(member){
    var t=S().tasks, c=S().content;
    var open=t.filter(function(x){return x.owner===member && has(x.task) && x.status!=='مكتملة';}).length;
    var content=c.filter(function(x){return x.owner===member && has(x.title);}).length;
    var effort=t.filter(function(x){return x.owner===member && x.status!=='مكتملة';})
                 .reduce(function(s,x){var n=parseFloat(x.effort); return s+(isNaN(n)?0:n);},0);
    return {open:open, content:content, effort:effort};
  };

  M.weeklyTrend = function(){
    var weeks=S().lists.weeks, c=S().content, cum=0;
    return weeks.map(function(w){
      var n=c.filter(function(x){return x.week===w;}).length;
      cum+=n; return {week:w, weekly:n, cum:cum};
    });
  };

  M.statusDistribution = function(){
    var st=S().lists.taskStatuses, t=S().tasks;
    return st.map(function(s){
      return {label:s, value:t.filter(function(x){return x.status===s;}).length, color:M.colorKey(s)};
    });
  };

  M.workload = function(){
    return S().team.filter(function(m){return has(m.member);}).map(function(m){
      return {label:m.member, value:M.teamComputed(m.member).open};
    });
  };

})(window.MOA);
