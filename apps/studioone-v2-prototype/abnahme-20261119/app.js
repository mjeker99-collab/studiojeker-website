/* StudioONE V2, klickbare Vorschau. Beispieldaten, keine externe Aktion. */
(function () {
  const KEY = "studioone-v2-abnahme-1";
  const contacts = [
    { id: "c1", name: "Anna Beispiel", firm: "Beispiel Maschinen AG", role: "Marketing", email: "anna.beispiel@example.invalid", kind: "ok" },
    { id: "c2", name: "Lukas Muster", firm: "Muster Architektur GmbH", role: "Geschäftsleitung", email: "lukas.muster@example.invalid", kind: "ok" },
    { id: "c3", name: "Sara Beispiel", firm: "Beispiel Handel AG", role: "Inhaberin", email: "sara.beispiel@example.invalid", kind: "ok" },
    { id: "c4", name: "Tim Muster", firm: "Muster Beratung GmbH", role: "Partner", email: "tim.muster@example.invalid", kind: "ok" },
    { id: "c5", name: "Jan Muster", firm: "Muster Technik AG", role: "Verkauf", email: "jan.muster@example.invalid", kind: "contacted", when: "3. November 2026" },
    { id: "c6", name: "Mia Beispiel", firm: "Beispiel Dienstleistungen AG", role: "Administration", email: "", kind: "missing" },
    { id: "c7", name: "Anna Beispiel", firm: "Beispiel Maschinen AG", role: "Marketing", email: "anna.beispiel@example.invalid", kind: "duplicate", of: "c1" }
  ];
  const monthNames = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

  function fresh() {
    return {
      page: "home",
      back: [],
      task: "Ich möchte neue Kunden gewinnen.",
      persistent: true,
      storageProblem: "",
      storageBlocked: false,
      resume: {
        page: "content",
        content: "newsletter",
        step: "recipients",
        label: "Newsletter «Sichtbarkeit im Dezember»",
        detail: "Schritt Bearbeiten. Text, Bild und Link."
      },
      akquise: {
        step: "research",
        query: "Industriebetriebe in der Region Beispiel mit einer Ansprechperson fürs Marketing.",
        found: false,
        imported: false,
        selected: ["c1", "c2", "c3", "c4"],
        notice: "",
        briefing: {
          goal: "Ein kurzes Gespräch zur Sichtbarkeit vereinbaren.",
          offer: "Regelmässige Inhalte für Newsletter, Social Media und Website.",
          tone: "Persönlich, professionell, Schweizer Hochdeutsch"
        },
        drafts: {},
        focus: "c1",
        when: "2026-11-26T09:00",
        consent: false,
        confirmHash: "",
        results: null
      },
      newsletter: {
        issues: [
          { id: "nov", title: "Ausgabe November", locked: true, subject: "Sichtbarkeit im November", preheader: "Die vorige Beispielausgabe", body: "Guten Tag\n\nIm November bleibt das Thema Sichtbarkeit im Beispielunternehmen präsent.\n\nFreundliche Grüsse\nStudiojeker", imageId: "b1", links: [{ id: "n1", label: "Mehr erfahren", url: "beispiel.invalid/november" }] }
        ],
        current: {
          id: "dec",
          title: "Ausgabe Dezember",
          copiedFrom: "Ausgabe November",
          subject: "Sichtbarkeit im Dezember",
          preheader: "Ein Beispiel für die aktuelle Ausgabe",
          body: "Guten Tag\n\nIm Dezember bleibt Ihr Unternehmen mit einem klaren Thema präsent. Diese Ausgabe zeigt, wie ein Angebot über Newsletter, Social Media und Website zusammenpasst.\n\nFreundliche Grüsse\nStudiojeker",
          imageId: "b1",
          links: [
            { id: "l1", label: "Mehr erfahren", url: "" },
            { id: "l2", label: "Studiojeker ansehen", url: "beispiel.invalid/sichtbarkeit" }
          ]
        },
        pane: "edit",
        checkedHash: "",
        mailchimp: null,
        notice: ""
      },
      content: "menu",
      social: { channel: "LinkedIn", text: "Im Dezember zeigen wir an einem Beispiel, wie ein Angebot über mehrere Kanäle sichtbar bleibt.", connected: false, planned: false },
      website: { page: "Startseite", change: "Den Einstieg kürzer fassen und das Beispielangebot nennen.", applied: false },
      imageWork: { brief: "Ein ruhiges Motiv mit viel Fläche und einem klaren Satz.", imageId: "b1" },
      video: { title: "Sichtbarkeit in 30 Sekunden", scenes: "1. Das Angebot in einem Satz.\n2. Ein Beispiel aus dem Alltag.\n3. Einladung zum Gespräch." },
      graphic: { headline: "Sichtbar bleiben.", template: "Dunkel" },
      project: {
        customer: "Beispiel Maschinen AG",
        goal: "Regelmässig mit einem klaren Thema präsent sein.",
        concept: "Ein Thema, drei Kanäle: Newsletter, Social Media und Website.",
        campaign: "Sichtbarkeit Dezember"
      },
      library: {
        folders: [
          { id: "f1", name: "Beispiel Maschinen AG", parent: null },
          { id: "f2", name: "Sichtbarkeit Dezember", parent: "f1" }
        ],
        folderId: "f2",
        draftName: "",
        assets: [
          { id: "b1", name: "Bild 1", folder: "f2" },
          { id: "b2", name: "Bild 2", folder: "f2" },
          { id: "b3", name: "Bild 3", folder: "f2" },
          { id: "b4", name: "Bild 4", folder: "f1" }
        ],
        notice: ""
      },
      calendar: {
        external: "",
        items: [
          { id: "k1", when: "26. November, 09:00", title: "Persönliche Ansprache", status: "Entwurf", page: "akquise", step: "confirm" },
          { id: "k2", when: "2. Dezember, 08:00", title: "Newsletter Ausgabe Dezember", status: "Entwurf", page: "content", content: "newsletter" }
        ]
      },
      settings: { role: "Alltag und Freigabe", brand: "Studiojeker" }
    };
  }

  let state = fresh();

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }
  function hash(value) {
    let h = 2166136261;
    const text = String(value);
    for (let i = 0; i < text.length; i += 1) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }
  function contact(id) { return contacts.find((item) => item.id === id); }
  function eligible(item) { return item.kind === "ok"; }
  function selectedContacts() { return state.akquise.selected.map(contact).filter(Boolean); }
  function readyContacts() { return selectedContacts().filter((item) => item.email && item.kind !== "duplicate"); }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && parsed.schema === 1 && parsed.data) state = parsed.data;
    } catch {
      state.persistent = false;
      state.storageProblem = "Der bisherige Stand in diesem Browser konnte nicht gelesen werden. Er wird nicht überschrieben.";
    }
  }
  function storageText() {
    if (state.storageProblem) return state.storageProblem;
    if (state.persistent) return "In diesem Browser gemerkt · keine Cloud, kein Versand";
    return "Nicht gemerkt. Die Arbeit bleibt nur in diesem offenen Fenster.";
  }
  function save() {
    // Keep the exact working step and preview pane, including in-page changes.
    // Opening the overview must retain the previous task.
    if (state.page !== "home") markResume();
    const status = document.getElementById("storage-status");
    if (state.storageBlocked) {
      state.persistent = false;
      state.storageProblem = "Nicht gemerkt: der Browserspeicher ist in dieser Vorschau ausgesetzt. Die Arbeit bleibt in diesem Fenster. Unter Einstellungen kannst du das Merken wieder zulassen.";
    } else if (state.storageProblem.startsWith("Der bisherige Stand")) {
      state.persistent = false;
    } else {
      try {
        localStorage.setItem(KEY, JSON.stringify({ schema: 1, data: state }));
        state.persistent = true;
        state.storageProblem = "";
      } catch {
        state.persistent = false;
        state.storageProblem = "Nicht gemerkt: der Browserspeicher hat abgelehnt. Lass dieses Fenster offen und versuche es erneut.";
      }
    }
    if (status) {
      status.textContent = storageText();
      status.className = state.persistent ? "saved" : "alert";
    }
    return state.persistent;
  }

  function assign(path, value) {
    const parts = path.split(".");
    let cursor = state;
    for (let i = 0; i < parts.length - 1; i += 1) {
      if (cursor[parts[i]] == null) cursor[parts[i]] = {};
      cursor = cursor[parts[i]];
    }
    cursor[parts[parts.length - 1]] = value;
  }
  function read(path) {
    return path.split(".").reduce((cursor, part) => (cursor == null ? "" : cursor[part]), state);
  }

  function newsletterHash() {
    const item = state.newsletter.current;
    return hash([item.subject, item.preheader, item.body, item.imageId, item.links.map((link) => link.label + "=" + link.url).join("|")].join("\n"));
  }
  function draftHash(draft) { return hash((draft?.subject || "") + "\n" + (draft?.body || "")); }
  function confirmMaterial() {
    const rows = readyContacts().map((item) => {
      const draft = state.akquise.drafts[item.id] || {};
      return item.id + draftHash(draft);
    }).join("|");
    return hash(rows + "|" + state.akquise.when);
  }
  function invalidate(path) {
    if (path.startsWith("newsletter.")) {
      state.newsletter.checkedHash = "";
      state.newsletter.mailchimp = null;
    }
    if (path.startsWith("akquise.drafts.") || path === "akquise.when" || path === "akquise.selected") {
      state.akquise.confirmHash = "";
      state.akquise.consent = false;
      state.akquise.results = null;
    }
    const draftMatch = path.match(/^akquise\.drafts\.([^.]+)\./);
    if (draftMatch && state.akquise.drafts[draftMatch[1]]) state.akquise.drafts[draftMatch[1]].reviewedHash = "";
  }

  function markResume() {
    const map = {
      home: ["Übersicht", "Aufgabe oder offene Punkte"],
      akquise: ["Akquise", stepLabel(state.akquise.step)],
      content: ["Inhalte", contentLabel(state.content)],
      projects: ["Projekte", state.project.campaign],
      library: ["Bibliothek", folderName(state.library.folderId)],
      calendar: ["Kalender", "Planübersicht"],
      settings: ["Einstellungen", "Beispielkonto"]
    };
    const pair = map[state.page] || ["Übersicht", ""];
    state.resume = {
      page: state.page,
      content: state.content,
      step: state.akquise.step,
      pane: state.newsletter.pane,
      label: pair[0] + (pair[1] ? " · " + pair[1] : ""),
      detail: pair[1]
    };
  }
  function stepLabel(step) {
    return { research: "Recherche oder Import", recipients: "Empfänger wählen", briefing: "Gemeinsames Briefing", drafts: "Persönliche Entwürfe", confirm: "Auswahl und Zeitpunkt", results: "Einzelresultate" }[step] || step;
  }
  function contentLabel(kind) {
    return { menu: "Auswahl", newsletter: "Newsletter «" + state.newsletter.current.title + "»", social: "Social Media", website: "Website", image: "Bild", video: "Video", graphic: "Grafik", three: "3D" }[kind] || kind;
  }
  function folderName(id) {
    const folder = state.library.folders.find((item) => item.id === id);
    return folder ? folder.name : "Bibliothek";
  }
  function go(page, extra) {
    state.back.push({ page: state.page, content: state.content, step: state.akquise.step });
    state.page = page;
    if (extra) Object.assign(state, extra);
    if (page !== "home") markResume();
    save();
    render(true);
  }
  function back() {
    const prev = state.back.pop();
    if (!prev) state.page = "home";
    else {
      state.page = prev.page;
      state.content = prev.content;
      state.akquise.step = prev.step;
    }
    save();
    render(true);
  }
  function resume() {
    state.page = state.resume.page || "home";
    state.content = state.resume.content || state.content;
    state.akquise.step = state.resume.step || state.akquise.step;
    state.newsletter.pane = state.resume.pane || state.newsletter.pane;
    save();
    render(true);
  }

  function shell(crumb, inner) {
    const nav = [
      ["home", "Übersicht"],
      ["akquise", "Akquise"],
      ["content", "Inhalte"],
      ["projects", "Projekte"],
      ["library", "Bibliothek"],
      ["calendar", "Kalender"]
    ].map(([id, label]) => `<a href="#${id}" data-go="${id}" ${state.page === id ? 'aria-current="page"' : ""}>${label}</a>`).join("");
    return `<div class="app"><aside class="sidebar"><img class="logo" src="assets/studioone-app-logo.png" width="1280" height="593" alt="STUDIOONE – Dein Marketing. Ein Ort."><nav aria-label="Hauptbereiche">${nav}</nav><div class="sidebar-foot"><a href="#settings" data-go="settings" ${state.page === "settings" ? 'aria-current="page"' : ""}>Einstellungen</a><p class="account"><span class="avatar" aria-hidden="true">BK</span><span>Beispielkonto<br>Keine Anmeldung</span></p></div></aside><div class="main"><header class="top"><p class="crumb">Studiojeker <span>/ ${esc(crumb)}</span></p><p class="draft-flag">Vorschau · Beispieldaten · keine externe Aktion</p></header><main id="inhalt"><p id="storage-status" class="${state.persistent ? "saved" : "alert"}" role="status">${esc(storageText())}</p>${inner}</main></div></div>`;
  }
  function button(label, act, cls, extra) {
    return `<button type="button" class="button ${cls || "secondary"}" data-act="${act}" ${extra || ""}>${label}</button>`;
  }
  function field(label, id, path, value, area) {
    const control = area
      ? `<textarea id="${id}" data-bind="${path}" rows="${area}">${esc(value)}</textarea>`
      : `<input id="${id}" type="text" data-bind="${path}" value="${esc(value)}">`;
    return `<label class="field" for="${id}">${label}${control}</label>`;
  }

  function home() {
    const missing = contacts.filter((item) => item.kind === "missing").length;
    const link = state.newsletter.current.links.find((item) => !item.url.trim());
    return shell("Übersicht", `
      <div class="stack">
        <section class="continue" aria-labelledby="weiter-titel">
          <div>
            <p class="kicker">Zuletzt bearbeitet</p>
            <h1 id="weiter-titel">${esc(state.resume.label)}</h1>
            <p class="note">${esc(state.resume.detail || "Am letzten Schritt weiterarbeiten.")}</p>
          </div>
          ${button("An dieser Stelle weiter", "resume", "primary")}
        </section>
        <section class="panel">
          <h2>Oder eine neue Aufgabe beginnen</h2>
          <p class="note">Solange eine Arbeit offen ist, bleibt Fortsetzen die hervorgehobene Aktion.</p>
          ${field("Deine Aufgabe", "aufgabe", "task", state.task)}
          <div class="actions">${button("Aufgabe beginnen", "start-task", "secondary")}</div>
          <div class="chips">
            <a href="#akquise" data-act="quick-akquise">Neue Kunden gewinnen</a>
            <a href="#newsletter" data-act="quick-newsletter">Newsletter erstellen</a>
            <a href="#social" data-act="quick-social">Social-Media-Beitrag</a>
          </div>
        </section>
        <section>
          <h2>Offene Punkte</h2>
          <ul class="points">
            <li><h3>${missing} Beispielkontakt ohne E-Mail</h3><p>Mia Beispiel kann in der Auswahl bleiben oder aus dieser Sendung gelassen werden. Die vollständigen Kontakte sind nicht blockiert.</p><p>${button("Auswahl prüfen", "open-recipients", "secondary")}</p></li>
            <li><h3>${link ? "Ein Link hat kein Ziel" : "Newsletter kann geprüft werden"}</h3><p>${link ? "Im Newsletter «" + link.label + "» fehlt die Adresse." : "Betreff, Text und Links sind ausgefüllt."}</p><p>${button(link ? "Link korrigieren" : "Newsletter öffnen", "open-newsletter", "secondary")}</p></li>
          </ul>
        </section>
      </div>`);
  }

  function steps(current) {
    const items = [["research", "Recherche oder Import"], ["recipients", "Empfänger"], ["briefing", "Briefing"], ["drafts", "Entwürfe"], ["confirm", "Zeitpunkt"], ["results", "Resultate"]];
    return `<ol class="steps" aria-label="Ablauf">${items.map(([id, label]) => `<li class="${id === current ? "now" : ""}" ${id === current ? 'aria-current="step"' : ""}>${label}</li>`).join("")}</ol>`;
  }
  function personRow(item) {
    const on = state.akquise.selected.includes(item.id);
    const pill = item.kind === "ok" ? '<span class="pill ok">Angaben vollständig</span>'
      : item.kind === "contacted" ? '<span class="pill neutral">Bereits angeschrieben</span>'
      : item.kind === "missing" ? '<span class="pill warn">E-Mail fehlt</span>'
      : '<span class="pill warn">Dublette</span>';
    const detail = item.kind === "contacted" ? `Nicht vorausgewählt, bereits angeschrieben am ${item.when}`
      : item.kind === "missing" ? "E-Mail fehlt. Ergänzen oder aus dieser Sendung lassen."
      : item.kind === "duplicate" ? "Dieselbe Beispielperson wie Anna Beispiel. Eine Zeile reicht."
      : `${item.firm} · ${item.role}`;
    return `<li><label class="person"><input type="checkbox" data-contact="${item.id}" ${on ? "checked" : ""} aria-label="${esc(item.name)} auswählen"><span class="who"><strong>${esc(item.name)}</strong><small>${esc(detail)}</small></span>${pill}</label></li>`;
  }
  function selectionSummary() {
    const all = selectedContacts();
    const ready = all.filter(eligible);
    const contacted = all.filter((item) => item.kind === "contacted").length;
    const missing = all.filter((item) => item.kind === "missing").length;
    return `${ready.length} vollständige Beispielkontakte ausgewählt` + (contacted || missing ? `. ${contacted} bereits angeschriebene und ${missing} ohne E-Mail sind zusätzlich markiert.` : ".");
  }

  function ensureDrafts() {
    readyContacts().forEach((item) => {
      if (state.akquise.drafts[item.id]) return;
      const first = item.name.split(" ")[0];
      state.akquise.drafts[item.id] = {
        subject: `Sichtbarkeit für ${item.firm}`,
        body: `Guten Tag ${first}\n\n${state.akquise.briefing.goal}\n\n${state.akquise.briefing.offer}\n\nFreundliche Grüsse\nStudiojeker`,
        reviewedHash: ""
      };
    });
  }

  function akquise() {
    const step = state.akquise.step;
    let body = "";
    if (step === "research") {
      body = `<section class="panel"><p class="kicker">Akquise</p><h1 id="page-title">Wen möchtest du erreichen?</h1>${steps(step)}
        ${field("Suchwunsch", "suchwunsch", "akquise.query", state.akquise.query, 4)}
        <p class="note">Die Resultate sind erfunden. Es wird nichts im Web gesucht.</p>
        <div class="actions">${button(state.akquise.found ? "Resultate erneut anzeigen" : "Beispielresultate anzeigen", "akquise-search", state.akquise.found ? "secondary" : "primary")}</div>
        <details><summary>Oder eine Beispieldatei übernehmen</summary><p class="note">Auch das ist eine Simulation. Es wird keine Datei gelesen.</p><div class="actions">${button("Import simulieren", "akquise-import", "secondary")}</div></details>
        ${state.akquise.found ? `<h2>Beispielresultate</h2><p class="note">${state.akquise.imported ? "Import: 7 Zeilen, davon 1 Dublette und 1 ohne E-Mail." : "Recherche: 7 Beispielzeilen, davon 1 Dublette und 1 ohne E-Mail."}</p><ul class="people">${contacts.map(personRow).join("")}</ul><div class="actions">${button("Vollständige übernehmen", "take-found", "primary")}</div>` : ""}
        ${state.akquise.notice ? `<div class="callout" role="status"><p>${esc(state.akquise.notice)}</p></div>` : ""}
      </section>`;
    }
    if (step === "recipients") {
      body = `<section class="panel"><p class="kicker">Akquise</p><h1 id="page-title">Empfänger wählen</h1>${steps(step)}
        <div class="countline"><p id="sel-count"><strong>${esc(selectionSummary())}</strong></p>${button("Gemeinsames Briefing öffnen", "to-briefing", "primary")}</div>
        <p class="note">Du musst nicht jeden Kontakt einzeln antippen. «Alle vollständigen auswählen» setzt die Liste. Zeilen sind nur für Ausnahmen. Bereits angeschriebene sind nicht vorausgewählt.</p>
        <div class="actions">${button("Alle vollständigen auswählen", "select-complete", "secondary")}${button("Auswahl leeren", "clear-selection", "secondary")}</div>
        <ul class="people">${contacts.map(personRow).join("")}</ul>
        ${state.akquise.notice ? `<div class="alert" role="alert"><p>${esc(state.akquise.notice)}</p></div>` : ""}
      </section>`;
    }
    if (step === "briefing") {
      const b = state.akquise.briefing;
      body = `<section class="panel"><p class="kicker">Akquise</p><h1 id="page-title">Gemeinsames Briefing</h1>${steps(step)}
        <p class="note">Ein Briefing für ${readyContacts().length} vollständige Beispielkontakte. Die persönlichen Texte entstehen daraus, ohne jeden Satz einzeln vorzugeben.</p>
        ${field("Ziel", "ziel", "akquise.briefing.goal", b.goal, 3)}
        ${field("Angebot", "angebot", "akquise.briefing.offer", b.offer, 3)}
        ${field("Ton", "ton", "akquise.briefing.tone", b.tone)}
        <div class="actions">${button("Zurück zu den Empfängern", "to-recipients", "secondary")}${button("Persönliche Entwürfe erstellen", "make-drafts", "primary")}</div>
      </section>`;
    }
    if (step === "drafts") {
      ensureDrafts();
      const rows = readyContacts().map((item) => {
        const draft = state.akquise.drafts[item.id];
        const reviewed = draft.reviewedHash && draft.reviewedHash === draftHash(draft);
        return `<article class="panel"><h2>${esc(item.name)}</h2><p class="note">${esc(item.firm)} · ${reviewed ? "Dieser Entwurf ist geprüft." : "Noch nicht geprüft. Eine Änderung betrifft nur diese Person."}</p>
          ${field("Betreff", "sub-" + item.id, "akquise.drafts." + item.id + ".subject", draft.subject)}
          ${field("Text", "body-" + item.id, "akquise.drafts." + item.id + ".body", draft.body, 5)}
          <div class="actions">${button(reviewed ? "Erneut als geprüft merken" : "Diesen Entwurf prüfen", "review-" + item.id, reviewed ? "secondary" : "secondary")}</div></article>`;
      }).join("");
      body = `<div class="stack drafts"><section class="panel"><p class="kicker">Akquise</p><h1 id="page-title">Persönliche Entwürfe</h1>${steps(step)}
        <p class="note">${readyContacts().length} Texte, jeweils mit Namen und Firma. Kontakte ohne E-Mail oder als Dublette sind nicht dabei.</p>
        <div class="actions">${button("Zurück zum Briefing", "to-briefing-back", "secondary")}${button("Auswahl und Zeitpunkt prüfen", "to-confirm", "primary")}</div>
        ${state.akquise.notice ? `<div class="alert" role="alert"><p>${esc(state.akquise.notice)}</p></div>` : ""}
      </section>${rows}</div>`;
    }
    if (step === "confirm") {
      const lines = readyContacts().map((item) => {
        const draft = state.akquise.drafts[item.id] || {};
        const reviewed = draft.reviewedHash && draft.reviewedHash === draftHash(draft);
        return `<li class="line"><span class="who"><strong>${esc(item.name)}</strong><small>${esc(draft.subject || "Ohne Betreff")} · ${reviewed ? "Entwurf geprüft" : "Entwurf noch nicht einzeln geprüft"}</small></span></li>`;
      }).join("");
      const stale = state.akquise.confirmHash && state.akquise.confirmHash !== confirmMaterial();
      body = `<section class="panel"><p class="kicker">Akquise</p><h1 id="page-title">Empfänger, Texte und Zeitpunkt</h1>${steps(step)}
        ${stale ? `<div class="alert" role="alert"><p>Die frühere Bestätigung gilt nicht mehr, weil sich ein Text, die Auswahl oder der Zeitpunkt geändert hat.</p></div>` : ""}
        <ul class="people">${lines}</ul>
        <label class="field" for="wann">Zeitpunkt in dieser Vorschau<input id="wann" type="datetime-local" data-bind="akquise.when" value="${esc(state.akquise.when)}"></label>
        <label class="person"><input id="consent" type="checkbox" data-act="consent" ${state.akquise.consent ? "checked" : ""}><span>Ich habe Empfänger, Texte und Zeitpunkt in dieser Vorschau geprüft.</span></label>
        <div class="actions">${button("Zurück zu den Entwürfen", "to-drafts", "secondary")}${button("Planung simulieren", "simulate-plan", "primary")}</div>
        <p class="note">Die Planung ist eine Simulation. Es wird keine Mail versendet.</p>
        ${state.akquise.notice ? `<div class="alert" role="alert"><p>${esc(state.akquise.notice)}</p></div>` : ""}
      </section>`;
    }
    if (step === "results") {
      const stale = state.akquise.confirmHash !== confirmMaterial();
      const rows = (state.akquise.results || []).map((item) => {
        const person = contact(item.id);
        const ok = item.status === "planned";
        return `<li class="line"><span class="who"><strong>${esc(person.name)}</strong><small>${ok ? "Simuliert eingeplant. Kein Versand." : "Simulation unklar. Nur diese Person erneut vorbereiten."}</small></span><span>${ok ? "" : button("Nur diese Person erneut", "retry-" + item.id, "secondary")}<span class="pill ${ok ? "ok" : "warn"}">${ok ? "Eingeplant" : "Unklar"}</span></span></li>`;
      }).join("");
      body = `<section class="panel"><p class="kicker">Akquise</p><h1 id="page-title">Einzelresultate</h1>${steps(step)}
        ${stale ? `<div class="alert" role="alert"><p>Die Resultate gehören zu einem älteren Stand. Bestätige Empfänger, Texte und Zeitpunkt erneut.</p></div><div class="actions">${button("Zurück zur Bestätigung", "to-confirm", "primary")}</div>` : `<ul class="people">${rows}</ul><div class="actions">${button("Zur Übersicht", "go-home", "primary")}</div>`}
        <p class="note">Jedes Resultat ist einzeln bezeichnet. Eine Änderung an einer anderen Person lässt die übrigen Resultate stehen, bis die gemeinsame Bestätigung nicht mehr zum Stand passt.</p>
      </section>`;
    }
    return shell("Akquise", body + `<div class="actions">${button("Zurück", "back", "secondary")}</div>`);
  }

  function newsletterPane() {
    const item = state.newsletter.current;
    const problems = newsletterProblems();
    const checked = state.newsletter.checkedHash && state.newsletter.checkedHash === newsletterHash();
    const previous = state.newsletter.issues[state.newsletter.issues.length - 1];
    const primary = !checked ? button("Prüfen", "check-newsletter", "primary")
      : !state.newsletter.mailchimp ? button("Mailchimp-Entwurf simulieren", "mailchimp", "primary")
      : !state.newsletter.mailchimp.test ? button("Testmail simulieren", "testmail", "primary")
      : button("Zur Übersicht", "go-home", "primary");
    return `<div class="stack">
      <section class="panel">
        <p class="kicker">Inhalte · Newsletter</p>
        <h1 id="page-title">${esc(item.title)}</h1>
        <p class="note">Änderungen werden in diesem Browser gemerkt. Es gibt keine Ablage ausserhalb dieses Browsers.</p>
        <p class="note">Kopiert aus ${esc(item.copiedFrom)}. ${esc(previous.title)} bleibt unverändert. Bearbeiten und die aktuelle Vorschau zeigen denselben Entwurf.</p>
        <div class="actions">${button("Vorige Ausgabe kopieren", "copy-newsletter", "secondary")}</div>
      </section>
      <div class="pane-switch" aria-label="Ansicht desselben Entwurfs">
        <button type="button" class="button secondary" data-act="pane-edit" aria-pressed="${state.newsletter.pane === "edit"}">Bearbeiten</button>
        <button type="button" class="button secondary" data-act="pane-preview" aria-pressed="${state.newsletter.pane === "preview"}">Vorschau</button>
      </div>
      <div class="editor">
        <section class="panel edit-pane">
          <h2>Bearbeiten</h2>
          ${field("Betreff", "betreff", "newsletter.current.subject", item.subject)}
          ${field("Vorschautext", "preheader", "newsletter.current.preheader", item.preheader)}
          ${field("Text", "nl-text", "newsletter.current.body", item.body, 8)}
          <fieldset class="thumbs"><legend>Bilder aus der Bibliothek</legend>
            ${state.library.assets.filter((asset) => asset.folder === "f2").map((asset) => `<label class="thumb"><input type="radio" name="bild" data-image="${asset.id}" ${item.imageId === asset.id ? "checked" : ""}><span class="swatch">${esc(asset.name)}</span></label>`).join("")}
          </fieldset>
          <p class="note">Platzhalter, keine Fotos. Die Miniaturen sind dieselben wie in der Bibliothek.</p>
          <h3>Links</h3>
          ${item.links.map((link) => `<label class="field" for="link-${link.id}">${esc(link.label)}<input id="link-${link.id}" type="text" data-bind="link.${link.id}" value="${esc(link.url)}" placeholder="Zieladresse"></label>`).join("")}
        </section>
        <section class="preview-pane" aria-label="Aktuelle Vorschau">
          <article class="preview-card"><header><p>Aktuelle Vorschau</p><p>Entwurf</p></header><div class="preview-body">
            <p class="figure" data-mirror="image-name">${esc(imageName(item.imageId))}<br><span class="note" style="color:#d5dee3">Platzhalter, kein Foto</span></p>
            <p class="kicker">Betreff</p>
            <h3 data-mirror="newsletter.current.subject">${esc(item.subject)}</h3>
            <p class="note" data-mirror="newsletter.current.preheader">${esc(item.preheader)}</p>
            <p data-mirror="newsletter.current.body" style="white-space:pre-wrap">${esc(item.body)}</p>
            ${item.links.map((link) => `<p data-link-preview="${link.id}"><strong>${esc(link.label)}</strong> · ${link.url.trim() ? esc(link.url) : "Ziel fehlt"}</p>`).join("")}
          </div></article>
        </section>
      </div>
      <div id="nl-alert" class="alert" role="alert" ${problems.length && !checked ? "" : "hidden"}>${problems.map((line) => `<p>${esc(line)}</p>`).join("")}<p>Trage eine Adresse ein oder entferne den Link. Danach kannst du erneut prüfen.</p></div>
      ${state.newsletter.notice ? `<div class="callout" role="status"><p>${esc(state.newsletter.notice)}</p></div>` : ""}
      <div class="actions">${primary}</div>
      <p class="note">Mailchimp und die Testmail sind hier nur simuliert. Ein Versand an eine Liste findet nicht statt.</p>
      ${state.newsletter.issues.map((issue) => `<section class="locked"><h2>${esc(issue.title)} bleibt erhalten</h2><p>Betreff: ${esc(issue.subject)}. Diese Ausgabe wird durch eine Kopie nicht ersetzt.</p></section>`).join("")}
    </div>`;
  }
  function imageName(id) {
    const asset = state.library.assets.find((item) => item.id === id);
    return asset ? asset.name : "Bild";
  }
  function newsletterProblems() {
    const item = state.newsletter.current;
    const problems = [];
    if (!item.subject.trim()) problems.push("Der Betreff ist leer.");
    if (!item.body.trim()) problems.push("Der Text ist leer.");
    item.links.forEach((link) => { if (!link.url.trim()) problems.push(`Der Link «${link.label}» hat kein Ziel.`); });
    return problems;
  }

  function contentPage() {
    if (state.content === "newsletter") return shell("Inhalte / Newsletter", newsletterPane() + `<div class="actions">${button("Alle Inhalte", "content-menu", "secondary")}</div>`);
    if (state.content === "social") return shell("Inhalte / Social Media", socialPage());
    if (state.content === "website") return shell("Inhalte / Website", websitePage());
    if (state.content === "image") return shell("Inhalte / Bild", imagePage());
    if (state.content === "video") return shell("Inhalte / Video", videoPage());
    if (state.content === "graphic") return shell("Inhalte / Grafik", graphicPage());
    if (state.content === "three") return shell("Inhalte / 3D", threePage());
    const cards = [
      ["newsletter", "Newsletter", "Ausgabe bearbeiten, kopieren und prüfen"],
      ["social", "Social Media", "Beitrag für einen Kanal vorbereiten"],
      ["website", "Website", "Eine Seite in der Vorschau ändern"],
      ["image", "Bild", "Motiv aus der Bibliothek wählen"],
      ["video", "Video", "Ablauf planen, ohne Film zu rechnen"],
      ["graphic", "Grafik", "Satz und Fläche anordnen"],
      ["three", "3D", "Im Bestand kein eigener Bereich"]
    ];
    return shell("Inhalte", `<section class="panel"><p class="kicker">Inhalte</p><h1 id="page-title">Was möchtest du erstellen?</h1><div class="points">${cards.map(([id, title, text]) => `<article><h3>${title}</h3><p>${text}</p><p>${button(title + " öffnen", "content-" + id, id === "newsletter" ? "primary" : "secondary")}</p></article>`).join("")}</div></section>`);
  }
  function socialPage() {
    const s = state.social;
    return `<section class="panel"><h1 id="page-title">Beitrag für ${esc(s.channel)}</h1>
      ${s.connected ? `<p class="note">Die Verbindung ist in dieser Vorschau nur als Beispiel markiert.</p>` : `<div class="callout"><p><strong>LinkedIn ist in dieser Vorschau nicht verbunden.</strong></p><p>Nächster Schritt: die Verbindung als Beispiel markieren. Es wird kein Konto geöffnet.</p></div>`}
      ${s.notice ? `<div class="alert" role="alert"><p>${esc(s.notice)}</p></div>` : ""}
      ${field("Text", "social-text", "social.text", s.text, 5)}
      <div class="actions">${s.connected ? "" : button("Verbindung als Beispiel markieren", "social-connect", "secondary")}${button(s.planned ? "Einplanung erneut simulieren" : "Einplanung simulieren", "social-plan", "primary")}</div>
      ${s.planned ? `<p class="saved" role="status">Simuliert für ${esc(s.channel)} eingeplant. Nichts wurde veröffentlicht.</p>` : ""}
      <div class="actions">${button("Alle Inhalte", "content-menu", "secondary")}</div></section>`;
  }
  function websitePage() {
    const w = state.website;
    return `<section class="panel"><h1 id="page-title">${esc(w.page)} anpassen</h1>
      <label class="field" for="seite">Seite<select id="seite" data-bind="website.page"><option ${w.page === "Startseite" ? "selected" : ""}>Startseite</option><option ${w.page === "Angebot" ? "selected" : ""}>Angebot</option><option ${w.page === "Kontakt" ? "selected" : ""}>Kontakt</option></select></label>
      ${field("Änderung", "web-change", "website.change", w.change, 4)}
      <article class="preview-card"><header><p>Aktuelle Vorschau</p><p>${w.applied ? "Übernommen" : "Entwurf"}</p></header><div class="preview-body"><h3 data-mirror="website.page">${esc(w.page)}</h3><p data-mirror="website.change">${esc(w.change)}</p></div></article>
      <div class="actions">${button("In der Vorschau übernehmen", "website-apply", "primary")}${button("Alle Inhalte", "content-menu", "secondary")}</div>
      ${w.applied ? `<p class="note">Nur in dieser Vorschau sichtbar. Die echte Website bleibt unverändert.</p>` : ""}</section>`;
  }
  function imagePage() {
    return `<section class="panel"><h1 id="page-title">Bild auswählen</h1>
      ${field("Wofür brauchst du das Bild?", "bild-brief", "imageWork.brief", state.imageWork.brief, 3)}
      <fieldset class="thumbs"><legend>Bibliothek</legend>${state.library.assets.map((asset) => `<label class="thumb"><input type="radio" name="workbild" data-work-image="${asset.id}" ${state.imageWork.imageId === asset.id ? "checked" : ""}><span class="swatch">${esc(asset.name)}</span></label>`).join("")}</fieldset>
      <p class="figure">${esc(imageName(state.imageWork.imageId))}</p>
      <div class="actions">${button("Im Newsletter verwenden", "image-to-newsletter", "primary")}${button("Alle Inhalte", "content-menu", "secondary")}</div></section>`;
  }
  function videoPage() {
    return `<section class="panel"><h1 id="page-title">Video planen</h1>
      <p class="note">Hier entsteht ein Ablauf, kein gerenderter Film.</p>
      ${field("Titel", "video-titel", "video.title", state.video.title)}
      ${field("Szenen", "video-szenen", "video.scenes", state.video.scenes, 5)}
      <div class="actions">${button("Ablauf merken", "video-keep", "primary")}${button("Alle Inhalte", "content-menu", "secondary")}</div>
      <p class="note" id="video-status" role="status"></p></section>`;
  }
  function graphicPage() {
    return `<section class="panel"><h1 id="page-title">Grafik anordnen</h1>
      ${field("Satz", "grafik-satz", "graphic.headline", state.graphic.headline)}
      <label class="field" for="vorlage">Fläche<select id="vorlage" data-bind="graphic.template"><option ${state.graphic.template === "Dunkel" ? "selected" : ""}>Dunkel</option><option ${state.graphic.template === "Hell" ? "selected" : ""}>Hell</option></select></label>
      <article class="preview-card"><header><p>Aktuelle Vorschau</p><p data-mirror="graphic.template">${esc(state.graphic.template)}</p></header><div class="preview-body"><h3 data-mirror="graphic.headline">${esc(state.graphic.headline)}</h3></div></article>
      <div class="actions">${button("Anordnung merken", "graphic-keep", "primary")}${button("Alle Inhalte", "content-menu", "secondary")}</div></section>`;
  }
  function threePage() {
    return `<section class="panel"><h1 id="page-title">3D</h1>
      <p>Im gelesenen V1-Bestand gibt es keinen eigenen 3D-Arbeitsbereich. Vorschlag: kein zusätzlicher Einstieg, bis das entschieden ist.</p>
      <div class="actions">${button("Zurück zu den Inhalten", "content-menu", "primary")}</div></section>`;
  }

  function projects() {
    const p = state.project;
    return shell("Projekte", `<section class="panel"><p class="kicker">Projekte</p><h1 id="page-title">${esc(p.campaign)}</h1>
      <p class="note">Kunde, Ziel, Konzept, Kampagne und die zugehörigen Inhalte an einem Ort. Der Kunde ist ein Beispiel.</p>
      ${field("Kunde", "kunde", "project.customer", p.customer)}
      ${field("Ziel", "projekt-ziel", "project.goal", p.goal, 3)}
      ${field("Konzept", "konzept", "project.concept", p.concept, 3)}
      ${field("Kampagne", "kampagne", "project.campaign", p.campaign)}
      <ul class="people">
        <li class="line"><span class="who"><strong>Newsletter</strong><small>${esc(state.newsletter.current.title)}</small></span>${button("Öffnen", "open-newsletter", "secondary")}</li>
        <li class="line"><span class="who"><strong>Akquise</strong><small>${esc(stepLabel(state.akquise.step))}</small></span>${button("Öffnen", "open-akquise", "secondary")}</li>
        <li class="line"><span class="who"><strong>Bibliothek</strong><small>${esc(folderName(state.library.folderId))}</small></span>${button("Öffnen", "open-library", "secondary")}</li>
      </ul>
      <div class="actions">${button("Am Newsletter weiterarbeiten", "open-newsletter", "primary")}</div>
    </section>`);
  }

  function library() {
    const current = state.library.folders.find((item) => item.id === state.library.folderId);
    const crumbs = [];
    let walk = current;
    while (walk) {
      crumbs.unshift(walk);
      walk = state.library.folders.find((item) => item.id === walk.parent);
    }
    const children = state.library.folders.filter((item) => item.parent === state.library.folderId);
    const assets = state.library.assets.filter((item) => item.folder === state.library.folderId);
    return shell("Bibliothek", `<section class="panel"><p class="kicker">Bibliothek</p><h1 id="page-title">${esc(folderName(state.library.folderId))}</h1>
      <p class="note">${crumbs.map((item) => esc(item.name)).join(" / ")}. Ordner liegen beim Beispielkunden und beim Beispielprojekt.</p>
      <div class="actions">${current && current.parent ? button("Ordner darüber", "folder-up", "secondary") : ""}</div>
      <ul class="people">${children.map((item) => `<li class="line"><span class="who"><strong>${esc(item.name)}</strong><small>Ordner</small></span>${button("Öffnen", "folder-" + item.id, "secondary")}</li>`).join("")}</ul>
      <fieldset class="thumbs"><legend>Medien</legend>${assets.map((asset) => `<label class="thumb"><input type="radio" name="libbild" data-image="${asset.id}" ${state.newsletter.current.imageId === asset.id ? "checked" : ""}><span class="swatch">${esc(asset.name)}</span></label>`).join("") || "<p>In diesem Ordner liegen noch keine Beispielbilder.</p>"}</fieldset>
      ${field("Neuer Ordner", "ordner", "library.draftName", state.library.draftName)}
      <div class="actions">${button("Ordner anlegen", "create-folder", "secondary")}${button("Bild in den Newsletter übernehmen", "use-image", "primary")}</div>
      ${state.library.notice ? `<p class="saved" role="status">${esc(state.library.notice)}</p>` : ""}
    </section>`);
  }

  function calendar() {
    return shell("Kalender", `<section class="panel"><p class="kicker">Kalender</p><h1 id="page-title">Was steht als Nächstes an?</h1>
      <p class="note">Zeiten in Europe/Zurich, nur als Beispiel. Ein Eintrag ist keine Veröffentlichung.</p>
      <ul class="people">${state.calendar.items.map((item) => `<li class="line"><span class="who"><strong>${esc(item.title)}</strong><small>${esc(item.when)} · ${esc(item.status)}</small></span>${button("Inhalt öffnen", "cal-" + item.id, "secondary")}</li>`).join("")}</ul>
      <div class="callout"><p><strong>${state.calendar.external ? "Externe Verbindung nur vorgemerkt." : "Keine externe Kalenderverbindung."}</strong></p><p>${state.calendar.external ? "Die Vormerkung liegt in diesem Browser. Apple, Google und Microsoft sind nicht verbunden und werden nicht beschrieben." : "Du kannst eine Verbindung vormerken. Das schreibt keinen externen Kalender."}</p></div>
      <div class="actions">${button(state.calendar.external ? "Vormerkung entfernen" : "Externe Verbindung vormerken", "calendar-flag", "primary")}</div>
    </section>`);
  }

  function settings() {
    const role = state.settings.role;
    return shell("Einstellungen", `<section class="panel"><p class="kicker">Einstellungen</p><h1 id="page-title">Beispielkonto</h1>
      <p class="note">Keine Anmeldung und keine echten Konten. Rollen sind ein Vorschlag, weil der gelesene Bestand dafür kein Feld hat.</p>
      ${field("Marke in dieser Vorschau", "marke", "settings.brand", state.settings.brand)}
      <fieldset><legend>Wer darf freigeben? Vorschlag.</legend>
        ${["Alltag", "Freigabe", "Alltag und Freigabe"].map((name) => `<label class="person"><input type="radio" name="rolle" data-role="${esc(name)}" ${role === name ? "checked" : ""}><span>${esc(name)}</span></label>`).join("")}
      </fieldset>
      <div class="actions">${button("Vorschlag merken", "save-role", "primary")}</div>
      <h2>Verbindungen</h2>
      <ul class="people">
        <li class="line"><span class="who"><strong>Mailchimp</strong><small>${state.newsletter.mailchimp ? "Nur als Simulation vorgemerkt" : "Nicht verbunden"}</small></span></li>
        <li class="line"><span class="who"><strong>LinkedIn</strong><small>${state.social.connected ? "Als Beispiel markiert" : "Nicht verbunden"}</small></span>${button("In den Beitrag", "quick-social", "secondary")}</li>
        <li class="line"><span class="who"><strong>Kalender</strong><small>${state.calendar.external ? "Nur vorgemerkt" : "Nicht verbunden"}</small></span>${button("Zur Planübersicht", "open-calendar", "secondary")}</li>
      </ul>
      <details><summary>Merken in dieser Vorschau prüfen</summary>
        <p class="note">Damit siehst du, was passiert, wenn der Browser nichts ablegt. Es wird nichts gelöscht.</p>
        <div class="actions">${button(state.storageBlocked ? "Merken wieder zulassen" : "Merken aussetzen", "toggle-storage", "secondary")}</div>
      </details>
    </section>`);
  }

  function render(focusTitle) {
    document.body.dataset.pane = state.newsletter.pane || "edit";
    const pages = { home, akquise, content: contentPage, projects, library, calendar, settings };
    document.getElementById("app").innerHTML = (pages[state.page] || home)();
    paintDerived();
    if (focusTitle) document.getElementById("page-title")?.focus();
  }
  function paintDerived() {
    document.querySelectorAll("[data-mirror]").forEach((node) => {
      const key = node.dataset.mirror;
      if (key === "image-name") node.firstChild.textContent = imageName(state.newsletter.current.imageId);
      else node.textContent = read(key) || "";
    });
    document.querySelectorAll("[data-link-preview]").forEach((node) => {
      const link = state.newsletter.current.links.find((item) => item.id === node.dataset.linkPreview);
      if (!link) return;
      node.innerHTML = `<strong>${esc(link.label)}</strong> · ${link.url.trim() ? esc(link.url) : "Ziel fehlt"}`;
    });
    const status = document.getElementById("storage-status");
    if (status) {
      status.textContent = storageText();
      status.className = state.persistent ? "saved" : "alert";
    }
    const count = document.getElementById("sel-count");
    if (count) count.innerHTML = `<strong>${esc(selectionSummary())}</strong>`;
    const alert = document.getElementById("nl-alert");
    if (alert) alert.hidden = newsletterProblems().length === 0 || state.newsletter.checkedHash === newsletterHash();
  }

  function startTask() {
    const text = state.task.toLowerCase();
    if (/newsletter/.test(text)) { state.content = "newsletter"; go("content"); }
    else if (/social|beitrag|linkedin/.test(text)) { state.content = "social"; go("content"); }
    else if (/website|webseite/.test(text)) { state.content = "website"; go("content"); }
    else if (/video|film/.test(text)) { state.content = "video"; go("content"); }
    else if (/grafik/.test(text)) { state.content = "graphic"; go("content"); }
    else if (/bild|foto/.test(text)) { state.content = "image"; go("content"); }
    else { state.akquise.step = "research"; go("akquise"); }
  }

  function onClick(event) {
    const actNode = event.target.closest("[data-act], [data-go]");
    if (!actNode) return;
    if (actNode.matches("a")) event.preventDefault();
    const act = actNode.dataset.act || "";
    const dest = actNode.dataset.go;
    if (dest) { go(dest); return; }
    if (act === "resume") { resume(); return; }
    if (act === "back") { back(); return; }
    if (act === "start-task") { startTask(); return; }
    if (act === "quick-akquise") { state.akquise.step = "research"; go("akquise"); return; }
    if (act === "quick-newsletter" || act === "open-newsletter") { state.content = "newsletter"; go("content"); return; }
    if (act === "quick-social") { state.content = "social"; go("content"); return; }
    if (act === "open-recipients") { state.akquise.step = "recipients"; go("akquise"); return; }
    if (act === "open-akquise") { go("akquise"); return; }
    if (act === "open-library") { go("library"); return; }
    if (act === "open-calendar") { go("calendar"); return; }
    if (act === "go-home") { go("home"); return; }
    if (act === "akquise-search") { state.akquise.found = true; state.akquise.notice = "Sieben erfundene Zeilen. Eine ist eine Dublette, eine hat keine E-Mail."; save(); render(false); return; }
    if (act === "akquise-import") { state.akquise.found = true; state.akquise.imported = true; state.akquise.notice = "Import simuliert: 1 Dublette übersprungen, 1 Zeile ohne E-Mail bleibt offen."; save(); render(false); return; }
    if (act === "take-found" || act === "select-complete") {
      state.akquise.selected = contacts.filter(eligible).map((item) => item.id);
      state.akquise.step = "recipients";
      state.akquise.notice = "Vier vollständige Beispielkontakte sind ausgewählt. Bereits angeschriebene, die Dublette und die Zeile ohne E-Mail sind nicht dabei.";
      save(); render(true); return;
    }
    if (act === "clear-selection") { state.akquise.selected = []; invalidate("akquise.selected"); state.akquise.notice = "Die Auswahl ist leer."; save(); render(false); return; }
    if (act === "to-briefing") {
      if (!readyContacts().length) { state.akquise.notice = "Wähle mindestens einen Kontakt mit E-Mail. Fehlende Angaben und Dubletten können ausgelassen werden."; save(); render(false); return; }
      state.akquise.step = "briefing"; state.akquise.notice = ""; save(); render(true); return;
    }
    if (act === "to-recipients") { state.akquise.step = "recipients"; save(); render(true); return; }
    if (act === "to-briefing-back") { state.akquise.step = "briefing"; save(); render(true); return; }
    if (act === "make-drafts") { ensureDrafts(); state.akquise.step = "drafts"; state.akquise.notice = ""; save(); render(true); return; }
    if (act === "to-confirm") {
      ensureDrafts();
      const open = readyContacts().filter((item) => state.akquise.drafts[item.id].reviewedHash !== draftHash(state.akquise.drafts[item.id]));
      if (open.length) { state.akquise.notice = "Noch nicht geprüft: " + open.map((item) => item.name).join(", ") + "."; save(); render(false); return; }
      state.akquise.step = "confirm"; state.akquise.notice = ""; save(); render(true); return;
    }
    if (act === "to-drafts") { state.akquise.step = "drafts"; save(); render(true); return; }
    if (act.startsWith("review-")) {
      const id = act.slice(7);
      const draft = state.akquise.drafts[id];
      if (draft) draft.reviewedHash = draftHash(draft);
      save(); render(false); return;
    }
    if (act === "simulate-plan") {
      if (!state.akquise.consent) { state.akquise.notice = "Setze den Haken, wenn Empfänger, Texte und Zeitpunkt stimmen."; save(); render(false); return; }
      const ids = readyContacts().map((item) => item.id);
      state.akquise.confirmHash = confirmMaterial();
      state.akquise.results = ids.map((id) => ({ id, status: id === "c4" ? "unclear" : "planned" }));
      state.akquise.step = "results";
      state.akquise.notice = "";
      state.calendar.items[0].status = "Simuliert eingeplant";
      save(); render(true); return;
    }
    if (act.startsWith("retry-")) {
      const id = act.slice(6);
      const row = (state.akquise.results || []).find((item) => item.id === id);
      if (row) row.status = "planned";
      save(); render(false); return;
    }
    if (act === "copy-newsletter") {
      const current = state.newsletter.current;
      state.newsletter.issues.push(JSON.parse(JSON.stringify(current)));
      const index = state.newsletter.issues.length;
      const name = monthNames[index % 12];
      state.newsletter.current = {
        id: "issue-" + index,
        title: "Ausgabe " + name,
        copiedFrom: current.title,
        subject: current.subject,
        preheader: current.preheader,
        body: current.body,
        imageId: current.imageId,
        links: current.links.map((link) => ({ ...link }))
      };
      state.newsletter.checkedHash = "";
      state.newsletter.mailchimp = null;
      state.newsletter.notice = current.title + " bleibt unverändert. Du arbeitest in der neuen Ausgabe.";
      save(); render(true); return;
    }
    if (act === "pane-edit" || act === "pane-preview") {
      state.newsletter.pane = act === "pane-edit" ? "edit" : "preview";
      save(); render(false); return;
    }
    if (act === "check-newsletter") {
      const problems = newsletterProblems();
      if (problems.length) {
        state.newsletter.checkedHash = "";
        state.newsletter.notice = problems[0] + " Danach erneut prüfen.";
      } else {
        state.newsletter.checkedHash = newsletterHash();
        state.newsletter.notice = "Prüfung ohne offenen Punkt. Als Nächstes kannst du den Mailchimp-Entwurf simulieren.";
      }
      save(); render(false); return;
    }
    if (act === "mailchimp") {
      if (state.newsletter.checkedHash !== newsletterHash()) { state.newsletter.notice = "Zuerst den aktuellen Stand prüfen."; save(); render(false); return; }
      state.newsletter.mailchimp = { test: false };
      state.newsletter.notice = "Mailchimp-Entwurf simuliert. Es wurde nichts übertragen. Als Nächstes kannst du eine Testmail simulieren.";
      save(); render(false); return;
    }
    if (act === "testmail") {
      if (!state.newsletter.mailchimp) { state.newsletter.notice = "Zuerst den Mailchimp-Entwurf simulieren."; save(); render(false); return; }
      state.newsletter.mailchimp.test = true;
      state.newsletter.notice = "Testmail simuliert. Es wurde keine Mail versendet. Der Versand an eine Liste bleibt ausserhalb dieser Vorschau.";
      state.calendar.items[1].status = "Simuliert vorbereitet";
      save(); render(false); return;
    }
    if (act.startsWith("content-")) { state.content = act.slice(8); if (state.page !== "content") go("content"); else { markResume(); save(); render(true); } return; }
    if (act === "social-connect") { state.social.connected = true; save(); render(false); return; }
    if (act === "social-plan") {
      if (!state.social.connected) {
        state.social.notice = "Zuerst die Verbindung als Beispiel markieren. Danach kannst du die Einplanung simulieren.";
        save(); render(false); return;
      }
      state.social.notice = "";
      state.social.planned = true; save(); render(false); return;
    }
    if (act === "website-apply") { state.website.applied = true; save(); render(false); return; }
    if (act === "image-to-newsletter" || act === "use-image") {
      state.newsletter.current.imageId = state.imageWork.imageId || state.newsletter.current.imageId;
      invalidate("newsletter.current.imageId");
      state.library.notice = imageName(state.newsletter.current.imageId) + " ist im Newsletter gewählt.";
      state.content = "newsletter";
      save();
      if (act === "use-image" && state.page === "library") { state.page = "content"; }
      render(true); return;
    }
    if (act === "video-keep") {
      const node = document.getElementById("video-status");
      save();
      if (node) node.textContent = state.persistent ? "Ablauf in diesem Browser gemerkt. Es wurde kein Film erzeugt." : storageText();
      return;
    }
    if (act === "graphic-keep") { save(); render(false); return; }
    if (act === "create-folder") {
      const name = state.library.draftName.trim();
      if (!name) { state.library.notice = "Gib dem Ordner einen Namen."; save(); render(false); return; }
      const id = "f" + (state.library.folders.length + 1);
      state.library.folders.push({ id, name, parent: state.library.folderId });
      state.library.folderId = id;
      state.library.draftName = "";
      state.library.notice = "Ordner «" + name + "» liegt unter " + folderName(state.library.folders.find((item) => item.id === id).parent) + ".";
      save(); render(false); return;
    }
    if (act === "folder-up") {
      const current = state.library.folders.find((item) => item.id === state.library.folderId);
      if (current?.parent) state.library.folderId = current.parent;
      save(); render(false); return;
    }
    if (act.startsWith("folder-")) { state.library.folderId = act.slice(7); save(); render(false); return; }
    if (act.startsWith("cal-")) {
      const item = state.calendar.items.find((entry) => entry.id === act.slice(4));
      if (!item) return;
      state.page = item.page;
      if (item.step) state.akquise.step = item.step;
      if (item.content) state.content = item.content;
      markResume(); save(); render(true); return;
    }
    if (act === "calendar-flag") { state.calendar.external = state.calendar.external ? "" : "preview"; save(); render(false); return; }
    if (act === "save-role") { save(); render(false); return; }
    if (act === "toggle-storage") {
      state.storageBlocked = !state.storageBlocked;
      if (!state.storageBlocked) state.storageProblem = "";
      save(); render(false); return;
    }
  }

  function onInput(event) {
    const node = event.target;
    const bind = node.dataset.bind;
    if (!bind) return;
    if (bind.startsWith("link.")) {
      const link = state.newsletter.current.links.find((item) => item.id === bind.split(".")[1]);
      if (link) link.url = node.value;
      invalidate("newsletter.current.links");
    } else {
      assign(bind, node.value);
      invalidate(bind);
      if (bind.startsWith("akquise.drafts.")) {
        const id = bind.split(".")[2];
        if (state.akquise.drafts[id]) state.akquise.drafts[id].reviewedHash = "";
      }
    }
    save();
    paintDerived();
  }
  function onChange(event) {
    const node = event.target;
    if (node.dataset.contact) {
      const id = node.dataset.contact;
      state.akquise.selected = node.checked
        ? [...new Set([...state.akquise.selected, id])]
        : state.akquise.selected.filter((item) => item !== id);
      invalidate("akquise.selected");
      save();
      paintDerived();
      return;
    }
    if (node.dataset.image) {
      state.newsletter.current.imageId = node.dataset.image;
      state.imageWork.imageId = node.dataset.image;
      invalidate("newsletter.current.imageId");
      save();
      render(false);
      return;
    }
    if (node.dataset.workImage) {
      state.imageWork.imageId = node.dataset.workImage;
      save();
      render(false);
      return;
    }
    if (node.dataset.role) { state.settings.role = node.dataset.role; save(); return; }
    if (node.dataset.act === "consent") { state.akquise.consent = node.checked; save(); return; }
    if (node.dataset.bind) { assign(node.dataset.bind, node.value); invalidate(node.dataset.bind); save(); paintDerived(); }
  }

  document.addEventListener("click", onClick);
  document.addEventListener("input", onInput);
  document.addEventListener("change", onChange);
  window.addEventListener("beforeunload", (event) => {
    if (!state.persistent) {
      event.preventDefault();
      event.returnValue = "";
    }
  });
  load();
  if (state.storageProblem.startsWith("Der bisherige Stand")) state.persistent = false;
  render(false);
  window.StudioPreview = { state, contacts, confirmMaterial, newsletterHash, draftHash, KEY };
})();
