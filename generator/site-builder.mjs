import { classifyMovement, MOVEMENT_TYPES } from "./people-map.mjs";

const NOISE = [
  /^oracle d&a all hands/i,
  /^oracle da all hands/i,
  /^presentation title/i,
  /^\d+$/,
  /^© /,
  /^agenda$/i,
  /^appendix$/i,
  /^thank you/i,
  /^placeholder$/i,
  /^name$/i,
  /^capability$/i,
  /^office$/i,
  /^management level$/i,
  /^office city$/i,
  /^job level promoted to$/i,
  /^development leader$/i,
  /^new hire$/i,
  /^internal transfer$/i,
  /^intern$/i,
  /^marbar$/i,
];

/** Session slide indices (after hidden-slide exclusion) per tab */
const TAB_SLIDES = {
  "fy26-recap": [4, 5, 6, 7, 8, 9],
  "fy27-kickoff": [11, 13],
  pipeline: [15, 16],
  training: [18, 19],
  qa: [20],
};

const HOME_AGENDA = [
  { label: "FY26 Recap", tabId: "fy26-recap" },
  { label: "FY27 Kickoff", tabId: "fy27-kickoff" },
  { label: "Pipeline and Sectors", tabId: "pipeline" },
  { label: "Training and Certs", tabId: "training" },
  { label: "Q&A", tabId: "qa" },
];

const TAB_META = {
  home: {
    label: "Home",
    headline: "Oracle D&A All Hands July 2026",
    subheadline: "July 2026 · First All Hands of FY27",
    intro: "Welcome to the Oracle Data & Analytics all-hands. Use the agenda below to navigate each section of today's session.",
  },
  "fy26-recap": {
    label: "FY26 Recap",
    headline: "FY26 Recap",
    intro: "A look back at FY26 — financial performance, AC delivery impact, talent movement, and promotions across Oracle D&A.",
  },
  "fy27-kickoff": {
    label: "FY27 Kickoff",
    headline: "FY27 Kickoff",
    intro: "Our direction for FY27 — structural changes to how we operate and key initiatives ahead.",
  },
  pipeline: {
    label: "Pipeline and Sectors",
    headline: "Pipeline and Sectors",
    intro: "FY27 pipeline, financial outlook, and sector leadership assignments.",
  },
  training: {
    label: "Training and Certs",
    headline: "Training and Certs",
    intro: "L&D initiatives for FY27 and partner basecamp highlights.",
  },
  qa: {
    label: "Q&A",
    headline: "Q&A",
    subheadline: "We're all ears — ask away!",
    intro: "Submit your questions during the live session. They appear here for everyone to see.",
  },
};

function isNoise(text) {
  const t = text.trim();
  if (!t || t.length < 2) return true;
  return NOISE.some((p) => p.test(t));
}

function rawBullets(slide) {
  const out = [];
  for (const shape of slide?.shapes || []) {
    if (shape.type === "text" && shape.bullets) {
      for (const b of shape.bullets) {
        if (b?.trim()) out.push(b.trim());
      }
    }
  }
  return out;
}

function bullets(slide) {
  return rawBullets(slide).filter((b) => !isNoise(b));
}

function images(slide) {
  const seen = new Set();
  return (slide?.shapes || [])
    .filter((s) => s.type === "image" && s.src)
    .filter((s) => {
      if (seen.has(s.src)) return false;
      seen.add(s.src);
      return true;
    });
}

function findSlide(slides, index) {
  return slides.find((s) => s.index === index) || null;
}

