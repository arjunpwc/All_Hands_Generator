/** Tabbed website HTML renderer for all-hands sessions. */

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
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const heroImg = tab.images?.[0] ? imgTag(tab.images[0].src, "Oracle D&A", assetPrefix) : "";

  return `
    <section class="hero">
      <div class="hero-text">
        <p class="eyebrow">Oracle Data & Analytics</p>
        <h1>${escapeHtml(tab.headline)}</h1>
        <p class="hero-date">${escapeHtml(tab.subheadline)}</p>
        <p class="lead">${escapeHtml(tab.intro)}</p>
      </div>
      <div class="hero-visual">${heroImg}</div>
    </section>
    <section class="content-section">
      <h2>Today's agenda</h2>
      <ul class="agenda-list">${agenda}</ul>
    </section>`;
}

function renderStrategy(tab, assetPrefix) {
  const pillars = (tab.pillars || [])
    .map(
      (p) => `
      <article class="pillar-card">
        <span class="pillar-tag">${escapeHtml(p.pillar)}</span>
        <h3>${escapeHtml(p.theme)}</h3>
        <p>${escapeHtml(p.detail || "Expanding our impact in FY26.")}</p>
      </article>`
    )
    .join("");

  const highlights = (tab.highlights || [])
    .map((h) => `<li>${escapeHtml(h)}</li>`)
    .join("");

  const imgs = (tab.images || [])
    .slice(0, 3)
    .map((i) => `<div class="media-card">${imgTag(i.src, i.alt, assetPrefix)}</div>`)
    .join("");

  return `
    <section class="page-header">
      <h1>${escapeHtml(tab.headline)}</h1>
      <p class="subtitle">${escapeHtml(tab.subheadline)}</p>
      ${tab.intro ? `<p class="lead">${escapeHtml(tab.intro)}</p>` : ""}
    </section>
    <section class="content-section">
      <h2>Strategic pillars</h2>
      <div class="pillar-grid">${pillars}</div>
    </section>
    <section class="content-section two-col">
      <div>
        <h2>New in FY26</h2>
        <ul class="check-list">${highlights}</ul>
      </div>
      <div class="media-grid">${imgs}</div>
    </section>`;
}

function renderPeople(tab, assetPrefix) {
  const promos = (tab.promotions || [])
    .map(
      (p) => `
      <article class="person-card">
        <div class="avatar">${escapeHtml(p.name.charAt(0))}</div>
        <h3>${escapeHtml(p.name)}</h3>
        <p class="role">${escapeHtml(p.title)}</p>
        <span class="badge">FY26 Promotion</span>
      </article>`
    )
    .join("");

  const rockstars = (tab.rockstars || [])
    .map(
      (r) => `
      <article class="profile-card">
        <h3>${escapeHtml(r.name)}</h3>
        <p class="role">${escapeHtml(r.role)}</p>
        ${r.funFact ? `<p class="fun-fact"><strong>Fun fact:</strong> ${escapeHtml(r.funFact)}</p>` : ""}
        ${r.bio ? `<p>${escapeHtml(r.bio)}</p>` : ""}
      </article>`
    )
    .join("");

  const retirees = (tab.retirees || []).map((n) => `<span class="chip">${escapeHtml(n)}</span>`).join("");

  return `
    <section class="page-header">
      <h1>${escapeHtml(tab.headline)}</h1>
      <p class="subtitle">${escapeHtml(tab.subheadline)}</p>
    </section>
    <section class="content-section">
      <h2>FY26 Promotions</h2>
      <p class="section-intro">Congratulations to all our FY26 D&A promotes!</p>
      <div class="people-grid">${promos}</div>
      ${
        retirees
          ? `<div class="retirees"><h3>Celebrating retirement</h3><div class="chips">${retirees}</div></div>`
          : ""
      }
    </section>
    <section class="content-section">
      <h2>New team members</h2>
      <div class="profile-grid">${rockstars}</div>
    </section>`;
}

