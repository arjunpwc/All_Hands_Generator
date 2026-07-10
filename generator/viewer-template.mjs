/** Tabbed website HTML renderer — PwC branded, dynamic tabs. */

import fs from "fs";
import path from "path";
import { buildWebsiteModel } from "./site-builder.mjs";

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function imgTag(src, alt, assetPrefix) {
  const url = src.startsWith("assets/") ? assetPrefix + src.slice(7) : assetPrefix + src;
  return `<img src="${escapeHtml(url)}" alt="${escapeHtml(alt || "")}" loading="lazy" />`;
}

function renderHome(tab, assetPrefix) {
  const agenda = (tab.agenda || [])
    .map((item) => {
      const label = typeof item === "string" ? item : item.label;
      const tabId = typeof item === "object" ? item.tabId : null;
      if (tabId) {
        return `<li><button type="button" class="agenda-link" data-goto="${escapeHtml(tabId)}">${escapeHtml(label)}</button></li>`;
      }
      return `<li>${escapeHtml(label)}</li>`;
    })
    .join("");
  const heroImg = tab.images?.[0] ? imgTag(tab.images[0].src, "Oracle D&A", assetPrefix) : "";

  return `
    <section class="hero">
      <div class="hero-text">
        <p class="eyebrow">PwC · Oracle Data & Analytics</p>
        <h1>${escapeHtml(tab.headline)}</h1>
        <p class="hero-date">${escapeHtml(tab.subheadline)}</p>
        <p class="lead">${escapeHtml(tab.intro)}</p>
      </div>
      <div class="hero-visual">${heroImg || '<div class="hero-badge">FY27</div>'}</div>
    </section>
    <section class="content-section">
      <h2>Session overview</h2>
      <ol class="agenda-list agenda-numbered">${agenda}</ol>
    </section>`;
}

function renderSections(sections) {
  if (!sections?.length) return "";
  return sections
    .map(
      (sec) => `
      <article class="topic-section">
        <h2>${escapeHtml(sec.title)}</h2>
        <p>${escapeHtml(sec.body)}</p>
      </article>`
    )
    .join("");
}

function renderContentTab(tab, assetPrefix) {
  const sectionsHtml = renderSections(tab.sections);
  const details = (tab.detailPoints || [])
    .map((b) => `<li>${escapeHtml(b)}</li>`)
    .join("");
  const detailHtml = details ? `<ul class="check-list">${details}</ul>` : "";

  const gallery = (tab.images || [])
    .map((i) => `<figure class="gallery-item">${imgTag(i.src, i.alt, assetPrefix)}</figure>`)
    .join("");

  return `
    <section class="page-header">
      <h1>${escapeHtml(tab.headline)}</h1>
      ${tab.intro ? `<p class="lead">${escapeHtml(tab.intro)}</p>` : ""}
    </section>
    <section class="content-section sections-stack">${sectionsHtml}${detailHtml}</section>
    ${gallery ? `<section class="content-section"><div class="gallery">${gallery}</div></section>` : ""}`;
}

function renderPeople(tab, assetPrefix) {
  const promos = (tab.promotions || [])
    .map(
      (p) => `
      <article class="person-card">
        <div class="avatar">${escapeHtml(p.name.charAt(0))}</div>
        <h3>${escapeHtml(p.name)}</h3>
        <p class="role">${escapeHtml(p.title)}</p>
      </article>`
    )
    .join("");

  const profiles = (tab.profiles || [])
    .map(
      (r) => `
      <article class="profile-card">
        <h3>${escapeHtml(r.name)}</h3>
        ${r.role ? `<p class="role">${escapeHtml(r.role)}</p>` : ""}
        ${r.funFact ? `<p class="fun-fact"><strong>Fun fact:</strong> ${escapeHtml(r.funFact)}</p>` : ""}
        ${r.bio ? `<p>${escapeHtml(r.bio)}</p>` : ""}
      </article>`
    )
    .join("");

  const gallery = (tab.images || [])
    .map((i) => `<figure class="gallery-item">${imgTag(i.src, i.alt, assetPrefix)}</figure>`)
    .join("");

  const sectionsHtml = renderSections(tab.sections);

  return `
    <section class="page-header">
      <h1>${escapeHtml(tab.headline)}</h1>
      ${tab.intro ? `<p class="lead">${escapeHtml(tab.intro)}</p>` : ""}
    </section>
    ${sectionsHtml ? `<section class="content-section sections-stack">${sectionsHtml}</section>` : ""}
    ${promos ? `<section class="content-section"><h2>Promotions</h2><div class="people-grid">${promos}</div></section>` : ""}
    ${profiles.length ? `<section class="content-section"><h2>Team highlights</h2><div class="profile-grid">${profiles}</div></section>` : ""}
    ${gallery ? `<section class="content-section"><div class="gallery">${gallery}</div></section>` : ""}`;
}

