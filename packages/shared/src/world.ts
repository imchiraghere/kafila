import { TAU, WORLD_SIZE, CP, JM, ZONE, SHOPS, POSTERS, SIGNC } from './constants';
import { Road, Ring, Park, Building, Barricade, Gate, Point } from './types';

export const clamp = (v: number, a: number, b: number): number => (v < a ? a : v > b ? b : v);
export const d2 = (ax: number, ay: number, bx: number, by: number): number => {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
};
export const dist = (ax: number, ay: number, bx: number, by: number): number => Math.hypot(ax - bx, ay - by);
export const angDiff = (a: number, b: number): number => {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
};
export const norm = (x: number, y: number): Point => {
  const m = Math.hypot(x, y);
  return m > 1e-6 ? { x: x / m, y: y / m } : { x: 0, y: 0 };
};

export function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax, dy = by - ay;
  const l = dx * dx + dy * dy;
  let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0;
  t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}

export function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16),
    r = n >> 16,
    g = (n >> 8) & 255,
    b = n & 255;
  const f = (v: number) => clamp(Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k), 0, 255);
  return '#' + ((1 << 24) | (f(r) << 16) | (f(g) << 8) | f(b)).toString(16).slice(1);
}

export const ROADS: Road[] = [
  { n: 'Sansad Marg', w: 56, p: [[3060, 2556], [3110, 2900], [3220, 3340]] },
  { n: 'Janpath', w: 58, p: [[2905, 2552], [2860, 3200], [2860, 3900]] },
  { n: 'Jantar Mantar Rd', w: 48, p: [[2877, 2950], [4024, 2950]] },
  { n: 'Kartavya Path', w: 84, p: [[1650, 3900], [4040, 3900]] },
  { n: 'Barakhamba Rd', w: 52, p: [[3507, 2237], [3720, 2357]] },
  { n: 'Tilak Marg', w: 52, p: [[3838, 2483], [4300, 3640]] },
  { n: 'ITO Rd', w: 52, p: [[3888, 2420], [4600, 2650]] },
  { n: 'Vikas Marg', w: 60, p: [[4600, 2650], [5200, 2650], [6000, 2650]] },
  { n: 'Minto Rd', w: 56, p: [[3000, 1440], [3000, 1000], [3400, 700], [4300, 620]] },
  { n: 'Pusa Rd', w: 56, p: [[2440, 2000], [1500, 1700], [500, 1600]] },
  { n: 'Lodhi Rd', w: 50, p: [[2860, 4500], [5200, 4500]] },
  { n: 'Aurobindo Marg', w: 54, p: [[2860, 3900], [2860, 4500], [2500, 5400], [2420, 5700]] },
  { n: 'Mathura Rd', w: 56, p: [[4470, 4100], [4800, 4500], [5200, 5000]] },
  { n: 'Ring Road', w: 72, p: [[500, 500], [5200, 500], [5200, 5400], [500, 5400], [500, 500]] },
  { n: 'GT Karnal Rd', w: 56, p: [[3000, 1000], [2000, 500], [1800, 0]] },
  { n: 'Rohtak Rd', w: 56, p: [[1500, 1700], [500, 1100], [0, 950]] },
  { n: 'Dhaula Kuan Rd', w: 56, p: [[1650, 3900], [1000, 4400], [500, 4600]] },
  { n: 'Gurgaon Rd', w: 56, p: [[1000, 4400], [300, 6000]] },
  { n: 'Ashoka Rd', w: 44, p: [[2860, 3250], [3230, 3420]] },
  { n: 'Baba Kharak Singh Marg', w: 48, p: [[2540, 2420], [2905, 2552]] },
  { n: 'JLN Marg', w: 44, p: [[3330, 1560], [3560, 1420]] },
  { n: 'Noida Link', w: 56, p: [[5200, 4000], [6000, 4000]] },
  { n: 'Asaf Ali Rd', w: 44, p: [[3000, 1250], [4000, 1050], [4600, 1100]] },
  { n: 'Outer Ring Rd', w: 56, p: [[1500, 1700], [1500, 5000], [4500, 5400]] }
];

