/**
 * US talent map — city coordinates, movement types, and SVG rendering.
 */

export const MOVEMENT_TYPES = {
  "new-hire": { label: "New Hire", color: "#E8830E" },
  "internal-transfer": { label: "Internal Transfer", color: "#0F6E56" },
  intern: { label: "Intern", color: "#534AB7" },
};

/** Continental US from Natural Earth simplified polygon (viewBox 0 0 1000 600) */
export const US_MAINLAND_PATH =
  "M510.6,31.9 L513.4,43.3 L518.3,46.8 L529.1,48.1 L545.1,51.4 L560.2,57.9 L572.8,55.2 L592,60.6 L597.1,60.4 L611.1,54.5 L625.7,62 L640.9,70.1 L653.6,77 L665.7,83.7 L667.2,89.1 L670.8,91.2 L669.9,93.3 L674.1,93.9 L677.9,96.7 L681,100 L685.3,100 L687.6,102.5 L685.7,106.2 L701.9,116 L705.2,134.8 L708.4,152.9 L703.8,165.2 L696.5,176.7 L693,183.9 L692.7,186.1 L694.5,189.1 L699.7,192.4 L703.7,192.4 L721.8,181.3 L737.8,178 L758.2,167.6 L758.5,165.5 L757.1,159.2 L754.6,155.1 L761.6,151.8 L777,151.7 L791.3,151.7 L796.3,143.6 L798.2,142 L814.7,127 L821.7,123.2 L845.4,123 L874.2,123 L875.7,117.9 L880.7,116.9 L887.3,113.6 L892.9,104.2 L897.6,88 L909.5,72.3 L914.7,77.8 L925.2,74.2 L932.1,80.2 L932.1,108.6 L942.3,120.3 L945,127.2 L928.3,137.2 L912.3,144.4 L895.8,150.6 L887.6,162.9 L884.9,167.6 L884.8,178.6 L889.9,189.7 L896.4,190.2 L894.7,182.6 L899.4,187.2 L898.2,193.1 L887.6,196.5 L880.2,196.1 L868.6,199.7 L861.8,200.8 L852.8,201.8 L839.8,207.8 L862.7,203.9 L867.3,207.9 L845.5,214.1 L835.5,214.1 L836,211.6 L831.3,217.4 L835.8,218.3 L832.5,233.2 L821.1,249.3 L820,243.9 L816.5,242.8 L811.4,237.6 L814.7,248.8 L818.5,252.5 L818.8,260.4 L813.8,268.5 L805,285.1 L803.6,284.3 L808.4,270.1 L800.4,262.2 L798.6,244.9 L795.6,253.9 L798.9,267.1 L788.6,263.8 L799.4,270.5 L800,290.3 L804.5,291.7 L806.1,298.9 L808.3,319.7 L798.4,335.2 L782.3,341.4 L772,353.6 L764.2,354.9 L756.3,362.5 L754.1,369.5 L737,383 L728.2,392.9 L720.9,405.2 L718.5,420 L721.2,434.5 L726.4,452.3 L733.3,467 L733.4,476 L740.8,500.1 L740.3,514.1 L739.6,522.2 L735.8,534.9 L731.1,537.5 L723.4,535 L721,525.9 L715,521.1 L706.8,503.2 L699.5,487.3 L697.2,479.2 L700.4,465.4 L696,453.9 L683.9,436.5 L677.8,433.3 L662,442.8 L659.2,441.7 L651.7,432 L641.9,426.9 L624.3,429.5 L610.4,427.2 L598.5,428.6 L592.1,431.9 L594.9,437.4 L594.7,445.8 L598,449.9 L595,452.7 L589.2,449.6 L583.4,453.6 L572,452.9 L560.4,441.9 L546.8,444.5 L535.5,439.7 L525.8,441.2 L512.6,446 L498.4,461.4 L482.9,470.4 L474.4,480.3 L470.8,489.7 L470.7,504 L471.5,514 L474.4,521.1 L468.3,521.7 L457.3,517.2 L445.1,510.7 L440.7,500.9 L437.3,486.4 L428.1,474.5 L422.7,462.3 L414.9,448.1 L403.9,439.8 L391.2,440.2 L381.3,456.6 L368.4,450.4 L360.3,444.1 L356.5,432.7 L351.3,421.8 L342,412.7 L334,406.1 L328.4,398.7 L301.3,398.7 L301.3,407.3 L288.9,407.3 L257.9,407.4 L222.4,392.8 L198.8,382.7 L200.3,378.6 L180.5,380.9 L162.8,382.5 L160.1,371.8 L150,359.9 L142.7,357.4 L141,351.4 L132.3,350.4 L126.7,344.8 L112.2,342.7 L108.3,339.3 L106.4,327.9 L91.2,307 L78.2,278.1 L78.8,273.3 L71.9,266.4 L59.8,249 L57.7,232 L49.4,220.7 L52.8,203.4 L52.3,185.6 L47.3,169.7 L53.4,150.1 L55.3,131.2 L57.2,112.3 L54.4,84.4 L49.4,66.6 L44.9,57 L46.8,52.9 L69.3,60 L77.6,79.6 L81.5,74.1 L79,57.1 L73.7,40 L118,40 L164.3,40 L179.6,40 L227.1,40 L273.1,40 L319.9,40 L366.7,40 L419.7,40 L473,40 L505.3,40 L505.4,32 L510.6,31.9 Z";

