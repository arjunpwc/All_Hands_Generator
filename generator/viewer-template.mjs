/** Tabbed website HTML renderer — PwC branded, structured content blocks. */

import fs from "fs";
import path from "path";
import { buildWebsiteModel } from "./site-builder.mjs";
import { renderUsTalentMap, MOVEMENT_TYPES } from "./people-map.mjs";

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

function renderMetricsGrid(metrics, className = "metrics-grid") {
  if (!metrics?.length) return "";
  return `<div class="${className}">${metrics
    .map(
      (m) => `
    <div class="metric-card">
      <div class="metric-value">${escapeHtml(m.value)}</div>
      <div class="metric-label">${escapeHtml(m.label)}</div>
    </div>`
    )
    .join("")}</div>`;
}

function renderImages(imgs, assetPrefix, layout = "stack") {
  if (!imgs?.length) return "";
  const cls = layout === "grid" ? "image-grid" : "image-stack";
  return `<div class="${cls}">${imgs
    .map((i) => `<figure class="slide-figure">${imgTag(i.src, i.alt, assetPrefix)}</figure>`)
    .join("")}</div>`;
}

function renderDonutChart(items) {
  if (!items?.length) return "";
  const total = items.reduce((sum, i) => sum + parseFloat(i.value), 0) || 100;
  let cumulative = 0;
  const stops = items
    .map((item) => {
      const pct = (parseFloat(item.value) / total) * 100;
      const start = cumulative;
      cumulative += pct;
      return `${item.color} ${start}% ${cumulative}%`;
    })
    .join(", ");

  const legend = items
    .map(
      (item) => `
    <div class="donut-legend-item">
      <span class="donut-swatch" style="background:${item.color}"></span>
      <span class="donut-legend-label">${escapeHtml(item.label)}</span>
      <span class="donut-legend-value">${escapeHtml(item.value)}</span>
    </div>`
    )
    .join("");

  return `
  <div class="donut-chart-wrap">
    <div class="donut-chart" style="background: conic-gradient(${stops})">
      <div class="donut-hole"><span>Industry<br>Split</span></div>
    </div>
    <div class="donut-legend">${legend}</div>
  </div>`;
}

function renderClientGrid(clients) {
  if (!clients?.clients?.length) return "";
  const cards = clients.clients
    .map((name) => {
      const initials = name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
      return `
      <div class="client-card">
        <div class="client-logo">${escapeHtml(initials)}</div>
        <div class="client-name">${escapeHtml(name)}</div>
      </div>`;
    })
    .join("");

  return `
  <div class="clients-section">
    <h3>Our Clients</h3>
    ${clients.summary ? `<p class="clients-summary">${escapeHtml(clients.summary)}</p>` : ""}
    <div class="client-grid">${cards}</div>
  </div>`;
}

function renderClientsTable(clients) {
  if (!clients?.rows?.length) return renderClientGrid(clients);
  const rows = clients.rows
    .map(
      ([left, right]) =>
        `<tr><td>${escapeHtml(left)}</td><td>${right ? escapeHtml(right) : "&nbsp;"}</td></tr>`
    )
    .join("");

  return `
  <div class="clients-section clients-section-table">
    <h3>Our Clients</h3>
    ${clients.summary ? `<p class="clients-summary">${escapeHtml(clients.summary)}</p>` : ""}
    <table class="clients-table"><tbody>${rows}</tbody></table>
  </div>`;
}

function renderClientsSection(clients) {
  if (!clients?.clients?.length && !clients?.rows?.length) return "";
  return clients.layout === "table" ? renderClientsTable(clients) : renderClientGrid(clients);
}

function renderIndustryChart(block, assetPrefix) {
  if (block.industryChart?.src) {
    const src = block.industryChart.src;
    const url = src.startsWith("assets/") ? assetPrefix + src.slice(7) : assetPrefix + src;
    return `<div class="industry-section">
      <img class="industry-chart-svg" src="${escapeHtml(url)}" alt="Industry Split of Projects" loading="lazy" />
    </div>`;
  }
  if (block.industrySplit?.length) {
    return `<div class="industry-section">
      <h3>Industry Split of Projects</h3>
      ${renderDonutChart(block.industrySplit)}
    </div>`;
  }
  return "";
}

function renderFinancial(block, assetPrefix) {
  const chartHtml = renderIndustryChart(block, assetPrefix);
  const clientsHtml = renderClientsSection(block.clients);
  const useTableRow = block.clients?.layout === "table" && (chartHtml || clientsHtml);
  const visualSection = useTableRow
    ? `<div class="financial-visual-row">${chartHtml}${clientsHtml}</div>`
    : `${chartHtml}${clientsHtml}`;

  return `
  <article class="content-block financial-block">
    <header class="block-header">
      <h2>${escapeHtml(block.title)}</h2>
      ${block.subtitle ? `<p class="block-subtitle">${escapeHtml(block.subtitle)}</p>` : ""}
    </header>
    ${renderMetricsGrid(block.keyMetrics, "metrics-grid metrics-primary")}
    ${block.notes?.length ? `<p class="block-note">${escapeHtml(block.notes[0])}</p>` : ""}
    ${visualSection}
    ${renderImages(block.images, assetPrefix, "stack")}
  </article>`;
}

function renderDashboardMetricCards(metrics, icons, assetPrefix) {
  if (!metrics?.length) return "";
  return `<div class="dashboard-metrics">${metrics
    .map((m, i) => {
      const icon = icons?.[i]
        ? `<div class="dashboard-metric-icon">${imgTag(icons[i].src, m.label, assetPrefix)}</div>`
        : "";
      return `
      <div class="dashboard-metric-card">
        ${icon}
        <div class="dashboard-metric-value">${escapeHtml(m.value)}</div>
        <div class="dashboard-metric-label">${escapeHtml(m.label)}</div>
      </div>`;
    })
    .join("")}</div>`;
}

function renderDashboardChart(chart, assetPrefix, className = "dashboard-chart") {
  if (!chart?.src) return "";
  const src = chart.src;
  const url = src.startsWith("assets/") ? assetPrefix + src.slice(7) : assetPrefix + src;
  return `<img class="${className}" src="${escapeHtml(url)}" alt="${escapeHtml(chart.alt || "Chart")}" loading="lazy" />`;
}