for (let k = 0; k < 8; k++) {
  const a = ((k + 0.5) * TAU) / 8;
  ROADS.push({
    n: '',
    w: 30,
    spoke: 1,
    p: [
      [CP.x + Math.cos(a) * 225, CP.y + Math.sin(a) * 225],
      [CP.x + Math.cos(a) * 560, CP.y + Math.sin(a) * 560]
    ]
  });
}

export const RINGS: Ring[] = [
  { x: 3000, y: 2000, r: 225, w: 40 },
  { x: 3000, y: 2000, r: 385, w: 46 },
  { x: 3000, y: 2000, r: 560, w: 60 },
  { x: 4300, y: 3900, r: 260, w: 50 },
  { x: 3800, y: 2400, r: 90, w: 44 }
];

for (const r of ROADS) {
  r.L = [];
  r.len = 0;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  r.p.forEach(([x, y], i) => {
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
    if (i) {
      const [px, py] = r.p[i - 1];
      const l = Math.hypot(x - px, y - py);
      r.L!.push(l);
      r.len! += l;
    }
  });
  r.bb = [x0 - r.w, y0 - r.w, x1 + r.w, y1 + r.w];
}

export const ROADBY: Record<string, Road> = {};
for (const r of ROADS) if (r.n) ROADBY[r.n] = r;

export function roadPointAt(r: Road, frac: number) {
  let x = frac * (r.len || 1);
  const L = r.L || [];
  for (let i = 0; i < L.length; i++) {
    if (x <= L[i] || i === L.length - 1) {
      const t = clamp(x / L[i], 0, 1);
      const [ax, ay] = r.p[i], [bx, by] = r.p[i + 1];
      return {
        x: ax + (bx - ax) * t,
        y: ay + (by - ay) * t,
        ang: Math.atan2(by - ay, bx - ax),
        w: r.w,
        i,
        t
      };
    }
    x -= L[i];
  }
  return { x: r.p[0][0], y: r.p[0][1], ang: 0, w: r.w, i: 0, t: 0 };
}

export function randomRoadPos(rnd: () => number, filter?: (r: Road) => boolean) {
  const roads = ROADS.filter(r => !r.spoke && (!filter || filter(r)));
  const tot = roads.reduce((s, r) => s + (r.len || 0), 0);
  let x = rnd() * tot;
  for (const r of roads) {
    if (x < (r.len || 0)) {
      const p = roadPointAt(r, x / (r.len || 1));
      return Object.assign(p, { road: r });
    }
    x -= r.len || 0;
  }
  const r = roads[0];
  return Object.assign(roadPointAt(r, 0), { road: r });
}

export const riverL = (y: number) => 5420 + 70 * Math.sin(y / 520) + 40 * Math.sin(y / 170 + 1);
export const onBridge = (y: number) => Math.abs(y - 2650) < 36 || Math.abs(y - 4000) < 36;
export const inRiver = (x: number, y: number) => {
  const rl = riverL(y);
  return x > rl && x < rl + 300 && !onBridge(y);
};

export const PARKS: Park[] = [
  { t: 'c', x: 3000, y: 2000, r: 205 },
  { t: 'r', x: 1650, y: 3770, w: 2390, h: 80 },
  { t: 'r', x: 1650, y: 3950, w: 2390, h: 80 },
  { t: 'c', x: 4300, y: 3900, r: 235 },
  { t: 'r', x: 3400, y: 4620, w: 620, h: 380, n: 'LODHI GARDEN' },
  { t: 'r', x: 1700, y: 2200, w: 700, h: 1100, forest: 1, n: 'DELHI RIDGE' },
  { t: 'r', x: 3380, y: 1180, w: 360, h: 230, ground: 1, n: 'RAMLILA MAIDAN' },
  { t: 'c', x: 3800, y: 2400, r: 68 },
  { t: 'r', x: 4800, y: 950, w: 330, h: 450, n: 'RAJ GHAT' },
  { t: 'r', x: 2000, y: 4650, w: 420, h: 300 },
  { t: 'r', x: 2150, y: 520, w: 420, h: 260, n: 'DU NORTH CAMPUS' },
  { t: 'r', x: 1300, y: 4950, w: 420, h: 330, n: 'JNU' }
];

export const LANDX = [
  [1250, 3500, 1550, 4300], [1720, 3620, 2080, 3780], [1720, 4020, 2080, 4180],
  [3170, 3300, 3640, 3640], [4320, 480, 4800, 820], [3970, 870, 4130, 1030],
  [2360, 5660, 2480, 5820], [4580, 4930, 4820, 5170], [2560, 2560, 2760, 2760]
];

