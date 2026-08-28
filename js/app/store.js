/* =========================================================
   ad. studio — store: local/cloud switch, seed, auth
   ========================================================= */
(function () {
  "use strict";

  var A = window.AdStudio;
  var MODE_KEY = "adstudio.mode.v1";
  var SEED_KEY = "adstudio.seeded.v1";

  function todayPlus(d) {
    return new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
  }
  function ago(s) {
    return new Date(Date.now() + s * 86400000).toISOString();
  }

  var Store = {
    mode: "local",
    ready: false,
    initing: null,

    init: function () {
      if (Store.initing) return Store.initing;
      Store.initing = (function () {
        try {
          var stored = window.localStorage.getItem(MODE_KEY);
          if (stored !== "cloud" && stored !== "local") window.localStorage.setItem(MODE_KEY, "local");
          Store.mode = stored === "cloud" ? "cloud" : "local";
        } catch (e) {}
        if (Store.mode === "cloud") {
          var creds = A.Cloud.storedCredentials() || (window.ADSTUDIO_CONFIG || {});
          var cUrl = creds && (creds.supabaseUrl || creds.url || "");
          var cKey = creds && (creds.supabaseAnonKey || creds.anonKey || "");
          if (cUrl && cKey) {
            try { A.Cloud.create(cUrl, cKey); } catch (e) {
              A.toast("Cloud config invalid: " + e.message, "err");
              Store.setMode("local");
            }
          } else {
            A.toast("No cloud credentials found \u2014 switched to Local mode.", "warn");
            Store.setMode("local");
          }
        }
        if (Store.mode === "local") {
          return A.Db.init().then(function () { return Store.seedIfEmpty(); });
        }
        return Promise.resolve(true);
      })().then(function () {
        Store.ready = true;
        if (Store.mode === "cloud") {
          return A.Cloud.sessionUser().then(function (u) {
            A.Cloud.setUser(u);
            Store.user = u;
            return u;
          });
        }
        Store.user = null;
        return null;
      });
      return Store.initing;
    },

    setMode: function (mode) {
      Store.mode = mode;
      try { window.localStorage.setItem(MODE_KEY, mode); } catch (e) {}
    },

    getAll: function (collection) {
      if (Store.mode === "cloud") return A.Cloud.getAll(collection);
      return A.Db.getAll(collection);
    },
    put: function (collection, row) {
      if (Store.mode === "cloud") {
        var u = Store.user || Auth.user || null;
        row.user_id = u ? u.id : null;
        return A.Cloud.put(collection, row);
      }
      return A.Db.put(collection, row);
    },
    remove: function (collection, id) {
      if (Store.mode === "cloud") return A.Cloud.remove(collection, id);
      return A.Db.remove(collection, id);
    },
    engineLabel: function () {
      if (Store.mode === "cloud") return "Supabase (multi-user)";
      return "Local \u00b7 " + A.Db.engineName();
    },

    subscribe: function (cb) {
      if (Store.mode === "cloud" && A.Cloud.isConfigured()) {
        return A.Cloud.subscribe(["projects", "clients", "tasks"], cb);
      }
      return function () {};
    },

    seedIfEmpty: function () {
      var seeded = false;
      try { seeded = window.localStorage.getItem(SEED_KEY) === "1"; } catch (e) {}
      if (seeded) return Promise.resolve(false);
      return Promise.all([
        A.Db.getAll("projects"), A.Db.getAll("clients"), A.Db.getAll("tasks"),
      ]).then(function (res) {
        var empty = res[0].length === 0 && res[1].length === 0 && res[2].length === 0;
        if (!empty) return false;
        var now = ago(0);
        var projects = [
          { id: A.uid(), name: "VOLT \u2014 Run Louder", slug: "volt-run-louder", client: "VOLT inc.", status: "in-production", brief: "Global sneaker drop. Hero film, OOH takeover, social engine. Copy: \u201cRun Louder.\u201d", due_date: todayPlus(12), color: "#d4ff2f", pos: 0, created_at: now, updated_at: now },
          { id: A.uid(), name: "BR\u00dcM \u2014 Black by Default", slug: "brum-black-by-default", client: "BR\u00dcM Coffee", status: "in-review", brief: "Cold brew launch. Identity refresh, packaging system, launch film.", due_date: todayPlus(21), color: "#ff8a3d", pos: 1, created_at: now, updated_at: now },
          { id: A.uid(), name: "SOLSTICE \u2014 48 Hours of Loud", slug: "solstice-48-hours", client: "SOLSTICE Fest", status: "live", brief: "Festival identity \u2014 motion system, wayfinding, stage visuals.", due_date: todayPlus(34), color: "#9b7bff", pos: 2, created_at: now, updated_at: now },
          { id: A.uid(), name: "KOVA \u2014 Charge the Night", slug: "kova-charge-the-night", client: "KOVA Motors", status: "idea", brief: "Electric coupe reveal. CGI film, teaser drops, launch site.", due_date: todayPlus(60), color: "#5ad1ff", pos: 3, created_at: now, updated_at: now },
          { id: A.uid(), name: "OKRA \u2014 Proof of Chaos", slug: "okra-proof-of-chaos", client: "OKRA Foods", status: "in-production", brief: "Gen-Z snack drop. Social-first campaign with creator collabs.", due_date: todayPlus(9), color: "#ff5e7a", pos: 4, created_at: now, updated_at: now },
        ];
        var clients = [
          { id: A.uid(), name: "Mira Sen", company: "VOLT inc.", email: "mira@volt.example", phone: "+91 90000 00001", color: "#d4ff2f", notes: "Wants loud. Hates safe. Always right about the heel tab.", created_at: now, updated_at: now },
          { id: A.uid(), name: "Arjun Rao", company: "BR\u00dcM Coffee", email: "arjun@brum.example", phone: "+91 90000 00002", color: "#ff8a3d", notes: "Ops person. Likes decisions in writing, coffee black.", created_at: now, updated_at: now },
          { id: A.uid(), name: "Tara Iyer", company: "SOLSTICE Fest", email: "tara@solstice.example", phone: "+91 90000 00003", color: "#9b7bff", notes: "Line-up power user. Answers at 2am, usefully.", created_at: now, updated_at: now },
          { id: A.uid(), name: "Dev Bhattacharya", company: "KOVA Motors", email: "dev@kova.example", phone: "+91 90000 00004", color: "#5ad1ff", notes: "Engineer soul. Asks for the render farm spec.", created_at: now, updated_at: now },
        ];
        var tasks = [
          { id: A.uid(), project_id: projects[0].id, title: "Cast the hero film", column_id: "in-progress", pos: 0, tag: "film", created_at: now, updated_at: now },
          { id: A.uid(), project_id: projects[0].id, title: "OOH \u2014 city domination plan", column_id: "backlog", pos: 0, tag: "ooh", created_at: now, updated_at: now },
          { id: A.uid(), project_id: projects[0].id, title: "Social cutdowns \u00d7 12", column_id: "ideas", pos: 0, tag: "social", created_at: now, updated_at: now },
          { id: A.uid(), project_id: projects[1].id, title: "Packaging die-lines v3", column_id: "review", pos: 0, tag: "print", created_at: now, updated_at: now },
          { id: A.uid(), project_id: projects[1].id, title: "Launch film grade pass", column_id: "in-progress", pos: 1, tag: "film", created_at: now, updated_at: now },
          { id: A.uid(), project_id: projects[1].id, title: "Taste-test video day", column_id: "done", pos: 0, tag: "social", created_at: now, updated_at: now },
          { id: A.uid(), project_id: projects[2].id, title: "Stage visuals \u2014 motion system", column_id: "in-progress", pos: 0, tag: "motion", created_at: now, updated_at: now },
          { id: A.uid(), project_id: projects[2].id, title: "Wayfinding signage", column_id: "backlog", pos: 1, tag: "print", created_at: now, updated_at: now },
          { id: A.uid(), project_id: projects[2].id, title: "Line-up announcement kit", column_id: "done", pos: 0, tag: "social", created_at: now, updated_at: now },
          { id: A.uid(), project_id: projects[3].id, title: "CGI teaser \u2014 6s loop", column_id: "ideas", pos: 1, tag: "cgi", created_at: now, updated_at: now },
          { id: A.uid(), project_id: projects[3].id, title: "Launch site sitemap", column_id: "backlog", pos: 2, tag: "web", created_at: now, updated_at: now },
          { id: A.uid(), project_id: projects[4].id, title: "Creator shortlist", column_id: "in-progress", pos: 0, tag: "talent", created_at: now, updated_at: now },
          { id: A.uid(), project_id: projects[4].id, title: "Drop calendar Q4", column_id: "ideas", pos: 2, tag: "strategy", created_at: now, updated_at: now },
        ];
        return Promise.all([
          Promise.all(projects.map(function (r) { return A.Db.put("projects", r); })),
          Promise.all(clients.map(function (r) { return A.Db.put("clients", r); })),
          Promise.all(tasks.map(function (r) { return A.Db.put("tasks", r); })),
        ]).then(function () {
          try { window.localStorage.setItem(SEED_KEY, "1"); } catch (e) {}
          return true;
        });
      });
    },

    exportAll: function () {
      return Promise.all([Store.getAll("projects"), Store.getAll("clients"), Store.getAll("tasks")]).then(function (res) {
        var payload = { exported_at: new Date().toISOString(), mode: Store.mode, projects: res[0], clients: res[1], tasks: res[2] };
        var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "ad-studio-export.json";
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
      });
    },

    resetLocal: function () {
      Store.setMode("local");
      try { window.localStorage.removeItem(SEED_KEY); } catch (e) {}
      return A.Db.init().then(function () {
        var cols = ["projects", "clients", "tasks"];
        return Promise.all(cols.map(function (c) {
          return A.Db.getAll(c).then(function (rows) {
            return Promise.all(rows.map(function (r) { return A.Db.remove(c, r.id); }));
          });
        }));
      }).then(function () {
        try { window.localStorage.removeItem(SEED_KEY); } catch (e) {}
        return Store.seedIfEmpty();
      });
    },
  };

  var Auth = {
    state: "idle",
    user: null,
    check: function () {
      return A.Cloud.sessionUser().then(function (u) {
        A.Cloud.setUser(u);
        Auth.user = u;
        Auth.state = u ? "signed-in" : "signed-out";
        return u;
      });
    },
    signUp: function (email, password, name) {
      return A.Cloud.signUp(email, password, name).then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
    },
    signIn: function (email, password) {
      return A.Cloud.signIn(email, password).then(function (res) {
        if (res.error) throw res.error;
        Auth.user = res.data.user;
        Store.user = Auth.user;
        A.Cloud.setUser(Auth.user);
        Auth.state = "signed-in";
        return res.data;
      });
    },
    magic: function (email) {
      return A.Cloud.signInMagic(email).then(function (res) {
        if (res.error) throw res.error;
        return res.data;
      });
    },
    signOut: function () {
      return A.Cloud.signOut().then(function () {
        Auth.user = null;
        A.Cloud.setUser(null);
        Auth.state = "signed-out";
      });
    },
  };

      A.Cloud.onAuthStateChange(function (event, user) {
    if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") {
      Auth.user = user;
      Store.user = user;
      A.Cloud.setUser(user);
      Auth.state = user ? "signed-in" : "signed-out";
      if (user) {
        A.toast("Signed in \u2014 cloud data synced", "ok");
        A.runRouter();
      }
    } else if (event === "SIGNED_OUT") {
      Auth.user = null;
      Store.user = null;
      A.Cloud.setUser(null);
      Auth.state = "signed-out";
      A.runRouter();
    }
  });

  window.AdStudio.Store = Store;
  window.AdStudio.Auth = Auth;
})();