function renderDashboard(block, assetPrefix) {
  const delivery = block.deliveryImpact || {};
  const team = block.teamSizeGrowth || {};
  const utilization = block.utilizationTrend || {};
  const ai = block.aiCapability || {};
  const adapt = block.aiAdaptability || {};
  const clients = block.ourClients || {};

  const clientLogos = (clients.images || [])
    .map(
      (img) =>
        `<figure class="client-logo-item">${imgTag(img.src, img.alt || "Client", assetPrefix)}</figure>`
    )
    .join("");

  return `
  <article class="content-block dashboard-block">
    <header class="block-header">
      <h2>${escapeHtml(block.title)}</h2>
      ${block.subtitle ? `<p class="block-subtitle">${escapeHtml(block.subtitle)}</p>` : ""}
    </header>

    <div class="dashboard-top-row">
      <section class="dashboard-panel">
        <h3>Delivery Impact</h3>
        ${renderDashboardMetricCards(delivery.metrics, delivery.images, assetPrefix)}
      </section>
      <section class="dashboard-panel dashboard-panel-ai">
        <h3>AI Capability</h3>
        ${renderDashboardMetricCards(ai.metrics?.slice(0, 1), ai.images?.slice(0, 1), assetPrefix)}
        ${
          ai.skills?.length
            ? `<div class="dashboard-skills">
            <div class="dashboard-skills-label">AI Skills Added</div>
            <div class="tag-row">${ai.skills.map((s) => `<span class="tag">${escapeHtml(s)}</span>`).join("")}</div>
          </div>`
            : ""
        }
        ${renderDashboardMetricCards(ai.metrics?.slice(1), ai.images?.slice(1), assetPrefix)}
        ${
          ai.ess
            ? `<div class="dashboard-ess">
            <div class="dashboard-ess-value">${escapeHtml(ai.ess)}</div>
            <div class="dashboard-ess-label">${escapeHtml(ai.essLabel || "Engagement Satisfaction Survey (ESS)")}</div>
          </div>`
            : ""
        }
      </section>
    </div>

    <div class="dashboard-mid-row">
      <section class="dashboard-panel dashboard-panel-chart">
        <h3>Team Size Growth</h3>
        ${team.stat ? `<p class="dashboard-stat">${escapeHtml(team.stat)}</p>` : ""}
        ${renderDashboardChart(team.chart, assetPrefix)}
      </section>
      <section class="dashboard-panel dashboard-panel-chart">
        <h3>Utilization Trend</h3>
        ${renderDashboardChart(utilization.chart, assetPrefix)}
      </section>
      <section class="dashboard-panel dashboard-panel-chart dashboard-panel-adapt">
        <h3>AI Adaptability</h3>
        ${
          adapt.metric
            ? `<div class="dashboard-adapt-value">${escapeHtml(adapt.metric.value)}</div>
           <div class="dashboard-adapt-label">${escapeHtml(adapt.metric.label)}</div>`
            : ""
        }
        ${renderDashboardChart(adapt.chart, assetPrefix, "dashboard-chart dashboard-chart-compact")}
      </section>
    </div>

    ${
      clientLogos
        ? `<section class="dashboard-panel dashboard-panel-clients">
        <h3>Our Clients</h3>
        <div class="client-logo-grid">${clientLogos}</div>
      </section>`
        : ""
    }
  </article>`;
}

function renderPeopleTable(block, assetPrefix) {
  const levelHeader = block.columns === 2 ? "Management Level" : "Level";
  const cols =
    block.type === "promotions-table"
      ? ["Name", "Capability", "Office", "Promoted To", "Development Leader"]
      : block.showMap
        ? ["", "Name", levelHeader, "Office City", "Type"]
        : block.columns === 2
          ? ["Name", levelHeader]
          : ["Name", levelHeader, "Office City"];

  const rows = block.rows
    .map((r) => {
      if (block.type === "promotions-table") {
        return `<tr><td>${escapeHtml(r.name)}</td><td>${escapeHtml(r.capability)}</td><td>${escapeHtml(r.office)}</td><td><span class="badge">${escapeHtml(r.promotedTo)}</span></td><td>${escapeHtml(r.leader)}</td></tr>`;
      }
      const type = MOVEMENT_TYPES[r.movementType] || MOVEMENT_TYPES["new-hire"];
      const personId = r.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const swatch = block.showMap
        ? `<td><span class="movement-swatch" style="background:${type.color}" title="${escapeHtml(type.label)}"></span></td>`
        : "";
      const typeCell = block.showMap
        ? `<td><span class="movement-type-label" style="color:${type.color}">${escapeHtml(type.label)}</span></td>`
        : "";
      const officeCell =
        block.columns === 2 ? "" : `<td>${escapeHtml(r.office || "")}</td>`;
      return `<tr class="people-row" data-person="${escapeHtml(personId)}">${swatch}<td><strong>${escapeHtml(r.name)}</strong></td><td>${escapeHtml(r.level)}</td>${officeCell}${typeCell}</tr>`;
    })
    .join("");

  const mapSection = block.showMap ? `<div class="people-map-layout">${renderUsTalentMap(block.rows)}</div>` : renderImages(block.images, assetPrefix, "stack");

  return `
  <article class="content-block table-block${block.showMap ? " people-map-block" : ""}">
    <header class="block-header">
      <h2>${escapeHtml(block.title)}</h2>
      ${block.subtitle ? `<p class="block-subtitle">${escapeHtml(block.subtitle)}</p>` : ""}
    </header>
    ${mapSection}
    <div class="table-wrap">
      <table class="data-table${block.showMap ? " people-map-table" : ""}">
        <thead><tr>${cols.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  </article>`;
}

function renderProfile(block, assetPrefix) {
  const photo = block.images?.[0]
    ? `<div class="profile-photo">${imgTag(block.images[0].src, block.title, assetPrefix)}</div>`
    : "";

  return `
  <article class="content-block profile-block">
    <div class="profile-layout">
      ${photo}
      <div class="profile-body">
        <header class="block-header">
          <h2>${escapeHtml(block.title)}</h2>
          ${block.roleLine ? `<p class="profile-role">${escapeHtml(block.roleLine)}</p>` : ""}
        </header>
        ${block.bio.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}
        ${block.funFact ? `<p class="fun-fact"><strong>Fun facts:</strong> ${escapeHtml(block.funFact)}</p>` : ""}
      </div>
    </div>
  </article>`;
}

