/* cloud.js — optional Supabase auth + per-user cloud sync (hybrid: local-first) */
window.MOA = window.MOA || {};
(function (M) {
  "use strict";
  M.cloud = {};
  var client = null, user = null, syncTimer = null, suppress = false, listeners = [];

  M.cloud.available = function () { return !!client; };
  M.cloud.user = function () { return user; };
  M.cloud.onAuth = function (fn) { listeners.push(fn); };
  function emit() { listeners.forEach(function (f) { try { f(user); } catch (e) {} }); }

  M.cloud.init = function () {
    try {
      var cfg = window.MOA_CONFIG || {};
      if (!window.supabase || !cfg.SUPABASE_URL || !cfg.SUPABASE_KEY) return false;
      client = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);
    } catch (e) { console.warn('cloud init failed', e); client = null; return false; }
    client.auth.onAuthStateChange(function (_evt, session) {
      var was = user; user = session ? session.user : null; emit();
      if (user && (!was || was.id !== user.id)) M.cloud.pullIntoState();
    });
    client.auth.getSession().then(function (res) {
      user = (res && res.data && res.data.session) ? res.data.session.user : null;
      emit();
      if (user) M.cloud.pullIntoState();
    }).catch(function () {});
    return true;
  };

  M.cloud.signUp = function (email, pw) { return client.auth.signUp({ email: email, password: pw }); };
  M.cloud.signIn = function (email, pw) { return client.auth.signInWithPassword({ email: email, password: pw }); };
  M.cloud.signOut = function () { return client.auth.signOut(); };

  /* pull this user's cloud workspace into local state; if none, push current local as first sync */
  M.cloud.pullIntoState = function () {
    if (!client || !user) return Promise.resolve();
    return client.from('workspaces').select('data').eq('user_id', user.id).maybeSingle()
      .then(function (res) {
        if (res.error) { console.warn('cloud pull', res.error); return; }
        var d = res.data && res.data.data;
        if (d && typeof d === 'object' && (d.content || d.tasks || d.team)) {
          suppress = true;
          M.loadFromObject(d);          // migrate + persist locally (sync suppressed)
          suppress = false;
          if (M.currentView) M.showView(M.currentView);
          if (M.toast) M.toast('تم تحميل بياناتك السحابية', 'ok');
        } else {
          M.cloud.push();               // first time: seed the cloud from local
          if (M.toast) M.toast('تمت مزامنة بياناتك للسحابة', 'ok');
        }
      });
  };

  M.cloud.push = function () {
    if (!client || !user || !M.state) return Promise.resolve();
    return client.from('workspaces')
      .upsert({ user_id: user.id, data: M.state, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
      .then(function (res) { if (res.error) console.warn('cloud push', res.error); });
  };

  /* called from M.onSaved on every local change — debounced cloud push (no-op when signed out) */
  M.cloud.scheduleSync = function () {
    if (!client || !user || suppress) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(function () { M.cloud.push(); }, 1200);
  };
})(window.MOA);
