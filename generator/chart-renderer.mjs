/**
 * Extract and render PowerPoint charts (doughnut, bar, line) as SVG from PPTX.
 */

import fs from "fs";
import path from "path";

function decodeXml(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');
}

function extractPtSection(xml, tag) {
  const sectionMatch = xml.match(new RegExp(`<c:${tag}>[\\s\\S]*?<\\/c:${tag}>`));
  if (!sectionMatch) return [];
  const items = [];
  const ptRegex = /<c:pt idx="(\d+)"><c:v>([^<]*)<\/c:v><\/c:pt>/g;
  let m;
  while ((m = ptRegex.exec(sectionMatch[0])) !== null) {
    items[Number(m[1])] = tag === "val" ? Number(m[2]) : decodeXml(m[2]);
  }
  return items;
}

function escapeSvg(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function parseDoughnutChart(chartXml) {
  const holeMatch = chartXml.match(/<c:holeSize val="(\d+)"/);
  const holeSize = holeMatch ? Number(holeMatch[1]) : 55;
  const categories = extractPtSection(chartXml, "cat");
  const values = extractPtSection(chartXml, "val");

  const colors = [];
  const colorRegex = /<c:dPt>[\s\S]*?<c:idx val="(\d+)"\/>[\s\S]*?<a:srgbClr val="([A-Fa-f0-9]{6})"/g;
  let m;
  while ((m = colorRegex.exec(chartXml)) !== null) {
    colors[Number(m[1])] = `#${m[2]}`;
  }

  const slices = [];
  const count = Math.max(categories.length, values.length);
  for (let i = 0; i < count; i++) {
    if (categories[i] == null || values[i] == null) continue;
    slices.push({
      label: categories[i],
      value: values[i],
      color: colors[i] || "#EB8C00",
    });
  }

  return { type: "doughnut", holeSize, slices };
}

export function parseBarChart(chartXml) {
  const categories = extractPtSection(chartXml, "cat");
  const values = extractPtSection(chartXml, "val");
  const colorMatch = chartXml.match(/<c:ser>[\s\S]*?<a:srgbClr val="([A-Fa-f0-9]{6})"/);
  const color = colorMatch ? `#${colorMatch[1]}` : "#EB8C00";
  const bars = categories
    .map((label, i) => ({ label, value: values[i] ?? 0 }))
    .filter((b) => b.label != null);
  return { type: "bar", bars, color };
}

export function parseLineChart(chartXml) {
  const categories = extractPtSection(chartXml, "cat");
  const values = extractPtSection(chartXml, "val");
  const colorMatch = chartXml.match(/<c:ser>[\s\S]*?<a:srgbClr val="([A-Fa-f0-9]{6})"/);
  const color = colorMatch ? `#${colorMatch[1]}` : "#EB8C00";
  const points = categories
    .map((label, i) => ({ label, value: values[i] ?? 0 }))
    .filter((p) => p.label != null);
  return { type: "line", points, color };
}

export function renderDoughnutSvg(chart, options = {}) {
  const { width = 520, height = 320, title = "", compact = false } = options;
  const cx = compact ? 90 : 150;
  const cy = compact ? 90 : 160;
  const outerR = compact ? 70 : 120;
  const innerR = outerR * (chart.holeSize / 100);
  const total = chart.slices.reduce((s, sl) => s + sl.value, 0) || 1;

  let angle = -90;
  const arcs = chart.slices.map((slice) => {
    const pct = slice.value / total;
    const sweep = pct * 360;
    const start = angle;
    const end = angle + sweep;
    angle = end;

    const startRad = (start * Math.PI) / 180;
    const endRad = (end * Math.PI) / 180;
    const x1o = cx + outerR * Math.cos(startRad);
    const y1o = cy + outerR * Math.sin(startRad);
    const x2o = cx + outerR * Math.cos(endRad);
    const y2o = cy + outerR * Math.sin(endRad);
    const x1i = cx + innerR * Math.cos(endRad);
    const y1i = cy + innerR * Math.sin(endRad);
    const x2i = cx + innerR * Math.cos(startRad);
    const y2i = cy + innerR * Math.sin(startRad);
    const large = sweep > 180 ? 1 : 0;

    const d = [
      `M ${x1o} ${y1o}`,
      `A ${outerR} ${outerR} 0 ${large} 1 ${x2o} ${y2o}`,
      `L ${x1i} ${y1i}`,
      `A ${innerR} ${innerR} 0 ${large} 0 ${x2i} ${y2i}`,
      "Z",
    ].join(" ");

    return { d, color: slice.color, label: slice.label, pctLabel: `${Math.round(pct * 100)}%` };
  });

  const paths = arcs
    .map(
      (a) =>
        `<path d="${a.d}" fill="${a.color}" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/>`
    )
    .join("\n    ");

  const legend = compact
    ? ""
    : arcs
        .map((a, i) => {
          const y = 40 + i * 38;
          return `
    <rect x="300" y="${y - 10}" width="14" height="14" fill="${a.color}" rx="2"/>
    <text x="322" y="${y + 2}" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#474747">${escapeSvg(a.label)}</text>
    <text x="500" y="${y + 2}" font-family="Arial, Helvetica, sans-serif" font-size="13" font-weight="700" fill="#D04A02" text-anchor="end">${a.pctLabel}</text>`;
        })
        .join("");

  const titleEl = title
    ? `<text x="${compact ? 130 : 300}" y="22" font-family="Georgia, serif" font-size="14" font-weight="700" fill="#000000">${escapeSvg(title)}</text>`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#FFFFFF"/>
  ${paths}
  ${titleEl}
  ${legend}
</svg>`;
}

export function renderBarChartSvg(chart, options = {}) {
  const { width = 360, height = 220 } = options;
  const padding = { top: 24, right: 16, bottom: 36, left: 16 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const maxVal = Math.max(...chart.bars.map((b) => b.value), 1) * 1.2;
  const slot = chartW / chart.bars.length;
  const barW = slot * 0.55;

  const bars = chart.bars.map((bar, i) => {
    const h = (bar.value / maxVal) * chartH;
    const x = padding.left + i * slot + (slot - barW) / 2;
    const y = padding.top + chartH - h;
    return { x, y, w: barW, h, label: bar.label, value: bar.value };
  });

  const barEls = bars
    .map(
      (b) => `
    <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${chart.color}" rx="4"/>
    <text x="${b.x + b.w / 2}" y="${b.y - 6}" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="700" fill="#2D2D2D">${b.value}</text>
    <text x="${b.x + b.w / 2}" y="${padding.top + chartH + 22}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#6B7280">${escapeSvg(b.label)}</text>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#FFFFFF"/>
  <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#D9DCE3" stroke-width="2"/>
  ${barEls}
</svg>`;
}

export function renderLineChartSvg(chart, options = {}) {
  const { width = 360, height = 220 } = options;
  const padding = { top: 28, right: 16, bottom: 36, left: 16 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;
  const minVal = 55;
  const maxVal = 100;
  const slot = chartW / Math.max(chart.points.length - 1, 1);

  const coords = chart.points.map((p, i) => {
    const x = padding.left + i * slot;
    const y = padding.top + chartH - ((p.value - minVal) / (maxVal - minVal)) * chartH;
    return { x, y, label: p.label, value: p.value };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const dots = coords
    .map(
      (c) => `
    <circle cx="${c.x}" cy="${c.y}" r="5" fill="${chart.color}" stroke="#FFFFFF" stroke-width="2"/>
    <text x="${c.x}" y="${c.y - 10}" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" font-weight="700" fill="#2D2D2D">${Math.round(c.value)}%</text>
    <text x="${c.x}" y="${padding.top + chartH + 22}" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#6B7280">${escapeSvg(c.label)}</text>`
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#FFFFFF"/>
  <line x1="${padding.left}" y1="${padding.top + chartH}" x2="${width - padding.right}" y2="${padding.top + chartH}" stroke="#D9DCE3" stroke-width="2"/>
  <path d="${linePath}" fill="none" stroke="${chart.color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  ${dots}
</svg>`;
}

function getChartMeta(chartXml) {
  if (chartXml.includes("barChart")) {
    const parsed = parseBarChart(chartXml);
    return { role: "team-size", parsed, title: "Team Size Growth", alt: "Team Size Growth" };
  }
  if (chartXml.includes("lineChart")) {
    const parsed = parseLineChart(chartXml);
    return { role: "utilization", parsed, title: "Utilization Trend", alt: "Utilization Trend" };
  }
  if (chartXml.includes("doughnutChart") || chartXml.includes("pieChart")) {
    const parsed = parseDoughnutChart(chartXml);
    if (chartXml.includes("AI Adaptability") || parsed.slices.some((s) => /adapt/i.test(s.label))) {
      return { role: "ai-adaptability", parsed, title: "AI Adaptability", alt: "AI Adaptability", compact: true };
    }
    return { role: "industry", parsed, title: "Industry Split of Projects", alt: "Industry Split of Projects" };
  }
  return null;
}

function renderChartSvg(meta) {
  if (meta.parsed.type === "bar") return renderBarChartSvg(meta.parsed);
  if (meta.parsed.type === "line") return renderLineChartSvg(meta.parsed);
  return renderDoughnutSvg(meta.parsed, { title: meta.title, compact: meta.compact });
}

export function extractChartsFromSlide(slideXml, rels, extractDir, slideIndex) {
  const charts = [];
  const chartFrameRegex = /<c:chart\b[^>]*\br:id="([^"]+)"/g;
  let match;
  const roleCounts = {};

  while ((match = chartFrameRegex.exec(slideXml)) !== null) {
    const rid = match[1];
    const target = rels[rid];
    if (!target?.includes("charts/chart")) continue;

    const chartPath = path.join(extractDir, "ppt", target.replace(/\//g, path.sep));
    if (!fs.existsSync(chartPath)) continue;

    const chartXml = fs.readFileSync(chartPath, "utf8");
    const meta = getChartMeta(chartXml);
    if (!meta) continue;

    roleCounts[meta.role] = (roleCounts[meta.role] || 0) + 1;
    const suffix = roleCounts[meta.role] > 1 ? `-${roleCounts[meta.role]}` : "";
    charts.push({
      filename: `slide-${slideIndex}-${meta.role}${suffix}-chart.svg`,
      svg: renderChartSvg(meta),
      parsed: meta.parsed,
      role: meta.role,
      alt: meta.alt,
    });
  }

  return charts;
}

export function writeChartAssets(charts, assetsDir) {
  const written = [];
  for (const chart of charts) {
    const dest = path.join(assetsDir, chart.filename);
    fs.writeFileSync(dest, chart.svg, "utf8");
    written.push({
      type: "image",
      src: `assets/${chart.filename}`,
      alt: chart.alt,
      chart: true,
      chartRole: chart.role,
    });
  }
  return written;
}