function renderOrgDesign(block) {
  return `
  <article class="content-block org-block">
    <header class="block-header">
      <h2>${escapeHtml(block.title)}</h2>
      ${block.description ? `<p class="lead-text">${escapeHtml(block.description)}</p>` : ""}
    </header>
    ${
      block.leadership?.length
        ? `<div class="org-section">
        <h3>Leadership</h3>
        <ul class="leadership-list">${block.leadership.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>
      </div>`
        : ""
    }
    <div class="pillar-grid">
      ${(block.pillars || [])
        .map(
          (p) => `
        <div class="pillar-card">
          <h3>${escapeHtml(p.name)}</h3>
          <ul>${p.items.map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
        </div>`
        )
        .join("")}
    </div>
  </article>`;
}

const APOLLO_VALUE_COLOR = "#0F6E56";
const APOLLO_DELIVERY_COLOR = "#D04A02";

function apolloColorText(text) {
  return escapeHtml(text)
    .replace(
      /AI for Value/g,
      `<strong class="apollo-text-value" style="color:${APOLLO_VALUE_COLOR} !important;font-weight:700">AI for Value</strong>`
    )
    .replace(
      /AI for Delivery/g,
      `<strong class="apollo-text-delivery" style="color:${APOLLO_DELIVERY_COLOR} !important;font-weight:700">AI for Delivery</strong>`
    );
}

function renderApolloRoadmapNote() {
  return `
  <div class="apollo-roadmap-callout">
    <p class="apollo-roadmap-lead">${apolloColorText(
      "Every team runs this schedule on two lanes: AI for Value and AI for Delivery. CT&I builds alongside every pod, contributing PMs and AI engineers so we build together."
    )}</p>
  </div>`;
}

function renderApolloProgram(block) {
  const programs = (block.programs || [])
    .map(
      (p, i) => `
    <div class="apollo-program-card${p.highlight ? " apollo-program-highlight" : ""}">
      <h3>${escapeHtml(p.name)}</h3>
      <p>${escapeHtml(p.description)}</p>
    </div>
    ${i === 0 ? `
    <div class="apollo-program-connector" aria-hidden="true">
      <div class="apollo-program-arrow">
        <div class="apollo-program-arrow-line"></div>
        <span class="apollo-program-arrow-label">DCM</span>
        <div class="apollo-program-arrow-line"></div>
        <div class="apollo-program-arrow-head"></div>
      </div>
    </div>` : ""}`
    )
    .join("");

  const valueModes = (block.valueModes || [])
    .map(
      (m) => `
    <div class="apollo-value-card apollo-value-${escapeHtml(m.accent)}">
      <h3>${apolloColorText(m.name)}</h3>
      <p>${apolloColorText(m.description)}</p>
      <p class="apollo-value-metrics">${apolloColorText(m.metrics)}</p>
    </div>`
    )
    .join("");

  const steps = (block.steps || [])
    .map(
      (s) => `
    <div class="apollo-step apollo-step-${escapeHtml(s.accent)}">
      <div class="apollo-step-num">${s.num}</div>
      <div class="apollo-step-body">
        <strong>${escapeHtml(s.title)}</strong>
        <span>${escapeHtml(s.detail)}</span>
      </div>
    </div>`
    )
    .join("");

  return `
  <article class="content-block apollo-block">
    <header class="block-header">
      <p class="eyebrow">${escapeHtml(block.eyebrow || "The Program")}</p>
      <h2>${escapeHtml(block.title)}</h2>
      ${block.subtitle ? `<p class="block-subtitle">${apolloColorText(block.subtitle)}</p>` : ""}
      ${block.intro ? `<p class="lead-text">${apolloColorText(block.intro)}</p>` : ""}
    </header>

    <div class="apollo-program-stack">${programs}</div>

    <section class="apollo-value-section">
      <h3>${apolloColorText(block.valueModesHeading || "Two value modes")}</h3>
      <div class="apollo-value-grid">${valueModes}</div>
    </section>

    <section class="apollo-roadmap-section">
      <div class="apollo-roadmap">${steps}</div>
      ${renderApolloRoadmapNote()}
    </section>
  </article>`;
}

function renderPlaceholder(block) {
  return `
  <article class="content-block placeholder-block">
    <header class="block-header">
      <h2>${escapeHtml(block.title)}</h2>
    </header>
    <div class="placeholder-card">
      <div class="placeholder-icon">🚀</div>
      <p>${escapeHtml(block.description)}</p>
      <span class="placeholder-badge">Coming soon</span>
    </div>
  </article>`;
}

function renderSectorList(block) {
  return `
  <article class="content-block sector-block">
    <header class="block-header">
      <h2>${escapeHtml(block.title)}</h2>
    </header>
    <div class="sector-grid">
      ${(block.assignments || [])
        .map(
          (a) => `
        <div class="sector-card">
          <div class="sector-name">${escapeHtml(a.name)}</div>
          ${a.sector ? `<div class="sector-tag">${escapeHtml(a.sector)}</div>` : ""}
        </div>`
        )
        .join("")}
    </div>
  </article>`;
}

const CERT_COLORS = { FDI: "#1B2A4A", AI: "#EB8C00", OCI: "#0F6E56", Other: "#6B7280" };

function renderCertDistribution(dist) {
  if (!dist?.length) return "";
  const total = dist.reduce((s, d) => s + d.value, 0) || 1;
  const segments = dist
    .map((d) => {
      const pct = (d.value / total) * 100;
      const color = CERT_COLORS[d.label] || "#6B7280";
      return `<div class="cert-dist-segment" style="width:${pct}%;background:${color}" title="${escapeHtml(d.label)}: ${d.value}"></div>`;
    })
    .join("");
  const legend = dist
    .map((d) => {
      const color = CERT_COLORS[d.label] || "#6B7280";
      return `<div class="cert-dist-legend-item"><span class="cert-dist-swatch" style="background:${color}"></span><span>${escapeHtml(d.label)}</span><strong>${d.value}</strong></div>`;
    })
    .join("");

  return `
  <div class="cert-distribution">
    <div class="cert-dist-label">Active Certification Distribution</div>
    <div class="cert-dist-bar">${segments}</div>
    <div class="cert-dist-legend">${legend}</div>
  </div>`;
}

function renderCertRegion(region) {
  if (!region) return "";
  return `
  <div class="cert-region">
    <h4>${escapeHtml(region.label)}</h4>
    <div class="cert-progress-wrap">
      <div class="cert-progress-bar"><div class="cert-progress-fill" style="width:${region.pct}%"></div></div>
      <div class="cert-progress-score">${escapeHtml(region.progress)}</div>
    </div>
    ${renderCertDistribution(region.distribution)}
  </div>`;
}

function renderTraining(block, assetPrefix) {
  const iconHtml = block.icon
    ? `<div class="training-icon">${imgTag(block.icon.src, "Learning", assetPrefix)}</div>`
    : "";

  return `
  <article class="content-block training-block">
    <header class="block-header">
      <h2>${escapeHtml(block.title)}</h2>
      ${block.subtitle ? `<p class="block-subtitle">${escapeHtml(block.subtitle)}</p>` : ""}
    </header>

    ${block.intro ? `<p class="training-intro">${escapeHtml(block.intro)}</p>` : ""}

    <div class="training-initiatives-row">
      <div class="training-column">
        <p class="training-col-desc">${escapeHtml(block.trainingSessions?.subheading || "")}</p>
        <ul>${(block.trainingSessions?.items || []).map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
        <h3>${escapeHtml(block.trainingSessions?.heading || "Training Sessions")}</h3>
      </div>
      <div class="training-column">
        <p class="training-col-lead">${escapeHtml(block.selfLearningInternal?.description || "")}</p>
        <h3>${escapeHtml(block.selfLearningInternal?.heading || "Self Learning (internal)")}</h3>
      </div>
      <div class="training-column">
        <p class="training-col-lead">${escapeHtml(block.selfLearningExternal?.description || "")}</p>
        <h3>${escapeHtml(block.selfLearningExternal?.heading || "Self Learning (external)")}</h3>
      </div>
      ${iconHtml}
    </div>

    ${block.catalogNote ? `<p class="training-catalog-note">${escapeHtml(block.catalogNote)}</p>` : ""}

    <div class="training-requirements">
      <h3>${escapeHtml(block.firmRequirements?.heading || "Recap: Firm L&D Requirements")}</h3>
      <ul>${(block.firmRequirements?.items || []).map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
    </div>

    <div class="training-cert-section">
      <h3>${escapeHtml(block.certProgress?.heading || "Active Certifications — Team Progress")}</h3>
      <div class="cert-progress-grid">
        ${renderCertRegion(block.certProgress?.us)}
        ${renderCertRegion(block.certProgress?.ac)}
      </div>
      ${block.certProgress?.footnote ? `<p class="cert-footnote">${escapeHtml(block.certProgress.footnote)}</p>` : ""}
    </div>

    ${block.callout ? `<div class="highlight-banner">${escapeHtml(block.callout)}</div>` : ""}
  </article>`;
}

function renderPhotoGallery(block, assetPrefix) {
  return `
  <article class="content-block gallery-block">
    <header class="block-header">
      <h2>${escapeHtml(block.title)}</h2>
      <p class="lead-text">${escapeHtml(block.description)}</p>
      ${block.link ? `<p class="block-link">${escapeHtml(block.link)}</p>` : ""}
    </header>
    ${renderImages(block.images, assetPrefix, "grid")}
  </article>`;
}

function renderBlock(block, assetPrefix) {
  switch (block.type) {
    case "financial":
      return renderFinancial(block, assetPrefix);
    case "dashboard":
      return renderDashboard(block, assetPrefix);
    case "people-table":
    case "promotions-table":
      return renderPeopleTable(block, assetPrefix);
    case "profile":
      return renderProfile(block, assetPrefix);
    case "org-design":
      return renderOrgDesign(block);
    case "apollo-program":
      return renderApolloProgram(block);
    case "placeholder":
      return renderPlaceholder(block);
    case "sector-list":
      return renderSectorList(block);
    case "training":
      return renderTraining(block, assetPrefix);
    case "photo-gallery":
      return renderPhotoGallery(block, assetPrefix);
    default:
      return `<article class="content-block"><h2>${escapeHtml(block.title)}</h2><ul>${(block.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul></article>`;
  }
}

function renderHome(tab, assetPrefix) {
  const agenda = (tab.agenda || [])
    .map(
      (item) =>
        `<li><button type="button" class="agenda-link" data-goto="${escapeHtml(item.tabId)}">${escapeHtml(item.label)}</button></li>`
    )
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
    <section class="content-section agenda-section">
      <h2>Agenda</h2>
      <ol class="agenda-list agenda-numbered">${agenda}</ol>
    </section>`;
}

function renderContentTab(tab, assetPrefix) {
  const blocksHtml = (tab.blocks || []).map((b) => renderBlock(b, assetPrefix)).join("");
  return `
    <section class="page-header">
      <h1>${escapeHtml(tab.headline)}</h1>
      ${tab.intro ? `<p class="lead">${escapeHtml(tab.intro)}</p>` : ""}
    </section>
    <div class="blocks-stack">${blocksHtml}</div>`;
}

function renderQa(tab) {
  return `
    <section class="page-header">
      <h1>${escapeHtml(tab.headline || "Q&A")}</h1>
      <p class="subtitle">${escapeHtml(tab.subheadline || "We're all ears — ask away!")}</p>
      <p class="lead">${escapeHtml(tab.intro || "Submit your questions during the live session.")}</p>
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
  --radius: 6px;
  --font-serif: Georgia, "Times New Roman", serif;
  --font-sans: Arial, Helvetica, sans-serif;
  --shadow: 0 2px 12px rgba(0,0,0,0.06);
}
* { box-sizing: border-box; }
body { margin: 0; font-family: var(--font-sans); color: var(--pwc-black); background: var(--pwc-grey-100); line-height: 1.6; }
h1, h2, h3 { font-family: var(--font-serif); font-weight: 400; }

.site-header { background: var(--pwc-black); position: sticky; top: 0; z-index: 100; }
.header-accent { height: 4px; background: var(--pwc-orange); }
.header-inner { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; min-height: 60px; }
.brand { display: flex; align-items: center; gap: 1rem; }
.pwc-logo { font-size: 1.75rem; font-weight: 700; color: var(--pwc-white); font-family: var(--font-sans); }
.practice-name { color: rgba(255,255,255,0.75); font-size: 0.85rem; border-left: 1px solid rgba(255,255,255,0.25); padding-left: 1rem; }

.tab-nav { display: flex; gap: 0.15rem; overflow-x: auto; padding: 0.35rem 0; }
.tab-btn { border: none; background: transparent; color: rgba(255,255,255,0.65); font: inherit; font-size: 0.82rem; font-weight: 600; padding: 0.5rem 0.85rem; border-radius: var(--radius); cursor: pointer; white-space: nowrap; transition: all 0.15s; }
.tab-btn:hover { background: rgba(255,255,255,0.1); color: var(--pwc-white); }
.tab-btn.active { background: var(--pwc-orange); color: var(--pwc-white); }

.site-main { max-width: 1200px; margin: 0 auto; padding: 2rem 1.5rem 4rem; }
.tab-panel { display: none; animation: fadeIn 0.25s ease; }
.tab-panel.active { display: block; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

.hero { display: grid; grid-template-columns: 1.3fr 1fr; gap: 2rem; align-items: center; background: var(--pwc-white); border-left: 4px solid var(--pwc-orange); padding: 2.5rem; margin-bottom: 1.5rem; box-shadow: var(--shadow); }
.eyebrow { text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.7rem; font-weight: 700; color: var(--pwc-orange); margin: 0 0 0.75rem; }
.hero h1 { font-size: 2.25rem; margin: 0 0 0.35rem; line-height: 1.2; }
.hero-date { font-size: 1.1rem; color: var(--pwc-grey-500); margin: 0 0 1rem; }
.lead { font-size: 1rem; color: var(--pwc-grey-700); max-width: 60ch; margin: 0; }
.hero-visual img { width: 100%; max-height: 200px; object-fit: contain; }
.hero-badge { width: 120px; height: 120px; background: var(--pwc-orange); color: var(--pwc-white); font-size: 2rem; font-weight: 700; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin: 0 auto; }

.page-header { margin-bottom: 1.75rem; border-bottom: 2px solid var(--pwc-orange); padding-bottom: 1rem; }
.page-header h1 { font-size: 1.85rem; margin: 0 0 0.5rem; }
.subtitle { color: var(--pwc-grey-500); font-size: 1rem; margin: 0 0 0.5rem; }

.content-section { background: var(--pwc-white); border: 1px solid var(--pwc-grey-200); padding: 1.75rem; margin-bottom: 1.25rem; box-shadow: var(--shadow); }
.blocks-stack { display: flex; flex-direction: column; gap: 1.5rem; }

.content-block { background: var(--pwc-white); border: 1px solid var(--pwc-grey-200); padding: 1.75rem; box-shadow: var(--shadow); border-left: 4px solid var(--pwc-orange); }
.block-header h2 { font-size: 1.35rem; margin: 0 0 0.35rem; }
.block-subtitle { color: var(--pwc-grey-500); font-size: 0.95rem; margin: 0 0 1rem; }
.block-note { font-size: 0.85rem; color: var(--pwc-grey-500); font-style: italic; margin: 0.5rem 0 1rem; }
.lead-text { color: var(--pwc-grey-700); font-size: 1rem; margin: 0 0 1rem; }

.metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.85rem; margin: 1rem 0; }
.metrics-primary .metric-card { background: linear-gradient(135deg, var(--pwc-orange-tint), var(--pwc-white)); }
.metric-card { background: var(--pwc-orange-tint); border: 1px solid var(--pwc-grey-200); padding: 1.1rem 0.75rem; text-align: center; border-radius: var(--radius); }
.metric-value { font-size: 1.5rem; font-weight: 700; color: var(--pwc-orange-dark); line-height: 1.2; }
.metric-label { font-size: 0.72rem; color: var(--pwc-grey-700); margin-top: 0.35rem; line-height: 1.3; }

.industry-section, .clients-section, .cert-section, .org-section { margin-top: 1.75rem; }
.industry-section h3, .clients-section h3, .cert-section h3, .org-section h3 { font-size: 1rem; margin: 0 0 1rem; color: var(--pwc-grey-700); text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--font-sans); font-weight: 700; }
.industry-chart-svg { display: block; max-width: 100%; height: auto; margin-top: 0.5rem; border-radius: var(--radius); box-shadow: var(--shadow); }
.financial-visual-row { display: grid; grid-template-columns: minmax(280px, 1.1fr) minmax(280px, 1fr); gap: 2rem; align-items: start; margin-top: 1.75rem; }
.financial-visual-row .industry-section { margin-top: 0; }
.financial-visual-row .clients-section { margin-top: 0; }
.clients-section-table .clients-table { width: 100%; border-collapse: collapse; margin-top: 0.25rem; }
.clients-section-table .clients-table td { padding: 0.4rem 0.5rem; font-size: 0.82rem; color: var(--pwc-grey-700); line-height: 1.35; vertical-align: top; border-bottom: 1px solid var(--pwc-grey-200); font-weight: 600; }
.clients-section-table .clients-table tr:last-child td { border-bottom: none; }
.clients-section-table .clients-table td:first-child { padding-right: 1.25rem; }

.donut-chart-wrap { display: grid; grid-template-columns: 220px 1fr; gap: 2rem; align-items: center; margin-top: 0.5rem; }
.donut-chart { width: 220px; height: 220px; border-radius: 50%; position: relative; box-shadow: var(--shadow); }
.donut-hole { position: absolute; inset: 28%; background: var(--pwc-white); border-radius: 50%; display: flex; align-items: center; justify-content: center; text-align: center; font-size: 0.75rem; font-weight: 700; color: var(--pwc-grey-700); line-height: 1.3; text-transform: uppercase; letter-spacing: 0.04em; }
.donut-legend { display: flex; flex-direction: column; gap: 0.55rem; }
.donut-legend-item { display: grid; grid-template-columns: 14px 1fr auto; gap: 0.65rem; align-items: center; font-size: 0.88rem; }
.donut-swatch { width: 14px; height: 14px; border-radius: 3px; flex-shrink: 0; }
.donut-legend-label { color: var(--pwc-grey-700); }
.donut-legend-value { font-weight: 700; color: var(--pwc-orange-dark); }

.client-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.85rem; margin-top: 0.75rem; }
.client-card { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 1rem 0.75rem; background: var(--pwc-grey-100); border: 1px solid var(--pwc-grey-200); border-radius: var(--radius); transition: box-shadow 0.15s; }
.client-card:hover { box-shadow: var(--shadow); }
.client-logo { width: 48px; height: 48px; border-radius: 50%; background: var(--pwc-black); color: var(--pwc-white); display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; margin-bottom: 0.65rem; letter-spacing: 0.02em; }
.client-name { font-size: 0.78rem; color: var(--pwc-grey-700); line-height: 1.35; font-weight: 600; }
.clients-summary { color: var(--pwc-grey-500); margin: 0 0 0.75rem; font-size: 0.95rem; }

