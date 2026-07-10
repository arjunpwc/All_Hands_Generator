/**
 * Build self-contained website content from session data.
 * All presentation content lives on the site — no references to external decks.
 */

const NOISE_PATTERNS = [
  /^oracle d&a all hands/i,
  /^presentation title/i,
  /^\d+$/,
  /^© /,
  /^agenda$/i,
  /^appendix$/i,
  /^thank you/i,
];

const TAB_DEFINITIONS = [
  { id: "learning", label: "Learning", keywords: [/claude/i, /basecamp/i, /upcoming training/i, /sf training/i, /shutdown/i, /l&d/i] },
  { id: "fy26-recap", label: "FY26 Recap", keywords: [/fy26 recap/i, /fy25 recap/i] },
  { id: "people", label: "People", keywords: [/team moments/i, /promotion/i, /promotees/i, /rockstar/i, /new team/i] },
  { id: "fy27-kickoff", label: "FY27 Kickoff", keywords: [/fy27 kick/i, /kickoff/i, /kick-off/i] },
  { id: "operating-model", label: "Operating Model", keywords: [/operating model/i, /team alignment/i] },
  { id: "vision", label: "Vision & Sub-Caps", keywords: [/sub-cap/i, /prac-op/i, /vision/i, /sub capability/i] },
  { id: "pipeline", label: "Pipeline", keywords: [/pipeline/i, /oppt/i, /project/i, /opportunity/i] },
  { id: "qa", label: "Q&A", keywords: [/q&a/i, /ask away/i, /questions/i] },
];

const TAB_INTROS = {
  "fy26-recap":
    "We open by looking back at FY26 — celebrating what we delivered as a practice, the momentum we built, and the foundation we carry into FY27.",
  people:
    "Our people are at the center of everything we do. This section highlights team moments, promotions, and the colleagues who make Oracle D&A strong.",
  "fy27-kickoff":
    "FY27 is here. This section sets our direction for the year ahead — priorities, expectations, and how we win together as a practice.",
  "operating-model":
    "How we operate matters as much as what we deliver. Here we align on our operating model, team structure, and how we work across the practice.",
  vision:
    "Our sub-capabilities and practice operating groups define how we go to market. We revisit our vision and how each team contributes to FY27 goals.",
  pipeline:
    "A strong pipeline fuels our growth. We review current opportunities, active projects, and where we are focused across the portfolio.",
  learning:
    "Continuous learning keeps us ahead. From AI partner training to upcoming programs, here is how we are investing in our team's growth.",
  qa: "Have a question for leadership? Submit it here during the session. Questions appear live for the team to see and discuss.",
};

const TOPIC_BODIES = [
  { match: /fy26 recap/i, body: "Review FY26 highlights including client impact, practice growth, delivery excellence, and key milestones across Oracle D&A." },
  { match: /team moments|promotion/i, body: "Celebrate promotions and team moments that reflect our culture — recognising colleagues who stepped up and connections that strengthen our global team." },
  { match: /fy27 kick/i, body: "Set the tone for FY27 with our kickoff priorities, strategic focus areas, and what success looks like for the year ahead." },
  { match: /operating model|team alignment/i, body: "Align on how the practice is structured, how teams collaborate, and what the operating model means for day-to-day delivery and client engagement." },
  { match: /sub-cap|prac-op|vision/i, body: "Revisit our sub-capability and practice operating group structure, clarifying vision, ownership, and how each group drives FY27 outcomes." },
  { match: /pipeline|oppt|project/i, body: "Walk through the current pipeline and project landscape — where we see demand, what is in flight, and how we are positioning for growth." },
  { match: /claude|basecamp/i, body: "Recap key learnings from the Claude partner basecamp training — practical takeaways, partner capabilities, and how we apply them with clients." },
  { match: /upcoming training/i, body: "Preview upcoming training programs and learning paths available to the team in FY27." },
  { match: /sf training|shutdown/i, body: "Share highlights from Salesforce training and firm shutdown activities — team photos, moments, and connections from recent events." },
  { match: /q&a/i, body: "Open floor for questions. Use the form below to submit questions during the live session." },
];

