/**
 * Generate an all-hands session from a .pptx file (no Python required).
 * Usage: node generator/generate.mjs "<path-to.pptx>" [session-id]
 */

import { execSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { writeStandalonePreview } from "./viewer-template.mjs";
import { extractChartsFromSlide } from "./chart-renderer.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

function extractPptx(pptxPath, extractDir) {
  fs.mkdirSync(extractDir, { recursive: true });
  const zipPath = path.join(extractDir, "deck.zip");
  fs.copyFileSync(pptxPath, zipPath);
  const ps = `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${extractDir.replace(/'/g, "''")}' -Force`;
  execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: "inherit" });
}

function parseRels(relsPath) {
  const rels = {};
  if (!fs.existsSync(relsPath)) return rels;
  const xml = fs.readFileSync(relsPath, "utf8");
  const relRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"[^>]*\/>/g;
  let match;
  while ((match = relRegex.exec(xml)) !== null) {
    rels[match[1]] = match[2].replace(/^\.\.\//, "");
  }
  return rels;
}

function decodeEntities(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function cleanText(text) {
  return decodeEntities(text).replace(/\s+/g, " ").trim();
}

function extractTextBlocks(xml) {
  const blocks = [];
  const paragraphRegex = /<a:p[\s>][\s\S]*?<\/a:p>/g;
  const paragraphs = xml.match(paragraphRegex) || [];
  for (const para of paragraphs) {
    const texts = [];
    const textRegex = /<a:t[^>]*>([^<]*)<\/a:t>/g;
    let m;
    while ((m = textRegex.exec(para)) !== null) {
      const t = cleanText(m[1]);
      if (t) texts.push(t);
    }
    if (texts.length) blocks.push(texts.join(" "));
  }
  return blocks;
}

function extractImages(xml, rels, mediaRoot) {
  const images = [];
  const embedRegex = /r:embed="([^"]+)"/g;
  let match;
  while ((match = embedRegex.exec(xml)) !== null) {
    const target = rels[match[1]];
    if (target && target.startsWith("media/")) {
      const mediaPath = path.join(mediaRoot, path.basename(target));
      if (fs.existsSync(mediaPath)) {
        images.push({ src: mediaPath, filename: path.basename(target) });
      }
    }
  }
  return images;
}

function isHiddenFlag(value) {
  return value === "0" || value === "false";
}

function getPresentationSlideOrder(extractDir) {
  const presPath = path.join(extractDir, "ppt", "presentation.xml");
  const presRelsPath = path.join(extractDir, "ppt", "_rels", "presentation.xml.rels");
  if (!fs.existsSync(presPath) || !fs.existsSync(presRelsPath)) return null;

  const presXml = fs.readFileSync(presPath, "utf8");
  const presRels = parseRels(presRelsPath);
  const sldIdRegex = /<p:sldId\b([^>]*)\/>/g;
  const order = [];
  let match;

  while ((match = sldIdRegex.exec(presXml)) !== null) {
    const attrs = match[1];
    const ridMatch = attrs.match(/\br:id="([^"]+)"/);
    if (!ridMatch) continue;

    const target = presRels[ridMatch[1]];
    if (!target?.startsWith("slides/")) continue;

    const showMatch = attrs.match(/\bshow="([^"]+)"/);
    order.push({
      file: path.basename(target),
      hiddenInPres: showMatch ? isHiddenFlag(showMatch[1]) : false,
    });
  }

  return order.length ? order : null;
}

function isSlideHidden(slideXml, hiddenInPres) {
  if (hiddenInPres) return true;
  const showMatch = slideXml.match(/<p:sld\b[^>]*\bshow="([^"]+)"/);
  return showMatch ? isHiddenFlag(showMatch[1]) : false;
}