export const DEST = [
  { n: 'Burari Ground', x: 1700, y: 230 },
  { n: 'Bawana Police Station', x: 230, y: 850 },
  { n: 'Narela Stadium', x: 760, y: 200 },
  { n: 'Kapashera Border', x: 260, y: 5760 },
  { n: 'Jharoda Kalan', x: 200, y: 3350 },
  { n: 'Badarpur Border', x: 4800, y: 5800 },
  { n: 'Ghazipur Border', x: 5920, y: 2250 }
];

export const METRO = [
  ['Rajiv Chowk', 3000, 2000], ['Patel Chowk', 2990, 2690], ['Central Secretariat', 2950, 3680],
  ['Mandi House', 3700, 2500], ['ITO', 4560, 2770], ['Chandni Chowk', 3900, 760],
  ['Kashmere Gate', 4300, 330], ['AIIMS', 3000, 5020], ['Lajpat Nagar', 4200, 5020],
  ['Rajouri Garden', 900, 2700], ['Dwarka', 330, 4350], ['Rohini West', 900, 1250],
  ['Noida Sec-18', 5900, 4300], ['Hauz Khas', 2650, 5200], ['Vishwavidyalaya', 2350, 880]
].map(([n, x, y]) => ({ n: n as string, x: x as number, y: y as number }));

export const ASSEMBLY = [
  ['DU North Campus', 2350, 700], ['Singhu Border', 1850, 110], ['Tikri Border', 110, 1000],
  ['Ghazipur Border', 5930, 2650], ['JNU', 1500, 5150], ['Ramlila Maidan', 3560, 1330],
  ['Laxmi Nagar', 5800, 3420], ['Lajpat Nagar', 4260, 5100], ['Mukherjee Nagar', 1250, 700],
  ['Kalkaji', 4900, 5300]
].map(([n, x, y]) => ({ n: n as string, x: x as number, y: y as number }));

export const PSTATIONS = [
  ['Parliament St PS', 3560, 3260], ['Tilak Marg PS', 4060, 3330], ['CP Police Station', 3000, 1380],
  ['Mandir Marg PS', 2450, 2330], ['Police HQ, ITO', 4720, 2860], ['Kamla Market PS', 3760, 1250]
].map(([n, x, y]) => ({ n: n as string, x: x as number, y: y as number }));

export const CHECK_DEFS: [string, number, string][] = [
  ['Janpath', 0.12, 'Janpath'], ['Jantar Mantar Rd', 0.86, 'Jantar Mantar Rd'], ['Ashoka Rd', 0.4, 'Ashoka Rd'],
  ['Baba Kharak Singh Marg', 0.5, 'Baba Kharak Singh Marg'], ['Barakhamba Rd', 0.5, 'Barakhamba Rd'],
  ['Tilak Marg', 0.25, 'Tilak Marg'], ['Minto Rd', 0.3, 'Minto Bridge'], ['GT Karnal Rd', 0.45, 'GT Karnal Rd'],
  ['Pusa Rd', 0.45, 'Pusa Rd'], ['Rohtak Rd', 0.4, 'Rohtak Rd'], ['Dhaula Kuan Rd', 0.4, 'Dhaula Kuan'],
  ['Aurobindo Marg', 0.3, 'Aurobindo Marg'], ['Kartavya Path', 0.55, 'Kartavya Path'], ['ITO Rd', 0.55, 'ITO Crossing'],
  ['Vikas Marg', 0.45, 'ITO Bridge'], ['Lodhi Rd', 0.35, 'Lodhi Rd'], ['Mathura Rd', 0.4, 'Mathura Rd'], ['Asaf Ali Rd', 0.5, 'Asaf Ali Rd']
];

export const CHECKS = CHECK_DEFS.map(([rn, f, name], i) => {
  const p = roadPointAt(ROADBY[rn], f);
  return { i, name, x: p.x, y: p.y, ang: p.ang + Math.PI / 2, len: p.w + 70 };
});