function isNoise(text) {
  const t = text.trim();
  if (!t || t.length < 2) return true;
  return NOISE_PATTERNS.some((p) => p.test(t));
}

function uniqueImages(shapes) {
  const seen = new Set();
  return (shapes || [])
    .filter((s) => s.type === "image" && s.src)
    .filter((s) => {
      if (seen.has(s.src)) return false;
      seen.add(s.src);
      return true;
    });
}

function meaningfulBullets(shapes) {
  const bullets = [];
  for (const shape of shapes || []) {
    if (shape.type === "text" && shape.bullets) {
      for (const b of shape.bullets) {
        if (!isNoise(b)) bullets.push(b);
      }
    }
  }
  return bullets;
}

function parseAgenda(slides) {
  const agendaSlide = slides.find(
    (s) => /^agenda$/i.test(s.title) || meaningfulBullets(s.shapes).some((b) => /^agenda$/i.test(b))
  );
  if (!agendaSlide) return [];

  return meaningfulBullets(agendaSlide.shapes).filter((item) => {
    if (/^agenda$/i.test(item)) return false;
    if (/^oracle d&a all hands/i.test(item)) return false;
    if (/^\d+$/.test(item)) return false;
    return item.length >= 2;
  });
}

function matchTabForText(text) {
  const lower = text.toLowerCase();
  for (const tab of TAB_DEFINITIONS) {
    if (tab.keywords.some((re) => re.test(lower))) return tab.id;
  }
  return null;
}

function matchTabForSlide(slide) {
  const haystack = [slide.title, ...meaningfulBullets(slide.shapes)].join(" ");
  return matchTabForText(haystack);
}

