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

function renderGalleryImages(imgs, assetPrefix) {
  if (!imgs?.length) return "";
  return `<div class="image-grid gallery-grid">${imgs
    .map((i) => {
      const featured = i.large || /basecamp-collage/i.test(i.src || "");
      const figClass = featured ? "slide-figure featured" : "slide-figure";
      return `<figure class="${figClass}">${imgTag(i.src, i.alt, assetPrefix)}</figure>`;
    })
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

function renderClientCell(cell) {
  if (!cell) return "<td>&nbsp;</td>";
  if (typeof cell === "string") return `<td>${escapeHtml(cell)}</td>`;
  const style = cell.color ? ` style="color:${cell.color}"` : "";
  return `<td${style}>${escapeHtml(cell.name)}</td>`;
}

function renderClientsTable(clients) {
  if (!clients?.rows?.length) return renderClientGrid(clients);
  const rows = clients.rows
    .map(([left, right]) => `<tr>${renderClientCell(left)}${renderClientCell(right)}</tr>`)
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
  const useSideBySide =
    block.clients?.layout === "table" && (chartHtml || block.industrySplit?.length);
  const visualSection = useSideBySide
    ? `<div class="financial-visual-row">${chartHtml}${clientsHtml}</div>`
    : `${chartHtml}${clientsHtml}`;
  const metricsClass = "metrics-grid metrics-primary metrics-grid-centered";

  return `
  <article class="content-block financial-block">
    <header class="block-header">
      <h2>${escapeHtml(block.title)}</h2>
      ${block.subtitle ? `<p class="block-subtitle">${escapeHtml(block.subtitle)}</p>` : ""}
    </header>
    ${renderMetricsGrid(block.keyMetrics, metricsClass)}
    ${block.notes?.length ? `<p class="block-note">${escapeHtml(block.notes[0])}</p>` : ""}
    ${visualSection}
    ${block.images?.length ? renderImages(block.images, assetPrefix, "stack") : ""}
  </article>`;
}

function renderDeliveryImpact(delivery, assetPrefix) {
  const metrics = delivery.metrics || [];
  const icons = delivery.images || [];
  if (!metrics.length) return "";

  return `<div class="delivery-impact-grid">${metrics
    .map((m, i) => {
      const icon = icons[i]
        ? `<div class="delivery-impact-icon">${imgTag(icons[i].src, m.label, assetPrefix)}</div>`
        : "";
      return `
    <div class="delivery-impact-card">
      ${icon}
      <div class="delivery-impact-value">${escapeHtml(m.value)}</div>
      <div class="delivery-impact-label">${escapeHtml(m.label)}</div>
    </div>`;
    })
    .join("")}</div>`;
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

function renderInlineBarChart(chartData, alt = "Bar chart", chartId = "bar") {
  if (!chartData?.bars?.length) return "";
  const color = chartData.color || "#EB8C00";
  const colorDark = "#C44D00";
  const bars = chartData.bars;
  const dataMin = Math.min(...bars.map((b) => b.value));
  const dataMax = Math.max(...bars.map((b) => b.value));
  const minVal = Math.max(0, Math.floor(dataMin / 10) * 10 - 10);
  const maxVal = Math.ceil(dataMax / 10) * 10 + 10;
  const padL = 42;
  const padR = 28;
  const padT = 32;
  const padB = 38;
  const chartW = 360;
  const chartH = 220;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const baseY = padT + plotH;
  const slot = plotW / bars.length;
  const barW = slot * 0.48;
  const gradId = `bar-grad-${chartId}`;

  const yTicks = [];
  for (let v = minVal; v <= maxVal; v += 10) yTicks.push(v);

  const gridLines = yTicks
    .map((v) => {
      const y = baseY - ((v - minVal) / (maxVal - minVal)) * plotH;
      return `
      <line x1="${padL}" y1="${y}" x2="${chartW - padR}" y2="${y}" stroke="#E8EAED" stroke-width="1" stroke-dasharray="${v === minVal ? "0" : "4 3"}"/>
      <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#9CA3AF">${v}</text>`;
    })
    .join("");

  const barEls = bars
    .map((bar, i) => {
      const h = ((bar.value - minVal) / (maxVal - minVal)) * plotH;
      const x = padL + i * slot + (slot - barW) / 2;
      const y = baseY - h;
      const isEnd = i === bars.length - 1;
      return `
      <rect x="${x}" y="${y}" width="${barW}" height="${h}" fill="url(#${gradId})" rx="5"/>
      <rect x="${x}" y="${y}" width="${barW}" height="${Math.min(4, h)}" fill="${colorDark}" opacity="0.35" rx="5"/>
      <rect x="${x + barW / 2 - 18}" y="${y - 22}" width="36" height="18" rx="4" fill="#FFFFFF" stroke="#E8EAED" stroke-width="1"/>
      <text x="${x + barW / 2}" y="${y - 9}" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="${isEnd ? colorDark : "#2D2D2D"}">${bar.value}</text>
      <text x="${x + barW / 2}" y="${baseY + 22}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="#4B5563">${escapeHtml(bar.label)}</text>`;
    })
    .join("");

  const delta =
    bars.length >= 2
      ? bars[bars.length - 1].value - bars[0].value
      : 0;
  const deltaEl =
    delta > 0
      ? `<text x="${chartW / 2}" y="${padT - 8}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="${colorDark}">+${delta} people</text>`
      : "";

  return `
  <div class="dashboard-chart-area" role="img" aria-label="${escapeHtml(alt)}">
    <svg class="dashboard-inline-chart" viewBox="0 0 ${chartW} ${chartH}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id="${gradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}"/>
          <stop offset="100%" stop-color="${colorDark}"/>
        </linearGradient>
      </defs>
      ${gridLines}
      <line x1="${padL}" y1="${baseY}" x2="${chartW - padR}" y2="${baseY}" stroke="#C5CAD3" stroke-width="1.5"/>
      ${deltaEl}
      ${barEls}
    </svg>
  </div>`;
}