export function blocked(x: number, y: number, rad: number): boolean {
  const rl = riverL(y);
  if (x + rad > rl - 30 && x - rad < rl + 330) return true;
  if (x > rl + 300) return false;
  for (const r of ROADS) {
    const L = r.L || [];
    for (let i = 0; i < L.length; i++) {
      const [a, b] = r.p[i], [c, d] = r.p[i + 1];
      if (segDist(x, y, a, b, c, d) < r.w / 2 + rad + 16) return true;
    }
  }
  for (const g of RINGS) {
    const d = Math.hypot(x - g.x, y - g.y);
    if (Math.abs(d - g.r) < g.w / 2 + rad + 16 || d < g.r) return true;
  }
  if (Math.hypot(x - CP.x, y - CP.y) < 600 + rad) return true;
  for (const p of PARKS) {
    if (p.t === 'c') {
      if (Math.hypot(x - p.x, y - p.y) < (p.r || 0) + rad) return true;
    } else if (p.w && p.h && x + rad > p.x && x - rad < p.x + p.w && y + rad > p.y && y - rad < p.y + p.h) {
      return true;
    }
  }
  for (const b of LANDX) if (x + rad > b[0] && x - rad < b[2] && y + rad > b[1] && y - rad < b[3]) return true;
  if (Math.hypot(x - ZONE.x, y - ZONE.y) < ZONE.R + 90 + rad) return true;
  for (const m of METRO) if (Math.hypot(x - m.x, y - m.y) < 60 + rad) return true;
  for (const m of DEST) if (Math.hypot(x - m.x, y - m.y) < 110 + rad) return true;
  for (const m of ASSEMBLY) if (Math.hypot(x - m.x, y - m.y) < 90 + rad) return true;
  for (const m of PSTATIONS) if (Math.hypot(x - m.x, y - m.y) < 70 + rad) return true;
  return false;
}


export const BUILD: Building[] = [];
export const TREES: { x: number; y: number; s: number; v: number }[] = [];

(function gen() {
  const R = mulberry32(1947);
  const occ = new Set<string>();
  const pal = ['#efe4cc', '#e8d6b5', '#f2e9d8', '#dccbb0', '#eadfd0', '#e7c9a9', '#d9d2c4', '#f0d9c0', '#e3e0d6', '#f4c7a5', '#d8e4e8', '#f3d6d6'];
  for (let k = 0; k < 9000 && BUILD.length < 2200; k++) {
    const w = 56 + R() * 76, h = 46 + R() * 60, x = R() * WORLD_SIZE, y = R() * WORLD_SIZE, cx = x + w / 2, cy = y + h / 2, rad = Math.max(w, h) / 2;
    const key = ((cx / 110) | 0) + ',' + ((cy / 110) | 0);
    if (occ.has(key)) continue;
    if (blocked(cx, cy, rad)) continue;
    if (BUILD.some(b => x < b.x + b.w + 34 && x + w + 34 > b.x && y < b.y + b.h + 34 && y + h + 34 > b.y)) continue;
    occ.add(key);
    const floors = 2 + ((R() * 4) | 0);
    const c = pal[(R() * pal.length) | 0];
    BUILD.push({
      x, y, w, h,
      H: floors * 15 + 8,
      c,
      roof: shade(c, -0.06),
      wall: shade(c, -0.16),
      shop: w > 66 && R() < 0.8 ? SHOPS[(R() * SHOPS.length) | 0] : null,
      poster: R() < 0.3 ? POSTERS[(R() * POSTERS.length) | 0] : null,
      sign: SIGNC[(R() * SIGNC.length) | 0],
      tank: R() < 0.75,
      tx: R(),
      ty: R(),
      dish: R() < 0.3,
      solar: R() < 0.15,
      laundry: R() < 0.35,
      ac: R(),
      paan: R() < 0.5,
      seed: (R() * 1e9) | 0
    });
  }
  for (const p of PARKS) {
    if (p.ground) continue;
    const area = p.t === 'c' ? Math.PI * (p.r || 0) * (p.r || 0) : (p.w || 0) * (p.h || 0);
    const n = Math.floor(area / (p.forest ? 4500 : 11000));
    for (let i = 0; i < n; i++) {
      let x = 0, y = 0;
      if (p.t === 'c' && p.r) {
        const a = R() * TAU, r2 = Math.sqrt(R()) * (p.r - 20);
        x = p.x + Math.cos(a) * r2;
        y = p.y + Math.sin(a) * r2;
      } else if (p.w && p.h) {
        x = p.x + 15 + R() * (p.w - 30);
        y = p.y + 15 + R() * (p.h - 30);
      }
      if (METRO.some(m => dist(m.x, m.y, x, y) < 90)) continue;
      TREES.push({ x, y, s: 0.8 + R() * (p.forest ? 0.7 : 0.5), v: (R() * 3) | 0 });
    }
  }
  for (let x = 1680; x < 4020; x += 90) {
    TREES.push({ x, y: 3800, s: 0.8, v: 0 }, { x, y: 4010, s: 0.8, v: 0 });
  }
})();

