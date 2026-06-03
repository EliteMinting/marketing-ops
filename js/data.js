/* data.js — seed dataset, default lists, status->color map */
window.MOA = window.MOA || {};
(function (M) {
  "use strict";

  M.LISTS = {
    weeks: ['الأسبوع 1','الأسبوع 2','الأسبوع 3','الأسبوع 4','الأسبوع 5','الأسبوع 6'],
    platforms: ['إنستقرام','تيك توك','يوتيوب','فيسبوك','تويتر / X','سناب شات','لينكدإن'],
    types: ['ريل','بوست','ستوري','كاروسيل','فيديو','مقال'],
    domains: ['تصميم','محتوى','إنتاج','تنسيق','UX','نشر'],
    priorities: ['عالية','متوسطة','منخفضة'],
    taskStatuses: ['لم تبدأ','قيد التنفيذ','قيد المراجعة','معلّقة','معتمدة','مكتملة'],
    contentStatuses: ['فكرة','قيد الإعداد','قيد المراجعة','جاهز للنشر','منشور','مؤجّل']
  };

  /* status / priority value -> color key (css class suffix p-<key>) */
  M.COLOR_OF = {
    // task statuses
    'لم تبدأ':'idle','قيد التنفيذ':'progress','قيد المراجعة':'review',
    'معلّقة':'hold','معتمدة':'approved','مكتملة':'done',
    // content statuses
    'فكرة':'idle','قيد الإعداد':'progress','جاهز للنشر':'approved','منشور':'done','مؤجّل':'hold',
    // priorities
    'عالية':'late','متوسطة':'hold','منخفضة':'done'
  };
  M.colorKey = function (v) { return M.COLOR_OF[v] || 'idle'; };

  /* raw hex for SVG charts (one source of truth, mirrors CSS) */
  M.HEX = {
    done:'#A8DDA0', progress:'#7FB8E6', review:'#C9B6E4', approved:'#86CFC4',
    idle:'#E4E1F2', hold:'#F4C56B', late:'#F2A9C0',
    primary:'#5B4FE0', ink:'#2E2A72', track:'#EEEDF8', grid:'#ECEAF6', muted:'#9A96B4'
  };

  M.SEED = {
    version: 1,
    content: [
      {id:'C-001', date:'2026-06-07', week:'الأسبوع 1', platform:'إنستقرام', type:'ريل',  title:'إطلاق الحملة التعريفية', owner:'سارة', status:'منشور',     assetUrl:'', publishedDate:'2026-06-07', notes:'مثال — استبدله', example:true},
      {id:'C-002', date:'2026-06-10', week:'الأسبوع 1', platform:'تيك توك',  type:'فيديو', title:'كواليس الفريق',          owner:'خالد', status:'قيد الإعداد', assetUrl:'', publishedDate:'',           notes:'مثال', example:true},
      {id:'C-003', date:'2026-06-15', week:'الأسبوع 2', platform:'يوتيوب',   type:'فيديو', title:'شرح المنتج بالتفصيل',     owner:'نورة', status:'فكرة',      assetUrl:'', publishedDate:'',           notes:'مثال', example:true}
    ],
    tasks: [
      {id:'T-001', task:'تصميم غلاف الحملة',        contentId:'C-001', domain:'تصميم', owner:'خالد', priority:'عالية',  start:'2026-06-02', due:'2026-06-05', status:'مكتملة',     effort:4, notes:'', example:true},
      {id:'T-002', task:'كتابة سيناريو الريل',       contentId:'C-001', domain:'محتوى', owner:'سارة', priority:'عالية',  start:'2026-06-03', due:'2026-06-06', status:'مكتملة',     effort:3, notes:'', example:true},
      {id:'T-003', task:'مونتاج فيديو الكواليس',     contentId:'C-002', domain:'إنتاج', owner:'نورة', priority:'متوسطة', start:'2026-06-05', due:'2026-06-09', status:'قيد التنفيذ', effort:5, notes:'', example:true},
      {id:'T-004', task:'إعداد سكربت الشرح',         contentId:'C-003', domain:'محتوى', owner:'سارة', priority:'متوسطة', start:'2026-05-27', due:'2026-05-30', status:'قيد التنفيذ', effort:4, notes:'مثال على مهمة متأخرة', example:true},
      {id:'T-005', task:'تجهيز خطة النشر الشهرية',   contentId:'',      domain:'تنسيق', owner:'ريم',  priority:'منخفضة', start:'2026-06-16', due:'2026-06-20', status:'لم تبدأ',     effort:2, notes:'', example:true}
    ],
    team: [
      {member:'ريم',  role:'مديرة التسويق',  area:'الإشراف العام والخطة الشهرية'},
      {member:'سارة', role:'أخصائية محتوى',  area:'الكتابة والنشر والتقويم'},
      {member:'خالد', role:'مصمم',           area:'الهوية البصرية والتصاميم'},
      {member:'نورة', role:'محرّرة فيديو',    area:'التصوير والمونتاج والموشن'}
    ],
    lists: JSON.parse(JSON.stringify(M.LISTS)),
    settings: {
      period:'يونيو 2026', updatedAt:'2026-06-02',
      targets:{ published:10, completion:80, content:12 },
      history:{ '2026-05': { total:4, done:1, prog:1, late:1, cTotal:2, pub:0, completion:25, rate:0 } }
    }
  };

})(window.MOA);