function renderMoments(tab, assetPrefix) {
  const gallery = (tab.images || [])
    .map(
      (i, idx) => `
      <figure class="gallery-item">
        ${imgTag(i.src, i.alt, assetPrefix)}
        ${tab.captions?.[idx] ? `<figcaption>${escapeHtml(tab.captions[idx])}</figcaption>` : ""}
      </figure>`
    )
    .join("");

  const captions = (tab.captions || [])
    .map((c) => `<li>${escapeHtml(c)}</li>`)
    .join("");

  return `
    <section class="page-header">
      <h1>${escapeHtml(tab.headline)}</h1>
      <p class="subtitle">${escapeHtml(tab.subheadline)}</p>
    </section>
    <section class="content-section">
      <ul class="moments-list">${captions}</ul>
      <div class="gallery">${gallery}</div>
    </section>`;
}

function renderLearning(tab, assetPrefix) {
  const initiatives = (tab.initiatives || [])
    .map((i) => `<li>${escapeHtml(i)}</li>`)
    .join("");
  const stats = (tab.stats || [])
    .map((s) => `<div class="stat-card"><span>${escapeHtml(s)}</span></div>`)
    .join("");
  const body = (tab.body || []).map((p) => `<p>${escapeHtml(p)}</p>`).join("");

  return `
    <section class="page-header">
      <h1>${escapeHtml(tab.headline)}</h1>
      <p class="subtitle">${escapeHtml(tab.subheadline)}</p>
    </section>
    <section class="content-section two-col">
      <div>
        <h2>FY26 initiatives</h2>
        <ul class="check-list">${initiatives}</ul>
        ${body}
      </div>
      <div>
        <h2>Certification progress</h2>
        <div class="stats-grid">${stats}</div>
        ${tab.images?.[0] ? `<div class="media-card">${imgTag(tab.images[0].src, "", assetPrefix)}</div>` : ""}
      </div>
    </section>`;
}

function renderQa(tab) {
  return `
    <section class="page-header">
      <h1>${escapeHtml(tab.headline)}</h1>
      <p class="subtitle">${escapeHtml(tab.subheadline)}</p>
      <p class="lead">${escapeHtml(tab.intro)}</p>
    </section>
    <section class="content-section qa-panel">
      <form id="qa-form" class="qa-form" onsubmit="return false;">
        <label>Your name <input type="text" id="qa-name" placeholder="Optional" /></label>
        <label>Your question <textarea id="qa-text" rows="4" placeholder="Type your question…"></textarea></label>
        <button type="button" id="qa-submit">Submit question</button>
      </form>
      <div id="qa-list" class="qa-list">
        <p class="muted">Questions submitted during the call will appear here.</p>
      </div>
    </section>`;
}

function renderResources(tab, assetPrefix) {
  return (tab.sections || [])
    .map((sec) => {
      const bullets = (sec.bullets || [])
        .slice(0, 16)
        .map((b) => `<li>${escapeHtml(b)}</li>`)
        .join("");
      const imgs = (sec.images || [])
        .slice(0, 2)
        .map((i) => imgTag(i.src, i.alt, assetPrefix))
        .join("");
      return `
        <section class="content-section resource-block">
          <h2>${escapeHtml(sec.title)}</h2>
          <div class="two-col">
            <ul class="resource-list">${bullets}</ul>
            <div>${imgs}</div>
          </div>
        </section>`;
    })
    .join("");
}

function renderTabPanel(tab, assetPrefix) {
  switch (tab.id) {
    case "home":
      return renderHome(tab, assetPrefix);
    case "strategy":
      return renderStrategy(tab, assetPrefix);
    case "people":
      return renderPeople(tab, assetPrefix);
    case "moments":
      return renderMoments(tab, assetPrefix);
    case "learning":
      return renderLearning(tab, assetPrefix);
    case "qa":
      return renderQa(tab);
    case "resources":
      return `<section class="page-header"><h1>${escapeHtml(tab.headline)}</h1><p class="subtitle">${escapeHtml(tab.subheadline)}</p></section>${renderResources(tab, assetPrefix)}`;
    default:
      return `<section class="content-section"><p>Content coming soon.</p></section>`;
  }
}

