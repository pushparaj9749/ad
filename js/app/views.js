/* =========================================================
   ad. studio — views: dashboard, projects, board, clients,
   settings, auth
   ========================================================= */
(function () {
  "use strict";

  var A = window.AdStudio;
  var Store = A.Store;
  var Auth = A.Auth;

  var STATUSES = {
    idea: "Idea",
    "in-production": "In production",
    "in-review": "In review",
    live: "Live",
    "on-hold": "On hold",
    done: "Done",
  };
  var COLUMNS = [
    { id: "backlog", label: "Backlog" },
    { id: "ideas", label: "Ideas" },
    { id: "in-progress", label: "In production" },
    { id: "review", label: "In review" },
    { id: "done", label: "Done" },
  ];
  var TAGS = ["film", "brand", "social", "print", "motion", "cgi", "web", "ooh", "talent", "strategy"];
  var PALETTE = ["#d4ff2f", "#ff8a3d", "#9b7bff", "#5ad1ff", "#ff5e7a", "#7ee081", "#ffd84d"];

  function loadAll() {
    return Promise.all([
      Store.getAll("projects"), Store.getAll("clients"), Store.getAll("tasks"),
    ]).then(function (r) { return { projects: r[0], clients: r[1], tasks: r[2] }; });
  }
  function statusPill(status) {
    return '<span class="saas-pill saas-pill-' + A.esc(status) + '">' + A.esc(STATUSES[status] || status) + "</span>";
  }
  function colorDot(color) {
    return '<span class="saas-dot" style="background:' + A.esc(color || "#d4ff2f") + '"></span>';
  }
  function initials(name) {
    return String(name || "?").split(/\s+/).map(function (w) { return w.charAt(0); }).slice(0, 2).join("").toUpperCase();
  }
  function greeting() {
    var h = new Date().getHours();
    if (h < 5) return "NIGHT SHIFT";
    if (h < 12) return "MORNING";
    if (h < 17) return "AFTERNOON";
    return "EVENING";
  }

  function navItem(active, href, label, icon) {
    return '<a class="saas-nav-item' + (active ? " active" : "") + '" href="' + href + '">' +
      '<span class="saas-nav-ico">' + icon + "</span><span>" + label + "</span></a>";
  }

  function shell(active, title, content) {
    var modeChip = Store.mode === "cloud"
      ? '<span class="saas-mode-chip saas-mode-cloud"><i></i>CLOUD \u00b7 ' + (Auth.user ? A.esc(Auth.user.email || "signed in") : "signed out") + "</span>"
      : '<span class="saas-mode-chip saas-mode-local"><i></i>LOCAL \u00b7 ' + A.esc(Store.engineLabel().replace("Local \u00b7 ", "")) + "</span>";
    return '' +
    '<div class="saas-layout">' +
      '<aside class="saas-side">' +
        '<a class="saas-brand" href="#/app">ad<span>.</span><em>studio</em></a>' +
        '<nav class="saas-nav">' +
          navItem(active === "app", "#/app", "Dashboard", '<svg viewBox="0 0 24 24"><path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/></svg>') +
          navItem(active === "projects", "#/projects", "Projects", '<svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h12"/></svg>') +
          navItem(active === "board", "#/board", "Board", '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="5" height="7" rx="1"/></svg>') +
          navItem(active === "clients", "#/clients", "Clients", '<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.4"/><path d="M15.5 14.6c2.9.3 5.5 2.4 5.5 5.4"/></svg>') +
          navItem(active === "settings", "#/settings", "Settings", '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1"/></svg>') +
        '</nav>' +
        '<div class="saas-side-foot">' +
          modeChip +
          '<a class="saas-site-link" href="#/top">\u2190 back to the site</a>' +
        '</div>' +
      '</aside>' +
      '<div class="saas-main">' +
        '<header class="saas-topbar">' +
          '<nav class="saas-topnav">' +
            navItem(active === "app", "#/app", "Dash", "D") +
            navItem(active === "projects", "#/projects", "Projects", "P") +
            navItem(active === "board", "#/board", "Board", "B") +
            navItem(active === "clients", "#/clients", "Clients", "C") +
            navItem(active === "settings", "#/settings", "Settings", "S") +
          '</nav>' +
          '<a class="saas-toplogo" href="#/app">ad<span>.</span></a>' +
        '</header>' +
        '<div class="saas-view">' +
          '<div class="saas-view-head"><p class="saas-kicker">ad. studio / ' + A.esc(active) + '</p><h1 class="saas-title">' + title + '</h1></div>' +
          content +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* =========================================================
     DASHBOARD
     ========================================================= */
  function renderDashboard($view) {
    loadAll().then(function (data) {
      var active = data.projects.filter(function (p) { return p.status !== "done"; });
      var open = data.tasks.filter(function (t) { return t.column_id !== "done"; });
      var done = data.tasks.filter(function (t) { return t.column_id === "done"; });
      var pct = data.tasks.length ? Math.round((done.length / data.tasks.length) * 100) : 0;
      var nextUp = open.slice().sort(function (a, b) { return (a.pos || 0) - (b.pos || 0); }).slice(0, 6);
      var projById = {};
      data.projects.forEach(function (p) { projById[p.id] = p; });
      var recent = data.projects.slice().sort(function (a, b) { return (b.created_at || "") < (a.created_at || "") ? -1 : 1; }).slice(0, 4);

      var html =
        '<div class="saas-dash-grid">' +
          '<article class="saas-card saas-stat"><p class="saas-stat-label">Active projects</p><p class="saas-stat-value">' + active.length + '</p><p class="saas-stat-sub">' + data.projects.length + ' total on the books</p></article>' +
          '<article class="saas-card saas-stat"><p class="saas-stat-label">Tasks in flight</p><p class="saas-stat-value">' + open.length + '</p><p class="saas-stat-sub">' + done.length + ' shipped</p></article>' +
          '<article class="saas-card saas-stat"><p class="saas-stat-label">Ship rate</p><p class="saas-stat-value">' + pct + '<em>%</em></p><div class="saas-meter"><i style="width:' + pct + '%"></i></div></article>' +
          '<article class="saas-card saas-stat"><p class="saas-stat-label">Clients</p><p class="saas-stat-value">' + data.clients.length + '</p><p class="saas-stat-sub">0 boring briefs accepted</p></article>' +
        '</div>' +

        '<div class="saas-cols2">' +
          '<section class="saas-card">' +
            '<header class="saas-card-head"><h2>NEXT UP</h2><a class="saas-link" href="#/board">open board \u2192</a></header>' +
            (nextUp.length
              ? '<ul class="saas-tasklist">' + nextUp.map(function (t) {
                  var p = projById[t.project_id];
                  var tag = t.tag ? '<span class="saas-tag">' + A.esc(t.tag) + "</span>" : "";
                  return '<li><a class="saas-taskrow" href="#/board">' +
                    '<span class="saas-kb-proj" style="background:' + A.esc((p && p.color) || "#666") + '"></span>' +
                    '<span class="saas-task-t">' + A.esc(t.title) + "</span>" +
                    (p ? '<span class="saas-task-p">' + A.esc(p.name.split(" \u2014 ")[0]) + "</span>" : "") +
                    tag + "</a></li>";
                }).join("") + "</ul>"
              : '<p class="saas-empty">Nothing in flight. Add something to the board.</p>') +
          '</section>' +

          '<section class="saas-card">' +
            '<header class="saas-card-head"><h2>PIPELINE</h2><a class="saas-link" href="#/board">board \u2192</a></header>' +
            '<div class="saas-pipeline">' + COLUMNS.map(function (c) {
              var n = data.tasks.filter(function (t) { return t.column_id === c.id; }).length;
              var w = data.tasks.length ? Math.round((n / data.tasks.length) * 100) : 0;
              return '<div class="saas-pipe-row"><span class="saas-pipe-label">' + A.esc(c.label) + '</span>' +
                '<span class="saas-pipe-bar"><i style="width:' + w + '%"></i></span><span class="saas-pipe-n">' + n + "</span></div>";
            }).join("") + "</div>" +
          '</section>' +
        '</div>' +

        '<section class="saas-card">' +
          '<header class="saas-card-head"><h2>RECENT PROJECTS</h2><a class="saas-link" href="#/projects">all projects \u2192</a></header>' +
          '<div class="saas-proj-grid">' +
            (recent.length ? recent.map(function (p) {
              var n = data.tasks.filter(function (t) { return t.project_id === p.id; }).length;
              return '<a class="saas-proj-card" href="#/projects/' + A.esc(p.id) + '">' +
                '<span class="saas-proj-bar" style="background:' + A.esc(p.color || "#d4ff2f") + '"></span>' +
                '<h3>' + A.esc(p.name) + "</h3>" +
                '<p class="saas-proj-client">' + A.esc(p.client || "No client") + "</p>" +
                '<div class="saas-proj-meta">' + statusPill(p.status) + "<span>" + n + " tasks</span></div></a>";
            }).join("") : '<p class="saas-empty">No projects yet — create one.</p>') +
          '</div>' +
        '</section>' +

        '<div class="saas-quick">' +
          '<button class="saas-btn saas-btn-accent" data-act="new-project">+ New project</button>' +
          '<button class="saas-btn" data-act="new-client">+ New client</button>' +
          '<button class="saas-btn" data-act="new-task">+ Quick task</button>' +
        '</div>';

      $view.innerHTML = shell("app", greeting().toUpperCase() + ", OPERATOR.", html);

      $view.querySelector('[data-act="new-project"]').addEventListener("click", function () {
        A.navigate("projects/new");
      });
      $view.querySelector('[data-act="new-client"]').addEventListener("click", function () {
        clientForm();
      });
      $view.querySelector('[data-act="new-task"]').addEventListener("click", function () {
        taskForm(null, data.projects);
      });
    });
  }

  /* =========================================================
     PROJECTS LIST
     ========================================================= */
  function renderProjects($view, params) {
    loadAll().then(function (data) {
      var filter = params && params.filter ? params.filter : "";
      var q = "";
      var rows = data.projects.slice();
      var statuses = ["", "idea", "in-production", "in-review", "live", "on-hold", "done"];
      var chips = statuses.map(function (s) {
        return '<button class="saas-chip' + (s === filter ? " active" : "") + '" data-filter="' + s + '">' +
          (s ? A.esc(STATUSES[s]) : "All") + " <i>" + (s ? data.projects.filter(function (p) { return p.status === s; }).length : data.projects.length) + "</i></button>";
      }).join("");

      var html =
        '<div class="saas-toolbar">' +
          '<div class="saas-chips">' + chips + "</div>" +
          '<div class="saas-search">' +
            '<input id="saas-q" type="search" placeholder="Search projects\u2026" value="' + A.esc(q) + '" />' +
            '<button class="saas-btn saas-btn-accent" data-act="new-project">+ New project</button>' +
          '</div>' +
        '</div>' +
        '<div class="saas-proj-list" id="saas-proj-list"></div>';

      $view.innerHTML = shell("projects", "PROJECTS.", html);

      function paint() {
        var listEl = $view.querySelector("#saas-proj-list");
        var needle = ($view.querySelector("#saas-q").value || "").toLowerCase();
        var visible = data.projects.filter(function (p) {
          if (filter && p.status !== filter) return false;
          if (needle && (p.name + " " + (p.client || "")).toLowerCase().indexOf(needle) === -1) return false;
          return true;
        });
        if (!visible.length) {
          listEl.innerHTML = '<p class="saas-empty">No projects match. Add one.</p>';
          return;
        }
        listEl.innerHTML = visible.map(function (p) {
          var n = data.tasks.filter(function (t) { return t.project_id === p.id; }).length;
          var dIs = p.due_date ? (new Date(p.due_date) < new Date() ? " over" : "") : "";
          return '<a class="saas-row saas-row-proj" href="#/projects/' + A.esc(p.id) + '">' +
            '<span class="saas-row-idx">' + A.esc(String(visible.indexOf(p) + 1).padStart(2, "0")) + "</span>" +
            colorDot(p.color) +
            '<span class="saas-row-main"><strong>' + A.esc(p.name) + "</strong><em>" + A.esc(p.client || "No client") + "</em></span>" +
            '<span class="saas-row-cell">' + statusPill(p.status) + "</span>" +
            '<span class="saas-row-cell saas-row-tasks">' + n + " tasks</span>" +
            '<span class="saas-row-cell' + dIs + '">' + A.esc(p.due_date ? A.fmtDate(p.due_date) : "\u2014") + "</span>" +
            '<span class="saas-row-arrow">\u2192</span></a>';
        }).join("");
      }
      paint();

      $view.querySelector("#saas-q").addEventListener("input", paint);
      $view.querySelector("[data-act='new-project']").addEventListener("click", function () {
        A.navigate("projects/new");
      });
      $view.querySelector(".saas-chips").addEventListener("click", function (e) {
        var btn = e.target.closest("[data-filter]");
        if (!btn) return;
        A.navigate("projects" + (btn.dataset.filter ? "/filter/" + btn.dataset.filter : ""));
      });
    });
  }

  /* =========================================================
     PROJECT EDIT
     ========================================================= */
  function projectForm(id) {
    var $view = document.getElementById("saas-view");
    var isNew = id === "new";
    var load = isNew
      ? Promise.resolve({ projects: [], clients: [], tasks: [] })
      : loadAll();
    load.then(function (data) {
      var p = isNew
        ? { id: A.uid(), name: "", slug: "", client: "", status: "idea", brief: "", due_date: "", color: PALETTE[0], pos: data.projects.length }
        : data.projects.filter(function (x) { return x.id === id; })[0];
      if (!p) { A.toast("Project not found.", "err"); A.navigate("projects"); return; }

      var clientNames = data.clients.map(function (c) { return c.company || c.name; });
      var clientOptions = ['<option value="">No client</option>'].concat(clientNames.map(function (n) {
        return '<option value="' + A.esc(n) + '"' + (p.client === n ? " selected" : "") + ">" + A.esc(n) + "</option>";
      })).join("");
      var statusOptions = Object.keys(STATUSES).map(function (s) {
        return '<option value="' + s + '"' + (p.status === s ? " selected" : "") + ">" + A.esc(STATUSES[s]) + "</option>";
      }).join("");
      var swatches = PALETTE.map(function (c) {
        return '<button type="button" class="saas-swatch' + (p.color === c ? " active" : "") + '" data-color="' + c + '" style="background:' + c + '" aria-label="' + c + '"></button>';
      }).join("");

      var html =
        '<a class="saas-back" href="#/projects">\u2190 all projects</a>' +
        '<div class="saas-editform">' +
          '<label class="saas-field saas-field-big"><span>Project name</span>' +
            '<input data-f="name" type="text" value="' + A.esc(p.name) + '" placeholder="e.g. NIMBUS \u2014 Flight Mode" /></label>' +
          '<div class="saas-fieldrow">' +
            '<label class="saas-field"><span>Client</span><select data-f="client">' + clientOptions + "</select></label>" +
            '<label class="saas-field"><span>Status</span><select data-f="status">' + statusOptions + "</select></label>" +
            '<label class="saas-field"><span>Due date</span><input data-f="due_date" type="date" value="' + A.esc(p.due_date) + '" /></label>' +
            '<label class="saas-field"><span>Accent</span><span class="saas-swatches">' + swatches + "</span></label>" +
          '</div>' +
          '<label class="saas-field"><span>Brief</span><textarea data-f="brief" rows="5" placeholder="What are we making, and why does it have to be loud?">' + A.esc(p.brief) + "</textarea></label>" +
          '<label class="saas-field"><span>Slug (optional)</span><input data-f="slug" type="text" value="' + A.esc(p.slug) + '" placeholder="kova-charge-the-night" /></label>' +
          '<div class="saas-form-actions">' +
            '<button class="saas-btn saas-btn-accent" data-act="save">' + (isNew ? "Create project" : "Save changes") + "</button>" +
            (isNew ? '<button class="saas-btn" data-act="cancel">Cancel</button>' : '<button class="saas-btn saas-btn-danger" data-act="delete">Delete project</button>') +
          '</div>' +
        '</div>' +
        (isNew ? "" :
          '<section class="saas-card saas-card-tasks"><header class="saas-card-head"><h2>TASKS \u00b7 ' + A.esc(String(data.tasks.filter(function (t) { return t.project_id === p.id; }).length).padStart(2, "0")) + '</h2><button class="saas-btn saas-btn-small" data-act="add-task">+ Task</button></header>' +
          '<div data-tasks></div></section>');

      $view.innerHTML = shell("projects", isNew ? "NEW PROJECT." : "PROJECT \u00b7 " + A.esc((p.name || "untitled").toUpperCase()), html);

      function paintTasks() {
        var wrap = $view.querySelector("[data-tasks]");
        if (!wrap) return;
        var mine = data.tasks.filter(function (t) { return t.project_id === p.id; })
          .sort(function (a, b) { return (a.pos || 0) - (b.pos || 0); });
        wrap.innerHTML = mine.length ? mine.map(function (t) {
          return '<div class="saas-taskrow" data-id="' + A.esc(t.id) + '">' +
            '<span class="saas-kb-proj" style="background:' + A.esc(t.column_id === "done" ? "#d4ff2f" : "#555") + '"></span>' +
            '<span class="saas-task-t' + (t.column_id === "done" ? " done" : "") + '">' + A.esc(t.title) + "</span>" +
            '<span class="saas-pill saas-pill-' + A.esc(t.column_id) + '">' + A.esc((COLUMNS.filter(function (c) { return c.id === t.column_id; })[0] || {}).label || t.column_id) + "</span>" +
            '<button class="saas-iconbtn" data-act="del-task" title="Delete">\u00d7</button></div>';
        }).join("") : '<p class="saas-empty">No tasks on this project yet.</p>';
      }
      paintTasks();
      var tasksWrap = $view.querySelector("[data-tasks]");
      if (tasksWrap) tasksWrap.addEventListener("click", function (e) {
        var btn = e.target.closest("[data-act='del-task']");
        if (!btn) return;
        var tid = btn.closest("[data-id]").dataset.id;
        A.confirmDialog("Delete task?", "This task will be removed from the board.").then(function (ok) {
          if (!ok) return;
          Store.remove("tasks", tid).then(function () {
            data.tasks = data.tasks.filter(function (t) { return t.id !== tid; });
            paintTasks();
            A.toast("Task deleted", "ok");
          });
        });
      });
      if (!isNew) {
        $view.querySelector("[data-act='add-task']").addEventListener("click", function () {
          taskForm(null, data.projects, [], data.tasks, p.id);
        });
      }

      var saveBtn = $view.querySelector("[data-act='save']");
      saveBtn.addEventListener("click", function () {
        var name = $view.querySelector('[data-f="name"]').value.trim();
        if (!name) { A.toast("Project needs a name.", "err"); return; }
        var row = {
          id: p.id, name: name,
          slug: $view.querySelector('[data-f="slug"]').value.trim() || slugify(name),
          client: $view.querySelector('[data-f="client"]').value,
          status: $view.querySelector('[data-f="status"]').value,
          due_date: $view.querySelector('[data-f="due_date"]').value,
          color: p.color,
          brief: $view.querySelector('[data-f="brief"]').value.trim(),
          pos: p.pos || 0,
          created_at: p.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        Store.put("projects", row).then(function () {
          A.toast(isNew ? "Project created" : "Project saved", "ok");
          A.navigate("projects/" + row.id);
        }).catch(function (err) { A.toast("Save failed: " + err.message, "err"); });
      });

      var cancelBtn = $view.querySelector("[data-act='cancel']");
      if (cancelBtn) cancelBtn.addEventListener("click", function () { A.navigate("projects"); });

      var delBtn = $view.querySelector("[data-act='delete']");
      if (delBtn) delBtn.addEventListener("click", function () {
        A.confirmDialog("Delete project?", "All its tasks go with it. This cannot be undone.").then(function (ok) {
          if (!ok) return;
          Promise.all([
            Store.remove("projects", p.id),
            Promise.all(data.tasks.filter(function (t) { return t.project_id === p.id; })
              .map(function (t) { return Store.remove("tasks", t.id); })),
          ]).then(function () {
            A.toast("Project deleted", "ok");
            A.navigate("projects");
          });
        });
      });

      $view.querySelector(".saas-swatches").addEventListener("click", function (e) {
        var b = e.target.closest("[data-color]");
        if (!b) return;
        p.color = b.dataset.color;
        A.$$(".saas-swatch", $view).forEach(function (s) { s.classList.toggle("active", s.dataset.color === p.color); });
      });
    });
  }

  function slugify(s) {
    return String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  }

  /* =========================================================
     BOARD (kanban)
     ========================================================= */
  function renderBoard($view, params) {
    loadAll().then(function (data) {
      var projFilter = params && params.project ? params.project : "";
      var list = projFilter ? data.tasks.filter(function (t) { return t.project_id === projFilter; }) : data.tasks;
      var projOptions = ['<option value="">All projects</option>'].concat(data.projects.map(function (p) {
        return '<option value="' + A.esc(p.id) + '"' + (p.id === projFilter ? " selected" : "") + ">" + A.esc(p.name) + "</option>";
      })).join("");

      var html =
        '<div class="saas-toolbar">' +
          '<div class="saas-search saas-search-wide"><select id="kb-project">' + projOptions + "</select></div>" +
          '<button class="saas-btn saas-btn-accent" data-act="add-task">+ Task</button>' +
        '</div>' +
        '<div class="saas-kb" id="saas-kb">' + COLUMNS.map(function (c) {
          return '<section class="saas-kb-col" data-col="' + c.id + '">' +
            '<header class="saas-kb-head"><h3>' + A.esc(c.label) + "</h3><span class=\"saas-kb-count\" data-count=\"" + c.id + "\">0</span></header>" +
            '<div class="saas-kb-cards" data-cards="' + c.id + '"></div>' +
            '<button class="saas-kb-add" data-add="' + c.id + '">+ add</button>' +
          "</section>";
        }).join("") + "</div>";

      $view.innerHTML = shell("board", "BOARD.", html);

      var projById = {};
      data.projects.forEach(function (p) { projById[p.id] = p; });

      function paint() {
        var cards = {};
        list.forEach(function (t) {
          (cards[t.column_id] = cards[t.column_id] || []).push(t);
        });
        COLUMNS.forEach(function (c) {
          var colEl = $view.querySelector('[data-cards="' + c.id + '"]');
          var mine = (cards[c.id] || []).slice().sort(function (a, b) { return (a.pos || 0) - (b.pos || 0); });
          $view.querySelector('[data-count="' + c.id + '"]').textContent = mine.length;
          colEl.innerHTML = mine.length ? mine.map(function (t) {
            var p = projById[t.project_id];
            return '<article class="saas-kb-card" draggable="true" data-id="' + A.esc(t.id) + '">' +
              (p ? '<span class="saas-kb-proj" style="background:' + A.esc(p.color || "#666") + '" title="' + A.esc(p.name) + '"></span>' : "") +
              '<p class="saas-kb-title">' + A.esc(t.title) + "</p>" +
              '<div class="saas-kb-foot">' +
                (p ? '<span class="saas-kb-project">' + A.esc(p.name.split(" \u2014 ")[0]) + "</span>" : "") +
                (t.tag ? '<span class="saas-tag">' + A.esc(t.tag) + "</span>" : "") +
              "</div></article>";
          }).join("") : '<p class="saas-kb-empty">empty</p>';
        });
      }
      paint();

      var kb = $view.querySelector("#saas-kb");
      var dragId = null;

      kb.addEventListener("dragstart", function (e) {
        var card = e.target.closest(".saas-kb-card");
        if (!card) return;
        dragId = card.dataset.id;
        e.dataTransfer.effectAllowed = "move";
        card.classList.add("dragging");
      });
      kb.addEventListener("dragend", function (e) {
        var card = e.target.closest(".saas-kb-card");
        if (card) card.classList.remove("dragging");
        A.$$(".saas-kb-col", kb).forEach(function (c) { c.classList.remove("over"); });
        dragId = null;
      });
      kb.addEventListener("dragover", function (e) {
        var colEl = e.target.closest(".saas-kb-col");
        if (!colEl || !dragId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        colEl.classList.add("over");
        var card = e.target.closest(".saas-kb-card");
        var cardsEl = colEl.querySelector("[data-cards]");
        if (card && card.dataset.id !== dragId && colEl.contains(card)) {
          var rect = card.getBoundingClientRect();
          if (e.clientY < rect.top + rect.height / 2) cardsEl.insertBefore(card, card);
          else cardsEl.insertBefore(card, card.nextSibling);
        }
      });
      kb.addEventListener("drop", function (e) {
        var colEl = e.target.closest(".saas-kb-col");
        if (!colEl || !dragId) return;
        e.preventDefault();
        var col = colEl.dataset.col;
        var task = list.filter(function (t) { return t.id === dragId; })[0];
        if (!task) return;
        var order = A.$$(".saas-kb-card", colEl.querySelector("[data-cards]")).map(function (n) { return n.dataset.id; });
        task.column_id = col;
        task.pos = order.indexOf(task.id);
        task.updated_at = new Date().toISOString();
        Store.put("tasks", task).then(function () {
          A.toast("Moved to " + (COLUMNS.filter(function (c) { return c.id === col; })[0] || {}).label, "ok");
        }).catch(function (err) {
          A.toast("Move failed: " + err.message, "err");
          paint();
        });
        paint();
      });

      kb.addEventListener("click", function (e) {
        var card = e.target.closest(".saas-kb-card");
        if (card) {
          taskForm(card.dataset.id, data.projects, null, data.tasks);
          return;
        }
        var add = e.target.closest("[data-add]");
        if (add) taskForm(null, data.projects, null, data.tasks, "", add.dataset.add);
      });

      $view.querySelector("#kb-project").addEventListener("change", function (e) {
        A.navigate("board" + (e.target.value ? "/project/" + e.target.value : ""));
      });
      $view.querySelector("[data-act='add-task']").addEventListener("click", function () {
        taskForm(null, data.projects, null, data.tasks);
      });
    });
  }

  /* =========================================================
     CLIENTS
     ========================================================= */
  function renderClients($view) {
    loadAll().then(function (data) {
      var html =
        '<div class="saas-toolbar saas-toolbar-end"><button class="saas-btn saas-btn-accent" data-act="new-client">+ New client</button></div>' +
        '<div class="saas-client-grid">' +
        (data.clients.length ? data.clients.map(function (c) {
          return '<article class="saas-client" style="--c:' + A.esc(c.color || "#d4ff2f") + '">' +
            '<header><span class="saas-avatar">' + A.esc(initials(c.name)) + "</span>" +
            '<div><h3>' + A.esc(c.name) + "</h3><p>" + A.esc(c.company || "Independent") + "</p></div>" +
            '<button class="saas-iconbtn" data-edit="' + A.esc(c.id) + '" title="Edit">\u270e</button></header>' +
            '<ul class="saas-client-meta">' +
              (c.email ? "<li>@ " + A.esc(c.email) + "</li>" : "") +
              (c.phone ? "<li>\u260e " + A.esc(c.phone) + "</li>" : "") +
              "<li>since " + A.esc(A.fmtDate(c.created_at)) + "</li>" +
            "</ul>" +
            (c.notes ? "<p class=\"saas-client-notes\">\u201c" + A.esc(c.notes) + "\u201d</p>" : "") +
            '<footer><span class="saas-proj-count">' + data.projects.filter(function (p) { return p.client === (c.company || c.name); }).length + " project(s)</span>" +
            '<button class="saas-btn saas-btn-danger saas-btn-ghost" data-del="' + A.esc(c.id) + '">Delete</button></footer>' +
          "</article>";
        }).join("") : '<p class="saas-empty">No clients yet. Add your first one.</p>') +
        "</div>";

      $view.innerHTML = shell("clients", "CLIENTS.", html);

      $view.querySelector("[data-act='new-client']").addEventListener("click", function () { clientForm(); });
      $view.querySelector(".saas-client-grid").addEventListener("click", function (e) {
        var edit = e.target.closest("[data-edit]");
        if (edit) { clientForm(edit.dataset.edit); return; }
        var del = e.target.closest("[data-del]");
        if (del) {
          A.confirmDialog("Delete client?", "They will be removed from your client list.").then(function (ok) {
            if (!ok) return;
            Store.remove("clients", del.dataset.del).then(function () {
              A.toast("Client deleted", "ok");
              renderClients($view);
            });
          });
        }
      });
    });
  }

  function clientForm(id) {
    var isNew = !id;
    var load = isNew ? Promise.resolve({ clients: [] }) : loadAll();
    load.then(function (data) {
      var c = isNew ? { id: A.uid(), name: "", company: "", email: "", phone: "", color: PALETTE[Math.floor(Math.random() * PALETTE.length)], notes: "" }
                    : data.clients.filter(function (x) { return x.id === id; })[0];
      if (!c) { A.toast("Client not found.", "err"); return; }
      var swatches = PALETTE.map(function (col) {
        return '<button type="button" class="saas-swatch' + (c.color === col ? " active" : "") + '" data-color="' + col + '" style="background:' + col + '"></button>';
      }).join("");
      var box = A.openModal(
        '<div class="saas-editform">' +
          '<div class="saas-fieldrow">' +
            '<label class="saas-field"><span>Name</span><input data-f="name" type="text" value="' + A.esc(c.name) + '" placeholder="Mira Sen" /></label>' +
            '<label class="saas-field"><span>Company</span><input data-f="company" type="text" value="' + A.esc(c.company) + '" placeholder="VOLT inc." /></label>' +
          '</div>' +
          '<div class="saas-fieldrow">' +
            '<label class="saas-field"><span>Email</span><input data-f="email" type="email" value="' + A.esc(c.email) + '" placeholder="mira@volt.example" /></label>' +
            '<label class="saas-field"><span>Phone</span><input data-f="phone" type="tel" value="' + A.esc(c.phone) + '" placeholder="+91 \u2026" /></label>' +
          '</div>' +
          '<label class="saas-field"><span>Accent</span><span class="saas-swatches">' + swatches + "</span></label>" +
          '<label class="saas-field"><span>Notes</span><textarea data-f="notes" rows="3" placeholder="How to talk to them, what they hate, what they love.">' + A.esc(c.notes) + "</textarea></label>" +
          '<div class="saas-form-actions"><button class="saas-btn saas-btn-accent" data-act="save">' + (isNew ? "Add client" : "Save") + "</button>" +
          '<button class="saas-btn" data-act="cancel">Cancel</button></div>' +
        "</div>",
        { title: isNew ? "New client" : "Edit client" }
      );

      box.querySelector("[data-act='cancel']").addEventListener("click", A.closeModal);
      box.querySelector(".saas-swatches").addEventListener("click", function (e) {
        var b = e.target.closest("[data-color]");
        if (!b) return;
        c.color = b.dataset.color;
        A.$$(".saas-swatch", box).forEach(function (s) { s.classList.toggle("active", s.dataset.color === c.color); });
      });
      box.querySelector("[data-act='save']").addEventListener("click", function () {
        var name = box.querySelector('[data-f="name"]').value.trim();
        if (!name) { A.toast("Client needs a name.", "err"); return; }
        var row = {
          id: c.id, name: name,
          company: box.querySelector('[data-f="company"]').value.trim(),
          email: box.querySelector('[data-f="email"]').value.trim(),
          phone: box.querySelector('[data-f="phone"]').value.trim(),
          color: c.color,
          notes: box.querySelector('[data-f="notes"]').value.trim(),
          created_at: c.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        Store.put("clients", row).then(function () {
          A.closeModal();
          A.toast(isNew ? "Client added" : "Client saved", "ok");
          A.runRouter();
        }).catch(function (err) { A.toast("Save failed: " + err.message, "err"); });
      });
    });
  }

  /* =========================================================
     TASK MODAL
     ========================================================= */
  function taskForm(taskId, projects, _ignored, allTasks, preselectProject, preselectCol) {
    var isNew = !taskId;
    var load = isNew ? Promise.resolve({ tasks: [] }) : loadAll();
    load.then(function (data) {
      var task = isNew
        ? { id: A.uid(), title: "", project_id: preselectProject || "", column_id: preselectCol || "backlog", pos: 0, tag: "" }
        : data.tasks.filter(function (t) { return t.id === taskId; })[0];
      if (!task) { A.toast("Task not found.", "err"); return; }
      var projOptions = ['<option value="">No project</option>'].concat(projects.map(function (p) {
        return '<option value="' + A.esc(p.id) + '"' + (task.project_id === p.id ? " selected" : "") + ">" + A.esc(p.name) + "</option>";
      })).join("");
      var colOptions = COLUMNS.map(function (c) {
        return '<option value="' + c.id + '"' + (task.column_id === c.id ? " selected" : "") + ">" + A.esc(c.label) + "</option>";
      }).join("");
      var tagOptions = ['<option value="">No tag</option>'].concat(TAGS.map(function (t) {
        return '<option value="' + t + '"' + (task.tag === t ? " selected" : "") + ">" + t + "</option>";
      })).join("");

      var box = A.openModal(
        '<div class="saas-editform">' +
          '<label class="saas-field"><span>Task</span><input data-f="title" type="text" value="' + A.esc(task.title) + '" placeholder="Grade the launch film" /></label>' +
          '<div class="saas-fieldrow">' +
            '<label class="saas-field"><span>Project</span><select data-f="project_id">' + projOptions + "</select></label>" +
            '<label class="saas-field"><span>Column</span><select data-f="column_id">' + colOptions + "</select></label>" +
          '</div>' +
          '<label class="saas-field"><span>Tag</span><select data-f="tag">' + tagOptions + "</select></label>" +
          '<div class="saas-form-actions">' +
            '<button class="saas-btn saas-btn-accent" data-act="save">' + (isNew ? "Add task" : "Save task") + "</button>" +
            '<button class="saas-btn" data-act="cancel">Cancel</button>' +
            (isNew ? "" : '<button class="saas-btn saas-btn-danger" data-act="del">Delete</button>') +
          "</div></div>",
        { title: isNew ? "New task" : "Edit task" }
      );

      box.querySelector("[data-act='cancel']").addEventListener("click", A.closeModal);
      box.querySelector("[data-act='save']").addEventListener("click", function () {
        var title = box.querySelector('[data-f="title"]').value.trim();
        if (!title) { A.toast("Task needs a title.", "err"); return; }
        var row = {
          id: task.id, title: title,
          project_id: box.querySelector('[data-f="project_id"]').value,
          column_id: box.querySelector('[data-f="column_id"]').value,
          tag: box.querySelector('[data-f="tag"]').value,
          pos: task.pos || 0,
          created_at: task.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        Store.put("tasks", row).then(function () {
          A.closeModal();
          A.toast(isNew ? "Task added" : "Task saved", "ok");
          A.runRouter();
        }).catch(function (err) { A.toast("Save failed: " + err.message, "err"); });
      });
      var del = box.querySelector("[data-act='del']");
      if (del) del.addEventListener("click", function () {
        A.confirmDialog("Delete task?", "It will leave the board.").then(function (ok) {
          if (!ok) return;
          Store.remove("tasks", task.id).then(function () {
            A.closeModal();
            A.toast("Task deleted", "ok");
            A.runRouter();
          });
        });
      });
    });
  }

  /* =========================================================
     SETTINGS
     ========================================================= */
  function renderSettings($view) {
    var creds = A.Cloud.storedCredentials() || (window.ADSTUDIO_CONFIG || {});
    var hasCreds = !!(creds.supabaseUrl && creds.supabaseAnonKey);
    var connected = Store.mode === "cloud" && A.Cloud.isConfigured();

    var html =
      '<div class="saas-settings-grid">' +

        '<section class="saas-card saas-card-settings">' +
          '<header class="saas-card-head"><h2>DATA MODE</h2><span class="saas-badge">' + (Store.mode === "cloud" ? "CLOUD" : "LOCAL") + "</span></header>" +
          '<p class="saas-settings-p">Where your studio data lives. Switch any time.</p>' +
          '<div class="saas-mode-cards">' +
            '<button class="saas-mode-card' + (Store.mode === "local" ? " active" : "") + '" data-mode="local">' +
              '<strong>Simple \u00b7 Local</strong><p>IndexedDB + localStorage. Works offline, zero setup, private to this browser.</p></button>' +
            '<button class="saas-mode-card' + (Store.mode === "cloud" ? " active" : "") + '" data-mode="cloud">' +
              '<strong>Multi-user SaaS \u00b7 Supabase Free</strong><p>Email auth, Postgres with RLS, per-user data, realtime sync. Free tier.</p></button>' +
          '</div>' +
          '<p class="saas-engine">Engine: <b>' + A.esc(Store.engineLabel()) + "</b></p>" +
        '</section>' +

        '<section class="saas-card saas-card-settings">' +
          '<header class="saas-card-head"><h2>SUPABASE CLOUD</h2><span class="saas-badge' + (hasCreds ? " saas-badge-ok" : "") + '">' + (hasCreds ? "CONFIGURED" : "NOT SET UP") + "</span></header>" +
          (hasCreds
            ? '<div class="saas-creds">' +
                '<p class="saas-engine">Project: <b>' + A.esc(creds.supabaseUrl || creds.url || (window.ADSTUDIO_CONFIG || {}).supabaseUrl || "") + "</b></p>" +
                (connected && Auth.user
                  ? '<div class="saas-account"><span class="saas-avatar">' + A.esc(initials(Auth.user.email || Auth.user.id || "U")) + '</span>' +
                    '<div><strong>' + A.esc(Auth.user.email || "Signed in") + "</strong>" +
                    "<p>" + A.esc((Auth.user.user_metadata && Auth.user.user_metadata.full_name) || "No display name") + "</p></div>" +
                    '<button class="saas-btn saas-btn-ghost" data-act="signout">Sign out</button></div>'
                  : (Store.mode === "cloud"
                      ? '<p class="saas-empty">You are not signed in. Use the auth screen to sign in.</p>'
                      : '<p class="saas-empty">Credentials saved. Switch to Cloud mode and sign in.</p>')) +
                '<div class="saas-form-actions"><button class="saas-btn" data-act="edit-creds">Edit credentials</button>' +
                '<button class="saas-btn saas-btn-danger saas-btn-ghost" data-act="clear-creds">Forget credentials</button></div>' +
              '</div>'
            : '<div class="saas-empty saas-setup">' +
                '<h3>Set up in 3 steps</h3>' +
                '<ol><li>Create a free project at <b>supabase.com</b></li>' +
                '<li>Run <code>supabase/schema.sql</code> in the SQL Editor</li>' +
                '<li>Paste your Project URL + anon key below</li></ol>' +
                '<button class="saas-btn saas-btn-accent" data-act="edit-creds">Connect cloud</button>' +
              '</div>') +
        '</section>' +

        '<section class="saas-card saas-card-settings">' +
          '<header class="saas-card-head"><h2>YOUR DATA</h2></header>' +
          '<div class="saas-setting-rows">' +
            '<div class="saas-setting-row"><div><strong>Export everything</strong><p>Download projects, clients and tasks as JSON.</p></div>' +
            '<button class="saas-btn" data-act="export">Export</button></div>' +
            '<div class="saas-setting-row"><div><strong>Reset local data</strong><p>Wipe this browser\u2019s local data and reseed the demo.</p></div>' +
            '<button class="saas-btn saas-btn-danger saas-btn-ghost" data-act="reset">Reset</button></div>' +
          '</div>' +
        '</section>' +

        '<section class="saas-card saas-card-settings">' +
          '<header class="saas-card-head"><h2>ABOUT</h2></header>' +
          '<p class="saas-settings-p">ad. studio \u2014 the operations side of the concept studio. Runs 100% client-side with IndexedDB, or as a multi-user SaaS on Supabase\u2019s free tier. Schema lives in <code>supabase/schema.sql</code>. Credentials can be configured in <code>js/app/config.js</code> or pasted in-app.</p>' +
        '</section>' +
      '</div>';

    $view.innerHTML = shell("settings", "SETTINGS.", html);

    $view.querySelector(".saas-mode-cards").addEventListener("click", function (e) {
      var card = e.target.closest("[data-mode]");
      if (!card) return;
      var mode = card.dataset.mode;
      if (mode === Store.mode) return;
      if (mode === "cloud" && !hasCreds) {
        editCreds($view);
        return;
      }
      Store.setMode(mode);
      A.toast(mode === "cloud" ? "Switched to cloud mode \u2014 signing in\u2026" : "Switched to local mode", "ok");
      window.location.reload();
    });
    $view.querySelector("[data-act='edit-creds']").addEventListener("click", function () { editCreds($view); });
    var clearCredsBtn = $view.querySelector("[data-act='clear-creds']");
    if (clearCredsBtn) clearCredsBtn.addEventListener("click", function () {
      A.confirmDialog("Forget cloud credentials?", "The app will drop back to local mode.").then(function (ok) {
        if (!ok) return;
        A.Cloud.clearCredentials();
        Store.setMode("local");
        window.location.reload();
      });
    });
    var signOut = $view.querySelector("[data-act='signout']");
    if (signOut) signOut.addEventListener("click", function () {
      Auth.signOut().then(function () {
        A.toast("Signed out", "ok");
        A.runRouter();
      });
    });
    $view.querySelector("[data-act='export']").addEventListener("click", function () {
      Store.exportAll().then(function () { A.toast("Export downloaded", "ok"); });
    });
    $view.querySelector("[data-act='reset']").addEventListener("click", function () {
      A.confirmDialog("Reset local data?", "All local projects, clients and tasks will be wiped and reseeded with the demo set.").then(function (ok) {
        if (!ok) return;
        Store.resetLocal().then(function () {
          A.toast("Local data reseeded", "ok");
          A.runRouter();
        });
      });
    });
  }

  function editCreds($view) {
    var creds = A.Cloud.storedCredentials() || (window.ADSTUDIO_CONFIG || {});
    var box = A.openModal(
      '<div class="saas-editform">' +
        '<label class="saas-field"><span>Project URL</span><input data-f="url" type="url" value="' + A.esc(creds.supabaseUrl || creds.url || "") + '" placeholder="https://abcdefgh.supabase.co" /></label>' +
        '<label class="saas-field"><span>Anon / public key</span><textarea data-f="key" rows="4" placeholder="eyJhbGciOiJIUzI1NiIs\u2026">' + A.esc(creds.supabaseAnonKey || creds.anonKey || "") + "</textarea></label>" +
        '<p class="saas-hint">Keys are stored only in this browser (localStorage). Never expose the service_role key.</p>' +
        '<div class="saas-form-actions">' +
          '<button class="saas-btn saas-btn-accent" data-act="connect">Connect &amp; test</button>' +
          '<button class="saas-btn" data-act="cancel">Cancel</button>' +
        "</div></div>",
      { title: "Connect Supabase", size: "md" }
    );
    box.querySelector("[data-act='cancel']").addEventListener("click", A.closeModal);
    box.querySelector("[data-act='connect']").addEventListener("click", function () {
      var url = box.querySelector('[data-f="url"]').value.trim().replace(/\/+$/, "");
      var key = box.querySelector('[data-f="key"]').value.trim();
      if (!url || !key) { A.toast("Both URL and anon key are required.", "err"); return; }
      var btn = box.querySelector("[data-act='connect']");
      btn.disabled = true;
      btn.textContent = "Testing\u2026";
      try {
        A.Cloud.create(url, key);
      } catch (err) {
        btn.disabled = false;
        btn.textContent = "Connect & test";
        A.toast(err.message, "err");
        return;
      }
      A.Cloud.test().then(function () {
        A.Cloud.saveCredentials(url, key);
        A.closeModal();
        A.toast("Supabase connected \u2014 switching to cloud mode", "ok");
        Store.setMode("cloud");
        window.location.reload();
      }).catch(function (err) {
        btn.disabled = false;
        btn.textContent = "Connect & test";
        A.toast("Connection failed: " + err.message + " \u2014 did you run schema.sql?", "err");
      });
    });
  }

  /* =========================================================
     AUTH
     ========================================================= */
  function renderAuth($view) {
    var html =
      '<div class="saas-auth">' +
        '<div class="saas-auth-brand">' +
          '<p class="saas-kicker">ad. studio / multi-user cloud</p>' +
          '<h1>THE SAME<br /><em>WORKSPACE,</em><br />ON EVERY MACHINE.</h1>' +
          '<ul class="saas-auth-points"><li>Email auth on Supabase Free</li><li>Per-user Postgres with RLS</li><li>Realtime sync across browsers</li><li>Same UI as local mode</li></ul>' +
        '</div>' +
        '<div class="saas-auth-panel">' +
          '<div class="saas-auth-tabs"><button class="active" data-tab="in">SIGN IN</button><button data-tab="up">CREATE ACCOUNT</button></div>' +
          '<form class="saas-auth-form" data-form="in">' +
            '<label class="saas-field"><span>Email</span><input data-a="email" type="email" required autocomplete="email" /></label>' +
            '<label class="saas-field"><span>Password</span><input data-a="password" type="password" required minlength="6" autocomplete="current-password" /></label>' +
            '<button class="saas-btn saas-btn-accent saas-btn-block" type="submit">Sign in</button>' +
            '<button class="saas-btn saas-btn-ghost saas-btn-block" type="button" data-act="magic">Send magic link instead</button>' +
            '<p class="saas-hint">Prefer local? <a href="#/settings">Switch to Local mode</a>.</p>' +
          '</form>' +
          '<form class="saas-auth-form" data-form="up" hidden>' +
            '<label class="saas-field"><span>Display name (optional)</span><input data-a="name" type="text" autocomplete="name" /></label>' +
            '<label class="saas-field"><span>Email</span><input data-a="email" type="email" required autocomplete="email" /></label>' +
            '<label class="saas-field"><span>Password</span><input data-a="password" type="password" required minlength="6" autocomplete="new-password" /></label>' +
            '<button class="saas-btn saas-btn-accent saas-btn-block" type="submit">Create account</button>' +
            '<p class="saas-hint">If email confirmation is on, check your inbox \u2014 then sign in.</p>' +
          '</form>' +
        '</div>' +
      '</div>';

    $view.innerHTML = '<div class="saas-standalone">' + html + "</div>";

    $view.querySelector(".saas-auth-tabs").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-tab]");
      if (!btn) return;
      A.$$(".saas-auth-tabs button", $view).forEach(function (b) { b.classList.toggle("active", b === btn); });
      $view.querySelector('[data-form="in"]').hidden = btn.dataset.tab !== "in";
      $view.querySelector('[data-form="up"]').hidden = btn.dataset.tab !== "up";
    });

    $view.querySelector('[data-form="in"]').addEventListener("submit", function (e) {
      e.preventDefault();
      var email = $view.querySelector('[data-form="in"] [data-a="email"]').value.trim();
      var pass = $view.querySelector('[data-form="in"] [data-a="password"]').value;
      Auth.signIn(email, pass).catch(function (err) {
        A.toast("Sign in failed: " + (err.message || err), "err");
      });
    });
    $view.querySelector('[data-form="up"]').addEventListener("submit", function (e) {
      e.preventDefault();
      var email = $view.querySelector('[data-form="up"] [data-a="email"]').value.trim();
      var pass = $view.querySelector('[data-form="up"] [data-a="password"]').value;
      var name = $view.querySelector('[data-form="up"] [data-a="name"]').value.trim();
      Auth.signUp(email, pass, name).then(function (res) {
        if (res.session) { A.toast("Account created \u2014 welcome", "ok"); }
        else { A.toast("Check your email to confirm, then sign in.", "ok"); }
      }).catch(function (err) {
        A.toast("Sign up failed: " + (err.message || err), "err");
      });
    });
    $view.querySelector("[data-act='magic']").addEventListener("click", function () {
      var email = $view.querySelector('[data-form="in"] [data-a="email"]').value.trim();
      if (!email) { A.toast("Enter your email first.", "err"); return; }
      Auth.magic(email).then(function () {
        A.toast("Magic link sent \u2014 check your inbox.", "ok");
      }).catch(function (err) {
        A.toast("Magic link failed: " + (err.message || err), "err");
      });
    });
  }

  window.AdStudio.Views = {
    dashboard: renderDashboard,
    projects: renderProjects,
    projectForm: projectForm,
    board: renderBoard,
    clients: renderClients,
    settings: renderSettings,
    auth: renderAuth,
    statuses: STATUSES,
    columns: COLUMNS,
    palette: PALETTE,
  };
})();