.image-stack { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
.image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.85rem; margin-top: 1rem; }
.slide-figure { margin: 0; }
.slide-figure img { width: 100%; display: block; border: 1px solid var(--pwc-grey-200); border-radius: var(--radius); background: var(--pwc-white); }

.table-wrap { overflow-x: auto; margin-top: 1rem; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.data-table th { background: var(--pwc-black); color: var(--pwc-white); padding: 0.65rem 0.85rem; text-align: left; font-family: var(--font-sans); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; }
.data-table td { padding: 0.65rem 0.85rem; border-bottom: 1px solid var(--pwc-grey-200); vertical-align: top; }
.data-table tbody tr:hover { background: var(--pwc-orange-tint); }
.badge { background: var(--pwc-orange); color: var(--pwc-white); padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }

.people-map-block .table-wrap { margin-top: 1.5rem; }
.people-map-layout { margin-top: 1rem; }
.people-map-panel { background: var(--pwc-grey-100); border: 1px solid var(--pwc-grey-200); border-radius: var(--radius); padding: 1.25rem; }
.map-legend { display: flex; flex-wrap: wrap; gap: 1.25rem; margin-bottom: 1rem; padding-bottom: 0.85rem; border-bottom: 1px solid var(--pwc-grey-200); }
.map-legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; font-weight: 600; color: var(--pwc-grey-700); }
.map-legend-swatch { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; border: 2px solid var(--pwc-white); box-shadow: 0 0 0 1px var(--pwc-grey-200); }
.us-talent-map { display: block; width: 100%; height: auto; max-height: 420px; border-radius: var(--radius); }
.map-marker { cursor: pointer; transition: r 0.15s, filter 0.15s; }
.map-marker.highlight, .map-marker:hover { r: 12; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25)); }
.map-city-label { pointer-events: none; user-select: none; }
.people-map-table .movement-swatch { display: inline-block; width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--pwc-white); box-shadow: 0 0 0 1px var(--pwc-grey-200); vertical-align: middle; }
.people-map-table td:first-child { width: 2rem; text-align: center; padding-left: 0.5rem; padding-right: 0.5rem; }
.people-map-table .movement-type-label { font-size: 0.82rem; font-weight: 600; white-space: nowrap; }
.people-map-table tbody tr.highlight { background: var(--pwc-orange-tint); outline: 2px solid var(--pwc-orange); outline-offset: -2px; }

