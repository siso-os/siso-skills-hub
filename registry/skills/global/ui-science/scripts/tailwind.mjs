/**
 * tailwind.mjs — make the checker see Tailwind utility classes.
 *
 * v1 of ui-science was blind to Tailwind (0 findings on 76 real component files)
 * because it parsed raw CSS declarations, but the product styles with utility
 * classes: `text-gray-500 bg-gray-900`, `h-6`, etc. This module maps the default
 * Tailwind palette to hex and extracts checkable facts from className strings.
 *
 * Palette = Tailwind CSS default v3 (public, stable). Only the families that show
 * up in real product code are included; extend as needed.
 */

// Tailwind v3 default palette (hex). Subset of the most-used families.
export const TW_COLORS = {
  gray:   { 50:"#f9fafb",100:"#f3f4f6",200:"#e5e7eb",300:"#d1d5db",400:"#9ca3af",500:"#6b7280",600:"#4b5563",700:"#374151",800:"#1f2937",900:"#111827",950:"#030712" },
  zinc:   { 50:"#fafafa",100:"#f4f4f5",200:"#e4e4e7",300:"#d4d4d8",400:"#a1a1aa",500:"#71717a",600:"#52525b",700:"#3f3f46",800:"#27272a",900:"#18181b",950:"#09090b" },
  neutral:{ 50:"#fafafa",100:"#f5f5f5",200:"#e5e5e5",300:"#d4d4d4",400:"#a3a3a3",500:"#737373",600:"#525252",700:"#404040",800:"#262626",900:"#171717",950:"#0a0a0a" },
  slate:  { 50:"#f8fafc",100:"#f1f5f9",200:"#e2e8f0",300:"#cbd5e1",400:"#94a3b8",500:"#64748b",600:"#475569",700:"#334155",800:"#1e293b",900:"#0f172a",950:"#020617" },
  red:    { 300:"#fca5a5",400:"#f87171",500:"#ef4444",600:"#dc2626",700:"#b91c1c" },
  orange: { 300:"#fdba74",400:"#fb923c",500:"#f97316",600:"#ea580c",700:"#c2410c" },
  amber:  { 300:"#fcd34d",400:"#fbbf24",500:"#f59e0b",600:"#d97706" },
  yellow: { 300:"#fde047",400:"#facc15",500:"#eab308" },
  green:  { 300:"#86efac",400:"#4ade80",500:"#22c55e",600:"#16a34a",700:"#15803d" },
  emerald:{ 300:"#6ee7b7",400:"#34d399",500:"#10b981",600:"#059669" },
  blue:   { 300:"#93c5fd",400:"#60a5fa",500:"#3b82f6",600:"#2563eb",700:"#1d4ed8" },
  indigo: { 300:"#a5b4fc",400:"#818cf8",500:"#6366f1",600:"#4f46e5" },
  violet: { 300:"#c4b5fd",400:"#a78bfa",500:"#8b5cf6",600:"#7c3aed" },
  purple: { 300:"#d8b4fe",400:"#c084fc",500:"#a855f7",600:"#9333ea" },
  pink:   { 300:"#f9a8d4",400:"#f472b6",500:"#ec4899",600:"#db2777" },
};
export const TW_BASE = { white:"#ffffff", black:"#000000", transparent:null, current:null, inherit:null };

// Tailwind spacing scale (rem*16 = px). h-N / w-N / p-N etc.
export const TW_SPACING_PX = {
  0:0, 0.5:2, 1:4, 1.5:6, 2:8, 2.5:10, 3:12, 3.5:14, 4:16, 5:20, 6:24, 7:28, 8:32,
  9:36, 10:40, 11:44, 12:48, 14:56, 16:64, 20:80, 24:96,
};

// Resolve a tailwind color token like "gray-500", "orange-400", "white",
// "orange-400/20" (alpha ignored for base color), "[#ff0000]" (arbitrary) → hex or null.
export function twColorToHex(token) {
  if (!token) return null;
  let t = token.trim();
  const slash = t.indexOf("/");
  if (slash >= 0) t = t.slice(0, slash); // drop /opacity
  // arbitrary value: [#hex] or [rgb(...)]
  const arb = /^\[(#[0-9a-fA-F]{3,6})\]$/.exec(t);
  if (arb) return arb[1];
  if (t in TW_BASE) return TW_BASE[t];
  const m = /^([a-z]+)-(\d{2,3}(?:\.\d)?)$/.exec(t);
  if (!m) return null;
  const fam = TW_COLORS[m[1]];
  if (!fam) return null;
  return fam[m[2]] ?? null;
}

/**
 * Extract every className="..." (and className={`...`}) string from TSX/JSX text,
 * with its 1-based line number. Handles simple template literals (ignores ${} exprs).
 */
export function extractClassLists(text) {
  const out = [];
  const re = /className\s*=\s*(?:"([^"]*)"|\{`([^`]*)`\}|\{"([^"]*)"\})/g;
  let m;
  while ((m = re.exec(text))) {
    const raw = m[1] ?? m[2] ?? m[3] ?? "";
    const cls = raw.replace(/\$\{[^}]*\}/g, " ").split(/\s+/).filter(Boolean);
    const line = text.slice(0, m.index).split("\n").length;
    out.push({ line, classes: cls, raw });
  }
  return out;
}

// From a class list, pull the text color (text-*), background (bg-*), and any
// explicit height/width spacing. Returns { textHex, bgHex, minPx, isInteractive }.
export function readClassList(classes, textForContext = "") {
  let textHex = null, bgHex = null;
  const dims = [];
  let interactive = false;
  for (const c of classes) {
    const tm = /^text-([a-z]+-\d{2,3}(?:\/\d+)?|\[#[0-9a-fA-F]{3,6}\])$/.exec(c);
    if (tm) { const h = twColorToHex(tm[1]); if (h) textHex = h; continue; }
    const bm = /^bg-([a-z]+-\d{2,3}(?:\/\d+)?|white|black|\[#[0-9a-fA-F]{3,6}\])$/.exec(c);
    if (bm) { const h = twColorToHex(bm[1]); if (h) bgHex = h; continue; }
    const hm = /^h-(\d+(?:\.\d)?)$/.exec(c); if (hm && hm[1] in TW_SPACING_PX) dims.push(TW_SPACING_PX[hm[1]]);
    const wm = /^w-(\d+(?:\.\d)?)$/.exec(c); if (wm && wm[1] in TW_SPACING_PX) dims.push(TW_SPACING_PX[wm[1]]);
  }
  return { textHex, bgHex, minPx: dims.length ? Math.min(...dims) : null };
}
