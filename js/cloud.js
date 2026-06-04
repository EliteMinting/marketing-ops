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

  /* ---------- teams & messaging (manager ⇄ workers) ---------- */
  var msgChannel = null;
  function defaultName() { return (user && user.email ? String(user.email).split('@')[0] : 'مستخدم'); }

  /* returns {team_id,name,join_code,role,owner_id} or null */
  M.cloud.getMyTeam = function () {
    if (!client || !user) return Promise.resolve(null);
    return client.from('team_members').select('role, teams(id,name,join_code,owner_id)').eq('user_id', user.id).maybeSingle()
      .then(function (res) {
        if (res.error || !res.data || !res.data.teams) return null;
        var t = res.data.teams;
        return { team_id: t.id, name: t.name, join_code: t.join_code, owner_id: t.owner_id, role: res.data.role, isManager: res.data.role === 'manager' };
      }).catch(function () { return null; });
  };
  M.cloud.createTeam = function (name) {
    return client.rpc('create_team', { p_name: name || 'فريق التسويق', p_display: defaultName() });
  };
  M.cloud.joinTeam = function (code, display) {
    return client.rpc('join_team', { p_code: String(code || '').trim().toUpperCase(), p_display: display || defaultName() });
  };
  M.cloud.listMembers = function (teamId) {
    return client.from('team_members').select('user_id, display_name, role').eq('team_id', teamId)
      .then(function (res) { return (res.data) || []; });
  };
  M.cloud.listMessages = function (teamId) {
    return client.from('messages').select('id, sender_id, recipient_id, body, created_at').eq('team_id', teamId)
      .order('created_at', { ascending: true }).limit(300)
      .then(function (res) { return (res.data) || []; });
  };
  M.cloud.countUnread = function (teamId, sinceISO) {
    if (!client || !user) return Promise.resolve(0);
    return client.from('messages').select('id', { count: 'exact', head: true })
      .eq('team_id', teamId).gt('created_at', sinceISO).neq('sender_id', user.id)
      .then(function (res) { return res.count || 0; }).catch(function () { return 0; });
  };
  M.cloud.sendMessage = function (teamId, recipientId, body) {
    return client.from('messages').insert({ team_id: teamId, sender_id: user.id, recipient_id: recipientId || null, body: body });
  };
  /* one realtime channel per team; two assignable handler slots:
     onIncoming (background, for unread badge) and onView (live messages view) */
  M.cloud.onIncoming = null;
  M.cloud.onView = null;
  M.cloud.msgTeam = null;
  M.cloud.startMessages = function (teamId) {
    if (!client || !teamId || M.cloud.msgTeam === teamId) return;
    M.cloud.stopMessages();
    M.cloud.msgTeam = teamId;
    msgChannel = client.channel('msgs-' + teamId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: 'team_id=eq.' + teamId },
        function (p) {
          if (typeof M.cloud.onIncoming === 'function') { try { M.cloud.onIncoming(p.new); } catch (e) {} }
          if (typeof M.cloud.onView === 'function') { try { M.cloud.onView(p.new); } catch (e) {} }
        })
      .subscribe();
  };
  M.cloud.stopMessages = function () {
    if (msgChannel && client) { try { client.removeChannel(msgChannel); } catch (e) {} }
    msgChannel = null; M.cloud.msgTeam = null;
  };
})(window.MOA);

