/* compute.js — all derived values (never stored) */
window.MOA = window.MOA || {};
(function (M) {
  "use strict";
  function S(){ return M.state; }
  function has(v){ return v!=null && String(v).trim()!==''; }

  M.isOverdue = function(t){
    return has(t.due) && t.due < M.todayISO() && t.status!=='مكتملة' && has(t.task);
  };

  function addDaysISO(iso, n){
    var d=new Date(iso+'T00:00:00'); d.setDate(d.getDate()+n);
    var z=function(x){return String(x).padStart(2,'0');};
    return d.getFullYear()+'-'+z(d.getMonth()+1)+'-'+z(d.getDate());
  }
  /* due within the next 3 days (inclusive), not done and not already overdue */
  M.isDueSoon = function(t){
    if(!has(t.due) || !has(t.task) || t.status==='مكتملة') return false;
    if(M.isOverdue(t)) return false;
    var today=M.todayISO();
    return t.due>=today && t.due<=addDaysISO(today,3);
  };
  M.taskAlerts = function(){
    var t=S().tasks;
    return { overdue:t.filter(M.isOverdue).length, dueSoon:t.filter(M.isDueSoon).length };
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

  /* goals: progress toward target KPIs (targets live in settings, never derived) */
  M.goals = function(){
    var k=M.kpis(), t=(S().settings && S().settings.targets) || {};
    function ratio(v, target){ target=parseFloat(target)||0; return target>0 ? v/target : 0; }
    var comp=Math.round(k.completion*100);
    return [
      {key:'published',  label:'محتوى منشور',        value:k.pub,   target:parseFloat(t.published)||0,  unit:'',  ratio:ratio(k.pub, t.published)},
      {key:'completion', label:'نسبة إنجاز المهام',  value:comp,    target:parseFloat(t.completion)||0, unit:'%', ratio:ratio(comp, t.completion)},
      {key:'content',    label:'إجمالي المحتوى',      value:k.cTotal,target:parseFloat(t.content)||0,    unit:'',  ratio:ratio(k.cTotal, t.content)}
    ];
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