function renderInlineLineChart(chartData, alt = "Line chart", chartId = "line") {
  if (!chartData?.points?.length) return "";
  const color = chartData.color || "#EB8C00";
  const colorDark = "#C44D00";
  const points = chartData.points;
  const values = points.map((p) => p.value);
  const minVal = Math.floor(Math.min(...values) / 10) * 10 - 5;
  const maxVal = Math.ceil(Math.max(...values) / 10) * 10 + 5;
  const padL = 42;
  const padR = 28;
  const padT = 32;
  const padB = 38;
  const chartW = 360;
  const chartH = 220;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;
  const baseY = padT + plotH;
  const slot = points.length > 1 ? plotW / (points.length - 1) : plotW;
  const areaGradId = `area-grad-${chartId}`;
  const lineGradId = `line-grad-${chartId}`;

  const yTicks = [];
  for (let v = Math.ceil(minVal / 10) * 10; v <= maxVal; v += 10) yTicks.push(v);

  const gridLines = yTicks
    .map((v) => {
      const y = baseY - ((v - minVal) / (maxVal - minVal)) * plotH;
      return `
      <line x1="${padL}" y1="${y}" x2="${chartW - padR}" y2="${y}" stroke="#E8EAED" stroke-width="1" stroke-dasharray="${v === minVal ? "0" : "4 3"}"/>
      <text x="${padL - 8}" y="${y + 4}" text-anchor="end" font-family="Arial, sans-serif" font-size="11" fill="#9CA3AF">${v}%</text>`;
    })
    .join("");

  const coords = points.map((p, i) => ({
    x: padL + i * slot,
    y: baseY - ((p.value - minVal) / (maxVal - minVal)) * plotH,
    label: p.label,
    value: p.value,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${baseY} L ${coords[0].x} ${baseY} Z`;

  const dots = coords
    .map((c, i) => {
      const labelY = c.y < padT + 24 ? c.y + 20 : c.y - 12;
      return `
      <circle cx="${c.x}" cy="${c.y}" r="6" fill="${color}" stroke="#FFFFFF" stroke-width="2.5"/>
      <rect x="${c.x - 17}" y="${labelY - 11}" width="34" height="18" rx="4" fill="#FFFFFF" stroke="#E8EAED" stroke-width="1"/>
      <text x="${c.x}" y="${labelY + 2}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="${i === coords.length - 1 ? colorDark : "#2D2D2D"}">${Math.round(c.value)}%</text>
      <text x="${c.x}" y="${baseY + 22}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="600" fill="#4B5563">${escapeHtml(c.label)}</text>`;
    })
    .join("");

  return `
  <div class="dashboard-chart-area" role="img" aria-label="${escapeHtml(alt)}">
    <svg class="dashboard-inline-chart" viewBox="0 0 ${chartW} ${chartH}" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <defs>
        <linearGradient id="${areaGradId}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.28"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.03"/>
        </linearGradient>
        <linearGradient id="${lineGradId}" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="${color}"/>
          <stop offset="100%" stop-color="${colorDark}"/>
        </linearGradient>
      </defs>
      ${gridLines}
      <line x1="${padL}" y1="${baseY}" x2="${chartW - padR}" y2="${baseY}" stroke="#C5CAD3" stroke-width="1.5"/>
      <path d="${areaPath}" fill="url(#${areaGradId})"/>
      <path d="${linePath}" fill="none" stroke="url(#${lineGradId})" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${dots}
    </svg>
  </div>`;
}

function renderDashboardTrendChart(section, assetPrefix) {
  if (section.chartData?.type === "bar") {
    return renderInlineBarChart(section.chartData, section.chart?.alt || "Team Size Growth", "team-size");
  }
  if (section.chartData?.type === "line") {
    return renderInlineLineChart(section.chartData, section.chart?.alt || "Utilization Trend", "utilization");
  }
  return renderDashboardChart(section.chart, assetPrefix, "dashboard-inline-chart");
}

function renderAiCapabilityPanel(ai, assetPrefix) {
  const metrics = ai.metrics || [];
  const icons = ai.images || [];
  const metricCards = metrics.length
    ? `<div class="ai-cap-metrics">${metrics
        .map((m, i) => {
          const icon = icons[i]
            ? `<div class="ai-cap-icon">${imgTag(icons[i].src, m.label, assetPrefix)}</div>`
            : "";
          return `
        <div class="ai-cap-metric">
          ${icon}
          <div class="ai-cap-value">${escapeHtml(m.value)}</div>
          <div class="ai-cap-label">${escapeHtml(m.label)}</div>
        </div>`;
        })
        .join("")}</div>`
    : "";

  const skills = ai.skills?.length
    ? `<div class="ai-cap-skills">
        <div class="ai-cap-skills-label">AI Skills Added</div>
        <div class="tag-row tag-row-compact">${ai.skills.map((s) => `<span class="tag tag-compact">${escapeHtml(s)}</span>`).join("")}</div>
      </div>`
    : "";

  const ess = ai.ess
    ? `<div class="ai-cap-ess">
        <div class="ai-cap-ess-value">${escapeHtml(ai.ess)}</div>
        <div class="ai-cap-ess-label">${escapeHtml(ai.essLabel || "Engagement Satisfaction Survey (ESS)")}</div>
      </div>`
    : "";

  return `<div class="ai-capability-grid">${metricCards}${skills}${ess}</div>`;
}

function parsePercentMetric(value) {
  const match = String(value || "").match(/([\d.]+)/);
  if (!match) return 0;
  return Math.min(100, Math.max(0, parseFloat(match[1])));
}

function renderAdaptabilityGauge(metric) {
  if (!metric?.value) return "";
  const pct = parsePercentMetric(metric.value);
  const label = metric.label || "AI Adaptability";
  const arcLength = 239;
  const offset = arcLength * (1 - pct / 100);

  return `
  <div class="adapt-gauge-wrap" role="img" aria-label="${escapeHtml(label)}: ${escapeHtml(metric.value)}">
    <svg class="adapt-gauge-svg" viewBox="0 0 200 120" aria-hidden="true">
      <path class="adapt-gauge-track" d="M 24 100 A 76 76 0 0 1 176 100" pathLength="239" />
      <path class="adapt-gauge-fill" d="M 24 100 A 76 76 0 0 1 176 100" pathLength="239" style="stroke-dasharray:239;stroke-dashoffset:${offset.toFixed(2)}" />
    </svg>
    <div class="adapt-gauge-label">
      <div class="adapt-gauge-value">${escapeHtml(metric.value)}</div>
      <div class="adapt-gauge-caption">${escapeHtml(label)}</div>
    </div>
  </div>`;
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

    <div class="dashboard-mosaic">
      <section class="dashboard-cell dashboard-cell-delivery">
        <h3>Delivery Impact</h3>
        ${renderDeliveryImpact(delivery, assetPrefix)}
      </section>
      <section class="dashboard-cell dashboard-cell-ai">
        <h3>AI Capability</h3>
        ${renderAiCapabilityPanel(ai, assetPrefix)}
      </section>
      <section class="dashboard-cell dashboard-cell-chart">
        <h3>Team Size Growth</h3>
        ${team.stat ? `<p class="dashboard-stat">${escapeHtml(team.stat)}</p>` : ""}
        ${renderDashboardTrendChart(team, assetPrefix)}
      </section>
      <section class="dashboard-cell dashboard-cell-chart">
        <h3>Utilization Trend</h3>
        ${renderDashboardTrendChart(utilization, assetPrefix)}
      </section>
      <section class="dashboard-cell dashboard-cell-chart dashboard-cell-adapt">
        <h3>AI Adaptability</h3>
        ${adapt.metric ? renderAdaptabilityGauge(adapt.metric) : renderDashboardChart(adapt.chart, assetPrefix)}
      </section>
      ${
        clientLogos
          ? `<section class="dashboard-cell dashboard-cell-clients">
        <h3>Our Clients</h3>
        <div class="client-logo-grid">${clientLogos}</div>
      </section>`
          : ""
      }
    </div>
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
    ${block.notes?.length ? `<p class="block-note">${escapeHtml(block.notes[0])}</p>` : ""}
  </article>`;
}

function renderConsultantProfileSample(block, assetPrefix) {
  if (block.image?.src) {
    const src = block.image.src;
    const url = src.startsWith("assets/") ? assetPrefix + src.slice(7) : assetPrefix + src;
    return `
  <article class="content-block consultant-profile-block">
    <img class="consultant-profile-full-image" src="${escapeHtml(url)}" alt="${escapeHtml(block.image.alt || "Sample Consultant Profile")}" loading="lazy" />
  </article>`;
  }

  const photo = block.photo?.src
    ? `<div class="consultant-profile-photo">${imgTag(block.photo.src, block.name, assetPrefix)}</div>`
    : "";

  const meta = (block.meta || [])
    .map(
      (m) => `
      <div class="consultant-profile-meta-item">
        <div class="consultant-profile-meta-label">${escapeHtml(m.label)}</div>
        <div class="consultant-profile-meta-value">${escapeHtml(m.value)}</div>
      </div>`
    )
    .join("");

  const sections = (block.sections || [])
    .map(
      (s) => `
      <section class="consultant-profile-section">
        <div class="consultant-profile-section-head">
          <span class="consultant-profile-section-num">${s.num}</span>
          <h3>${escapeHtml(s.title)}</h3>
        </div>
        <ul>${s.items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>`
    )
    .join("");

  return `
  <article class="content-block consultant-profile-block">
    <div class="consultant-profile-card">
      <aside class="consultant-profile-sidebar">
        ${photo}
        <h2 class="consultant-profile-name">${escapeHtml(block.name)}</h2>
        <p class="consultant-profile-role">${escapeHtml(block.role)}</p>
        <p class="consultant-profile-subtitle">${escapeHtml(block.subtitle)}</p>
        <hr class="consultant-profile-divider" />
        ${meta}
      </aside>
      <div class="consultant-profile-main">${sections}</div>
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

function renderOrgColumnList(items) {
  return `<ul class="org-slide-list">${items
    .map((item) => {
      const text = escapeHtml(item);
      const italic = /^\(.+\)$/.test(String(item).trim());
      return `<li${italic ? ' class="org-slide-note"' : ""}>${text}</li>`;
    })
    .join("")}</ul>`;
}

function renderOrgDesign(block) {
  const leadership = (block.leadership || []).map((row) =>
    Array.isArray(row) ? row.join(" | ") : String(row || "").trim()
  );
  const columns = block.columns?.length ? block.columns : block.pillars || [];
  const enablers =
    block.enablers ||
    columns.find((c) => /cross-cutting/i.test(c.name))?.items?.join(" | ") ||
    "";

  return `
  <article class="content-block org-block org-slide-layout">
    <div class="org-slide-frame">
      <p class="org-slide-eyebrow">${escapeHtml(block.eyebrow || "ORG DESIGN")}</p>
      <h2 class="org-slide-title">${escapeHtml(block.title)}</h2>
      <div class="org-slide-rule" aria-hidden="true"></div>
      ${block.description ? `<p class="org-slide-desc">${escapeHtml(block.description)}</p>` : ""}

      ${
        leadership.length
          ? `<div class="org-slide-leadership-head">Leadership</div>
      <div class="org-slide-leadership-row">
        ${leadership.map((line) => `<div class="org-slide-lead-box">${escapeHtml(line)}</div>`).join("")}
      </div>`
          : ""
      }

      ${
        columns.filter((c) => !/cross-cutting/i.test(c.name)).length
          ? `<div class="org-slide-columns">
        ${columns
          .filter((c) => !/cross-cutting/i.test(c.name))
          .map((col) => {
            const color =
              col.headerColor ||
              (/engineering/i.test(col.name)
                ? "#EB8C00"
                : /ai for value/i.test(col.name)
                  ? "#D04A02"
                  : /data management/i.test(col.name)
                    ? "#A32020"
                    : "#D04A02");
            return `
          <div class="org-slide-col">
            <div class="org-slide-col-head" style="background:${color}">${escapeHtml(col.name)}</div>
            <div class="org-slide-col-body">${renderOrgColumnList(col.items || [])}</div>
          </div>`;
          })
          .join("")}
      </div>`
          : ""
      }

      ${
        enablers
          ? `<div class="org-slide-enablers">
        <span class="org-slide-enablers-label">Cross-Cutting Enablers</span>
        <span class="org-slide-enablers-text">${escapeHtml(enablers)}</span>
      </div>`
          : ""
      }
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

/** FY27 GTM sector structure — edit sectors, APPs, team, and colors here without changing layout code. */
const FY27_GTM_SECTOR_STRUCTURE = [
  {
    id: "fs",
    name: "FS",
    app: "Tapan Nagori",
    accent: "#1B2A4A",
    tier: 3,
    team: [
      "Fania Georgiades",
      "Nick Edmonds",
      "Rikin Parekh",
      "Samir Parkar",
      "Shierly Mondianti",
    ],
  },
  {
    id: "tmt",
    name: "TMT",
    app: "Ernesto Solera",
    accent: "#534AB7",
    tier: 3,
    team: ["Srikanth Vemula", "Judy Kim", "Ruchir Patel"],
  },
  {
    id: "ips",
    name: "IPS",
    app: "Russell Pearson",
    accent: "#0F6E56",
    tier: 3,
    team: ["Jeff Silverman"],
  },
  {
    id: "cm",
    name: "CM",
    app: "Dmitry Danilenko",
    accent: "#E8830E",
    tier: 3,
    team: ["Divya Thathu", "Vish Gaitonde"],
  },
  {
    id: "eur",
    name: "EUR",
    app: "Russell Pearson",
    accent: "#78716C",
    tier: 2,
  },
  {
    id: "hls",
    name: "Health & Life Sciences",
    app: "Chris DeBeer",
    accent: "#78716C",
    tier: 2,
  },
];

const FY27_SECTOR_PENDING_NOTE =
  "Sujith Kumar — sector TBD, not yet officially moved (pending transfer to US firm).";

function renderGtmConnectorV() {
  return `<div class="gtm-connector-v" aria-hidden="true"></div>`;
}

function renderGtmTeamNode(name, accent) {
  return `<div class="gtm-team-node" style="--gtm-accent:${accent}">${escapeHtml(name)}</div>`;
}

function buildGtmTeamItems(sector) {
  const items = (sector.team || []).map((name) => ({ type: "member", name }));
  for (const group of sector.nestedGroups || []) {
    items.push({ type: "group", name: group.name, members: group.members || [] });
  }
  return items;
}

function renderGtmTeamTier(sector) {
  const items = buildGtmTeamItems(sector);
  if (!items.length) return "";

  const parts = items.map((item) => {
    if (item.type === "member") {
      return `${renderGtmConnectorV()}${renderGtmTeamNode(item.name, sector.accent)}`;
    }

    const nested = (item.members || [])
      .map((name) => `${renderGtmConnectorV()}${renderGtmTeamNode(name, sector.accent)}`)
      .join("");

    return `${renderGtmConnectorV()}
      <div class="gtm-subgroup">
        <div class="gtm-subgroup-label">${escapeHtml(item.name)}</div>
        ${nested}
      </div>`;
  });

  return `<div class="gtm-team-tier">${parts.join("")}</div>`;
}

function renderGtmSectorBlock(sector) {
  const muted = sector.tier === 2;
  const teamHtml = sector.tier === 3 ? renderGtmTeamTier(sector) : "";

  return `
  <div class="gtm-sector-block${muted ? " gtm-sector-block--muted" : ""}" id="gtm-sector-${sector.id}" style="--gtm-accent:${sector.accent}">
    <div class="gtm-sector-node">${escapeHtml(sector.name)}</div>
    ${renderGtmConnectorV()}
    <div class="gtm-app-node">APP: ${escapeHtml(sector.app)}</div>
    ${teamHtml}
  </div>`;
}

function renderSectorOrgChart(block) {
  const sectors = FY27_GTM_SECTOR_STRUCTURE.map(renderGtmSectorBlock).join("");

  return `
  <article class="content-block sector-org-block">
    <header class="block-header">
      <h2>${escapeHtml(block.title)}</h2>
    </header>
    <div class="sector-org-scroll">
      <div class="gtm-vertical-chart">${sectors}</div>
    </div>
    <p class="sector-org-note">${escapeHtml(FY27_SECTOR_PENDING_NOTE)}</p>
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
    ? `<div class="training-slide-icon">${imgTag(block.icon.src, "Learning", assetPrefix)}</div>`
    : "";

  return `
  <article class="content-block training-block training-slide-layout">
    <div class="training-slide-frame">
      <div class="training-slide-title-bar">
        <h2>${escapeHtml(block.title)}</h2>
        ${block.subtitle ? `<span class="training-slide-as-of">${escapeHtml(block.subtitle)}</span>` : ""}
      </div>

      ${block.intro ? `<p class="training-slide-intro">${escapeHtml(block.intro)}</p>` : ""}

      <div class="training-slide-initiatives">
        <div class="training-slide-col training-slide-col-sessions">
          <div class="training-slide-col-head">${escapeHtml(block.trainingSessions?.heading || "Training Sessions")}</div>
          <div class="training-slide-col-body">
            <p class="training-col-desc">${escapeHtml(block.trainingSessions?.subheading || "")}</p>
            <ul>${(block.trainingSessions?.items || []).map((i) => `<li>${escapeHtml(i)}</li>`).join("")}</ul>
          </div>
        </div>
        <div class="training-slide-col-stack">
          <div class="training-slide-col">
            <div class="training-slide-col-head">${escapeHtml(block.selfLearningInternal?.heading || "Self Learning (internal)")}</div>
            <div class="training-slide-col-body">
              <p class="training-col-lead">${escapeHtml(block.selfLearningInternal?.description || "")}</p>
            </div>
          </div>
          <div class="training-slide-col">
            <div class="training-slide-col-head">${escapeHtml(block.selfLearningExternal?.heading || "Self Learning (external)")}</div>
            <div class="training-slide-col-body">
              <p class="training-col-lead">${escapeHtml(block.selfLearningExternal?.description || "")}</p>
            </div>
          </div>
        </div>
        <aside class="training-slide-aside">
          ${iconHtml}
          ${block.catalogNote ? `<p class="training-slide-catalog-note">${escapeHtml(block.catalogNote)}</p>` : ""}
        </aside>
      </div>

      <div class="training-slide-requirements">
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
    </div>
  </article>`;
}

function renderBlockLink(link) {
  if (!link) return "";
  if (typeof link === "string") {
    return `<p class="block-link">${escapeHtml(link)}</p>`;
  }
  return `<p class="block-link"><a href="${escapeHtml(link.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(link.text)}</a></p>`;
}

function renderPhotoGallery(block, assetPrefix) {
  return `
  <article class="content-block gallery-block">
    <header class="block-header">
      <h2>${escapeHtml(block.title)}</h2>
      <p class="lead-text">${escapeHtml(block.description)}</p>
      ${renderBlockLink(block.link)}
    </header>
    ${renderGalleryImages(block.images, assetPrefix)}
  </article>`;
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/&[^;]+;/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 56);
}

function sectionId(tabId, block, index) {
  const slug = slugify(block.title) || `section-${index + 1}`;
  return `${tabId}-${slug}`;
}

function attachSectionId(html, id) {
  if (html.includes('class="content-block')) {
    return html.replace(
      /<article(\s+id="[^"]*")?\s+class="content-block/,
      `<article id="${id}" class="content-block`
    );
  }
  return `<article id="${id}" class="content-block">${html}</article>`;
}

function renderSectionNav(tab) {
  const blocks = tab.blocks || [];
  if (blocks.length < 2) return "";

  const links = blocks
    .map((block, index) => {
      const id = sectionId(tab.id, block, index);
      const label = block.title || `Section ${index + 1}`;
      return `<a class="section-nav-link" href="#${id}" data-section="${id}">${escapeHtml(label)}</a>`;
    })
    .join("");

  return `<aside class="section-nav-sidebar">
    <p class="section-nav-heading">On this page</p>
    <nav class="section-nav" aria-label="Jump to section">${links}</nav>
  </aside>`;
}

function renderBlock(block, assetPrefix, tabId, index = 0) {
  let html;
  switch (block.type) {
    case "financial":
      html = renderFinancial(block, assetPrefix);
      break;
    case "dashboard":
      html = renderDashboard(block, assetPrefix);
      break;
    case "people-table":
    case "promotions-table":
      html = renderPeopleTable(block, assetPrefix);
      break;
    case "profile":
      html = renderProfile(block, assetPrefix);
      break;
    case "consultant-profile-sample":
      html = renderConsultantProfileSample(block, assetPrefix);
      break;
    case "org-design":
      html = renderOrgDesign(block);
      break;
    case "apollo-program":
      html = renderApolloProgram(block);
      break;
    case "placeholder":
      html = renderPlaceholder(block);
      break;
    case "sector-org-chart":
      html = renderSectorOrgChart(block);
      break;
    case "sector-list":
      html = renderSectorList(block);
      break;
    case "training":
      html = renderTraining(block, assetPrefix);
      break;
    case "photo-gallery":
      html = renderPhotoGallery(block, assetPrefix);
      break;
    default:
      html = `<article class="content-block"><h2>${escapeHtml(block.title)}</h2><ul>${(block.bullets || []).map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul></article>`;
  }
  if (tabId) {
    html = attachSectionId(html, sectionId(tabId, block, index));
  }
  return html;
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
  const blocksHtml = (tab.blocks || []).map((b, i) => renderBlock(b, assetPrefix, tab.id, i)).join("");
  const sectionNav = renderSectionNav(tab);
  const hasNav = Boolean(sectionNav);
  return `
    <section class="page-header">
      <h1>${escapeHtml(tab.headline)}</h1>
      ${tab.intro ? `<p class="lead">${escapeHtml(tab.intro)}</p>` : ""}
    </section>
    <div class="tab-body${hasNav ? " tab-body-with-nav" : ""}">
      ${sectionNav}
      <div class="tab-body-main">
        <div class="blocks-stack">${blocksHtml}</div>
      </div>
    </div>`;
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
        <label>Your name <input type="text" id="qa-name" placeholder="Optional" autocomplete="name" /></label>
        <label>Your question <textarea id="qa-text" rows="4" placeholder="Type your question…" required></textarea></label>
        <button type="button" id="qa-submit" class="btn-primary">Submit question</button>
        <p id="qa-status" class="qa-status muted" role="status" aria-live="polite"></p>
      </form>
      <div id="qa-list" class="qa-list">
        <p class="muted">Loading questions…</p>
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
  --page-padding: clamp(1.25rem, 3vw, 2.75rem);
  --content-max: min(1280px, calc(100% - 2 * var(--page-padding)));
  --header-height: 64px;
  --section-nav-width: clamp(200px, 18vw, 260px);
}
* { box-sizing: border-box; }
html { height: 100%; }
body { margin: 0; min-height: 100%; font-family: var(--font-sans); color: var(--pwc-black); background: var(--pwc-white); line-height: 1.6; }
h1, h2, h3 { font-family: var(--font-serif); font-weight: 400; }

.site-header { background: var(--pwc-black); position: sticky; top: 0; z-index: 100; width: 100%; }
.header-accent { height: 4px; background: var(--pwc-orange); }
.header-inner { width: 100%; max-width: none; margin: 0; padding: 0 var(--page-padding); display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 0.75rem 1.5rem; min-height: var(--header-height); text-align: center; }
.brand { display: flex; align-items: center; justify-content: center; gap: 1rem; }
.pwc-logo { font-size: 1.75rem; font-weight: 700; color: var(--pwc-white); font-family: var(--font-sans); }
.practice-name { color: rgba(255,255,255,0.75); font-size: 0.85rem; border-left: 1px solid rgba(255,255,255,0.25); padding-left: 1rem; }

.tab-nav { display: flex; gap: 0.15rem; overflow-x: auto; padding: 0.35rem 0; justify-content: center; width: 100%; }
.tab-btn { border: none; background: transparent; color: rgba(255,255,255,0.65); font: inherit; font-size: 0.82rem; font-weight: 600; padding: 0.5rem 0.85rem; border-radius: var(--radius); cursor: pointer; white-space: nowrap; transition: all 0.15s; }
.tab-btn:hover { background: rgba(255,255,255,0.1); color: var(--pwc-white); }
.tab-btn.active { background: var(--pwc-orange); color: var(--pwc-white); }

.site-main { width: 100%; max-width: none; margin: 0; padding: 0; }
.tab-panel { display: none; animation: fadeIn 0.25s ease; width: 100%; min-height: calc(100vh - var(--header-height)); text-align: center; }
.tab-panel.active { display: block; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

.hero { display: grid; grid-template-columns: 1fr; gap: 2rem; align-items: center; justify-items: center; background: var(--pwc-grey-100); border-left: none; padding: clamp(2rem, 5vh, 3.5rem) var(--page-padding); margin: 0; box-shadow: none; border-bottom: 4px solid var(--pwc-orange); min-height: min(42vh, 520px); text-align: center; }
.hero-text { max-width: var(--content-max); width: 100%; }
.eyebrow { text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.7rem; font-weight: 700; color: var(--pwc-orange); margin: 0 0 0.75rem; }
.hero h1 { font-size: clamp(1.85rem, 3.5vw, 2.75rem); margin: 0 0 0.35rem; line-height: 1.2; }
.hero-date { font-size: 1.1rem; color: var(--pwc-grey-500); margin: 0 0 1rem; }
.lead { font-size: 1rem; color: var(--pwc-grey-700); max-width: 72ch; margin: 0 auto; }
.hero-visual { max-width: var(--content-max); width: 100%; display: flex; justify-content: center; }
.hero-visual img { width: 100%; max-width: 420px; max-height: min(28vh, 280px); object-fit: contain; }
.hero-badge { width: 120px; height: 120px; background: var(--pwc-orange); color: var(--pwc-white); font-size: 2rem; font-weight: 700; display: flex; align-items: center; justify-content: center; border-radius: 50%; margin: 0 auto; }

.page-header { margin: 0; padding: clamp(1.75rem, 4vh, 2.5rem) var(--page-padding) 1.25rem; border-bottom: 2px solid var(--pwc-orange); background: var(--pwc-grey-100); text-align: center; }
.page-header h1 { font-size: clamp(1.65rem, 3vw, 2.25rem); margin: 0 auto 0.5rem; max-width: var(--content-max); }
.page-header .lead, .page-header .subtitle { max-width: var(--content-max); margin-inline: auto; }

.tab-body { width: 100%; }
.tab-body-with-nav {
  display: grid;
  grid-template-columns: var(--section-nav-width) 1fr;
  align-items: start;
  width: 100%;
}
.tab-body-main { min-width: 0; text-align: center; }

.section-nav-sidebar {
  position: sticky;
  top: var(--header-height);
  z-index: 40;
  align-self: start;
  width: var(--section-nav-width);
  height: calc(100vh - var(--header-height));
  overflow-y: auto;
  overflow-x: hidden;
  border-right: 1px solid var(--pwc-grey-200);
  background: var(--pwc-grey-100);
  padding: 1rem 0 1.5rem;
  text-align: left;
}
.section-nav-heading {
  margin: 0 0 0.65rem;
  padding: 0 1rem;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--pwc-grey-500);
  font-family: var(--font-sans);
}
.section-nav {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  padding: 0 0.5rem;
}
.section-nav-link {
  display: block;
  padding: 0.5rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--pwc-grey-700);
  text-decoration: none;
  border: none;
  border-left: 3px solid transparent;
  border-radius: 0 var(--radius) var(--radius) 0;
  background: transparent;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
  line-height: 1.35;
}
.section-nav-link:hover {
  color: var(--pwc-orange-dark);
  border-left-color: var(--pwc-orange);
  background: var(--pwc-orange-tint);
}
.section-nav-link.active {
  color: var(--pwc-orange-dark);
  border-left-color: var(--pwc-orange);
  background: var(--pwc-orange-tint);
}
.subtitle { color: var(--pwc-grey-500); font-size: 1rem; margin: 0 0 0.5rem; }

.content-section { background: var(--pwc-white); border: none; padding: clamp(1.75rem, 4vh, 2.5rem) var(--page-padding); margin: 0; box-shadow: none; border-bottom: 1px solid var(--pwc-grey-200); text-align: center; }
.content-section > * { max-width: var(--content-max); margin-inline: auto; }
.blocks-stack { display: flex; flex-direction: column; gap: 0; width: 100%; align-items: center; }

.content-block { background: var(--pwc-white); border: none; border-bottom: 1px solid var(--pwc-grey-200); padding: clamp(1.75rem, 4vh, 2.5rem) var(--page-padding); box-shadow: none; border-left: none; border-radius: 0; width: 100%; display: flex; flex-direction: column; align-items: center; text-align: center; scroll-margin-top: calc(var(--header-height) + 0.75rem); }
.content-block:last-child { border-bottom: none; }
.content-block > * { width: 100%; max-width: var(--content-max); }
.block-header { text-align: center; }
.block-header h2 { font-size: clamp(1.2rem, 2.2vw, 1.5rem); margin: 0 0 0.35rem; }
.block-subtitle { color: var(--pwc-grey-500); font-size: 0.95rem; margin: 0 auto 1rem; max-width: 72ch; }
.block-note { font-size: 0.85rem; color: var(--pwc-grey-500); font-style: italic; margin: 0.5rem auto 1rem; max-width: 72ch; }
.lead-text { color: var(--pwc-grey-700); font-size: 1rem; margin: 0 auto 1rem; max-width: 72ch; }
.block-link { margin: 0 auto 1.25rem; max-width: 72ch; font-weight: 600; }
.block-link a { color: var(--pwc-orange-dark); text-decoration: underline; text-underline-offset: 0.15em; }
.block-link a:hover { color: var(--pwc-orange); }

.content-block .table-wrap,
.content-block .data-table,
.content-block .clients-table,
.content-block .people-map-table,
.content-block .financial-visual-row,
.content-block .dashboard-mosaic,
.content-block .training-slide-initiatives,
.content-block .cert-progress-grid,
.content-block .profile-layout,
.content-block .org-section,
.content-block .gtm-vertical-chart,
.content-block .apollo-program-stack,
.content-block .apollo-value-grid,
.content-block .apollo-roadmap,
.content-block .people-map-layout,
.content-block .initiative-grid,
.content-block .sector-grid,
.content-block .qa-form,
.content-block .qa-list,
.agenda-numbered,
.donut-legend { text-align: left; }

.metrics-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: clamp(0.75rem, 1.5vw, 1rem); margin: 1rem auto; width: 100%; }
.metrics-grid-centered { grid-template-columns: repeat(auto-fit, minmax(150px, 200px)); justify-content: center; width: fit-content; max-width: 100%; margin-inline: auto; }
.metrics-primary .metric-card { background: linear-gradient(135deg, var(--pwc-orange-tint), var(--pwc-white)); }
.metric-card { background: var(--pwc-orange-tint); border: 1px solid var(--pwc-grey-200); padding: 1.1rem 0.75rem; text-align: center; border-radius: var(--radius); }
.metric-value { font-size: 1.5rem; font-weight: 700; color: var(--pwc-orange-dark); line-height: 1.2; }
.metric-label { font-size: 0.72rem; color: var(--pwc-grey-700); margin-top: 0.35rem; line-height: 1.3; }