export const CITY_COORDS = {
  "charlotte, nc": { x: 728.5, y: 326.5 },
  "boston, ma": { x: 881.1, y: 178.1 },
  "chicago, il": { x: 622.7, y: 188.1 },
  "austin, tx": { x: 465, y: 429.6 },
  "indianapolis, in": { x: 645.7, y: 232 },
  "tampa, fl": { x: 703.4, y: 477.8 },
  "miami, fl": { x: 738.7, y: 523.4 },
  "washington, dc": { x: 787.9, y: 249.9 },
  "irvine, ca": { x: 151.9, y: 358.6 },
  "raleigh, nc": { x: 762.9, y: 315 },
  "houston, tx": { x: 502, y: 440.2 },
  "dallas, tx": { x: 479.8, y: 377.4 },
  "new york, ny": { x: 835.2, y: 212.4 },
};

const INTERNAL_TRANSFER_NAMES = new Set(["anas masri"]);

export function classifyMovement(row) {
  if (/^intern$/i.test(row.level)) return "intern";
  if (INTERNAL_TRANSFER_NAMES.has(row.name.toLowerCase())) return "internal-transfer";
  return "new-hire";
}

export function cityKey(office) {
  return office.toLowerCase().replace(/\s+/g, " ").trim();
}

export function groupRowsByCity(rows) {
  const groups = new Map();
  for (const row of rows) {
    const key = cityKey(row.office);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

function offsetForIndex(i, total) {
  if (total <= 1) return { dx: 0, dy: 0 };
  const angle = (i / total) * Math.PI * 2 - Math.PI / 2;
  const r = 8 + total * 2;
  return { dx: Math.cos(angle) * r, dy: Math.sin(angle) * r };
}

export function buildMapMarkers(rows) {
  const groups = groupRowsByCity(rows);
  const markers = [];

  for (const [, people] of groups) {
    const office = people[0].office;
    const coord = CITY_COORDS[cityKey(office)];
    if (!coord) continue;
    people.forEach((person, i) => {
      const { dx, dy } = offsetForIndex(i, people.length);
      markers.push({
        id: person.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        x: coord.x + dx,
        y: coord.y + dy,
        person,
        movementType: person.movementType || classifyMovement(person),
        city: office.split(",")[0],
      });
    });
  }
  return markers;
}

export function renderUsTalentMap(rows) {
  const markers = buildMapMarkers(rows);
  const legend = Object.entries(MOVEMENT_TYPES)
    .map(
      ([key, t]) => `
    <div class="map-legend-item">
      <span class="map-legend-swatch" style="background:${t.color}"></span>
      <span>${t.label}</span>
    </div>`
    )
    .join("");

  const dots = markers
    .map((m) => {
      const color = MOVEMENT_TYPES[m.movementType]?.color || "#E8830E";
      const label = MOVEMENT_TYPES[m.movementType]?.label || "";
      return `<circle class="map-marker" data-person="${m.id}" cx="${m.x}" cy="${m.y}" r="9" fill="${color}" stroke="#FFFFFF" stroke-width="2.5">
        <title>${m.person.name} — ${m.person.office} (${label})</title>
      </circle>`;
    })
    .join("\n");

  const seenCities = new Set();
  const cityLabels = markers
    .filter((m) => {
      if (seenCities.has(m.city)) return false;
      seenCities.add(m.city);
      return true;
    })
    .map(
      (m) =>
        `<text class="map-city-label" x="${m.x + 13}" y="${m.y + 4}" font-size="11" fill="#374151" font-family="Arial,sans-serif">${m.city}</text>`
    )
    .join("\n");

  return `
  <div class="people-map-panel">
    <div class="map-legend">${legend}</div>
    <svg class="us-talent-map" viewBox="0 0 1000 600" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="US map showing new hires, internal transfers, and interns by city">
      <rect width="100%" height="100%" fill="#F5F6F8"/>
      <path d="${US_MAINLAND_PATH}" fill="#D1D5DB" stroke="#FFFFFF" stroke-width="2"/>
      ${dots}
      ${cityLabels}
    </svg>
  </div>`;
}