function cleanSectionTitle(item) {
  return item
    .replace(/\s*[–—-]\s*Brad'?s slide\s*$/i, "")
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bodyForTopic(item) {
  for (const { match, body } of TOPIC_BODIES) {
    if (match.test(item)) return body;
  }
  return `Discussion and updates on: ${cleanSectionTitle(item)}.`;
}

function agendaItemToSection(item) {
  const title = cleanSectionTitle(item);
  return { title, body: bodyForTopic(item) };
}

function parsePromotions(bullets) {
  const people = [];
  for (let i = 0; i < bullets.length; i++) {
    const next = bullets[i + 1];
    const isRank = /^(managing director|senior manager|senior associate|manager|director|partner)$/i.test(next || "");
    if (isRank && bullets[i].length < 50) {
      people.push({ name: bullets[i], title: next });
      i++;
    }
  }
  return people;
}

function parseProfiles(bullets) {
  const profiles = [];
  let current = null;
  for (const b of bullets) {
    if (/fun fact:/i.test(b)) {
      if (current) current.funFact = b.replace(/^fun fact:\s*/i, "");
      continue;
    }
    if (/^(senior associate|manager|intern|director|senior manager|associate)$/i.test(b)) {
      if (current) current.role = b;
      if (current?.name) profiles.push(current);
      current = null;
      continue;
    }
    if (b.length < 45 && !b.includes(".") && !/^(i |my |we )/i.test(b)) {
      if (current?.name) profiles.push(current);
      current = { name: b, role: "", funFact: "", bio: "" };
      continue;
    }
    if (current) current.bio = (current.bio ? current.bio + " " : "") + b;
  }
  if (current?.name) profiles.push(current);
  return profiles;
}

function extractFiscalYear(text) {
  if (/FY\s*27|fy27|2026|July 2026/i.test(text)) return { fiscal: "FY27", date: "July 2026" };
  if (/FY\s*26|fy26|2025/i.test(text)) return { fiscal: "FY26", date: "July 2025" };
  return { fiscal: "FY27", date: "July 2026" };
}

function buildTabsFromAgenda(agendaItems) {
  const tabMap = new Map();

  for (const item of agendaItems) {
    const tabId = matchTabForText(item);
    if (!tabId) continue;

    if (tabMap.has(tabId)) {
      tabMap.get(tabId).agendaItems.push(item);
      continue;
    }

    const def = TAB_DEFINITIONS.find((t) => t.id === tabId);
    tabMap.set(tabId, {
      id: tabId,
      label: def?.label || cleanSectionTitle(item),
      headline: def?.label || cleanSectionTitle(item),
      subheadline: "",
      intro: TAB_INTROS[tabId] || "",
      agendaItems: [item],
      sections: [],
      bullets: [],
      images: [],
      promotions: [],
      profiles: [],
      interactive: tabId === "qa",
    });
  }

  return Array.from(tabMap.values());
}

function assignSlidesToTabs(slides, tabs) {
  const tabMap = Object.fromEntries(tabs.map((t) => [t.id, t]));

  for (const slide of slides) {
    if (/^agenda$/i.test(slide.title)) continue;
    if (slide.index === 1) continue;

    const tabId = matchTabForSlide(slide);
    if (!tabId || !tabMap[tabId]) continue;

    const tab = tabMap[tabId];
    const bullets = meaningfulBullets(slide.shapes);
    tab.bullets.push(...bullets);
    tab.images.push(...uniqueImages(slide.shapes));

    if (tabId === "people") {
      tab.promotions = parsePromotions(bullets);
      tab.profiles = parseProfiles(bullets);
    }
  }

  return tabs;
}

function enrichTabContent(tabs) {
  for (const tab of tabs) {
    // Build sections from agenda topics — this IS the website content
    const fromAgenda = (tab.agendaItems || []).map(agendaItemToSection);
    const fromBullets = (tab.bullets || [])
      .filter((b) => !(tab.agendaItems || []).includes(b))
      .map((b) => ({ title: cleanSectionTitle(b), body: b }));

    tab.sections = [...fromAgenda, ...fromBullets];

    // Slide bullets become additional detail under sections when unique
    if (tab.bullets.length > 0 && tab.sections.length === fromAgenda.length) {
      tab.detailPoints = tab.bullets.filter(
        (b) => !tab.agendaItems?.some((a) => a.includes(b) || b.includes(a))
      );
    } else {
      tab.detailPoints = [];
    }

    if (tab.id === "qa") {
      tab.intro = TAB_INTROS.qa;
    }
  }
  return tabs;
}

function buildTabs(session) {
  const { slides } = session;
  const agendaItems = parseAgenda(slides);
  const homeSlide = slides[0];
  const meta = extractFiscalYear(session.title + " " + (homeSlide?.title || ""));

  let contentTabs = buildTabsFromAgenda(agendaItems);

  if (contentTabs.length === 0) {
    contentTabs = TAB_DEFINITIONS.map((def) => ({
      id: def.id,
      label: def.label,
      headline: def.label,
      subheadline: "",
      intro: TAB_INTROS[def.id] || "",
      agendaItems: [],
      sections: [{ title: def.label, body: TAB_INTROS[def.id] || "" }],
      bullets: [],
      images: [],
      promotions: [],
      profiles: [],
      interactive: def.id === "qa",
      detailPoints: [],
    }));
  }

  contentTabs = assignSlidesToTabs(slides, contentTabs);
  contentTabs = enrichTabContent(contentTabs);

  const home = {
    id: "home",
    label: "Home",
    headline: "Oracle D&A All Hands",
    subheadline: `${meta.date} · First All Hands of ${meta.fiscal}`,
    intro: `Welcome to the Oracle Data & Analytics ${meta.fiscal} all-hands. Everything you need for today's session is right here — use the tabs above to follow along live with the team.`,
    agenda: agendaItems.map((item) => ({
      label: cleanSectionTitle(item),
      tabId: matchTabForText(item),
    })),
    images: uniqueImages(homeSlide?.shapes),
    fiscalYear: meta.fiscal,
  };

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