.industry-section, .clients-section, .cert-section, .org-section { margin-top: 1.75rem; text-align: center; }
.industry-section h3, .clients-section h3, .cert-section h3, .org-section h3 { font-size: 1rem; margin: 0 auto 1rem; color: var(--pwc-grey-700); text-transform: uppercase; letter-spacing: 0.05em; font-family: var(--font-sans); font-weight: 700; }
.industry-chart-svg { display: block; width: 100%; max-width: min(100%, 480px); height: auto; margin: 0.5rem auto 0; border-radius: var(--radius); box-shadow: var(--shadow); }
.financial-visual-row { display: grid; grid-template-columns: minmax(280px, 1fr) minmax(320px, 1.4fr); gap: clamp(1.5rem, 3vw, 3rem); align-items: start; margin: 1.75rem auto 0; width: 100%; }
.financial-visual-row .industry-section { margin-top: 0; }
.financial-visual-row .clients-section { margin-top: 0; }
.clients-section-table .clients-table { width: 100%; border-collapse: collapse; margin-top: 0.25rem; }
.clients-section-table .clients-table td { padding: 0.4rem 0.5rem; font-size: 0.82rem; color: var(--pwc-grey-700); line-height: 1.35; vertical-align: top; border-bottom: 1px solid var(--pwc-grey-200); font-weight: 600; }
.clients-section-table .clients-table tr:last-child td { border-bottom: none; }
.clients-section-table .clients-table td:first-child { padding-right: 1.25rem; }