function parseKeyMetrics(bulletsList, sectionHeaders = []) {
  const metrics = [];
  const valueRe = /^(\$[\d.]+[MKB]?|TBD|[\d.]+%|\~[\d,]+|[\d,]+\+?|\d+\s*\/\s*\d+.*|\d{1,4})$/i;
  const skip = /^(fy\d(?!.*(?:headcount|financials|recap))|oracle|our clients|industry split|draft|# of)/i;

  for (let i = 0; i < bulletsList.length - 1; i++) {
    const a = bulletsList[i];
    const b = bulletsList[i + 1];
    if (sectionHeaders.some((h) => h.test(a) || h.test(b))) continue;
    if (valueRe.test(a) && !skip.test(b) && b.length <= 70) {
      metrics.push({ value: a, label: b });
      i++;
    }
  }
  return metrics;
}

const INDUSTRY_COLORS = [
  "#1B2A4A",
  "#0F6E56",
  "#C56A00",
  "#993556",
  "#534AB7",
  "#A32D2D",
];

function parsePrimaryMetrics(bulletsList) {
  const end = bulletsList.findIndex((b) => /industry split|our clients/i.test(b));
  const section = end >= 0 ? bulletsList.slice(0, end) : bulletsList;
  const sectionHeaders = [/^fy\d+ financials$/i];
  const metrics = parseKeyMetrics(section, sectionHeaders);
  const seen = new Set();
  return metrics.filter((m) => {
    const key = `${m.value}|${m.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return !INDUSTRY_SECTOR_NAMES.some((n) => n.toLowerCase() === m.label.toLowerCase());
  });
}

const INDUSTRY_SECTOR_NAMES = [
  "Financial Services",
  "Technology, Media & Telecom",
  "Industrials & Services",
  "Health Industries",
  "Consumer Markets",
  "Energy, Utilities & Resources",
];

const FY26_FINANCIAL_INDUSTRY_SPLIT = [
  { label: "Financial Services", value: "34%", color: "#1B2A4A" },
  { label: "Technology, Media & Telecom", value: "21%", color: "#0F6E56" },
  { label: "Industrials & Services", value: "18%", color: "#C56A00" },
  { label: "Health Industries", value: "11%", color: "#993556" },
  { label: "Consumer Markets", value: "11%", color: "#534AB7" },
  { label: "Energy, Utilities & Resources", value: "5%", color: "#A32D2D" },
];

const FY26_FINANCIAL_CLIENT_ROWS = [
  [
    { name: "Munich Reinsurance America", color: "#1B2A4A" },
    { name: "Lennar Homes LLC", color: "#C56A00" },
  ],
  [
    { name: "Principal Financial Services", color: "#1B2A4A" },
    { name: "Abbvie Inc", color: "#993556" },
  ],
  [
    { name: "TD Bank National Association", color: "#1B2A4A" },
    { name: "HealthPartners", color: "#993556" },
  ],
  [
    { name: "Microsoft Corporation", color: "#0F6E56" },
    { name: "QXO Inc", color: "#534AB7" },
  ],
  [
    { name: "Hewlett Packard Enterprise", color: "#0F6E56" },
    { name: "United Parcel Service, Inc.", color: "#534AB7" },
  ],
  [
    { name: "Palo Alto Networks, Inc.", color: "#0F6E56" },
    { name: "Fermi Inc.", color: "#A32D2D" },
  ],
  [
    { name: "GE Vernova International", color: "#C56A00" },
    { name: "Arizona Public Service Co.", color: "#A32D2D" },
  ],
];

const FY27_PROMOTIONS_NOTE = "*New partner leads for FY27*";

const FY27_PIPELINE_INDUSTRY_SPLIT = [
  { label: "Financial Services", value: "34%", color: "#1B2A4A" },
  { label: "Technology, Media & Telecom", value: "17%", color: "#0F6E56" },
  { label: "Consumer Markets", value: "17%", color: "#534AB7" },
  { label: "Health Industries", value: "13%", color: "#993556" },
  { label: "Industrials & Services", value: "11%", color: "#C56A00" },
  { label: "Energy, Utilities & Resources", value: "8%", color: "#A32D2D" },
];

const FY27_PIPELINE_CLIENT_ROWS = [
  [
    { name: "Citigroup Inc.", color: "#1B2A4A" },
    { name: "Pfizer Inc.", color: "#993556" },
  ],
  [
    { name: "Visa Inc.", color: "#1B2A4A" },
    { name: "Boston Scientific Corporation", color: "#993556" },
  ],
  [
    { name: "The Charles Schwab Corporation", color: "#1B2A4A" },
    { name: "Community Health Systems Inc.", color: "#993556" },
  ],
  [
    { name: "Comcast Corporation", color: "#0F6E56" },
    { name: "Honeywell", color: "#C56A00" },
  ],
  [
    { name: "OpenAI Foundation", color: "#0F6E56" },
    { name: "DENSO International America, Inc.", color: "#C56A00" },
  ],
  [
    { name: "Palo Alto Networks, Inc.", color: "#0F6E56" },
    { name: "Acuity Brands INC.", color: "#C56A00" },
  ],
  [
    { name: "Chipotle Mexican Grill", color: "#534AB7" },
    { name: "Arizona Public Service Company", color: "#A32D2D" },
  ],
  [
    { name: "United Parcel Service, Inc.", color: "#534AB7" },
    { name: "Vulcan Materials Company", color: "#A32D2D" },
  ],
  [
    { name: "Dollar General Corporation", color: "#534AB7" },
    { name: "Weatherford International Public Li Company", color: "#A32D2D" },
  ],
];

function parseIndustrySplit(bulletsList) {
  const items = [];
  for (let i = 0; i < bulletsList.length - 1; i++) {
    const label = bulletsList[i];
    const pct = bulletsList[i + 1];
    if (INDUSTRY_SECTOR_NAMES.some((n) => n.toLowerCase() === label.toLowerCase()) && /^[\d.]+%$/.test(pct)) {
      items.push({
        label,
        value: pct,
        color: INDUSTRY_COLORS[items.length % INDUSTRY_COLORS.length],
      });
      i++;
    }
  }
  return items;
}

function parseClientList(bulletsList, options = {}) {
  const start = bulletsList.findIndex((b) => /our clients/i.test(b));
  if (start < 0) return { summary: "", clients: [], layout: "grid" };
  const summary = bulletsList[start + 1] || "";
  const industrySet = new Set(INDUSTRY_SECTOR_NAMES.map((n) => n.toLowerCase()));

  const clients = bulletsList
    .slice(start + 2)
    .filter((b) => {
      if (b.length < 4 || b.length > 80) return false;
      if (/^[\d—\-–]/.test(b)) return false;
      if (/^[\d.]+%$/.test(b)) return false;
      if (industrySet.has(b.toLowerCase())) return false;
      if (/oracle|all hands|industry split|our clients|fy\d/i.test(b)) return false;
      return true;
    });

  if (options.layout === "table" && clients.length >= 2) {
    const mid = Math.ceil(clients.length / 2);
    const col1 = clients.slice(0, mid);
    const col2 = clients.slice(mid);
    const rows = col1.map((left, i) => [left, col2[i] || ""]);
    return { summary, clients, rows, layout: "table" };
  }

  return { summary, clients, layout: "grid" };
}

function applyMetricOverrides(metrics, overrides) {
  for (const metric of metrics) {
    for (const [labelPattern, value] of overrides) {
      if (labelPattern.test(metric.label)) {
        metric.value = value;
      }
    }
  }
  return metrics;
}

function parseFinancialSlide(slide) {
  const b = rawBullets(slide).filter((x) => {
    if (/^oracle d&a all hands|^presentation title|^© |^agenda$|^appendix$|^thank you|^placeholder$/i.test(x)) return false;
    if (/^\d{1,2}$/.test(x) && parseInt(x, 10) <= 21) return false;
    return x.trim().length >= 1;
  });
  const title = slide.title;
  const subtitle = b.find((x) => /delivery, people/i.test(x)) || "";
  const keyMetrics = parsePrimaryMetrics(b);
  const industrySplit = parseIndustrySplit(b);
  const notes = b.filter((x) => /pending partner|delivery \$/i.test(x));
  const slideImages = images(slide);
  const industryChart =
    slideImages.find((img) => img.chart && img.chartRole === "industry") ||
    slideImages.find((img) => img.chart) ||
    null;

  if (slide.index === 4) {
    applyMetricOverrides(keyMetrics, [[/^Growth\s*%$/i, "53.6%"]]);
    return {
      type: "financial",
      title,
      subtitle,
      keyMetrics,
      industrySplit: FY26_FINANCIAL_INDUSTRY_SPLIT,
      industryChart: null,
      clients: {
        summary:
          b.find((x) => /—\s*\d+\s*unique accounts/i.test(x)) ||
          "— 39 unique accounts, US & AC",
        layout: "table",
        rows: FY26_FINANCIAL_CLIENT_ROWS,
        clients: [],
      },
      notes: [],
      images: slideImages.filter((img) => !img.chart),
    };
  }

  const clients = parseClientList(b, { layout: "grid" });

  if (slide.index === 15) {
    return {
      type: "financial",
      title: "FY27 Financials",
      subtitle,
      keyMetrics,
      industrySplit: FY27_PIPELINE_INDUSTRY_SPLIT,
      industryChart: null,
      clients: {
        summary: b.find((x) => /—\s*\d+\s*unique accounts/i.test(x)) || "— 47 unique accounts",
        layout: "table",
        rows: FY27_PIPELINE_CLIENT_ROWS,
        clients: [],
      },
      notes,
      images: [],
    };
  }

  return {
    type: "financial",
    title,
    subtitle,
    keyMetrics,
    industrySplit,
    industryChart,
    clients,
    notes,
    images: slideImages.filter((img) => !img.chart),
  };
}

function imageNum(src) {
  const m = (src || "").match(/image(\d+)/);
  return m ? parseInt(m[1], 10) : 0;
}

function imagesByRange(slide, min, max) {
  return images(slide)
    .filter((img) => !img.chart)
    .filter((img) => {
      const n = imageNum(img.src);
      return n >= min && n <= max;
    })
    .sort((a, b) => imageNum(a.src) - imageNum(b.src));
}

function chartByRole(slide, role) {
  return images(slide).find((img) => img.chart && img.chartRole === role) || null;
}

function splitBySectionHeaders(bulletsList, headers) {
  const sections = [];
  let current = null;

  for (const line of bulletsList) {
    const upper = line.toUpperCase();
    const header = headers.find((h) => upper === h || upper.startsWith(h));
    if (header) {
      if (current) sections.push(current);
      current = { heading: header, items: [] };
    } else if (current) {
      current.items.push(line);
    }
  }
  if (current) sections.push(current);
  return sections;
}

function parseSectionMetrics(items) {
  const metrics = [];
  const valueRe = /^(\~?[\d,.]+[KMB]?|\d+\s*\/\s*10|\+[\d.]+%[\w\s]*|\d+%)$/i;

  for (let i = 0; i < items.length - 1; i++) {
    const value = items[i];
    const label = items[i + 1];
    if (!valueRe.test(value)) continue;
    if (!label || label.length > 70) continue;
    if (/^(prompt engineering|genai|agentic|ml ops|llm evaluation|ai skills added)$/i.test(label)) continue;
    metrics.push({ value, label });
    i++;
  }
  return metrics;
}

function parseDashboardSlide(slide) {
  const b = rawBullets(slide).filter((x) => {
    if (/^oracle d&a all hands|^presentation title|^© |^agenda$|^appendix$|^thank you|^placeholder$/i.test(x)) return false;
    if (/^draft ac highlights$/i.test(x)) return false;
    if (/^pwc$/i.test(x)) return false;
    return x.trim().length >= 1;
  });

  const headers = [
    "DELIVERY IMPACT",
    "TEAM SIZE GROWTH",
    "UTILIZATION TREND",
    "AI CAPABILITY",
    "AI ADAPTABILITY",
    "OUR CLIENTS",
  ];
  const sections = splitBySectionHeaders(b, headers);
  const byHeading = Object.fromEntries(sections.map((s) => [s.heading, s.items]));

  const deliveryItems = byHeading["DELIVERY IMPACT"] || [];
  const aiItems = byHeading["AI CAPABILITY"] || [];
  const aiAdaptItems = byHeading["AI ADAPTABILITY"] || [];
  const teamItems = byHeading["TEAM SIZE GROWTH"] || [];

  const deliveryMetrics = parseSectionMetrics(deliveryItems);
  const aiMetrics = parseSectionMetrics(aiItems);
  const aiSkills = aiItems.filter((x) =>
    /^(prompt engineering|genai tooling|agentic workflows|ml ops|llm evaluation)$/i.test(x)
  );
  const ess = b.find((x) => /\/10/.test(x)) || "";
  const essIdx = b.findIndex((x) => /\/10/.test(x));
  const essLabel =
    essIdx >= 0 ? b[essIdx + 1] || "Engagement Satisfaction Survey (ESS)" : "Engagement Satisfaction Survey (ESS)";

  return {
    type: "dashboard",
    title: slide.title,
    subtitle: b.find((x) => /delivery, people/i.test(x)) || "",
    deliveryImpact: {
      metrics: deliveryMetrics,
      images: imagesByRange(slide, 4, 8),
    },
    teamSizeGrowth: {
      stat: teamItems.find((x) => /headcount/i.test(x)) || teamItems[0] || "",
      chart: chartByRole(slide, "team-size"),
      chartData: {
        type: "bar",
        bars: [
          { label: "Start", value: 61 },
          { label: "End", value: 79 },
        ],
        color: "#EB8C00",
      },
    },
    utilizationTrend: {
      chart: chartByRole(slide, "utilization"),
      chartData: {
        type: "line",
        points: [
          { label: "Q1", value: 86 },
          { label: "Q2", value: 60 },
          { label: "Q3", value: 70 },
          { label: "Q4", value: 79 },
        ],
        color: "#EB8C00",
      },
    },
    aiCapability: {
      metrics: aiMetrics.filter((m) => !/\/10/.test(m.value)),
      skills: aiSkills,
      ess,
      essLabel,
      images: imagesByRange(slide, 9, 12),
    },
    aiAdaptability: {
      metric: parseSectionMetrics(aiAdaptItems)[0] || { value: "100%", label: "AI Adaptability" },
      chart: null,
    },
    ourClients: {
      images: imagesByRange(slide, 13, 30),
    },
  };
}

function parsePeopleTable(slide, columns = 3) {
  const b = rawBullets(slide);
  const title = slide.title;
  const subtitle =
    b.find((x) => /talent movement|congratulations/i.test(x)) || "";
  const rows = [];
  const headerIdx = b.findIndex((x) => /^name$/i.test(x));

  if (columns === 2) {
    const data = headerIdx >= 0 ? b.slice(headerIdx + 3) : b.slice(2);
    const levelRe =
      /^(Managing Director|Senior Manager|Manager|Senior Associate|Associate \d+|Director|Intern)$/i;
    const officeRe = /,\s*[A-Z]{2}$|,\s*IN$|^Mumbai|^Bangalore|^Hyderabad|^Gurugram/i;
    let i = 0;
    while (i + 1 < data.length) {
      const name = data[i];
      const level = data[i + 1];
      if (!name || !level || isNoise(name) || name.length >= 50 || !levelRe.test(level)) {
        i++;
        continue;
      }
      rows.push({ name, level });
      i += 2;
      if (data[i] && officeRe.test(data[i])) i++;
    }
  } else if (columns === 3) {
    const data = headerIdx >= 0 ? b.slice(headerIdx + 3) : b.slice(2);
    for (let i = 0; i + 2 < data.length; i += 3) {
      const name = data[i];
      const level = data[i + 1];
      const office = data[i + 2];
      if (name && level && office && !isNoise(name) && name.length < 50) {
        const row = { name, level, office };
        row.movementType = classifyMovement(row);
        rows.push(row);
      }
    }
  } else if (columns === 5) {
    const data = headerIdx >= 0 ? b.slice(headerIdx + 5) : b;
    for (let i = 0; i + 4 < data.length; i += 5) {
      const name = data[i];
      const capability = data[i + 1];
      const office = data[i + 2];
      const promotedTo = data[i + 3];
      const leader = data[i + 4];
      if (name && capability && office && promotedTo && !/oracle|all hands/i.test(name)) {
        rows.push({ name, capability, office, promotedTo, leader });
      }
    }
  }

  return {
    type: columns === 5 ? "promotions-table" : "people-table",
    title,
    subtitle,
    rows,
    columns,
    showMap: slide.index === 6,
    legend: Object.entries(MOVEMENT_TYPES).map(([id, t]) => ({ id, ...t })),
    images: images(slide),
    notes: columns === 5 ? [FY27_PROMOTIONS_NOTE] : [],
  };
}

function parseProfileSlide(slide) {
  const b = bullets(slide);
  const name = slide.title;
  const roleLine = b.find((x) => /\|/.test(x) && x.length < 80) || "";
  const bio = b.filter(
    (x) =>
      x.length > 80 ||
      (/^(he |she |today|abhishek)/i.test(x) && x.length > 40)
  );
  const funFact = b.find((x) => /fun fact/i.test(x))?.replace(/^few fun facts\s*-?\s*/i, "") || "";

  return {
    type: "profile",
    title: name,
    roleLine,
    bio,
    funFact,
    images: images(slide),
  };
}

function parseOrgDesignSlide(slide) {
  const b = bullets(slide);
  const eyebrow = b.find((x) => /^org design$/i.test(x)) || "ORG DESIGN";
  const headline = b.find((x) => /structural change/i.test(x)) || "The Structural Change: One Team";
  const description = b.find((x) => x.length > 80 && /merge|single team/i.test(x)) || "";
  const leadership = [];
  const columns = [];
  let enablers = "";
  let mode = "intro";

  const columnHeaders = [
    { re: /^engineering and infrastructure$/i, headerColor: "#EB8C00" },
    { re: /^ai for value$/i, headerColor: "#D04A02" },
    { re: /^data management & reporting$/i, headerColor: "#A32020" },
  ];

  for (const line of b) {
    if (/^leadership$/i.test(line)) {
      mode = "leadership";
      continue;
    }
    if (/^cross-cutting enablers$/i.test(line)) {
      mode = "enablers";
      continue;
    }
    const colMatch = columnHeaders.find((c) => c.re.test(line));
    if (colMatch) {
      mode = "column";
      columns.push({ name: line, headerColor: colMatch.headerColor, items: [] });
      continue;
    }
    if (mode === "leadership" && line.includes("|")) {
      leadership.push(line);
    } else if (mode === "column" && columns.length) {
      columns[columns.length - 1].items.push(line);
    } else if (mode === "enablers") {
      enablers = line;
    }
  }

  return { type: "org-design", eyebrow, title: headline, description, leadership, columns, enablers };
}

function parseApolloSlide(slide) {
  return {
    type: "apollo-program",
    eyebrow: "The Program",
    title: "Apollo and ATE",
    subtitle: "One transformation agenda, delivered at DCM scale",
    intro:
      "Apollo is DCM's AI acceleration program, delivered under the Advisory Transformation Engine (ATE).",
    programs: [
      {
        name: "ATE Advisory Transformation Engine",
        description:
          "Drives offering transformation across Advisory, through Rapid Transformation and Offering Growth Plans.",
      },
      {
        name: "Apollo",
        description:
          "DCM's program driving AI transformation across selected offerings, on a quarterly basis, in harmony with ATE.",
        highlight: true,
      },
    ],
    valueModesHeading: "Two value modes — every build is one or the other",
    valueModes: [
      {
        name: "AI for Value",
        accent: "value",
        description:
          "Client-facing solutions that change how the client operates.",
        metrics: "Measured on client KPI impact and new revenue.",
      },
      {
        name: "AI for Delivery",
        accent: "delivery",
        description: "Internal solutions that speed how PwC delivers.",
        metrics: "Measured on margin, velocity, and quality.",
      },
    ],
    steps: [
      {
        num: 1,
        title: "Upskilling",
        detail: "PwC Agent AMs + Powered PMs. Onsite wk of Jul 20.",
        accent: "orange",
      },
      { num: 2, title: "Sprint 1", detail: "Scope + design.", accent: "grey" },
      { num: 3, title: "Sprint 2", detail: "Build.", accent: "grey" },
      { num: 4, title: "Sprint 3", detail: "Build + harden.", accent: "grey" },
      {
        num: 5,
        title: "Package v1",
        detail: "Package and prepare v1 (ARR review).",
        accent: "green",
      },
      {
        num: 6,
        title: "Giveback + GTM",
        detail: "Reuse, tell the story.",
        accent: "purple",
      },
    ],
    roadmapNote:
      "Every team runs this schedule on two lanes: AI for Value and AI for Delivery. CT&I builds alongside every pod, contributing PMs and AI engineers so we build together.",
  };
}

function parseSectorSlide(slide) {
  return {
    type: "sector-org-chart",
    title: "Sector Breakout / Assignments",
  };
}

function parseCertDistribution(bullets, progressPattern, endPattern) {
  const start = bullets.findIndex((x) => progressPattern.test(x));
  if (start < 0) return [];
  const end = bullets.findIndex((x, i) => i > start && endPattern.test(x));
  const slice = bullets.slice(start + 1, end >= 0 ? end : undefined);
  const items = [];

  for (let i = 0; i < slice.length; i++) {
    const line = slice[i];
    const combined = line.match(/^(\d+)\s*(FDI|AI|OCI|Other)$/i);
    if (combined) {
      items.push({
        value: parseInt(combined[1], 10),
        label: /^other$/i.test(combined[2]) ? "Other" : combined[2].toUpperCase(),
      });
      continue;
    }
    if (/^\d+$/.test(line) && i + 1 < slice.length) {
      const label = slice[i + 1];
      if (/^(FDI|AI|OCI|Other)$/i.test(label)) {
        items.push({
          value: parseInt(line, 10),
          label: /^other$/i.test(label) ? "Other" : label.toUpperCase(),
        });
        i++;
      }
    }
  }
  return items;
}

function parseTrainingSlide(slide) {
  const b = rawBullets(slide).filter((x) => {
    if (/^oracle d&a all hands|^presentation title|^© |^agenda$|^appendix$|^thank you|^placeholder$/i.test(x)) return false;
    return x.trim().length >= 1;
  });

  const usProgress = b.find((x) => /40\s*\/\s*52/.test(x)) || "40 / 52 (77%)";
  const acProgress = b.find((x) => /37\s*\/\s*49/.test(x)) || "37 / 49 (76%)";

  return {
    type: "training",
    title: "Oracle D&A L&D FY'27 Initiatives",
    subtitle: b.find((x) => /as of jul/i.test(x)) || "",
    intro:
      b.find((x) => /l&d team continues to focus/i.test(x)) ||
      "The L&D team continues to focus on upskilling our team on key areas of growth identified for FY '27.",
    catalogNote:
      b.find((x) => /links to the updated catalog/i.test(x)) ||
      "Links to the updated catalog(s) will be published to the D&A group in the next few weeks",
    callout:
      b.find((x) => /don't get left behind/i.test(x)) ||
      "Don't get left behind—join the AI revolution and level up with Oracle AI Certifications!",
    trainingSessions: {
      heading: "Training Sessions",
      subheading: "Training sessions to be organized by level for the following areas:",
      items: [
        "Engagement economics",
        "AI focus (prompt engineering, GenAI)",
        "Soft skills (presentation, client communication, time management)",
      ],
    },
    selfLearningInternal: {
      heading: "Self Learning (internal)",
      description:
        b.find((x) => /curated catalog of learning resources/i.test(x)) ||
        "Curated catalog of learning resources geared towards upskilling on internal tools and technologies",
    },
    selfLearningExternal: {
      heading: "Self Learning (external)",
      description:
        b.find((x) => /oracle led learning curriculum/i.test(x)) ||
        "Oracle led learning curriculum and certification resources geared towards upskilling on relevant Data and Technology skills",
    },
    firmRequirements: {
      heading: "Recap: Firm L&D Requirements",
      items: [
        "At least 1 active Oracle certification if you are SM and below",
        "Note: Certifications continue to be a strong consideration for Career Roundtables",
      ],
    },
    certProgress: {
      heading: "Active Certifications — Our Team's Progress",
      footnote: b.find((x) => /# of resources with an active certification/i.test(x)) || "",
      us: {
        label: b.find((x) => /^US \(/i.test(x)) || "US (33% to go!)",
        progress: usProgress,
        pct: 77,
        distribution: parseCertDistribution(b, /40\s*\/\s*52/, /37\s*\/\s*49/),
      },
      ac: {
        label: b.find((x) => /^AC \(/i.test(x)) || "AC (34% to go!)",
        progress: acProgress.includes("76") ? acProgress : `${acProgress.replace(/\s*\([^)]*\)/, "")} (76%)`,
        pct: 76,
        distribution: parseCertDistribution(b, /37\s*\/\s*49/, /# of resources|don't get left/i),
      },
    },
    icon: images(slide).find((img) => /image32/.test(img.src)) || images(slide)[0] || null,
  };
}

const ANTHROPIC_BASECAMP_FORM_URL =
  "https://forms.cloud.microsoft/pages/responsepage.aspx?id=oJQyUSA-skGpcG0wvxVG-ky5bqwx9pFDp7lIMfGmPTNUNkpER0JPS0JLUzhESEZIRDVUQlNQWkoyMC4u&route=shorturl";

function parseBasecampSlide(slide) {
  const b = bullets(slide);
  const linkText = b.find((x) => /link to anthropic/i.test(x)) || "";
  return {
    type: "photo-gallery",
    title: "Partner Basecamp Recap + Photos",
    description:
      b.find((x) => x.length > 60 && /two-day program/i.test(x)) ||
      "A two-day program built around the commercial framework, the technical foundations, and the applied work.",
    link: linkText ? { text: linkText, href: ANTHROPIC_BASECAMP_FORM_URL } : null,
    images: images(slide),
  };
}

function parseSlideContent(slide) {
  const idx = slide.index;
  const title = slide.title || "";

  if (idx === 4 || idx === 15) return parseFinancialSlide(slide);
  if (idx === 5) return parseDashboardSlide(slide);
  if (idx === 6) return parsePeopleTable(slide, 3);
  if (idx === 8) return parsePeopleTable(slide, 2);
  if (idx === 7) return parseProfileSlide(slide);
  if (idx === 9) return parsePeopleTable(slide, 5);
  if (idx === 11) return parseOrgDesignSlide(slide);
  if (idx === 13) return parseApolloSlide(slide);
  if (idx === 16) return parseSectorSlide(slide);
  if (idx === 18) return parseTrainingSlide(slide);
  if (idx === 19) return parseBasecampSlide(slide);

  return {
    type: "generic",
    title,
    bullets: bullets(slide),
    images: images(slide),
  };
}

const SAMPLE_CONSULTANT_PROFILE = {
  type: "consultant-profile-sample",
  title: "Sample Profile",
  name: "Kaitlyn Price",
  role: "Senior Associate, Digital Core Modernization, Oracle Core ERP, Data & Analytics",
  subtitle: "Consultant Profile — FY27",
  meta: [
    { label: "Development Leader", value: "Divya Thathu, Director" },
    { label: "Coach", value: "Ajeetha Menezes, Managing Director" },
    { label: "Industry Alignment", value: "Consumer Markets" },
    { label: "Sector Alignment", value: "Technology, Transportation, and Leisure" },
  ],
  sections: [
    {
      num: 1,
      title: "Goals & Objectives for the Year",
      items: [
        "Strengthen technical reporting skills through clear, structured client deliverables.",
        "Build a stronger point of view to guide clients on Oracle ERP and data strategy.",
        "Manage internal and external workstreams to balance delivery priorities effectively.",
        "Support proposal development and sales cycle activities.",
        "Progress toward promotion by closing key development skill gaps.",
      ],
    },
    {
      num: 2,
      title: "Reinvest Activities",
      items: [
        "FDI & AIDP Go-To-Market: Drive campaign strategy, account analysis, and planning for FY27 goal.",
        "D&A Communications: Coordinate all-hands materials, quarterly newsletter, and miscellaneous.",
        "Recruiting & Campus Engagement: Support new graduate hiring evaluations and participate in panels.",
        "Practice Development: Support proposal development and internal initiatives.",
      ],
    },
  ],
  photo: { src: "assets/sample-profile-headshot.png" },
};

function insertFy27SampleProfile(blocks) {
  const sample = SAMPLE_CONSULTANT_PROFILE;
  const apolloIdx = blocks.findIndex((b) => b.type === "apollo-program");
  if (apolloIdx >= 0) {
    return [...blocks.slice(0, apolloIdx), sample, ...blocks.slice(apolloIdx)];
  }
  return [...blocks, sample];
}

function buildTab(id, slides, slideIndices) {
  const meta = TAB_META[id];
  let blocks = slideIndices
    .map((idx) => findSlide(slides, idx))
    .filter(Boolean)
    .map(parseSlideContent);

  if (id === "fy27-kickoff") {
    blocks = insertFy27SampleProfile(blocks);
  }

  return {
    id,
    label: meta.label,
    headline: meta.headline,
    subheadline: meta.subheadline || "",
    intro: meta.intro,
    blocks,
    interactive: id === "qa",
  };
}

function buildTabs(session) {
  const slides = session.slides.filter((s) => s.index <= 20);
  const homeSlide = findSlide(slides, 1);

  const home = {
    id: "home",
    ...TAB_META.home,
    agenda: HOME_AGENDA,
    images: images(homeSlide),
  };

  const contentTabs = ["fy26-recap", "fy27-kickoff", "pipeline", "training", "qa"].map((id) =>
    buildTab(id, slides, TAB_SLIDES[id])
  );

  return [home, ...contentTabs];
}

export function buildWebsiteModel(session, sessionId) {
  const year = new Date().getFullYear();
  return {
    sessionId,
    title: session.title,
    tabs: buildTabs(session),
    brand: { practice: "Oracle D&A", firm: "PwC" },
    footer: `© ${year} PwC. All rights reserved. PwC refers to the PwC network and/or one or more of its member firms, each of which is a separate legal entity. Please see www.pwc.com/structure for further details.`,
  };
}