const SITE_CSS = `
:root {
  --orange: #fd5108;
  --orange-light: #ffaa72;
  --ink: #1a1a2e;
  --muted: #5c6578;
  --bg: #f7f8fa;
  --surface: #ffffff;
  --border: #e2e6ed;
  --shadow: 0 4px 24px rgba(26, 26, 46, 0.08);
  --radius: 12px;
  --font: "Segoe UI", system-ui, -apple-system, sans-serif;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: var(--font);
  color: var(--ink);
  background: var(--bg);
  line-height: 1.6;
}
a { color: var(--orange); text-decoration: none; }
a:hover { text-decoration: underline; }

.site-header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 1px 8px rgba(0,0,0,0.04);
}
.header-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  min-height: 64px;
}
.brand {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--ink);
  white-space: nowrap;
}
.brand span { color: var(--orange); }

.tab-nav {
  display: flex;
  gap: 0.25rem;
  overflow-x: auto;
  padding: 0.5rem 0;
}
.tab-btn {
  border: none;
  background: transparent;
  color: var(--muted);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.55rem 1rem;
  border-radius: 999px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.15s;
}
.tab-btn:hover { background: #fff3ec; color: var(--orange); }
.tab-btn.active {
  background: var(--orange);
  color: #fff;
}

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
  grid-template-columns: 1.2fr 1fr;
  gap: 2rem;
  align-items: center;
  background: linear-gradient(135deg, #fff 0%, #fff8f4 100%);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2.5rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow);
}
.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--orange);
  margin: 0 0 0.5rem;
}
.hero h1 { font-size: 2.5rem; margin: 0 0 0.25rem; line-height: 1.15; }
.hero-date { font-size: 1.25rem; color: var(--muted); margin: 0 0 1rem; }
.lead { font-size: 1.05rem; color: var(--muted); max-width: 52ch; }
.hero-visual img { width: 100%; max-height: 220px; object-fit: contain; }

.page-header { margin-bottom: 2rem; }
.page-header h1 { font-size: 2rem; margin: 0 0 0.35rem; }
.subtitle { color: var(--muted); font-size: 1.1rem; margin: 0; }

.content-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.75rem;
  margin-bottom: 1.5rem;
  box-shadow: var(--shadow);
}
.content-section h2 { margin-top: 0; font-size: 1.25rem; }

.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 2rem;
  align-items: start;
}
.agenda-list, .check-list, .moments-list, .resource-list {
  padding-left: 1.25rem;
}
.agenda-list li, .check-list li { margin-bottom: 0.5rem; }

.pillar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1rem;
}
.pillar-card {
  background: #fff8f4;
  border: 1px solid #ffe0cc;
  border-radius: var(--radius);
  padding: 1.25rem;
}
.pillar-tag {
  display: inline-block;
  background: var(--orange);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  margin-bottom: 0.5rem;
}
.pillar-card h3 { margin: 0.35rem 0; font-size: 1rem; }
.pillar-card p { margin: 0; font-size: 0.9rem; color: var(--muted); }

.people-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 1rem;
}
.person-card {
  text-align: center;
  padding: 1.25rem;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: #fafbfc;
}
.avatar {
  width: 56px; height: 56px;
  border-radius: 50%;
  background: var(--orange);
  color: #fff;
  font-size: 1.5rem;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 0.75rem;
}
.person-card h3 { margin: 0 0 0.25rem; font-size: 0.95rem; }
.role { color: var(--muted); font-size: 0.85rem; margin: 0 0 0.5rem; }
.badge {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  background: #e8f5e9;
  color: #2e7d32;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
}

.profile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}
.profile-card {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 1.25rem;
  background: #fafbfc;
}
.profile-card h3 { margin: 0 0 0.25rem; }
.fun-fact { font-size: 0.9rem; color: var(--orange); }

.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
}
.gallery-item {
  margin: 0;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
}
.gallery-item img { width: 100%; display: block; aspect-ratio: 4/3; object-fit: cover; }
.gallery-item figcaption { padding: 0.75rem; font-size: 0.85rem; background: #fafbfc; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}
.stat-card {
  background: #fff3ec;
  border-radius: 8px;
  padding: 0.75rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.85rem;
}

.media-grid { display: grid; gap: 1rem; }
.media-card img { width: 100%; border-radius: 8px; }

.chips { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.chip {
  background: #eef2f7;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  font-size: 0.9rem;
}
.retirees { margin-top: 1.5rem; }
.section-intro { color: var(--muted); }

.qa-panel .qa-form {
  display: grid;
  gap: 1rem;
  margin-bottom: 2rem;
}
.qa-panel label { display: grid; gap: 0.35rem; font-weight: 600; font-size: 0.9rem; }
.qa-panel input, .qa-panel textarea {
  font: inherit;
  padding: 0.65rem 0.85rem;
  border: 1px solid var(--border);
  border-radius: 8px;
}
.qa-panel button {
  justify-self: start;
  background: var(--orange);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 0.65rem 1.25rem;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
}
.qa-item {
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 0.75rem;
  background: #fafbfc;
}
.muted { color: var(--muted); }

.site-footer {
  border-top: 1px solid var(--border);
  background: var(--surface);
  padding: 1.5rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--muted);
}

@media (max-width: 800px) {
  .hero, .two-col { grid-template-columns: 1fr; }
  .hero h1 { font-size: 1.75rem; }
  .header-inner { flex-direction: column; align-items: stretch; }
}
`;