.donut-chart-wrap { display: grid; grid-template-columns: minmax(180px, 220px) 1fr; gap: clamp(1rem, 2vw, 2rem); align-items: center; margin: 0.5rem auto 0; width: 100%; max-width: none; justify-items: center; }
.donut-chart { width: 200px; height: 200px; border-radius: 50%; position: relative; box-shadow: var(--shadow); flex-shrink: 0; margin-inline: auto; }
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
.clients-summary { color: var(--pwc-grey-500); margin: 0 auto 0.75rem; font-size: 0.95rem; }

.sector-org-note { margin: 1.25rem auto 0; padding: 0.85rem 1rem; border: 2px dashed var(--pwc-grey-200); border-radius: var(--radius); background: var(--pwc-grey-100); font-size: 0.82rem; color: var(--pwc-grey-500); font-style: italic; line-height: 1.45; max-width: var(--content-max); text-align: center; }

.image-stack { display: flex; flex-direction: column; gap: 1rem; margin-top: 1rem; }
.image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.85rem; margin-top: 1rem; }
.gallery-block .gallery-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.25rem; margin-top: 1.25rem; }
.gallery-block .slide-figure.featured { grid-column: 1 / -1; }
.gallery-block .slide-figure.featured img { width: 100%; max-width: 100%; }
.slide-figure { margin: 0; }
.slide-figure img { width: 100%; display: block; border: none; border-radius: var(--radius); background: transparent; }