function parseSlides(extractDir) {
  const slidesDir = path.join(extractDir, "ppt", "slides");
  const relsDir = path.join(extractDir, "ppt", "slides", "_rels");
  const mediaDir = path.join(extractDir, "ppt", "media");

  const presentationOrder = getPresentationSlideOrder(extractDir);
  const slideEntries = presentationOrder || fs
    .readdirSync(slidesDir)
    .filter((f) => /^slide\d+\.xml$/i.test(f))
    .sort((a, b) => parseInt(a.match(/\d+/)[0], 10) - parseInt(b.match(/\d+/)[0], 10))
    .map((file) => ({ file, hiddenInPres: false }));

  const slides = [];
  for (const entry of slideEntries) {
    const slidePath = path.join(slidesDir, entry.file);
    if (!fs.existsSync(slidePath)) continue;

    const xml = fs.readFileSync(slidePath, "utf8");
    if (isSlideHidden(xml, entry.hiddenInPres)) continue;

    const relsPath = path.join(relsDir, `${entry.file}.rels`);
    const rels = parseRels(relsPath);
    const textBlocks = extractTextBlocks(xml);
    const images = extractImages(xml, rels, mediaDir);
    const charts = extractChartsFromSlide(xml, rels, extractDir, slides.length + 1);

    const shapes = [];
    if (textBlocks.length) {
      shapes.push({ type: "text", bullets: textBlocks });
    }
    for (const img of images) {
      shapes.push({ type: "image", _file: img.src, filename: img.filename });
    }
    for (const chart of charts) {
      shapes.push({
        type: "chart",
        filename: chart.filename,
        svg: chart.svg,
        alt: chart.alt,
        chartRole: chart.role,
      });
    }

    slides.push({
      index: slides.length + 1,
      title: textBlocks[0] || `Slide ${slides.length + 1}`,
      shapes,
      notes: "",
    });
  }

  return slides;
}

function readCoreTitle(extractDir, fallback) {
  const corePath = path.join(extractDir, "docProps", "core.xml");
  if (!fs.existsSync(corePath)) return fallback;
  const xml = fs.readFileSync(corePath, "utf8");
  const m = xml.match(/<dc:title>([^<]*)<\/dc:title>/);
  return m?.[1]?.trim() || fallback;
}

function buildSession(parsed, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  const assetsDir = path.join(outputDir, "assets");
  if (fs.existsSync(assetsDir)) {
    fs.rmSync(assetsDir, { recursive: true, force: true });
  }
  fs.mkdirSync(assetsDir, { recursive: true });

  const slides = parsed.slides.map((slide) => {
    const shapes = slide.shapes.map((shape) => {
      if (shape.type === "chart") {
        fs.writeFileSync(path.join(assetsDir, shape.filename), shape.svg, "utf8");
        return {
          type: "image",
          src: `assets/${shape.filename}`,
          alt: shape.alt || "Chart",
          chart: true,
          chartRole: shape.chartRole,
        };
      }
      if (shape.type !== "image") return shape;
      const destName = `slide-${slide.index}-${shape.filename}`;
      fs.copyFileSync(shape._file, path.join(assetsDir, destName));
      return { type: "image", src: `assets/${destName}`, alt: shape.filename };
    });
    return { index: slide.index, title: slide.title, shapes, notes: slide.notes };
  });

  const sessionData = {
    title: parsed.title,
    author: parsed.author || "",
    slide_count: slides.length,
    slides,
  };

  fs.writeFileSync(path.join(outputDir, "session.json"), JSON.stringify(sessionData, null, 2));

  const sessionId = path.basename(outputDir);
  const meta = {
    id: sessionId,
    title: parsed.title,
    author: parsed.author || "",
    slide_count: slides.length,
    current_slide: 1,
    status: "ready",
  };
  fs.writeFileSync(path.join(outputDir, "meta.json"), JSON.stringify(meta, null, 2));
  writeStandalonePreview(sessionData, outputDir, sessionId);
  return meta;
}

function main() {
  const pptxPath = process.argv[2];
  if (!pptxPath || !fs.existsSync(pptxPath)) {
    console.error("Usage: node generator/generate.mjs <path-to.pptx> [session-id]");
    process.exit(1);
  }

  const sessionId = process.argv[3] || crypto.randomBytes(4).toString("hex");
  const extractDir = path.join(REPO_ROOT, "data", "uploads", `_extract_${sessionId}`);
  const outputDir = path.join(REPO_ROOT, "data", "sessions", sessionId);

  console.log(`Parsing: ${pptxPath}`);
  extractPptx(path.resolve(pptxPath), extractDir);

  const slides = parseSlides(extractDir);
  const fallbackTitle = path.basename(pptxPath, path.extname(pptxPath));
  const title = readCoreTitle(extractDir, fallbackTitle);

  const meta = buildSession({ title, author: "", slides }, outputDir);

  fs.rmSync(extractDir, { recursive: true, force: true });

  console.log("\nSession generated successfully!");
  console.log(`  ID:       ${meta.id}`);
  console.log(`  Title:    ${meta.title}`);
  console.log(`  Slides:   ${meta.slide_count}`);
  console.log(`  Data:     ${outputDir}`);
  console.log(`  Preview:  ${path.join(outputDir, "preview.html")}`);
  console.log(`  Website:  ${path.join(outputDir, "index.html")}`);
  console.log(`\n  Presenter: /session/${meta.id}?role=presenter`);
  console.log(`  Attendee:  /session/${meta.id}`);
}

main();