export function buildWebsiteHtml(session, sessionId, options = {}) {
  const { assetPrefix = "assets/", standalone = true } = options;
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
  <title>${escapeHtml(model.title)}</title>
  <style>${SITE_CSS}</style>
</head>
<body>
  <header class="site-header">
    <div class="header-inner">
      <div class="brand">Oracle <span>D&A</span></div>
      <nav class="tab-nav" role="tablist">${nav}</nav>
    </div>
  </header>
  <main class="site-main">${panels}</main>
  <footer class="site-footer">${escapeHtml(model.footer)}</footer>
  <script>
    const tabs = document.querySelectorAll('.tab-btn');
    const panels = document.querySelectorAll('.tab-panel');
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.tab;
        tabs.forEach(t => t.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));
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

    const qaSubmit = document.getElementById('qa-submit');
    if (qaSubmit) {
      const list = document.getElementById('qa-list');
      const questions = [];
      qaSubmit.addEventListener('click', () => {
        const name = document.getElementById('qa-name').value.trim() || 'Anonymous';
        const text = document.getElementById('qa-text').value.trim();
        if (!text) return;
        questions.push({ name, text, votes: 0 });
        document.getElementById('qa-text').value = '';
        list.innerHTML = questions.map((q, i) =>
          '<article class="qa-item"><strong>' + q.name + '</strong><p>' + q.text + '</p></article>'
        ).join('');
      });
    }
  </script>
</body>
</html>`;
}

export function writeStandalonePreview(session, outputDir, sessionId) {
  const html = buildWebsiteHtml(session, sessionId, { assetPrefix: "assets/", standalone: true });
  const previewPath = path.join(outputDir, "preview.html");
  const indexPath = path.join(outputDir, "index.html");
  fs.writeFileSync(previewPath, html);
  fs.writeFileSync(indexPath, html);
  return previewPath;
}

// Keep legacy export name for preview-server
export function buildViewerHtml(session, sessionId, options) {
  return buildWebsiteHtml(session, sessionId, options);
}