export const BG = 200;
export const BIDX = new Map<number, Building[]>();
for (const b of BUILD) {
  for (let cx = (b.x / BG) | 0; cx <= (((b.x + b.w) / BG) | 0); cx++) {
    for (let cy = (b.y / BG) | 0; cy <= (((b.y + b.h) / BG) | 0); cy++) {
      const k = cx * 100 + cy;
      if (!BIDX.has(k)) BIDX.set(k, []);
      BIDX.get(k)!.push(b);
    }
  }
}

export function nearBuildings(x: number, y: number): Building[] {
  const cx = (x / BG) | 0, cy = (y / BG) | 0, out: Building[] = [];
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const a = BIDX.get((cx + i) * 100 + cy + j);
      if (a) {
        for (const b of a) {
          if (out.indexOf(b) < 0) out.push(b);
        }
      }
    }
  }
  return out;
}

export function pointInBuilding(x: number, y: number, m: number): boolean {
  const a = BIDX.get(((x / BG) | 0) * 100 + ((y / BG) | 0));
  if (!a) return false;
  for (const b of a) {
    if (x > b.x - m && x < b.x + b.w + m && y > b.y - m && y < b.y + b.h + m) return true;
  }
  return false;
}

export function collideBuildings(p: { x: number; y: number; r: number }) {
  const a = BIDX.get(((p.x / BG) | 0) * 100 + ((p.y / BG) | 0));
  const lists = [a];
  const cx = (p.x / BG) | 0, cy = (p.y / BG) | 0;
  const fx = p.x - cx * BG, fy = p.y - cy * BG;
  if (fx < p.r) lists.push(BIDX.get((cx - 1) * 100 + cy));
  if (fx > BG - p.r) lists.push(BIDX.get((cx + 1) * 100 + cy));
  if (fy < p.r) lists.push(BIDX.get(cx * 100 + cy - 1));
  if (fy > BG - p.r) lists.push(BIDX.get(cx * 100 + cy + 1));
  for (const L of lists) {
    if (!L) continue;
    for (const b of L) {
      const nx = clamp(p.x, b.x, b.x + b.w), ny = clamp(p.y, b.y, b.y + b.h);
      const dx = p.x - nx, dy = p.y - ny, dd = dx * dx + dy * dy;
      if (dd < p.r * p.r) {
        if (dd > 1e-6) {
          const d = Math.sqrt(dd);
          p.x += (dx / d) * (p.r - d);
          p.y += (dy / d) * (p.r - d);
        } else {
          const l = p.x - b.x, r = b.x + b.w - p.x, t = p.y - b.y, bo = b.y + b.h - p.y;
          const m = Math.min(l, r, t, bo);
          if (m === l) p.x = b.x - p.r;
          else if (m === r) p.x = b.x + b.w + p.r;
          else if (m === t) p.y = b.y - p.r;
          else p.y = b.y + b.h + p.r;
        }
      }
    }
  }
}

