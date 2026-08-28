/* =========================================================
   ad. studio — CLOUD data layer (Multi-user SaaS · Supabase)
   Auth (email magic link / password), Postgres tables with
   Row Level Security, Realtime broadcast.
   Cloud credentials can also be pasted in-app (stored in
   localStorage) so the build can be configured without edits.
   ========================================================= */
(function () {
  "use strict";

  var NS = "adstudio";
  var CRED_KEY = NS + ".supabase.credentials.v1";

  var client = null;
  var url = "";
  var anonKey = "";
  var pendingAuthListener = null;
  var authSub = null;

  function storedCredentials() {
    try {
      var raw = window.localStorage.getItem(CRED_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }
  function saveCredentials(u, k) {
    try {
      window.localStorage.setItem(CRED_KEY, JSON.stringify({ url: u, anonKey: k }));
      return true;
    } catch (e) {
      return false;
    }
  }
  function clearCredentials() {
    try { window.localStorage.removeItem(CRED_KEY); } catch (e) {}
  }

  function create(u, k) {
    if (!u || !k) throw new Error("Supabase URL and anon key are required.");
    if (typeof window.supabase === "undefined" || !window.supabase.createClient) {
      throw new Error("supabase.js failed to load — refresh the page.");
    }
    client = window.supabase.createClient(u, k, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
      realtime: { params: { eventsPerSecond: 8 } },
    });
    url = u;
    anonKey = k;
    // re-wire the auth listener for this client (old subscriptions die with old clients)
    if (pendingAuthListener) {
      if (authSub && authSub.data && authSub.data.subscription) {
        try { authSub.data.subscription.unsubscribe(); } catch (e) {}
      }
      authSub = client.auth.onAuthStateChange(pendingAuthListener);
    }
    return client;
  }

  function test() {
    if (!client) return Promise.reject(new Error("Not connected."));
    return client.from("projects").select("id").limit(1).then(function (res) {
      if (res.error) throw res.error;
      return true;
    });
  }

  /* ---------- auth ---------- */
  function user() {
    return client && client.auth.getUser ? client.auth.getUser().then(function (r) { return r.data ? r.data.user : null; }).catch(function () { return null; }) : Promise.resolve(null);
  }
  function sessionUser() {
    return client && client.auth.getSession
      ? client.auth.getSession().then(function (r) { return r.data && r.data.session ? r.data.session.user : null; }).catch(function () { return null; })
      : Promise.resolve(null);
  }
  function onAuthStateChange(cb) {
    pendingAuthListener = function (event, session) {
      cb(event, session ? session.user : null);
    };
    if (client && client.auth.onAuthStateChange && !authSub) {
      authSub = client.auth.onAuthStateChange(pendingAuthListener);
    }
    return function () {
      pendingAuthListener = null;
      if (authSub && authSub.data && authSub.data.subscription) {
        try { authSub.data.subscription.unsubscribe(); } catch (e) {}
        authSub = null;
      }
    };
  }
  function signUp(email, password, name) {
    return client.auth.signUp({
      email: email,
      password: password,
      options: { data: { full_name: name || "" } },
    });
  }
  function signIn(email, password) {
    return client.auth.signInWithPassword({ email: email, password: password });
  }
  function signInMagic(email) {
    return client.auth.signInWithOtp({ email: email, options: { emailRedirectTo: window.location.origin + window.location.pathname } });
  }
  function signOut() {
    return client.auth.signOut();
  }

  /* ---------- tables ---------- */
  function getAll(table) {
    return client.from(table).select("*").order("created_at", { ascending: false }).then(function (res) {
      if (res.error) throw res.error;
      // RLS scopes to the signed-in user; also filter defensively
      return (res.data || []).filter(function (r) { return r.user_id === userCache.id; });
    });
  }
  var userCache = { id: null };

  function put(table, row) {
    return client.from(table).upsert(row).select().single().then(function (res) {
      if (res.error) throw res.error;
      return res.data;
    });
  }
  function remove(table, id) {
    return client.from(table).delete().eq("id", id).then(function (res) {
      if (res.error) throw res.error;
      return true;
    });
  }

  function subscribe(tables, onChange) {
    if (!client || !client.channel) return function () {};
    var names = tables.map(function (t) { return "public:" + t; });
    var ch = client.channel("adstudio-realtime-" + Math.random().toString(36).slice(2, 8));
    names.forEach(function (name) {
      ch.on("postgres_changes", { event: "*", schema: "public", table: name.split(":")[1] }, function (payload) {
        onChange(payload);
      });
    });
    ch.subscribe();
    return function () {
      try { client.removeChannel(ch); } catch (e) {}
    };
  }

  function setUser(u) { userCache.id = u ? u.id : null; }

  window.AdStudio = window.AdStudio || {};
  window.AdStudio.Cloud = {
    create: create,
    test: test,
    user: user,
    sessionUser: sessionUser,
    onAuthStateChange: onAuthStateChange,
    signUp: signUp,
    signIn: signIn,
    signInMagic: signInMagic,
    signOut: signOut,
    setUser: setUser,
    getAll: getAll,
    put: put,
    remove: remove,
    subscribe: subscribe,
    saveCredentials: saveCredentials,
    storedCredentials: storedCredentials,
    clearCredentials: clearCredentials,
    isConfigured: function () { return !!client; },
    url: function () { return url; },
  };
})();