.table-wrap { overflow-x: auto; margin-top: 1rem; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.88rem; }
.data-table th { background: var(--pwc-black); color: var(--pwc-white); padding: 0.65rem 0.85rem; text-align: left; font-family: var(--font-sans); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; }
.data-table td { padding: 0.65rem 0.85rem; border-bottom: 1px solid var(--pwc-grey-200); vertical-align: top; }
.data-table tbody tr:hover { background: var(--pwc-orange-tint); }
.badge { background: var(--pwc-orange); color: var(--pwc-white); padding: 0.15rem 0.5rem; border-radius: 999px; font-size: 0.75rem; font-weight: 600; white-space: nowrap; }

.people-map-block .table-wrap { margin-top: 1.5rem; }
.people-map-layout { margin-top: 1rem; }
.people-map-panel { background: var(--pwc-grey-100); border: 1px solid var(--pwc-grey-200); border-radius: var(--radius); padding: 1.25rem; }
.map-legend { display: flex; flex-wrap: wrap; gap: 1.25rem; margin-bottom: 1rem; padding-bottom: 0.85rem; border-bottom: 1px solid var(--pwc-grey-200); justify-content: center; }
.map-legend-item { display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; font-weight: 600; color: var(--pwc-grey-700); }
.map-legend-swatch { width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0; border: 2px solid var(--pwc-white); box-shadow: 0 0 0 1px var(--pwc-grey-200); }
.us-talent-map { display: block; width: 100%; height: auto; max-height: min(52vh, 560px); border-radius: var(--radius); }
.map-marker { cursor: pointer; transition: r 0.15s, filter 0.15s; }
.map-marker.highlight, .map-marker:hover { r: 12; filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25)); }
.map-city-label { pointer-events: none; user-select: none; }
.people-map-table .movement-swatch { display: inline-block; width: 14px; height: 14px; border-radius: 50%; border: 2px solid var(--pwc-white); box-shadow: 0 0 0 1px var(--pwc-grey-200); vertical-align: middle; }
.people-map-table td:first-child { width: 2rem; text-align: center; padding-left: 0.5rem; padding-right: 0.5rem; }
.people-map-table .movement-type-label { font-size: 0.82rem; font-weight: 600; white-space: nowrap; }
.people-map-table tbody tr.highlight { background: var(--pwc-orange-tint); outline: 2px solid var(--pwc-orange); outline-offset: -2px; }

.profile-layout { display: grid; grid-template-columns: minmax(180px, 240px) 1fr; gap: clamp(1.5rem, 3vw, 2.5rem); align-items: start; width: 100%; }
.profile-photo img { width: 100%; border-radius: var(--radius); border: 1px solid var(--pwc-grey-200); }
.profile-role { color: var(--pwc-orange); font-weight: 600; margin: 0 0 1rem; font-size: 0.95rem; }

.consultant-profile-block { text-align: left; align-items: stretch; padding-top: 1.5rem; padding-bottom: 1.5rem; }
.consultant-profile-full-image {
  display: block;
  width: 100%;
  max-width: 960px;
  margin: 0 auto;
  height: auto;
  border: 1px solid var(--pwc-grey-200);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.consultant-profile-card {
  display: grid;
  grid-template-columns: minmax(260px, 320px) 1fr;
  max-width: 960px;
  margin: 0 auto;
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--pwc-grey-200);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.consultant-profile-sidebar {
  background: #000000;
  color: #FFFFFF;
  padding: 2rem 1.5rem 1.75rem;
}
.consultant-profile-photo {
  width: 132px;
  height: 132px;
  margin: 0 auto 1.25rem;
  border-radius: 50%;
  border: 3px solid #FD5108;
  overflow: hidden;
  background: #2D2D2D;
}
.consultant-profile-photo img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: center center;
  display: block;
}
.consultant-profile-name {
  margin: 0 0 0.5rem;
  font-family: var(--font-sans);
  font-size: 1.35rem;
  font-weight: 700;
  color: #FFFFFF;
  line-height: 1.2;
}
.consultant-profile-role {
  margin: 0 0 0.65rem;
  font-family: var(--font-sans);
  font-size: 0.72rem;
  line-height: 1.45;
  color: #FFFFFF;
}
.consultant-profile-subtitle {
  margin: 0 0 1rem;
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-style: italic;
  color: #9CA3AF;
}
.consultant-profile-divider {
  border: none;
  border-top: 1px solid #4B5563;
  margin: 0 0 1rem;
}
.consultant-profile-meta-item { margin-bottom: 0.85rem; }
.consultant-profile-meta-item:last-child { margin-bottom: 0; }
.consultant-profile-meta-label {
  font-family: var(--font-sans);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #FD5108;
  margin-bottom: 0.2rem;
}
.consultant-profile-meta-value {
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 700;
  color: #FFFFFF;
  line-height: 1.35;
}
.consultant-profile-main {
  background: #FFFFFF;
  padding: 2rem 2rem 1.75rem;
  text-align: left;
}
.consultant-profile-section { margin-bottom: 1.75rem; }
.consultant-profile-section:last-child { margin-bottom: 0; }
.consultant-profile-section-head {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 0.75rem;
}
.consultant-profile-section-num {
  flex-shrink: 0;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: #FD5108;
  color: #FFFFFF;
  font-family: var(--font-sans);
  font-size: 0.85rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.consultant-profile-section-head h3 {
  margin: 0;
  font-family: var(--font-sans);
  font-size: 0.92rem;
  font-weight: 700;
  color: #2D2D2D;
  line-height: 1.3;
}
.consultant-profile-section ul {
  margin: 0;
  padding-left: 1.15rem;
  font-family: var(--font-sans);
  font-size: 0.78rem;
  line-height: 1.5;
  color: #2D2D2D;
}
.consultant-profile-section li { margin-bottom: 0.45rem; }
.consultant-profile-section li:last-child { margin-bottom: 0; }
.fun-fact { background: var(--pwc-orange-tint); padding: 1rem; border-radius: var(--radius); font-size: 0.9rem; margin-top: 1rem; }

.pillar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin-top: 1rem; }
.pillar-card { background: var(--pwc-grey-100); padding: 1.25rem; border-radius: var(--radius); border-top: 3px solid var(--pwc-orange); }
.pillar-card h3 { font-size: 0.95rem; margin: 0 0 0.75rem; font-family: var(--font-sans); font-weight: 700; }
.pillar-card ul { margin: 0; padding-left: 1.1rem; font-size: 0.85rem; }
.pillar-card li { margin-bottom: 0.35rem; }
.leadership-list { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 0.5rem; justify-content: center; }
.leadership-list li { background: var(--pwc-grey-100); padding: 0.5rem 0.85rem; border-radius: var(--radius); font-size: 0.88rem; }

