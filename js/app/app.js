/* =========================================================
   ad. studio — bootstrap: app/site switch, routes, auth gate
   ========================================================= */
(function () {
  "use strict";

  var A = window.AdStudio;

  function isCloud() { return A.Store.mode === "cloud"; }
  function signedIn() { return !!A.Auth.user; }

  function enterApp() {
    var html = document.documentElement;
    if (!html.classList.contains("app-mode")) {
      html.classList.add("app-mode");
      window.scrollTo(0, 0);
      if (window.__adLenis) {
        try { window.__adLenis.scrollTo(0, { immediate: true }); } catch (e) {}
      }
      if (window.ScrollTrigger) {
        requestAnimationFrame(function () { ScrollTrigger.refresh(); });
      }
    }
  }
  function exitApp() {
    var html = document.documentElement;
    if (html.classList.contains("app-mode")) {
      html.classList.remove("app-mode");
      if (window.ScrollTrigger) {
        requestAnimationFrame(function () { ScrollTrigger.refresh(); });
      }
      if (window.__adLenis) {
        try { window.__adLenis.scrollTo(0, { immediate: true }); } catch (e) {}
      }
      window.scrollTo(0, 0);
    }
  }

  function viewEl() { return document.getElementById("saas-view"); }
  function render(fn, params) {
    enterApp();
    fn(viewEl(), params || {});
  }
  function gate(fn, params) {
    if (isCloud() && !signedIn()) {
      enterApp();
      A.Views.auth(viewEl());
      return;
    }
    render(fn, params);
  }

  /* ---------- routes ---------- */
  A.route("app", function () { gate(function (v) { A.Views.dashboard(v); }); });

  A.route("projects", function () { gate(function (v) { A.Views.projects(v); }); });
  A.route("projects/new", function () { gate(function () { A.Views.projectForm("new"); }); });
  A.route("projects/:id", function (p) { gate(function () { A.Views.projectForm(p.id); }); });
  A.route("projects/filter/:filter", function (p) { gate(function (v) { A.Views.projects(v, { filter: p.filter }); }); });

  A.route("board", function () { gate(function (v) { A.Views.board(v); }); });
  A.route("board/project/:project", function (p) { gate(function (v) { A.Views.board(v, { project: p.project }); }); });

  A.route("clients", function () { gate(function (v) { A.Views.clients(v); }); });
  A.route("settings", function () { render(function (v) { A.Views.settings(v); }); });
  A.route("top", function () { exitApp(); });

  /* unknown hash (e.g. marketing #work / #contact) — leave the app */
  A.onUnknownRoute = function (hash) {
    exitApp();
    var target = hash ? document.getElementById(hash) : null;
    if (target && window.__adLenis) {
      try { window.__adLenis.scrollTo(target, { immediate: true }); } catch (e) {}
    } else if (window.__adLenis) {
      try { window.__adLenis.scrollTo(0, { immediate: true }); } catch (e) {}
    }
  };

  /* ---------- realtime (cloud) ---------- */
  function subscribe() {
    if (Store_subscribed) return;
    Store_subscribed = true;
    A.Store.subscribe(function () {
      if (!document.documentElement.classList.contains("app-mode")) return;
      if (document.querySelector(".saas-modal-backdrop")) return;
      A.toast("Cloud update received \u2014 view refreshed", "warn");
      A.runRouter();
    });
  }
  var Store_subscribed = false;

  /* ---------- boot ---------- */
  function boot() {
    A.Store.init()
      .then(function () {
        if (A.Store.mode === "cloud") return A.Auth.check();
        return null;
      })
      .then(function () {
        A.Auth.state = A.Auth.user ? "signed-in" : "signed-out";
        A.runRouter();
        subscribe();
        var loader = document.getElementById("saas-loading");
        if (loader) loader.remove();
      })
      .catch(function (err) {
        console.error("[ad.studio] boot failed", err);
        A.toast("Startup error: " + (err && err.message ? err.message : err), "err");
        if (A.Store.mode === "cloud") {
          A.Store.setMode("local");
          window.location.reload();
        }
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