.profile-layout { display: grid; grid-template-columns: 200px 1fr; gap: 2rem; align-items: start; }
.profile-photo img { width: 100%; border-radius: var(--radius); border: 1px solid var(--pwc-grey-200); }
.profile-role { color: var(--pwc-orange); font-weight: 600; margin: 0 0 1rem; font-size: 0.95rem; }
.fun-fact { background: var(--pwc-orange-tint); padding: 1rem; border-radius: var(--radius); font-size: 0.9rem; margin-top: 1rem; }

.pillar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin-top: 1rem; }
.pillar-card { background: var(--pwc-grey-100); padding: 1.25rem; border-radius: var(--radius); border-top: 3px solid var(--pwc-orange); }
.pillar-card h3 { font-size: 0.95rem; margin: 0 0 0.75rem; font-family: var(--font-sans); font-weight: 700; }
.pillar-card ul { margin: 0; padding-left: 1.1rem; font-size: 0.85rem; }
.pillar-card li { margin-bottom: 0.35rem; }
.leadership-list { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem; }
.leadership-list li { background: var(--pwc-grey-100); padding: 0.5rem 0.85rem; border-radius: var(--radius); font-size: 0.88rem; }

.placeholder-card { text-align: center; padding: 3rem 2rem; background: var(--pwc-grey-100); border-radius: var(--radius); border: 2px dashed var(--pwc-grey-200); }
.placeholder-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
.placeholder-badge { display: inline-block; margin-top: 1rem; background: var(--pwc-grey-200); color: var(--pwc-grey-700); padding: 0.35rem 0.85rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }

.apollo-block { --apollo-value-color: #0F6E56; --apollo-delivery-color: #D04A02; }
.apollo-block .eyebrow { margin-bottom: 0.35rem; }
.apollo-program-stack { display: flex; flex-direction: column; gap: 0; margin: 1.5rem 0 2rem; max-width: 720px; }
.apollo-program-card { background: var(--pwc-grey-100); border: 1px solid var(--pwc-grey-200); border-radius: var(--radius); padding: 1.15rem 1.25rem; }
.apollo-program-card h3 { font-size: 0.95rem; margin: 0 0 0.45rem; font-family: var(--font-sans); font-weight: 700; }
.apollo-program-card p { margin: 0; font-size: 0.88rem; color: var(--pwc-grey-700); line-height: 1.45; }
.apollo-program-highlight { background: linear-gradient(135deg, var(--pwc-orange-tint), var(--pwc-white)); border-color: var(--pwc-orange); border-left: 4px solid var(--pwc-orange); }
.apollo-program-highlight h3 { color: var(--pwc-orange-dark); }
.apollo-program-connector { display: flex; justify-content: center; padding: 0.35rem 0; }
.apollo-program-arrow { display: flex; flex-direction: column; align-items: center; width: 2.5rem; }
.apollo-program-arrow-line { width: 2px; flex: 1; min-height: 0.65rem; background: var(--pwc-orange); }
.apollo-program-arrow-label { background: var(--pwc-white); border: 1px solid var(--pwc-orange); color: var(--pwc-orange); border-radius: 999px; padding: 0.15rem 0.6rem; font-size: 0.72rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; line-height: 1.2; white-space: nowrap; margin: 0.1rem 0; }
.apollo-program-arrow-head { width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid var(--pwc-orange); margin-top: 0.1rem; }
.apollo-value-section { margin-top: 1.75rem; }
.apollo-value-section > h3 { font-size: 0.95rem; margin: 0 0 1rem; color: var(--pwc-grey-700); font-family: var(--font-sans); font-weight: 700; }
.apollo-value-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
.apollo-value-card { background: var(--pwc-white); border: 1px solid var(--pwc-grey-200); border-radius: var(--radius); padding: 1.15rem 1.25rem; border-top: 4px solid var(--pwc-grey-500); }
.apollo-value-value { border-top-color: var(--apollo-value-color); }
.apollo-value-value h3,
.apollo-value-value p,
.apollo-value-value .apollo-value-metrics { color: var(--apollo-value-color); }
.apollo-value-value .apollo-value-metrics { opacity: 0.85; }
.apollo-value-delivery { border-top-color: var(--pwc-orange); }
.apollo-value-delivery h3,
.apollo-value-delivery p,
.apollo-value-delivery .apollo-value-metrics { color: var(--apollo-delivery-color); }
.apollo-value-delivery .apollo-value-metrics { opacity: 0.85; }
.apollo-text-value { color: var(--apollo-value-color); }
.apollo-text-delivery { color: var(--apollo-delivery-color); }
.apollo-block .apollo-roadmap-lead .apollo-text-value { color: #0F6E56; font-weight: 700; }
.apollo-block .apollo-roadmap-lead .apollo-text-delivery { color: #D04A02; font-weight: 700; }
.apollo-roadmap-lead .apollo-text-value,
.apollo-roadmap-lead .apollo-text-delivery,
.apollo-value-section > h3 .apollo-text-value,
.apollo-value-section > h3 .apollo-text-delivery { font-weight: 700; }
.apollo-value-card h3 { font-size: 0.92rem; margin: 0 0 0.5rem; font-family: var(--font-sans); font-weight: 700; }
.apollo-value-card p { margin: 0 0 0.45rem; font-size: 0.85rem; line-height: 1.4; }
.apollo-value-metrics { font-size: 0.8rem !important; font-style: italic; margin-bottom: 0 !important; }
.apollo-roadmap-section { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--pwc-grey-200); }
.apollo-roadmap { display: grid; grid-template-columns: repeat(6, 1fr); gap: 0.65rem; margin-bottom: 1rem; }
.apollo-step { text-align: center; }
.apollo-step-num { width: 2.25rem; height: 2.25rem; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; color: var(--pwc-white); margin: 0 auto 0.55rem; }
.apollo-step-orange .apollo-step-num { background: var(--pwc-orange); }
.apollo-step-orange .apollo-step-body strong { color: var(--pwc-orange-dark); }
.apollo-step-orange .apollo-step-body span { color: var(--pwc-orange); }
.apollo-step-grey .apollo-step-num { background: var(--pwc-grey-700); }
.apollo-step-grey .apollo-step-body strong { color: var(--pwc-grey-700); }
.apollo-step-grey .apollo-step-body span { color: var(--pwc-grey-500); }
.apollo-step-green .apollo-step-num { background: #0F6E56; }
.apollo-step-green .apollo-step-body strong { color: #0F6E56; }
.apollo-step-green .apollo-step-body span { color: #0F6E56; opacity: 0.85; }
.apollo-step-purple .apollo-step-num { background: #534AB7; }
.apollo-step-purple .apollo-step-body strong { color: #534AB7; }
.apollo-step-purple .apollo-step-body span { color: #534AB7; opacity: 0.85; }
.apollo-step-body { font-size: 0.72rem; line-height: 1.35; }
.apollo-step-body strong { display: block; font-size: 0.78rem; margin-bottom: 0.2rem; }
.apollo-roadmap-callout { margin-top: 1.25rem; padding: 1.25rem 1.35rem; background: var(--pwc-grey-100); border: 1px solid var(--pwc-grey-200); border-radius: var(--radius); border-left: 4px solid var(--pwc-orange); }
.apollo-roadmap-lead { font-size: 0.95rem; font-weight: 600; color: var(--pwc-black); line-height: 1.55; margin: 0; }

.sector-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.75rem; }
.sector-card { background: var(--pwc-grey-100); padding: 1rem; border-radius: var(--radius); border-left: 3px solid var(--pwc-orange); }
.sector-name { font-weight: 600; font-size: 0.9rem; }
.sector-tag { font-size: 0.78rem; color: var(--pwc-orange-dark); margin-top: 0.25rem; font-weight: 600; }

.initiative-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin-top: 1rem; }
.initiative-card { background: var(--pwc-grey-100); padding: 1.25rem; border-radius: var(--radius); }
.initiative-card h3 { font-size: 0.9rem; margin: 0 0 0.65rem; font-family: var(--font-sans); font-weight: 700; }
.initiative-card ul { margin: 0; padding-left: 1.1rem; font-size: 0.85rem; }

.training-intro { font-size: 0.95rem; color: var(--pwc-grey-700); margin: 0 0 1.25rem; line-height: 1.5; }
.training-initiatives-row { display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 1.25rem; align-items: start; margin-bottom: 1rem; }
.training-column { background: var(--pwc-grey-100); border: 1px solid var(--pwc-grey-200); border-radius: var(--radius); padding: 1.15rem; min-height: 180px; }
.training-column h3 { font-size: 0.78rem; margin: 0.75rem 0 0; color: var(--pwc-orange-dark); text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--font-sans); font-weight: 700; margin-top: auto; padding-top: 0.75rem; }
.training-column { display: flex; flex-direction: column; }
.training-col-desc { font-size: 0.82rem; font-weight: 700; color: var(--pwc-black); margin: 0 0 0.65rem; line-height: 1.35; }
.training-col-lead { font-size: 0.82rem; color: var(--pwc-grey-700); margin: 0 0 0.5rem; line-height: 1.4; }
.training-column ul { margin: 0; padding-left: 1.1rem; font-size: 0.82rem; color: var(--pwc-grey-700); }
.training-column li { margin-bottom: 0.35rem; }
.training-icon { display: flex; align-items: center; justify-content: center; padding: 0.5rem; }
.training-icon img { width: 72px; height: 72px; object-fit: contain; opacity: 0.85; }
.training-catalog-note { font-size: 0.85rem; color: var(--pwc-grey-500); font-style: italic; margin: 0 0 1.5rem; }
.training-requirements { background: var(--pwc-white); border: 1px solid var(--pwc-grey-200); border-left: 4px solid var(--pwc-orange); border-radius: var(--radius); padding: 1.15rem 1.25rem; margin-bottom: 1.5rem; }
.training-requirements h3 { font-size: 0.85rem; margin: 0 0 0.65rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--pwc-grey-700); }
.training-requirements ul { margin: 0; padding-left: 1.1rem; font-size: 0.85rem; color: var(--pwc-grey-700); }
.training-cert-section { margin-top: 1rem; }
.training-cert-section > h3 { font-size: 0.9rem; margin: 0 0 1rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--pwc-grey-700); font-family: var(--font-sans); font-weight: 700; }
.cert-progress-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
.cert-region { background: var(--pwc-grey-100); border: 1px solid var(--pwc-grey-200); border-radius: var(--radius); padding: 1.15rem; }
.cert-region h4 { font-size: 0.88rem; margin: 0 0 0.85rem; color: var(--pwc-black); font-weight: 700; }
.cert-progress-wrap { margin-bottom: 1rem; }
.cert-progress-bar { height: 12px; background: var(--pwc-grey-200); border-radius: 999px; overflow: hidden; margin-bottom: 0.4rem; }
.cert-progress-fill { height: 100%; background: linear-gradient(90deg, var(--pwc-orange), var(--pwc-orange-dark)); border-radius: 999px; }
.cert-progress-score { font-size: 0.88rem; font-weight: 700; color: var(--pwc-orange-dark); }
.cert-distribution { margin-top: 0.75rem; }
.cert-dist-label { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--pwc-grey-500); margin-bottom: 0.5rem; font-weight: 700; }
.cert-dist-bar { display: flex; height: 14px; border-radius: 4px; overflow: hidden; margin-bottom: 0.65rem; }
.cert-dist-segment { min-width: 2px; }
.cert-dist-legend { display: grid; grid-template-columns: 1fr 1fr; gap: 0.35rem 0.75rem; }
.cert-dist-legend-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.78rem; color: var(--pwc-grey-700); }
.cert-dist-swatch { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; }
.cert-dist-legend-item strong { margin-left: auto; color: var(--pwc-black); }
.cert-footnote { font-size: 0.78rem; color: var(--pwc-grey-500); margin-top: 0.85rem; font-style: italic; }
.cert-list { padding-left: 1.25rem; font-size: 0.9rem; }

.highlight-banner { background: var(--pwc-orange); color: var(--pwc-white); padding: 0.85rem 1.25rem; border-radius: var(--radius); margin: 1rem 0; font-size: 0.95rem; }
.tag-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin: 0.75rem 0; }