.org-slide-layout { text-align: left; align-items: stretch; }
.org-slide-frame { max-width: 960px; margin: 0 auto; width: 100%; }
.org-slide-eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: #D04A02;
  font-family: var(--font-sans);
}
.org-slide-title {
  margin: 0 0 0.65rem;
  font-size: clamp(1.35rem, 2.4vw, 1.65rem);
  font-weight: 700;
  color: #2D2D2D;
  font-family: var(--font-sans);
  line-height: 1.2;
}
.org-slide-rule {
  width: 2.5rem;
  height: 3px;
  background: #D04A02;
  margin: 0 0 0.85rem;
}
.org-slide-desc {
  margin: 0 0 1.35rem;
  font-size: 0.92rem;
  line-height: 1.5;
  color: #464646;
  max-width: none;
}
.org-slide-leadership-head {
  background: #2D2D2D;
  color: #FFFFFF;
  font-family: var(--font-sans);
  font-size: 0.82rem;
  font-weight: 700;
  padding: 0.55rem 0.85rem;
  text-align: left;
}
.org-slide-leadership-row {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin-bottom: 1.35rem;
}
.org-slide-lead-box {
  background: #FFF1E3;
  border: 1px solid #D04A02;
  color: #D04A02;
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 700;
  text-align: center;
  padding: 0.7rem 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  line-height: 1.35;
}
.org-slide-lead-box + .org-slide-lead-box { border-left: none; }
.org-slide-columns {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
  margin-bottom: 0;
  align-items: stretch;
}
.org-slide-col { display: flex; flex-direction: column; min-width: 0; }
.org-slide-col-head {
  color: #FFFFFF;
  font-family: var(--font-sans);
  font-size: 0.82rem;
  font-weight: 700;
  text-align: center;
  padding: 0.65rem 0.45rem;
  line-height: 1.3;
  min-height: 2.85rem;
  display: flex;
  align-items: center;
  justify-content: center;
}
.org-slide-col-body {
  background: #FFFFFF;
  border: 1px solid #DEDEDE;
  border-top: none;
  border-left: none;
  padding: 0.85rem 0.75rem 1rem;
  flex: 1;
}
.org-slide-col:first-child .org-slide-col-body { border-left: 1px solid #DEDEDE; }
.org-slide-list {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.78rem;
  line-height: 1.45;
  color: #2D2D2D;
  font-family: var(--font-sans);
}
.org-slide-list li { margin-bottom: 0.35rem; }
.org-slide-list li:last-child { margin-bottom: 0; }
.org-slide-note { font-style: italic; list-style: none; margin-left: -1.1rem; padding-left: 0; }
.org-slide-enablers {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem 1rem;
  background: #464646;
  padding: 0.55rem 0.85rem;
  margin-top: 0;
}
.org-slide-enablers-label {
  color: #EB8C00;
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}
.org-slide-enablers-text {
  color: #FFFFFF;
  font-family: var(--font-sans);
  font-size: 0.72rem;
  line-height: 1.45;
  flex: 1;
  min-width: 200px;
}

.placeholder-card { text-align: center; padding: 3rem 2rem; background: var(--pwc-grey-100); border-radius: var(--radius); border: 2px dashed var(--pwc-grey-200); }
.placeholder-icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
.placeholder-badge { display: inline-block; margin-top: 1rem; background: var(--pwc-grey-200); color: var(--pwc-grey-700); padding: 0.35rem 0.85rem; border-radius: 999px; font-size: 0.8rem; font-weight: 600; }

.apollo-block { --apollo-value-color: #0F6E56; --apollo-delivery-color: #D04A02; }
.apollo-block .eyebrow { margin-bottom: 0.35rem; }
.apollo-program-stack { display: flex; flex-direction: column; gap: 0; margin: 1.5rem 0 2rem; width: 100%; max-width: none; }
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
.apollo-value-grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(1rem, 2vw, 1.5rem); width: 100%; }
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
.apollo-roadmap-section { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--pwc-grey-200); text-align: center; }
.apollo-roadmap-section > h3,
.training-cert-section > h3,
.training-slide-intro,
.training-slide-catalog-note,
.highlight-banner { text-align: center; }
.apollo-roadmap-callout { margin: 1.25rem auto 0; padding: 1.25rem 1.35rem; background: var(--pwc-grey-100); border: 1px solid var(--pwc-grey-200); border-radius: var(--radius); border-left: 4px solid var(--pwc-orange); max-width: var(--content-max); text-align: center; }
.apollo-roadmap { display: grid; grid-template-columns: repeat(6, 1fr); gap: clamp(0.65rem, 1.5vw, 1rem); margin-bottom: 1rem; width: 100%; }
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
.apollo-roadmap-lead { font-size: 0.95rem; font-weight: 600; color: var(--pwc-black); line-height: 1.55; margin: 0; }

.sector-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 0.75rem; }
.sector-card { background: var(--pwc-grey-100); padding: 1rem; border-radius: var(--radius); border-left: 3px solid var(--pwc-orange); }
.sector-name { font-weight: 600; font-size: 0.9rem; }
.sector-tag { font-size: 0.78rem; color: var(--pwc-orange-dark); margin-top: 0.25rem; font-weight: 600; }

.sector-org-block { overflow: visible; }
.sector-org-scroll { margin-top: 1rem; padding-bottom: 0.75rem; width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; }

.gtm-vertical-chart { display: flex; flex-direction: row; align-items: flex-start; justify-content: center; gap: clamp(0.65rem, 1.2vw, 1rem); width: 100%; min-width: min-content; padding: 0.5rem 0 0.25rem; }
.gtm-sector-block { display: flex; flex-direction: column; align-items: center; flex: 1 1 130px; min-width: 128px; max-width: 168px; width: auto; }
#gtm-sector-hls { min-width: 148px; max-width: 188px; }
.gtm-sector-node { width: 100%; text-align: center; background: var(--gtm-accent); color: var(--pwc-white); border: 2px solid color-mix(in srgb, var(--gtm-accent) 80%, var(--pwc-black)); border-radius: var(--radius); padding: 0.6rem 0.55rem; font-family: var(--font-sans); font-size: 0.82rem; font-weight: 700; letter-spacing: 0.03em; line-height: 1.25; box-shadow: var(--shadow); }
.gtm-sector-block--muted .gtm-sector-node { background: var(--pwc-grey-100); color: var(--pwc-grey-700); border-color: var(--pwc-grey-200); box-shadow: none; }
.gtm-app-node { width: 100%; text-align: center; background: var(--pwc-grey-100); border: 1px solid var(--pwc-grey-200); border-radius: var(--radius); padding: 0.5rem 0.45rem; font-size: 0.72rem; font-weight: 600; color: var(--pwc-grey-700); line-height: 1.3; }
.gtm-connector-v { --gtm-line: #9CA3AF; width: 2px; height: 1.125rem; background: var(--gtm-line); position: relative; flex-shrink: 0; }
.gtm-connector-v::after { content: ""; position: absolute; left: 50%; bottom: -5px; transform: translateX(-50%); width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-top: 5px solid var(--gtm-line); }
.gtm-team-tier { display: flex; flex-direction: column; align-items: center; width: 100%; }
.gtm-team-node { width: 100%; text-align: center; background: color-mix(in srgb, var(--gtm-accent) 14%, var(--pwc-white)); border: 1px solid color-mix(in srgb, var(--gtm-accent) 40%, var(--pwc-grey-200)); border-left: 3px solid var(--gtm-accent); border-radius: var(--radius); padding: 0.42rem 0.45rem; font-size: 0.68rem; font-weight: 600; color: var(--pwc-grey-700); line-height: 1.25; }
.gtm-subgroup { display: flex; flex-direction: column; align-items: center; width: 100%; }
.gtm-subgroup-label { width: 100%; text-align: center; background: var(--pwc-grey-100); border: 1px solid var(--pwc-grey-200); border-radius: var(--radius); padding: 0.42rem 0.45rem; font-size: 0.68rem; font-weight: 700; color: var(--pwc-grey-700); line-height: 1.25; }

.initiative-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; margin-top: 1rem; }
.initiative-card { background: var(--pwc-grey-100); padding: 1.25rem; border-radius: var(--radius); }
.initiative-card h3 { font-size: 0.9rem; margin: 0 0 0.65rem; font-family: var(--font-sans); font-weight: 700; }
.initiative-card ul { margin: 0; padding-left: 1.1rem; font-size: 0.85rem; }

.training-slide-layout { text-align: left; align-items: stretch; }
.training-slide-frame { max-width: 960px; margin: 0 auto; width: 100%; }
.training-slide-title-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  background: var(--pwc-black);
  border-bottom: 4px solid var(--pwc-orange);
  padding: 0.65rem 1rem;
  margin-bottom: 0.75rem;
  border-radius: var(--radius) var(--radius) 0 0;
}
.training-slide-title-bar h2 {
  margin: 0;
  font-family: var(--font-serif);
  font-size: clamp(1.15rem, 2.2vw, 1.45rem);
  font-weight: 700;
  color: var(--pwc-white);
  line-height: 1.2;
}
.training-slide-as-of {
  font-family: var(--font-sans);
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.72);
  white-space: nowrap;
  flex-shrink: 0;
}
.training-slide-intro {
  font-family: var(--font-sans);
  font-size: 0.92rem;
  color: var(--pwc-grey-700);
  margin: 0 0 1rem;
  line-height: 1.45;
}
.training-slide-initiatives {
  display: grid;
  grid-template-columns: minmax(0, 1.15fr) minmax(0, 1.15fr) minmax(88px, 0.45fr);
  gap: 0.85rem;
  align-items: stretch;
  margin-bottom: 1rem;
  width: 100%;
}
.training-slide-col,
.training-slide-col-sessions { display: flex; flex-direction: column; min-width: 0; }
.training-slide-col-stack { display: flex; flex-direction: column; gap: 0.85rem; min-width: 0; }
.training-slide-col-sessions .training-slide-col-body { flex: 1; }
.training-slide-col-head {
  align-self: center;
  margin-bottom: -0.55rem;
  position: relative;
  z-index: 1;
  background: var(--pwc-orange);
  border: none;
  border-radius: 999px;
  padding: 0.35rem 1.1rem;
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--pwc-white);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  text-align: center;
  line-height: 1.25;
  white-space: nowrap;
  box-shadow: var(--shadow);
}
.training-slide-col-body {
  background: var(--pwc-orange-tint);
  border: 1px solid var(--pwc-grey-200);
  border-top: 3px solid var(--pwc-orange);
  border-radius: var(--radius);
  padding: 1.15rem 1rem 0.95rem;
  flex: 1;
}
.training-col-desc {
  font-family: var(--font-sans);
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--pwc-orange-dark);
  margin: 0 0 0.65rem;
  line-height: 1.35;
}
.training-col-lead {
  font-family: var(--font-sans);
  font-size: 0.82rem;
  color: var(--pwc-grey-700);
  margin: 0;
  line-height: 1.45;
}
.training-slide-col-body ul {
  margin: 0;
  padding-left: 1.1rem;
  font-family: var(--font-sans);
  font-size: 0.82rem;
  color: var(--pwc-grey-700);
}
.training-slide-col-body li { margin-bottom: 0.35rem; }
.training-slide-col-body li:last-child { margin-bottom: 0; }
.training-slide-aside {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0.75rem;
  min-width: 0;
  padding-top: 0.15rem;
}
.training-slide-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 52px;
  height: 52px;
  background: var(--pwc-orange-tint);
  border: 2px solid var(--pwc-orange);
  border-radius: 50%;
}
.training-slide-icon img { width: 28px; height: 28px; object-fit: contain; }
.training-slide-catalog-note {
  font-family: var(--font-sans);
  font-size: 0.72rem;
  color: var(--pwc-grey-500);
  font-style: italic;
  margin: 0;
  line-height: 1.4;
  text-align: center;
}
.training-slide-requirements {
  background: var(--pwc-grey-100);
  border: 1px solid var(--pwc-grey-200);
  border-left: 4px solid var(--pwc-orange);
  border-radius: var(--radius);
  padding: 0.85rem 1rem;
  margin-bottom: 1.25rem;
}
.training-slide-requirements h3 {
  margin: 0 0 0.45rem;
  font-family: var(--font-sans);
  font-size: 0.82rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--pwc-orange-dark);
}
.training-slide-requirements ul {
  margin: 0;
  padding-left: 1.1rem;
  font-family: var(--font-sans);
  font-size: 0.82rem;
  color: var(--pwc-grey-700);
  line-height: 1.45;
}
.training-slide-requirements li { margin-bottom: 0.25rem; }
.training-slide-requirements li:last-child { margin-bottom: 0; }
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

