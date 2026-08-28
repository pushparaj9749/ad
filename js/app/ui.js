/* =========================================================
   ad. studio — UI helpers: dom, toast, modal, router
   ========================================================= */
(function () {
  "use strict";

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null) return;
      if (k === "class") node.className = v;
      else if (k === "html") node.innerHTML = v;
      else if (k === "dataset") Object.keys(v).forEach(function (d) { node.dataset[d] = v[d]; });
      else if (k.indexOf("on") === 0) node.addEventListener(k.slice(2), v);
      else if (k === "style") node.setAttribute("style", v);
      else node.setAttribute(k, v);
    });
    (children || []).forEach(function (c) {
      if (c == null) return;
      node.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return node;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
  }

  function fmtDate(iso) {
    if (!iso) return "\u2014";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }

  function relDate(iso) {
    if (!iso) return "\u2014";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    var days = Math.ceil((d - Date.now()) / 86400000);
    if (days < 0) return Math.abs(days) === 1 ? "1 day late" : Math.abs(days) + " days late";
    if (days === 0) return "today";
    if (days === 1) return "tomorrow";
    return "in " + days + " days";
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  /* ---------- toast ---------- */
  var toastWrap = null;
  function toast(msg, type) {
    if (!toastWrap) {
      toastWrap = el("div", { class: "saas-toasts", "aria-live": "polite" });
      document.body.appendChild(toastWrap);
    }
    var t = el("div", { class: "saas-toast saas-toast-" + (type || "ok"), role: "status" }, [
      el("span", { class: "saas-toast-dot" }),
      el("span", {}, [msg]),
    ]);
    toastWrap.appendChild(t);
    requestAnimationFrame(function () { t.classList.add("show"); });
    setTimeout(function () {
      t.classList.remove("show");
      setTimeout(function () { t.remove(); }, 400);
    }, 3400);
  }

  /* ---------- modal ---------- */
  var modalRoot = null;
  function openModal(html, opts) {
    closeModal();
    opts = opts || {};
    modalRoot = el("div", { class: "saas-modal-backdrop", "data-lenis-prevent": "", onclick: function (e) {
      if (e.target === modalRoot && opts.dismissible !== false) closeModal();
    } });
    var box = el("div", { class: "saas-modal" + (opts.size ? " saas-modal-" + opts.size : ""), role: "dialog", "aria-modal": "true" });
    box.appendChild(el("button", {
      class: "saas-modal-x", "aria-label": "Close", onclick: closeModal, html: "\u00d7",
    }));
    if (opts.title) box.appendChild(el("header", { class: "saas-modal-head" }, [
      el("h3", { class: "saas-modal-title" }, [opts.title]),
    ]));
    box.appendChild(el("div", { class: "saas-modal-body", html: html }));
    modalRoot.appendChild(box);
    document.body.appendChild(modalRoot);
    requestAnimationFrame(function () { modalRoot.classList.add("open"); });
    var first = box.querySelector("input, textarea, select, button");
    if (first) setTimeout(function () { try { first.focus(); } catch (e) {} }, 60);
    return box;
  }
  function closeModal() {
    if (!modalRoot) return;
    var root = modalRoot;
    modalRoot = null;
    root.classList.remove("open");
    setTimeout(function () { root.remove(); }, 220);
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });

  function confirmDialog(title, message, okLabel) {
    return new Promise(function (resolve) {
      var box = openModal(
        "<p class=\"saas-confirm-msg\">" + esc(message) + "</p>" +
        "<div class=\"saas-modal-actions\">" +
        "<button class=\"saas-btn saas-btn-ghost\" data-act=\"cancel\">Cancel</button>" +
        "<button class=\"saas-btn saas-btn-danger\" data-act=\"ok\">" + esc(okLabel || "Delete") + "</button>" +
        "</div>",
        { title: title, dismissible: true }
      );
      box.querySelector('[data-act="cancel"]').addEventListener("click", function () { closeModal(); resolve(false); });
      box.querySelector('[data-act="ok"]').addEventListener("click", function () { closeModal(); resolve(true); });
    });
  }

  /* ---------- router ---------- */
  var routes = {};
  var current = null;
  function route(pattern, handler) { routes[pattern] = handler; }
  function parseHash() {
    var h = window.location.hash || "";
    // "#/" belongs to the app; anything else (#work, #contact, empty) is the marketing site
    return h.indexOf("#/") === 0 ? h.slice(2) : "";
  }
  function matchRoute(hash) {
    var parts = hash.split("/");
    var keys = [];
    for (var pattern in routes) {
      var p = pattern.split("/");
      if (p.length !== parts.length) continue;
      var ok = true;
      var params = {};
      for (var i = 0; i < p.length; i++) {
        if (p[i].charAt(0) === ":") { params[p[i].slice(1)] = decodeURIComponent(parts[i]); }
        else if (p[i] !== parts[i]) { ok = false; break; }
      }
      if (ok) return { pattern: pattern, params: params };
    }
    return null;
  }
  function navigate(h) { window.location.hash = "#/" + h; }
  function run() {
    var hash = parseHash();
    var m = matchRoute(hash);
    if (!m) {
      if (window.AdStudio.onUnknownRoute) { window.AdStudio.onUnknownRoute(hash); return; }
      return;
    }
    var handler = m ? routes[m.pattern] : routes["app"];
    current = m ? m.params : {};
    handler(current);
  }
  window.addEventListener("hashchange", run);

  window.AdStudio = window.AdStudio || {};
  window.AdStudio.$ = $;
  window.AdStudio.$$ = $$;
  window.AdStudio.el = el;
  window.AdStudio.esc = esc;
  window.AdStudio.uid = uid;
  window.AdStudio.fmtDate = fmtDate;
  window.AdStudio.relDate = relDate;
  window.AdStudio.todayISO = todayISO;
  window.AdStudio.toast = toast;
  window.AdStudio.openModal = openModal;
  window.AdStudio.closeModal = closeModal;
  window.AdStudio.confirmDialog = confirmDialog;
  window.AdStudio.route = route;
  window.AdStudio.navigate = navigate;
  window.AdStudio.runRouter = run;
  window.AdStudio.routeParams = function () { return current; };
})();