function renderQa(tab) {
  return `
    <section class="page-header">
      <h1>${escapeHtml(tab.headline || "Q&A")}</h1>
      <p class="subtitle">${escapeHtml(tab.subheadline || "We're all ears — ask away!")}</p>
      <p class="lead">${escapeHtml(tab.intro || "Submit your questions during the live all-hands session.")}</p>
    </section>
    <section class="content-section qa-panel">
      <form id="qa-form" class="qa-form" onsubmit="return false;">
        <label>Your name <input type="text" id="qa-name" placeholder="Optional" /></label>
        <label>Your question <textarea id="qa-text" rows="4" placeholder="Type your question…"></textarea></label>
        <button type="button" id="qa-submit" class="btn-primary">Submit question</button>
      </form>
      <div id="qa-list" class="qa-list">
        <p class="muted">Questions submitted during the call will appear here.</p>
      </div>
    </section>`;
}

function renderTabPanel(tab, assetPrefix) {
  if (tab.id === "home") return renderHome(tab, assetPrefix);
  if (tab.id === "qa" || tab.interactive) return renderQa(tab);
  if (tab.id === "people") return renderPeople(tab, assetPrefix);
  return renderContentTab(tab, assetPrefix);
}

const SITE_CSS = `
:root {
  --pwc-orange: #FD5108;
  --pwc-orange-dark: #D04A02;
  --pwc-orange-tint: #FFF5ED;
  --pwc-black: #000000;
  --pwc-white: #FFFFFF;
  --pwc-grey-700: #474747;
  --pwc-grey-500: #736F6E;
  --pwc-grey-200: #E8E8E8;
  --pwc-grey-100: #F5F5F5;
  --radius: 4px;
  --font-serif: Georgia, "Times New Roman", serif;
  --font-sans: Arial, Helvetica, sans-serif;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: var(--font-sans);
  color: var(--pwc-black);
  background: var(--pwc-grey-100);
  line-height: 1.6;
}
a { color: var(--pwc-orange); text-decoration: none; }
a:hover { text-decoration: underline; }
h1, h2, h3 { font-family: var(--font-serif); font-weight: 400; }

.site-header {
  background: var(--pwc-black);
  position: sticky;
  top: 0;
  z-index: 100;
}
.header-accent { height: 4px; background: var(--pwc-orange); }
.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  min-height: 60px;
}
.brand { display: flex; align-items: center; gap: 1rem; }
.pwc-logo {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--pwc-white);
  letter-spacing: -0.02em;
  font-family: var(--font-sans);
}
.practice-name {
  color: rgba(255,255,255,0.75);
  font-size: 0.85rem;
  border-left: 1px solid rgba(255,255,255,0.25);
  padding-left: 1rem;
}

.tab-nav {
  display: flex;
  gap: 0.15rem;
  overflow-x: auto;
  padding: 0.35rem 0;
}
.tab-btn {
  border: none;
  background: transparent;
  color: rgba(255,255,255,0.65);
  font: inherit;
  font-size: 0.82rem;
  font-weight: 600;
  padding: 0.5rem 0.85rem;
  border-radius: var(--radius);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.tab-btn:hover { background: rgba(255,255,255,0.1); color: var(--pwc-white); }
.tab-btn.active { background: var(--pwc-orange); color: var(--pwc-white); }

.site-main {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem 4rem;
}
.tab-panel { display: none; animation: fadeIn 0.25s ease; }
.tab-panel.active { display: block; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

.hero {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 2rem;
  align-items: center;
  background: var(--pwc-white);
  border-left: 4px solid var(--pwc-orange);
  padding: 2.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 12px rgba(0,0,0,0.06);
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--pwc-orange);
  margin: 0 0 0.75rem;
}
.hero h1 { font-size: 2.25rem; margin: 0 0 0.35rem; line-height: 1.2; color: var(--pwc-black); }
.hero-date { font-size: 1.1rem; color: var(--pwc-grey-500); margin: 0 0 1rem; }
.lead { font-size: 1rem; color: var(--pwc-grey-700); max-width: 52ch; }
.hero-visual img { width: 100%; max-height: 200px; object-fit: contain; }
.hero-badge {
  width: 120px; height: 120px;
  background: var(--pwc-orange);
  color: var(--pwc-white);
  font-size: 2rem;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  border-radius: 50%;
  margin: 0 auto;
}

.page-header { margin-bottom: 1.5rem; border-bottom: 2px solid var(--pwc-orange); padding-bottom: 1rem; }
.page-header h1 { font-size: 1.75rem; margin: 0 0 0.35rem; }
.subtitle { color: var(--pwc-grey-500); font-size: 1rem; margin: 0; }

.content-section {
  background: var(--pwc-white);
  border: 1px solid var(--pwc-grey-200);
  padding: 1.75rem;
  margin-bottom: 1.25rem;
}
.content-section h2 { margin-top: 0; font-size: 1.15rem; color: var(--pwc-black); }
.sections-stack { display: flex; flex-direction: column; gap: 1.5rem; }
.topic-section { border-left: 3px solid var(--pwc-orange); padding-left: 1.25rem; }
.topic-section h2 { font-size: 1.1rem; margin: 0 0 0.5rem; font-family: var(--font-serif); }
.topic-section p { margin: 0; color: var(--pwc-grey-700); }

.agenda-link {
  background: none; border: none; padding: 0; font: inherit;
  color: var(--pwc-black); cursor: pointer; text-align: left;
}
.agenda-link:hover { color: var(--pwc-orange); text-decoration: underline; }
.agenda-numbered { counter-reset: agenda; }
.agenda-numbered li {
  counter-increment: agenda;
  padding: 0.75rem 0 0.75rem 2.5rem;
  border-bottom: 1px solid var(--pwc-grey-200);
  position: relative;
}
.agenda-numbered li::before {
  content: counter(agenda);
  position: absolute; left: 0;
  width: 1.75rem; height: 1.75rem;
  background: var(--pwc-orange);
  color: var(--pwc-white);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.8rem; font-weight: 700;
}
.check-list { padding-left: 1.25rem; }
.check-list li { margin-bottom: 0.5rem; }

.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
}
.gallery-item { margin: 0; overflow: hidden; border: 1px solid var(--pwc-grey-200); }
.gallery-item img { width: 100%; display: block; }

.people-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
}
.person-card {
  text-align: center;
  padding: 1.25rem;
  border: 1px solid var(--pwc-grey-200);
  background: var(--pwc-grey-100);
}
.avatar {
  width: 48px; height: 48px;
  border-radius: 50%;
  background: var(--pwc-orange);
  color: var(--pwc-white);
  font-size: 1.25rem;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 0.75rem;
}
.person-card h3 { margin: 0 0 0.25rem; font-size: 0.9rem; font-family: var(--font-sans); }
.role { color: var(--pwc-grey-500); font-size: 0.8rem; margin: 0; }

.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}
.profile-card {
  border: 1px solid var(--pwc-grey-200);
  padding: 1.25rem;
  background: var(--pwc-grey-100);
}
.fun-fact { font-size: 0.9rem; color: var(--pwc-orange); }
.section-intro { color: var(--pwc-grey-500); }
.muted { color: var(--pwc-grey-500); }

.qa-panel .qa-form { display: grid; gap: 1rem; margin-bottom: 2rem; }
.qa-panel label { display: grid; gap: 0.35rem; font-weight: 600; font-size: 0.9rem; }
.qa-panel input, .qa-panel textarea {
  font: inherit; padding: 0.65rem 0.85rem;
  border: 1px solid var(--pwc-grey-200); border-radius: var(--radius);
}
.btn-primary, .qa-panel button {
  justify-self: start;
  background: var(--pwc-orange);
  color: var(--pwc-white);
  border: none;
  border-radius: var(--radius);
  padding: 0.65rem 1.5rem;
  font: inherit; font-weight: 600; cursor: pointer;
}
.btn-primary:hover, .qa-panel button:hover { background: var(--pwc-orange-dark); }
.qa-item {
  border: 1px solid var(--pwc-grey-200);
  padding: 1rem;
  margin-bottom: 0.75rem;
  background: var(--pwc-grey-100);
}

.site-footer {
  border-top: 3px solid var(--pwc-orange);
  background: var(--pwc-black);
  color: rgba(255,255,255,0.6);
  padding: 1.5rem;
  text-align: center;
  font-size: 0.75rem;
  line-height: 1.5;
}

@media (max-width: 800px) {
  .hero { grid-template-columns: 1fr; }
  .hero h1 { font-size: 1.5rem; }
  .header-inner { flex-direction: column; align-items: flex-start; padding: 0.75rem 1rem; }
  .practice-name { border-left: none; padding-left: 0; }
}
`;

