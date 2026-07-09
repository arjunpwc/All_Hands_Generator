/**
 * Transform parsed slide data into a tabbed website structure.
 */

const NOISE_PATTERNS = [
  /^oracle d&a all hands/i,
  /^presentation title/i,
  /^\d+$/,
  /^© /,
  /^agenda$/i,
  /^appendix$/i,
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

function parsePromotions(bullets) {
  const people = [];
  const retirees = [];
  let inRetirement = false;

  for (let i = 0; i < bullets.length; i++) {
    const b = bullets[i];
    if (/retirement/i.test(b)) {
      inRetirement = true;
      continue;
    }
    if (/congratulations/i.test(b)) continue;
    if (/^fy26 promotions$/i.test(b)) continue;

    if (inRetirement) {
      if (!/^(manager|director|senior|associate|managing)/i.test(b)) {
        retirees.push(b);
      }
      continue;
    }

    const next = bullets[i + 1];
    const isRank = /^(managing director|senior manager|senior associate|manager|director)$/i.test(next || "");
    if (isRank) {
      people.push({ name: b, title: next });
      i++;
    }
  }
  return { people, retirees };
}

function parseRockstars(bullets) {
  const profiles = [];
  let current = null;

  for (const b of bullets) {
    if (/^rockstars!$/i.test(b) || /meet d&a/i.test(b)) continue;
    if (/^(minneapolis|new york|atlanta)/i.test(b)) continue;

    if (/fun fact:/i.test(b)) {
      if (current) current.funFact = b.replace(/^fun fact:\s*/i, "");
      continue;
    }
    if (/^(senior associate|manager|intern|director|senior manager)$/i.test(b)) {
      if (current) current.role = b;
      if (current?.name) profiles.push(current);
      current = null;
      continue;
    }
    if (b.length < 40 && !b.includes(".") && !/^(i |my )/i.test(b)) {
      if (current?.name && !current.bio) {
        current.bio = b;
      } else {
        if (current?.name) profiles.push(current);
        current = { name: b, role: "", funFact: "", bio: "" };
      }
      continue;
    }
    if (current) current.bio = (current.bio ? current.bio + " " : "") + b;
  }
  if (current?.name) profiles.push(current);
  return profiles;
}

function groupIntoParagraphs(bullets) {
  const paragraphs = [];
  let chunk = [];

  for (const b of bullets) {
    if (b.length < 60 && !b.endsWith(".") && chunk.length < 4) {
      chunk.push(b);
    } else {
      if (chunk.length) paragraphs.push(chunk.join(" · "));
      paragraphs.push(b);
      chunk = [];
    }
  }
  if (chunk.length) paragraphs.push(chunk.join(" · "));
  return paragraphs.filter(Boolean);
}

function buildStrategyCards(bullets) {
  const pillars = ["Better", "Deeper", "Wider", "Cooler", "Bigger", "Smarter", "Stronger"];
  const themes = [
    "Continuous Improvement",
    "Data Coverage",
    "Industry Breadth",
    "Digital & AI / GenAI",
    "Capability Extend",
    "Operation at Scale",
    "People Experience",
  ];

  const cards = [];
  const idx = bullets.findIndex((b) => b === "D&A Strategy");
  const strategyIntro = bullets.slice(idx, idx + 4).filter((b) => b.length > 20);

  for (let i = 0; i < pillars.length; i++) {
    const theme = themes[i];
    const detailStart = bullets.indexOf(pillars[i]);
    let detail = "";
    if (detailStart >= 0) {
      for (let j = detailStart + 1; j < bullets.length; j++) {
        if (pillars.includes(bullets[j]) || themes.includes(bullets[j])) break;
        if (bullets[j].length > 30) {
          detail = bullets[j];
          break;
        }
      }
    }
    cards.push({ pillar: pillars[i], theme, detail });
  }

  return { intro: strategyIntro, cards };
}

function slideByIndex(session, index) {
  return session.slides.find((s) => s.index === index);
}

function buildTabs(session) {
  const s = (i) => slideByIndex(session, i);

  const homeSlide = s(1);
  const agendaSlide = s(2);
  const strategySlides = [3, 4, 5].map(s).filter(Boolean);
  const peopleSlides = [6, 7, 8].map(s).filter(Boolean);
  const momentsSlides = [9, 10].map(s).filter(Boolean);
  const ldSlides = [11, 12].map(s).filter(Boolean);
  const qaSlide = s(13);
  const resourceSlides = [16, 17, 19, 20].map(s).filter(Boolean);

  const promoBullets = meaningfulBullets(s(7)?.shapes);
  const { people, retirees } = parsePromotions(promoBullets);
  const rockstars = parseRockstars(meaningfulBullets(s(8)?.shapes));
  const strategyBullets = meaningfulBullets(s(4)?.shapes);
  const strategy = buildStrategyCards(strategyBullets);
  const fy26New = meaningfulBullets(s(5)?.shapes).filter((b) => b.length > 25);

  const ldBullets = meaningfulBullets(s(12)?.shapes);
  const ldInitiatives = ldBullets.filter((b) =>
    /training|learning|certification|l&d|self learning|recap/i.test(b)
  );
  const ldStats = ldBullets.filter((b) => /%|\/\s*\d+|US \(|AC \(|FDI|OCI|to go/i.test(b));

  const agendaItems = meaningfulBullets(agendaSlide?.shapes).filter((b) =>
    /kick-off|promotees|rockstars|team moments|l&d|ask away/i.test(b)
  );

  return [
    {
      id: "home",
      label: "Home",
      hero: true,
      headline: "Oracle D&A All Hands",
      subheadline: "July 2025",
      intro:
        "Welcome to the Oracle Data & Analytics practice all-hands hub. Explore FY26 direction, celebrate our people, and find learning resources — all in one place.",
      agenda: agendaItems,
      images: uniqueImages(homeSlide?.shapes),
    },
    {
      id: "strategy",
      label: "FY26 Kick-off",
      headline: "FY26 Kick-off",
      subheadline: "Strategy & operating model",
      intro: strategy.intro.join(" "),
      pillars: strategy.cards,
      highlights: fy26New,
      images: uniqueImages([...(s(4)?.shapes || []), ...(s(5)?.shapes || [])]),
      sections: [
        {
          title: "New in FY26",
          body: fy26New,
        },
      ],
    },
    {
      id: "people",
      label: "People",
      headline: "Meet our team",
      subheadline: "Promotions, new faces & rockstars",
      promotions: people,
      retirees,
      rockstars,
      images: uniqueImages(s(8)?.shapes),
    },
    {
      id: "moments",
      label: "Team Moments",
      headline: "Team moments",
      subheadline: "Connectivity across our global team",
      captions: meaningfulBullets(s(10)?.shapes).filter((b) => b.length > 20),
      images: uniqueImages(s(10)?.shapes),
    },
    {
      id: "learning",
      label: "L&D",
      headline: "Learning & Development",
      subheadline: "FY26 upskilling initiatives",
      initiatives: ldInitiatives,
      stats: ldStats,
      images: uniqueImages(s(12)?.shapes),
      body: groupIntoParagraphs(
        ldBullets.filter((b) => !ldInitiatives.includes(b) && !ldStats.includes(b))
      ).slice(0, 6),
    },
    {
      id: "qa",
      label: "Q&A",
      headline: "We're all ears",
      subheadline: "Ask away during the all-hands call",
      intro:
        "Have a question for leadership? Submit it here during the live session. Upvote questions you'd like addressed.",
      interactive: true,
    },
    {
      id: "resources",
      label: "Resources",
      headline: "Resources & appendix",
      subheadline: "Training catalogs, brainstorm ideas & more",
      sections: resourceSlides.map((slide) => ({
        title: slide.title,
        bullets: meaningfulBullets(slide.shapes).slice(0, 24),
        images: uniqueImages(slide.shapes),
      })),
    },
  ];
}

export function buildWebsiteModel(session, sessionId) {
  return {
    sessionId,
    title: session.title,
    tabs: buildTabs(session),
    footer:
      "© 2025 PwC. All rights reserved. PwC refers to the PwC network and/or one or more of its member firms, each of which is a separate legal entity.",
  };
}