.dashboard-mosaic {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 1px;
  margin-top: 1rem;
  width: 100%;
  background: var(--pwc-grey-200);
  border: 1px solid var(--pwc-grey-200);
  border-radius: var(--radius);
  overflow: hidden;
}
.dashboard-cell {
  background: var(--pwc-white);
  padding: 0.7rem 0.65rem 0.75rem;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.dashboard-cell-delivery,
.dashboard-cell-ai { grid-column: span 3; }
.dashboard-cell-chart { grid-column: span 2; padding-bottom: 0.85rem; }
.dashboard-cell-clients { grid-column: 1 / -1; }
.dashboard-cell h3 {
  font-size: 0.78rem;
  margin: 0 0 0.55rem;
  color: var(--pwc-grey-700);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-family: var(--font-sans);
  font-weight: 700;
  text-align: center;
  flex-shrink: 0;
}
.delivery-impact-grid {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 0;
  width: 100%;
  flex: 1;
  align-items: stretch;
  border: 1px solid var(--pwc-grey-200);
  border-radius: calc(var(--radius) - 2px);
  overflow: hidden;
}
.delivery-impact-card {
  background: var(--pwc-grey-100);
  border: none;
  border-right: 1px solid var(--pwc-grey-200);
  border-top: 3px solid var(--pwc-orange);
  border-radius: 0;
  padding: 0.55rem 0.35rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  min-height: 5.5rem;
}
.delivery-impact-card:last-child { border-right: none; }
.delivery-impact-icon { width: 28px; height: 28px; margin: 0 auto 0.35rem; background: var(--pwc-orange-tint); border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
.delivery-impact-icon img { width: 16px; height: 16px; object-fit: contain; }
.delivery-impact-value { font-family: var(--font-serif); font-size: clamp(1.05rem, 1.6vw, 1.35rem); font-weight: 700; color: var(--pwc-orange-dark); line-height: 1.1; }
.delivery-impact-label { font-size: 0.62rem; color: var(--pwc-grey-700); margin-top: 0.25rem; line-height: 1.2; font-weight: 600; max-width: 9em; }
.ai-capability-grid { display: flex; flex-direction: column; gap: 0.55rem; flex: 1; }
.ai-cap-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0; border: 1px solid var(--pwc-grey-200); border-radius: calc(var(--radius) - 2px); overflow: hidden; }
.ai-cap-metric { text-align: center; padding: 0.45rem 0.3rem; background: var(--pwc-grey-100); border-right: 1px solid var(--pwc-grey-200); }
.ai-cap-metric:last-child { border-right: none; }
.ai-cap-icon img { width: 26px; height: 26px; object-fit: contain; margin-bottom: 0.25rem; }
.ai-cap-value { font-family: var(--font-serif); font-size: 1.15rem; font-weight: 700; color: var(--pwc-black); line-height: 1.1; }
.ai-cap-label { font-size: 0.62rem; color: var(--pwc-grey-500); margin-top: 0.2rem; line-height: 1.2; }
.ai-cap-skills { padding: 0.45rem 0.5rem; background: var(--pwc-grey-100); border: 1px solid var(--pwc-grey-200); border-radius: calc(var(--radius) - 2px); }
.ai-cap-skills-label { font-size: 0.68rem; font-weight: 700; color: var(--pwc-grey-700); text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 0.35rem; text-align: center; }
.ai-cap-ess { text-align: center; padding: 0.45rem 0.5rem; background: var(--pwc-orange-tint); border: 1px solid var(--pwc-grey-200); border-radius: calc(var(--radius) - 2px); }
.ai-cap-ess-value { font-family: var(--font-serif); font-size: 1.35rem; font-weight: 700; color: var(--pwc-orange-dark); line-height: 1.1; }
.ai-cap-ess-label { font-size: 0.68rem; color: var(--pwc-grey-500); margin-top: 0.15rem; line-height: 1.25; }
.tag-row-compact { margin: 0; gap: 0.35rem; justify-content: center; }
.tag-compact { padding: 0.2rem 0.5rem; font-size: 0.68rem; background: var(--pwc-white); }
.dashboard-stat { font-size: 0.82rem; font-weight: 700; color: var(--pwc-orange-dark); margin: 0 0 0.25rem; text-align: center; flex-shrink: 0; }
.dashboard-chart-area { flex: 1; display: flex; align-items: center; justify-content: center; min-height: 170px; width: 100%; padding: 0.15rem 0.25rem 0; }
.dashboard-inline-chart { display: block; width: 100%; height: auto; max-height: 200px; }
.dashboard-cell-adapt { align-items: stretch; }
.dashboard-cell-adapt .adapt-gauge-wrap { width: min(100%, 220px); margin: auto auto 0; flex: 1; display: flex; flex-direction: column; justify-content: flex-end; }
.adapt-gauge-wrap { position: relative; width: min(100%, 220px); margin: 0 auto; }
.adapt-gauge-svg { display: block; width: 100%; height: auto; overflow: visible; }
.adapt-gauge-track { fill: none; stroke: var(--pwc-grey-200); stroke-width: 22; stroke-linecap: round; }
.adapt-gauge-fill { fill: none; stroke: var(--pwc-orange); stroke-width: 22; stroke-linecap: round; }
.adapt-gauge-label { position: absolute; left: 50%; bottom: 0.2rem; transform: translateX(-50%); text-align: center; width: 100%; }
.adapt-gauge-value { font-family: var(--font-serif); font-size: clamp(1.35rem, 2.5vw, 1.65rem); font-weight: 700; color: var(--pwc-orange-dark); line-height: 1.1; }
.adapt-gauge-caption { font-size: 0.68rem; color: var(--pwc-grey-500); margin-top: 0.15rem; }
.dashboard-cell-clients .client-logo-grid { margin-top: 0.35rem; gap: 0; border: 1px solid var(--pwc-grey-200); border-radius: calc(var(--radius) - 2px); overflow: hidden; grid-template-columns: repeat(7, minmax(0, 1fr)); }
.client-logo-grid { display: grid; gap: 0; }
.client-logo-item { display: flex; align-items: center; justify-content: center; padding: 0.45rem; background: var(--pwc-grey-100); border: none; border-right: 1px solid var(--pwc-grey-200); border-bottom: 1px solid var(--pwc-grey-200); border-radius: 0; min-height: 52px; }
.client-logo-item:nth-child(7n) { border-right: none; }
.client-logo-item img { max-width: 100%; max-height: 36px; object-fit: contain; }
.tag { background: var(--pwc-grey-100); border: 1px solid var(--pwc-grey-200); padding: 0.3rem 0.65rem; border-radius: 999px; font-size: 0.78rem; }

.agenda-link { background: none; border: none; padding: 0; font: inherit; color: var(--pwc-black); cursor: pointer; text-align: left; font-weight: 600; }
.agenda-link:hover { color: var(--pwc-orange); }
.agenda-numbered { counter-reset: agenda; list-style: none; padding: 0; margin: 0 auto; max-width: 640px; text-align: left; }
.agenda-numbered li { counter-increment: agenda; padding: 1rem 0 1rem 3rem; border-bottom: 1px solid var(--pwc-grey-200); position: relative; }
.agenda-numbered li::before { content: counter(agenda); position: absolute; left: 0; width: 2rem; height: 2rem; background: var(--pwc-orange); color: var(--pwc-white); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; font-weight: 700; }

.qa-panel .qa-form { display: grid; gap: 1rem; margin-bottom: 2rem; }
.qa-panel label { display: grid; gap: 0.35rem; font-weight: 600; font-size: 0.9rem; }
.qa-panel input, .qa-panel textarea { font: inherit; padding: 0.65rem 0.85rem; border: 1px solid var(--pwc-grey-200); border-radius: var(--radius); }
.btn-primary { background: var(--pwc-orange); color: var(--pwc-white); border: none; border-radius: var(--radius); padding: 0.65rem 1.5rem; font: inherit; font-weight: 600; cursor: pointer; }
.btn-primary:hover { background: var(--pwc-orange-dark); }
.btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }
.qa-status { margin: 0; min-height: 1.25rem; font-size: 0.85rem; }
.qa-status.is-error { color: #A32020; font-style: normal; font-weight: 600; }
.qa-status.is-success { color: var(--pwc-orange-dark); font-style: normal; font-weight: 600; }
.qa-list { text-align: left; max-width: 720px; margin: 0 auto; width: 100%; }
.qa-item { border: 1px solid var(--pwc-grey-200); padding: 1rem; margin-bottom: 0.75rem; background: var(--pwc-grey-100); border-radius: var(--radius); }
.qa-item-header { display: flex; align-items: baseline; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.35rem; }
.qa-item-header strong { color: var(--pwc-black); }
.qa-item-time { font-size: 0.72rem; color: var(--pwc-grey-500); white-space: nowrap; }
.qa-item p { margin: 0; color: var(--pwc-grey-700); line-height: 1.45; }
.muted { color: var(--pwc-grey-500); }

.site-footer { border-top: 3px solid var(--pwc-orange); background: var(--pwc-black); color: rgba(255,255,255,0.6); padding: 1.5rem; text-align: center; font-size: 0.75rem; }

.preview-build-banner {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 200;
  background: var(--pwc-black); color: rgba(255,255,255,0.85);
  font-size: 0.72rem; font-family: var(--font-sans); text-align: center;
  padding: 0.4rem 0.75rem; border-top: 2px solid var(--pwc-orange);
  pointer-events: none;
}
body { padding-bottom: 2rem; }

@media (max-width: 600px) {
  .metrics-grid-centered { grid-template-columns: 1fr; width: 100%; }
}

@media (max-width: 800px) {
  .tab-body-with-nav { --section-nav-width: 168px; }
  .section-nav-link { font-size: 0.72rem; padding: 0.42rem 0.55rem; }
  .section-nav-heading { font-size: 0.62rem; padding: 0 0.65rem; }
  .hero { grid-template-columns: 1fr; }
  .hero h1 { font-size: 1.5rem; }
  .profile-layout { grid-template-columns: 1fr; }
  .consultant-profile-card { grid-template-columns: 1fr; }
  .consultant-profile-main { padding: 1.25rem 1rem; }
  .donut-chart-wrap { grid-template-columns: 1fr; justify-items: center; }
  .financial-visual-row { grid-template-columns: 1fr; }
  .dashboard-mosaic { grid-template-columns: 1fr; }
  .dashboard-cell-delivery,
  .dashboard-cell-ai,
  .dashboard-cell-chart,
  .dashboard-cell-clients { grid-column: 1 / -1; }
  .delivery-impact-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .delivery-impact-card { border-right: 1px solid var(--pwc-grey-200); }
  .delivery-impact-card:nth-child(3n) { border-right: none; }
  .delivery-impact-card:nth-child(-n+3) { border-bottom: 1px solid var(--pwc-grey-200); }
  .ai-cap-metrics { grid-template-columns: 1fr; }
  .ai-cap-metric { border-right: none; border-bottom: 1px solid var(--pwc-grey-200); }
  .ai-cap-metric:last-child { border-bottom: none; }
  .dashboard-cell-clients .client-logo-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .client-logo-item:nth-child(7n) { border-right: 1px solid var(--pwc-grey-200); }
  .client-logo-item:nth-child(4n) { border-right: none; }
  .training-slide-initiatives { grid-template-columns: 1fr; }
  .training-slide-aside { flex-direction: row; justify-content: center; padding-top: 0; }
  .training-slide-catalog-note { max-width: 16rem; }
  .cert-progress-grid { grid-template-columns: 1fr; }
  .apollo-value-grid { grid-template-columns: 1fr; }
  .apollo-roadmap { grid-template-columns: repeat(2, 1fr); }
  .clients-section-table .clients-table td { display: block; width: 100%; border-bottom: none; padding: 0.3rem 0; }
  .clients-section-table .clients-table tr { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; border-bottom: 1px solid var(--pwc-grey-200); padding: 0.25rem 0; }
  .clients-section-table .clients-table tr:last-child { border-bottom: none; }
  .client-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); }
  .map-legend { flex-direction: column; gap: 0.65rem; }
  .header-inner { flex-direction: column; align-items: flex-start; padding: 0.75rem var(--page-padding); }
  .practice-name { border-left: none; padding-left: 0; }
  .org-slide-columns,
  .org-slide-leadership-row { grid-template-columns: 1fr; }
  .org-slide-enablers { flex-direction: column; align-items: flex-start; }
}
@media (max-width: 520px) {
  .tab-body-with-nav { --section-nav-width: 140px; }
  .section-nav-link { font-size: 0.68rem; padding: 0.38rem 0.45rem; }
  .delivery-impact-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .delivery-impact-card:nth-child(3n) { border-right: 1px solid var(--pwc-grey-200); }
  .delivery-impact-card:nth-child(2n) { border-right: none; }
  .delivery-impact-card:nth-child(-n+3) { border-bottom: 1px solid var(--pwc-grey-200); }
  .delivery-impact-card:nth-child(-n+2) { border-bottom: 1px solid var(--pwc-grey-200); }
  .delivery-impact-card:nth-last-child(-n+1) { border-bottom: none; }
  .dashboard-cell-clients .client-logo-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .client-logo-item:nth-child(4n) { border-right: 1px solid var(--pwc-grey-200); }
  .client-logo-item:nth-child(3n) { border-right: none; }
  .gtm-sector-block { min-width: 118px; max-width: 148px; }
  #gtm-sector-hls { min-width: 132px; max-width: 160px; }
  .gtm-team-node, .gtm-subgroup-label { font-size: 0.65rem; }
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
<body data-built-at="${builtAt}" data-session-id="${sessionId}">
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
  <div class="preview-build-banner" aria-hidden="true">Preview · built ${builtAt}</div>
  <script>
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.tab;
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('panel-' + id).classList.add('active');
        history.replaceState(null, '', '#' + id);
        window.scrollTo({ top: 0, behavior: 'auto' });
      });
    });
    function scrollToSection(id, smooth) {
      const el = document.getElementById(id);
      if (!el) return false;
      el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
      history.replaceState(null, '', '#' + id);
      return true;
    }
    function activateSectionNav(id) {
      const section = document.getElementById(id);
      const panel = section && section.closest('.tab-panel');
      const scope = panel || document;
      scope.querySelectorAll('.section-nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === id);
      });
    }
    document.querySelectorAll('.section-nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const id = link.dataset.section;
        scrollToSection(id, true);
        activateSectionNav(id);
      });
    });
    if ('IntersectionObserver' in window) {
      const sectionObserver = new IntersectionObserver((entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible && visible.target.id) activateSectionNav(visible.target.id);
      }, { rootMargin: '-96px 0px -55% 0px', threshold: [0, 0.15, 0.4] });
      document.querySelectorAll('.content-block[id]').forEach(block => sectionObserver.observe(block));
    }
    function handleLocationHash() {
      const hash = location.hash.slice(1);
      if (!hash) return;
      const tabBtn = document.querySelector('[data-tab="' + hash + '"]');
      if (tabBtn) {
        tabBtn.click();
        return;
      }
      const section = document.getElementById(hash);
      if (section) {
        const panel = section.closest('.tab-panel');
        if (panel) {
          const tabId = panel.id.replace('panel-', '');
          const btn = document.querySelector('[data-tab="' + tabId + '"]');
          if (btn && !btn.classList.contains('active')) btn.click();
          requestAnimationFrame(() => {
            setTimeout(() => {
              scrollToSection(hash, false);
              activateSectionNav(hash);
            }, 50);
          });
        }
      }
    }
    handleLocationHash();
    window.addEventListener('hashchange', handleLocationHash);
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
      const status = document.getElementById('qa-status');
      const qaApi = '/api/sessions/${sessionId}/questions';
      let questions = [];
      let pollTimer = null;

      function escapeHtml(text) {
        return String(text)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      function formatTime(iso) {
        if (!iso) return '';
        try {
          return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
        } catch {
          return '';
        }
      }

      function setStatus(message, type) {
        if (!status) return;
        status.textContent = message || '';
        status.classList.remove('is-error', 'is-success');
        if (type) status.classList.add('is-' + type);
      }

      function renderQuestions() {
        if (!list) return;
        if (!questions.length) {
          list.innerHTML = '<p class="muted">No questions yet. Be the first to ask!</p>';
          return;
        }
        list.innerHTML = questions.map((q) =>
          '<article class="qa-item">' +
            '<div class="qa-item-header">' +
              '<strong>' + escapeHtml(q.name || q.author || 'Anonymous') + '</strong>' +
              (q.time ? '<span class="qa-item-time">' + escapeHtml(formatTime(q.time)) + '</span>' : '') +
            '</div>' +
            '<p>' + escapeHtml(q.text) + '</p>' +
          '</article>'
        ).join('');
      }

      async function loadQuestions() {
        try {
          const res = await fetch(qaApi, { cache: 'no-store' });
          if (!res.ok) throw new Error('Could not load questions');
          questions = await res.json();
          renderQuestions();
        } catch (err) {
          if (!questions.length && list) {
            list.innerHTML = '<p class="muted">Unable to load questions. Make sure the site is running with the Q&amp;A server enabled.</p>';
          }
        }
      }

      async function submitQuestion() {
        const nameInput = document.getElementById('qa-name');
        const textInput = document.getElementById('qa-text');
        const name = nameInput.value.trim() || 'Anonymous';
        const text = textInput.value.trim();
        if (!text) {
          setStatus('Please enter a question before submitting.', 'error');
          return;
        }

        qaSubmit.disabled = true;
        setStatus('Submitting…', '');

        try {
          const res = await fetch(qaApi, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, text }),
          });
          if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.detail || 'Could not submit question');
          }
          textInput.value = '';
          setStatus('Question submitted — it will appear for everyone shortly.', 'success');
          await loadQuestions();
        } catch (err) {
          setStatus(err.message || 'Could not submit question. Try again.', 'error');
        } finally {
          qaSubmit.disabled = false;
        }
      }

      qaSubmit.addEventListener('click', submitQuestion);
      document.getElementById('qa-form')?.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
          event.preventDefault();
          submitQuestion();
        }
      });

      loadQuestions();
      pollTimer = window.setInterval(loadQuestions, 4000);
      window.addEventListener('beforeunload', () => {
        if (pollTimer) window.clearInterval(pollTimer);
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