.dashboard-top-row, .dashboard-mid-row { display: grid; gap: 1.25rem; margin-top: 1.5rem; }
.dashboard-top-row { grid-template-columns: 1.2fr 1fr; }
.dashboard-mid-row { grid-template-columns: repeat(3, 1fr); }
.dashboard-panel { background: var(--pwc-white); border: 1px solid var(--pwc-grey-200); border-radius: var(--radius); padding: 1.25rem; box-shadow: var(--shadow); }
.dashboard-panel h3 { font-size: 0.82rem; margin: 0 0 1rem; color: var(--pwc-grey-700); text-transform: uppercase; letter-spacing: 0.06em; font-family: var(--font-sans); font-weight: 700; }
.dashboard-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 0.85rem; }
.dashboard-metric-card { text-align: center; padding: 0.75rem 0.5rem; background: var(--pwc-grey-100); border-radius: var(--radius); border: 1px solid var(--pwc-grey-200); }
.dashboard-metric-icon img { width: 36px; height: 36px; object-fit: contain; margin-bottom: 0.45rem; }
.dashboard-metric-value { font-family: var(--font-serif); font-size: 1.35rem; font-weight: 700; color: var(--pwc-black); line-height: 1.1; }
.dashboard-metric-label { font-size: 0.72rem; color: var(--pwc-grey-500); margin-top: 0.35rem; line-height: 1.3; }
.dashboard-skills { margin-top: 1rem; }
.dashboard-skills-label { font-size: 0.75rem; font-weight: 700; color: var(--pwc-grey-700); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.5rem; }
.dashboard-ess { margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--pwc-grey-200); text-align: center; }
.dashboard-ess-value { font-family: var(--font-serif); font-size: 1.75rem; font-weight: 700; color: var(--pwc-orange-dark); }
.dashboard-ess-label { font-size: 0.78rem; color: var(--pwc-grey-500); margin-top: 0.25rem; }
.dashboard-stat { font-size: 0.95rem; font-weight: 700; color: var(--pwc-orange-dark); margin: 0 0 0.75rem; }
.dashboard-chart { display: block; width: 100%; max-width: 100%; height: auto; margin-top: 0.5rem; }
.dashboard-chart-compact { max-width: 180px; margin: 0.5rem auto 0; }
.dashboard-adapt-value { font-family: var(--font-serif); font-size: 1.5rem; font-weight: 700; color: var(--pwc-orange-dark); text-align: center; }
.dashboard-adapt-label { font-size: 0.78rem; color: var(--pwc-grey-500); text-align: center; margin-bottom: 0.25rem; }
.dashboard-panel-clients { margin-top: 1.25rem; }
.client-logo-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 0.85rem; margin-top: 0.75rem; }
.client-logo-item { display: flex; align-items: center; justify-content: center; padding: 0.65rem; background: var(--pwc-grey-100); border: 1px solid var(--pwc-grey-200); border-radius: var(--radius); min-height: 64px; }
.client-logo-item img { max-width: 100%; max-height: 48px; object-fit: contain; }
.tag { background: var(--pwc-grey-100); border: 1px solid var(--pwc-grey-200); padding: 0.3rem 0.65rem; border-radius: 999px; font-size: 0.78rem; }