export const GATE_DEFS: Gate[] = [];
(function () {
  for (const r of ROADS) {
    if (r.spoke) continue;
    const L = r.L || [];
    for (let i = 0; i < L.length; i++) {
      const [ax, ay] = r.p[i], [bx, by] = r.p[i + 1];
      const st = Math.ceil(L[i] / 4);
      let prev: number | null = null;
      for (let k = 0; k <= st; k++) {
        const t = k / st, x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
        const s = Math.hypot(x - ZONE.x, y - ZONE.y) > ZONE.R ? 1 : -1;
        if (prev !== null && s !== prev) {
          const ang = Math.atan2(y - ZONE.y, x - ZONE.x);
          if (!GATE_DEFS.some(g => Math.abs(angDiff(g.ang, ang)) < 0.25)) {
            const nx = Math.cos(ang), ny = Math.sin(ang), w = r.w + 28;
            const dirs = ['East', 'South', 'West', 'North'];
            GATE_DEFS.push({
              ang, w, road: r.n, nx, ny, tx: -ny, ty: nx,
              x: ZONE.x + nx * ZONE.R, y: ZONE.y + ny * ZONE.R,
              ox: ZONE.x + nx * (ZONE.R + 60), oy: ZONE.y + ny * (ZONE.R + 60),
              ix: ZONE.x + nx * (ZONE.R - 60), iy: ZONE.y + ny * (ZONE.R - 60),
              half: (w / 2) / ZONE.R,
              name: dirs[(((Math.round(ang / (Math.PI / 2)) % 4) + 4) % 4)]
            });
          }
        }
        prev = s;
      }
    }
  }
  GATE_DEFS.sort((a, b) => a.ang - b.ang);
})();

export function gateAtAngle(a: number, margin: number): number {
  for (let i = 0; i < GATE_DEFS.length; i++) {
    const g = GATE_DEFS[i];
    if (Math.abs(angDiff(a, g.ang)) < g.half - margin) return i;
  }
  return -1;
}

export function zoneConstrain(
  p: { x: number; y: number; r: number; team?: string; noZone?: boolean },
  px: number, py: number, gateDown: boolean[]
) {
  if (p.noZone) return;
  const dx = p.x - ZONE.x, dy = p.y - ZONE.y, d = Math.hypot(dx, dy) || 1, band = p.r + 9;
  if (Math.abs(d - ZONE.R) >= band) return;
  const gi = gateAtAngle(Math.atan2(dy, dx), p.r / ZONE.R);
  if (gi >= 0 && (p.team !== 'P' || gateDown[gi])) return;
  if (gi < 0 && p.team === 'P') return;
  const pd = Math.hypot(px - ZONE.x, py - ZONE.y);
  const nd = ZONE.R + (pd < ZONE.R ? -band : band);
  p.x = ZONE.x + (dx / d) * nd;
  p.y = ZONE.y + (dy / d) * nd;
}

export function barClosest(b: Barricade, x: number, y: number) {
  const t = clamp((x - b.x1) * b.tx + (y - b.y1) * b.ty, 0, b.len);
  return { x: b.x1 + b.tx * t, y: b.y1 + b.ty * t, t };
}

export function barConstrain(
  p: { x: number; y: number; r: number; team?: string },
  px: number, py: number, bars: Barricade[]
) {
  if (p.team !== 'P') return;
  for (const b of bars) {
    if (!b.up) continue;
    if (d2(p.x, p.y, b.x, b.y) > (b.len / 2 + 30) ** 2) continue;
    const q = barClosest(b, p.x, p.y);
    const dx = p.x - q.x, dy = p.y - q.y, d = Math.hypot(dx, dy), m = p.r + 7;
    if (d < m) {
      const side = Math.sign((px - b.x) * b.nx + (py - b.y) * b.ny) || 1;
      const end = q.t <= 0 || q.t >= b.len;
      const nx = end && d > 0 ? dx / d : b.nx * side;
      const ny = end && d > 0 ? dy / d : b.ny * side;
      p.x = q.x + nx * m;
      p.y = q.y + ny * m;
    }
  }
}

export function moveBody(
  p: { x: number; y: number; vx: number; vy: number; r: number; team?: string; sx?: number; sy?: number; noZone?: boolean },
  wx: number, wy: number, spd: number, dt: number, gateDown: boolean[], bars: Barricade[]
): number {
  const k = Math.min(1, dt * 12);
  p.vx += (wx * spd - p.vx) * k;
  p.vy += (wy * spd - p.vy) * k;
  const px = p.x, py = p.y;
  p.x += p.vx * dt + (p.sx || 0);
  p.y += p.vy * dt + (p.sy || 0);
  collideBuildings(p);
  zoneConstrain(p, px, py, gateDown);
  barConstrain(p, px, py, bars);
  p.x = clamp(p.x, 30, WORLD_SIZE - 30);
  p.y = clamp(p.y, 30, WORLD_SIZE - 30);
  return Math.hypot(p.x - px, p.y - py);
}