export function buildWebsiteHtml(session, sessionId, options = {}) {
  const { assetPrefix = "assets/" } = options;
  const model = buildWebsiteModel(session, sessionId);

  const nav = model.tabs
    .map(
      (tab, i) =>
        `<button class="tab-btn${i === 0 ? " active" : ""}" data-tab="${tab.id}" type="button">${escapeHtml(tab.label)}</button>`
    )
    .join("");

  const panels = model.tabs
    .map(
      (tab, i) =>
        `<div class="tab-panel${i === 0 ? " active" : ""}" id="panel-${tab.id}" role="tabpanel">${renderTabPanel(tab, assetPrefix)}</div>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(model.title)} | PwC</title>
  <style>${SITE_CSS}</style>
</head>
<body>
  <header class="site-header">
    <div class="header-accent"></div>
    <div class="header-inner">
      <div class="brand">
        <span class="pwc-logo">pwc</span>
        <span class="practice-name">Oracle Data & Analytics</span>
      </div>
      <nav class="tab-nav" role="tablist">${nav}</nav>
    </div>
  </header>
  <main class="site-main">${panels}</main>
  <footer class="site-footer">${escapeHtml(model.footer)}</footer>
  <script>
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('panel-' + id).classList.add('active');
        history.replaceState(null, '', '#' + id);
      });
    });
    const hash = location.hash.slice(1);
    if (hash) {
      const btn = document.querySelector('[data-tab="' + hash + '"]');
      if (btn) btn.click();
    }
    function goToTab(id) {
      const btn = document.querySelector('[data-tab="' + id + '"]');
      if (btn) { btn.click(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
    }
    document.querySelectorAll('.agenda-link').forEach(link => {
      link.addEventListener('click', () => goToTab(link.dataset.goto));
    });
    const qaSubmit = document.getElementById('qa-submit');
    if (qaSubmit) {
      const list = document.getElementById('qa-list');
      const questions = [];
      qaSubmit.addEventListener('click', () => {
        const name = document.getElementById('qa-name').value.trim() || 'Anonymous';
        const text = document.getElementById('qa-text').value.trim();
        if (!text) return;
        questions.push({ name, text });
        document.getElementById('qa-text').value = '';
        list.innerHTML = questions.map(q =>
          '<article class="qa-item"><strong>' + q.name + '</strong><p>' + q.text + '</p></article>'
        ).join('');
      });
    }
  </script>
</body>
</html>`;
}

export function writeStandalonePreview(session, outputDir, sessionId) {
  const html = buildWebsiteHtml(session, sessionId, { assetPrefix: "assets/" });
  const previewPath = path.join(outputDir, "preview.html");
  const indexPath = path.join(outputDir, "index.html");
  fs.writeFileSync(previewPath, html);
  fs.writeFileSync(indexPath, html);
  return previewPath;
}

export function buildViewerHtml(session, sessionId, options) {
  return buildWebsiteHtml(session, sessionId, options);
}