.agenda-link { background: none; border: none; padding: 0; font: inherit; color: var(--pwc-black); cursor: pointer; text-align: left; font-weight: 600; }
.agenda-link:hover { color: var(--pwc-orange); }
.agenda-numbered { counter-reset: agenda; list-style: none; padding: 0; margin: 0; }
.agenda-numbered li { counter-increment: agenda; padding: 1rem 0 1rem 3rem; border-bottom: 1px solid var(--pwc-grey-200); position: relative; }
.agenda-numbered li::before { content: counter(agenda); position: absolute; left: 0; width: 2rem; height: 2rem; background: var(--pwc-orange); color: var(--pwc-white); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; }

.qa-panel .qa-form { display: grid; gap: 1rem; margin-bottom: 2rem; }
.qa-panel label { display: grid; gap: 0.35rem; font-weight: 600; font-size: 0.9rem; }
.qa-panel input, .qa-panel textarea { font: inherit; padding: 0.65rem 0.85rem; border: 1px solid var(--pwc-grey-200); border-radius: var(--radius); }
.btn-primary { background: var(--pwc-orange); color: var(--pwc-white); border: none; border-radius: var(--radius); padding: 0.65rem 1.5rem; font: inherit; font-weight: 600; cursor: pointer; }
.btn-primary:hover { background: var(--pwc-orange-dark); }
.qa-item { border: 1px solid var(--pwc-grey-200); padding: 1rem; margin-bottom: 0.75rem; background: var(--pwc-grey-100); border-radius: var(--radius); }
.muted { color: var(--pwc-grey-500); }

.site-footer { border-top: 3px solid var(--pwc-orange); background: var(--pwc-black); color: rgba(255,255,255,0.6); padding: 1.5rem; text-align: center; font-size: 0.75rem; }

@media (max-width: 800px) {
  .hero { grid-template-columns: 1fr; }
  .hero h1 { font-size: 1.5rem; }
  .profile-layout { grid-template-columns: 1fr; }
  .donut-chart-wrap { grid-template-columns: 1fr; justify-items: center; }
  .financial-visual-row { grid-template-columns: 1fr; }
  .dashboard-top-row, .dashboard-mid-row { grid-template-columns: 1fr; }
  .training-initiatives-row { grid-template-columns: 1fr; }
  .cert-progress-grid { grid-template-columns: 1fr; }
  .apollo-value-grid { grid-template-columns: 1fr; }
  .apollo-roadmap { grid-template-columns: repeat(2, 1fr); }
  .clients-section-table .clients-table td { display: block; width: 100%; border-bottom: none; padding: 0.3rem 0; }
  .clients-section-table .clients-table tr { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; border-bottom: 1px solid var(--pwc-grey-200); padding: 0.25rem 0; }
  .clients-section-table .clients-table tr:last-child { border-bottom: none; }
  .client-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
  .map-legend { flex-direction: column; gap: 0.65rem; }
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

  const builtAt = new Date().toISOString();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
  <meta http-equiv="Pragma" content="no-cache" />
  <meta http-equiv="Expires" content="0" />
  <title>${escapeHtml(model.title)} | PwC</title>
  <style>${SITE_CSS}</style>
</head>
<body data-built-at="${builtAt}">
  <!-- preview build: ${builtAt} -->
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
    document.querySelectorAll('.people-map-block').forEach(block => {
      const rows = block.querySelectorAll('.people-row[data-person]');
      const markers = block.querySelectorAll('.map-marker[data-person]');
      function highlight(personId) {
        rows.forEach(r => r.classList.toggle('highlight', r.dataset.person === personId));
        markers.forEach(m => m.classList.toggle('highlight', m.dataset.person === personId));
      }
      rows.forEach(row => {
        row.addEventListener('mouseenter', () => highlight(row.dataset.person));
        row.addEventListener('mouseleave', () => highlight(null));
      });
      markers.forEach(marker => {
        marker.addEventListener('mouseenter', () => highlight(marker.dataset.person));
        marker.addEventListener('mouseleave', () => highlight(null));
      });
    });
    const qaSubmit = document.getElementById('qa-submit');
    if (qaSubmit) {
      const list = document.getElementById('qa-list');
      const questions = JSON.parse(localStorage.getItem('qa-questions-${sessionId}') || '[]');
      function renderQuestions() {
        if (!questions.length) return;
        list.innerHTML = questions.map(q =>
          '<article class="qa-item"><strong>' + q.name.replace(/</g,'&lt;') + '</strong><p>' + q.text.replace(/</g,'&lt;') + '</p></article>'
        ).join('');
      }
      renderQuestions();
      qaSubmit.addEventListener('click', () => {
        const name = document.getElementById('qa-name').value.trim() || 'Anonymous';
        const text = document.getElementById('qa-text').value.trim();
        if (!text) return;
        questions.unshift({ name, text, time: new Date().toISOString() });
        localStorage.setItem('qa-questions-${sessionId}', JSON.stringify(questions));
        document.getElementById('qa-text').value = '';
        renderQuestions();
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
