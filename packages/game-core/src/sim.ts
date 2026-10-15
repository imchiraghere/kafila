import {
  TAU, clamp, d2, dist, angDiff, norm, WORLD_SIZE, CP, JM, ZONE,
  SPEED, MUDDAS, DT, TICK_MS, FIR_AT, FIR_TITLES, NAMES_P, NAMES_C,
  GATE_DEFS, CHECKS, ASSEMBLY, PSTATIONS, DEST, METRO, ROADS,
  pointInBuilding, collideBuildings, moveBody, barClosest, inRiver,
  Team, ControlType, Barricade, GateState, ClientInput
} from '@mantar-jantar/shared';

const GC = 40;
const GN = Math.ceil(WORLD_SIZE / GC);
const KAFILA_CAP = 25;
const NM = MUDDAS.length;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(a: T[]): T => a[(Math.random() * a.length) | 0];

export interface SimOptions {
  roundTime?: number;
  minP?: number;
  minC?: number;
  npcLeaders?: number;
  npcCap?: number;
}

export interface SimEntity {
  id: number;
  team: Team;
  ctl: ControlType;
  mode: string;
  role: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  sx: number;
  sy: number;
  r: number;
  face: number;
  want: { x: number; y: number };
  state: 'active' | 'detained' | 'resting' | 'fleeing';
  gassed: number;
  stun: number;
  ghost: number;
  cd: number;
  gasCd: number;
  abCd: number;
  eCd: number;
  megaCd: number;
  swingT: number;
  swingCd: number;
  metroCd: number;
  gheraoImm: number;
  sta: number;
  sprint: boolean;
  chaiT: number;
  gamT: number;
  pbT: number;
  reelT: number;
  boostT: number;
  dispT: number;
  kbT: number;
  kbx: number;
  kby: number;
  fleeT: number;
  moving: boolean;
  thinkT: number;
  gateT: number;
  lat: number;
  bold: number;
  followers: SimEntity[];
  leader: SimEntity | null;
  trail: [number, number][];
  trailT: number;
  fo: { x: number; y: number };
  pushing: any;
  look: number;
  mud: number;
  score: number;
  streak: number;
  best: number;
  stats: { det: number; arr: number; rec: number; brk: number; kick: number; gas: number; hits: number };
  fxq?: any[];
  inq?: any[];
  ack: number;
  last: any;
  chatT: number;
  sayT: number;
  lastAct: number;
  lstate?: string;
  goalN?: number;
  recruitT?: number;
  huntOf?: SimEntity;
  tgt?: SimEntity | null;
  tgtT?: number;
  bar?: Barricade;
  slot?: number;
  pocket?: any;
}

export function createSim(opts: SimOptions = {}) {
  const roundTime = opts.roundTime || 480;
  const minP = opts.minP || 5;
  const minC = opts.minC || 4;
  const npcCap = opts.npcCap || 130;

  let nid = 1;
  const ents: SimEntity[] = [];
  const grid = new Map<number, SimEntity[]>();
  const bars: Barricade[] = [];
  const fx: any[] = [];
  const gates: GateState[] = GATE_DEFS.map(() => ({
    hp: 100, max: 100, armor: 0, up: true, rebuild: 0, nPush: 0, nHold: 0, crowd: 0, pushers: []
  }));

  const mats = [0, 1, 2, 3, 4].map(i => {
    const a = (i / 5) * TAU - Math.PI / 2;
    return { i, x: JM.x + Math.cos(a) * JM.r * 0.55, y: JM.y + Math.sin(a) * JM.r * 0.55, by: null as SimEntity | null };
  });

  const state = {
    tick: 0,
    roundTime,
    timeLeft: roundTime,
    over: false,
    winner: '' as Team | '',
    pScore: 0,
    cScore: 0,
    dharnaMeter: 0,
    trend: -1,
    nextEv: 30,
    activeEvent: null as string | null
  };

  // Helper: create entity
  function mk(o: Partial<SimEntity>): SimEntity {
    const e: SimEntity = Object.assign({
      id: nid++,
      team: 'P' as Team,
      ctl: 'npc' as ControlType,
      mode: 'free',
      role: '',
      name: '',
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      sx: 0,
      sy: 0,
      r: 10,
      face: Math.PI / 2,
      want: { x: 0, y: 0 },
      state: 'active' as const,
      gassed: 0,
      stun: 0,
      ghost: 0,
      cd: rand(0, 2),
      gasCd: rand(3, 9),
      abCd: 0,
      eCd: 0,
      megaCd: rand(5, 15),
      swingT: 0,
      swingCd: 0,
      metroCd: 0,
      gheraoImm: 0,
      sta: 100,
      sprint: false,
      chaiT: 0,
      gamT: 0,
      pbT: 0,
      reelT: 0,
      boostT: 0,
      dispT: 0,
      kbT: 0,
      kbx: 0,
      kby: 0,
      fleeT: 0,
      moving: false,
      thinkT: Math.random() * 0.2,
      gateT: 0,
      lat: rand(-0.85, 0.85),
      bold: Math.random(),
      followers: [],
      leader: null,
      trail: [],
      trailT: 0,
      fo: { x: rand(-30, 30), y: rand(-30, 30) },
      pushing: null,
      look: (Math.random() * 8) | 0,
      mud: (Math.random() * NM) | 0,
      score: 0,
      streak: 0,
      best: 1e9,
      stats: { det: 0, arr: 0, rec: 0, brk: 0, kick: 0, gas: 0, hits: 0 },
      ack: 0,
      last: null,
      chatT: 0,
      sayT: 0,
      lastAct: 0
    }, o);
    ents.push(e);
    return e;
  }

  function addFx(k: string, x: number, y: number, a?: any, b?: any, c?: any) {
    fx.push({ t: state.tick, k, x: x | 0, y: y | 0, a, b, c });
    if (fx.length > 50) fx.shift();
  }

  function makeBar(x: number, y: number, ang: number, len: number, hp: number, o?: any): Barricade {
    const tx = Math.cos(ang), ty = Math.sin(ang);
    const b: Barricade = Object.assign({
      id: nid++,
      x, y, ang, tx, ty, nx: -ty, ny: tx, len,
      x1: x - tx * len / 2, y1: y - ty * len / 2,
      hp, max: hp, up: true, nPush: 0, nHold: 0, armor: 0,
      ttl: Infinity, rebuild: 0, downT: 0, name: 'Barricade', pushers: []
    }, o || {});
    bars.push(b);
    return b;
  }

  // Setup initial barricades
  function setupBarricades() {
    bars.length = 0;
    const RC = ZONE.R + 230;
    for (const r of ROADS) {
      for (let i = 0; i < r.p.length - 1; i++) {
        const [ax, ay] = r.p[i], [bx, by] = r.p[i + 1];
        const dx = bx - ax, dy = by - ay;
        const fx0 = ax - ZONE.x, fy0 = ay - ZONE.y;
        const A = dx * dx + dy * dy;
        const B = 2 * (fx0 * dx + fy0 * dy);
        const C0 = fx0 * fx0 + fy0 * fy0 - RC * RC;
        const D = B * B - 4 * A * C0;
        if (D < 0 || !A) continue;
        for (const sg of [-1, 1]) {
          const t = (-B + sg * Math.sqrt(D)) / (2 * A);
          if (t < 0 || t > 1) continue;
          const x = ax + dx * t, y = ay + dy * t;
          if (CHECKS.some(q => dist(q.x, q.y, x, y) < 170) || bars.some(q => q.cordon && dist(q.x, q.y, x, y) < 130)) continue;
          makeBar(x, y, Math.atan2(dy, dx) + Math.PI / 2, r.w + 60, 55, {
            name: 'Section 163 cordon',
            check: true,
            cordon: true
          });
        }
      }
    }
    // Also place initial check barriers
    for (const c of CHECKS) {
      makeBar(c.x, c.y, c.ang, c.len, 50, { name: c.name, check: true });
    }
  }

  // Spatial grid
  function gridBuild() {
    grid.clear();
    for (const e of ents) {
      if (e.state !== 'active') continue;
      const k = ((e.x / 64) | 0) * 1000 + ((e.y / 64) | 0);
      let a = grid.get(k);
      if (!a) grid.set(k, a = []);
      a.push(e);
    }
  }

  function query(x: number, y: number, R: number, fn: (e: SimEntity) => boolean | void) {
    const x0 = ((x - R) / 64) | 0, x1 = ((x + R) / 64) | 0;
    const y0 = ((y - R) / 64) | 0, y1 = ((y + R) / 64) | 0;
    const RR = R * R;
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const a = grid.get(cx * 1000 + cy);
        if (!a) continue;
        for (let i = 0; i < a.length; i++) {
          const e = a[i];
          if (d2(e.x, e.y, x, y) <= RR) {
            if (fn(e) === false) return;
          }
        }
      }
    }
  }

  function wantedLvl(e: SimEntity): number {
    if (e.team !== 'P' || e.ctl === 'npc') return 0;
    let l = 0;
    while (l < 5 && e.streak >= FIR_AT[l]) l++;
    return l;
  }

  // Spawn initial population
  function seedPopulation() {
    setupBarricades();
    // Spawn civilian NPCs
    for (let i = 0; i < 90; i++) {
      const sp = pick(ASSEMBLY);
      const e = mk({
        team: 'P',
        ctl: 'npc',
        mode: 'idle',
        x: sp.x + rand(-120, 120),
        y: sp.y + rand(-120, 120),
        mud: (Math.random() * NM) | 0,
        look: (Math.random() * 8) | 0
      });
      collideBuildings(e);
    }
    // Spawn initial bot leaders
    for (let i = 0; i < 3; i++) {
      const sp = pick(ASSEMBLY);
      const e = mk({
        team: 'P',
        ctl: 'bot',
        mode: 'lead',
        name: NAMES_P[i % NAMES_P.length],
        x: sp.x + rand(-30, 30),
        y: sp.y + rand(-30, 30),
        mud: i % NM,
        look: 0
      });
      collideBuildings(e);
    }
    // Spawn initial police constables
    for (let i = 0; i < 8; i++) {
      const ps = pick(PSTATIONS);
      const e = mk({
        team: 'C',
        ctl: 'npc',
        role: 'patrol',
        name: NAMES_C[i % NAMES_C.length],
        x: ps.x + rand(-40, 40),
        y: ps.y + rand(-40, 40),
        look: 1
      });
      collideBuildings(e);
    }
  }

  seedPopulation();

  // Public methods
  function addPlayer(name: string, team: Team, isBot = false, mudda = 0): SimEntity {
    const sp = team === 'P' ? pick(ASSEMBLY) : pick(PSTATIONS);
    const p = mk({
      name: name || (team === 'P' ? pick(NAMES_P) : pick(NAMES_C)),
      team,
      ctl: isBot ? 'bot' : 'human',
      mud: mudda,
      x: sp.x + rand(-20, 20),
      y: sp.y + rand(-20, 20),
      look: team === 'P' ? 0 : 1
    });
    collideBuildings(p);
    return p;
  }

  function setTeam(id: number, team: Team, mudda = 0) {
    const p = ents.find(e => e.id === id);
    if (!p) return;
    p.team = team;
    p.mud = mudda;
    p.followers.forEach(f => { f.leader = null; });
    p.followers = [];
    const sp = team === 'P' ? pick(ASSEMBLY) : pick(PSTATIONS);
    p.x = sp.x + rand(-20, 20);
    p.y = sp.y + rand(-20, 20);
    p.vx = 0;
    p.vy = 0;
    collideBuildings(p);
  }

  function input(id: number, inp: ClientInput) {
    const p = ents.find(e => e.id === id);
    if (!p || p.state !== 'active') return;
    p.ack = inp.s;
    const len = Math.hypot(inp.x, inp.y);
    const wx = len > 0.05 ? inp.x / len : 0;
    const wy = len > 0.05 ? inp.y / len : 0;
    p.want = { x: wx, y: wy };
    p.sprint = !!inp.sp;
    if (len > 0.1) p.face = Math.atan2(wy, wx);

    // Actions
    if (inp.a) {
      // Primary action
      if (p.team === 'P') {
        // Naara (Slogan)
        const now = state.tick;
        if (now - p.lastAct > 15) {
          p.lastAct = now;
          addFx('ring', p.x, p.y, 220);
          addFx('say', p.x, p.y, p.id, pick(MUDDAS[p.mud].ch));
          p.score += 5;
          // Recruit nearby neutral NPCs
          query(p.x, p.y, 200, neutral => {
            if (neutral.team === 'P' && !neutral.leader && neutral.ctl === 'npc' && p.followers.length < KAFILA_CAP) {
              neutral.leader = p;
              neutral.mode = 'follow';
              p.followers.push(neutral);
              p.score += 15;
              p.streak += 10;
              addFx('pop', neutral.x, neutral.y);
            }
          });
        }
      } else {
        // Police Lathi swing
        if (p.swingCd <= 0) {
          p.swingT = 0.25;
          p.swingCd = 0.5;
          addFx('swing', p.x, p.y, 0, p.id);
          const reach = 45;
          const hitAngle = p.face;
          query(p.x, p.y, reach + 20, target => {
            if (target.team === 'P' && target.state === 'active') {
              const ang = Math.atan2(target.y - p.y, target.x - p.x);
              if (Math.abs(angDiff(ang, hitAngle)) < 1.0) {
                target.stun = 0.8;
                const pushBack = norm(target.x - p.x, target.y - p.y);
                target.x += pushBack.x * 25;
                target.y += pushBack.y * 25;
                collideBuildings(target);
                addFx('hit', target.x, target.y, target.id, (ang * 100) | 0);
                p.score += 20;
                // If target had followers, disperse some
                if (target.followers.length > 0) {
                  const lost = target.followers.pop();
                  if (lost) {
                    lost.leader = null;
                    lost.mode = 'idle';
                  }
                }
              }
            }
          });
        }
      }
    }

    if (inp.e && p.team === 'C') {
      // Secondary action: Tear gas throw
      if (p.gasCd <= 0) {
        p.gasCd = 4.0;
        const targetX = p.x + Math.cos(p.face) * 160;
        const targetY = p.y + Math.sin(p.face) * 160;
        addFx('mega', targetX, targetY);
        query(targetX, targetY, 150, vict => {
          if (vict.team === 'P') {
            vict.gassed = 3.0;
            vict.sta = Math.max(0, vict.sta - 40);
          }
        });
      }
    }
  }

  // Physics and logic tick (30 Hz)
  function step() {
    state.tick++;
    state.timeLeft = Math.max(0, state.timeLeft - DT);
    if (state.timeLeft <= 0 && !state.over) {
      state.over = true;
      state.winner = state.pScore > state.cScore ? 'P' : 'C';
      addFx('over', 0, 0, state.winner);
    }

    gridBuild();

    const gd = gates.map(g => !g.up);

    // Update entities
    for (const e of ents) {
      if (e.state !== 'active') continue;

      if (e.stun > 0) {
        e.stun -= DT;
        continue;
      }
      if (e.swingCd > 0) e.swingCd -= DT;
      if (e.gasCd > 0) e.gasCd -= DT;
      if (e.gassed > 0) e.gassed -= DT;

      // Bot AI logic
      if (e.ctl === 'bot' || (e.ctl === 'npc' && e.role === 'patrol')) {
        e.thinkT -= DT;
        if (e.thinkT <= 0) {
          e.thinkT = rand(0.5, 1.2);
          if (e.team === 'P') {
            // Protester bot moves toward Jantar Mantar
            const dx = JM.x - e.x, dy = JM.y - e.y;
            const dir = norm(dx, dy);
            e.want = dir;
            e.face = Math.atan2(dir.y, dir.x);
            // Occasionally shout
            if (Math.random() < 0.2) {
              addFx('say', e.x, e.y, e.id, pick(MUDDAS[e.mud].ch));
            }
          } else {
            // Police bot wanders toward Connaught Place or nearest crowd
            const dx = CP.x + rand(-300, 300) - e.x;
            const dy = CP.y + rand(-300, 300) - e.y;
            const dir = norm(dx, dy);
            e.want = dir;
            e.face = Math.atan2(dir.y, dir.x);
          }
        }
      }

      // Kafila follower movement
      if (e.mode === 'follow' && e.leader) {
        const lead = e.leader;
        const targetX = lead.x + e.fo.x;
        const targetY = lead.y + e.fo.y;
        const d = dist(e.x, e.y, targetX, targetY);
        if (d > 25) {
          const dir = norm(targetX - e.x, targetY - e.y);
          e.want = dir;
          e.face = Math.atan2(dir.y, dir.x);
        } else {
          e.want = { x: 0, y: 0 };
        }
      }

      // Movement
      const baseSpd = e.team === 'P' ? SPEED.P : SPEED.C;
      const spd = baseSpd * (e.sprint ? SPEED.sprint : 1.0) * (e.gassed > 0 ? 0.6 : 1.0);
      moveBody(e, e.want.x, e.want.y, spd, DT, gd, bars);

      // Check dharna mats at Jantar Mantar
      if (e.team === 'P' && dist(e.x, e.y, JM.x, JM.y) < JM.r) {
        state.dharnaMeter = Math.min(1000, state.dharnaMeter + DT * 5);
        state.pScore += DT * 10;
        e.score += DT * 10;
      }
    }
  }

  function snapshot(forPlayerId: number, view: { w: number; h: number }) {
    const me = ents.find(e => e.id === forPlayerId);
    const px = me ? me.x : CP.x, py = me ? me.y : CP.y;
    const halfW = (view.w || 1200) / 2 + 100;
    const halfH = (view.h || 900) / 2 + 100;

    const visibleEnts: any[] = [];
    for (const e of ents) {
      if (Math.abs(e.x - px) < halfW && Math.abs(e.y - py) < halfH) {
        visibleEnts.push([
          e.id,
          Math.round(e.x),
          Math.round(e.y),
          Math.round(e.vx),
          Math.round(e.vy),
          Math.round(e.face * 100),
          e.team,
          e.ctl,
          e.state,
          e.look,
          e.mud,
          e.followers.length,
          Math.round(e.score),
          e.name
        ]);
      }
    }

    const visibleBars = bars.map(b => [
      b.id,
      Math.round(b.x),
      Math.round(b.y),
      Math.round(b.ang * 1000),
      b.len,
      b.up ? 1 : 0,
      b.hp,
      b.max,
      Math.round(b.nPush * 10),
      Math.round(b.nHold * 10),
      b.check ? 1 : 0,
      b.armor
    ]);

    const outFx = fx.slice();
    fx.length = 0;

    return {
      t: 's',
      tk: state.tick,
      e: visibleEnts,
      b: visibleBars,
      g: gates.map(g => [g.up ? 1 : 0, g.hp, g.max]),
      fx: outFx,
      rd: [
        Math.round(state.timeLeft),
        Math.round(state.pScore),
        Math.round(state.cScore),
        Math.round(state.dharnaMeter),
        state.over ? 1 : 0,
        state.winner
      ],
      me: me ? {
        id: me.id,
        x: Math.round(me.x),
        y: Math.round(me.y),
        vx: me.vx,
        vy: me.vy,
        team: me.team,
        st: me.state,
        k: me.followers.length,
        score: Math.round(me.score),
        streak: me.streak,
        ack: me.ack
      } : null
    };
  }

  function staticInfo() {
    return {
      world: WORLD_SIZE,
      cp: CP,
      jm: JM,
      zone: ZONE
    };
  }

  return {
    S: state,
    ents,
    bars,
    gates,
    addPlayer,
    setTeam,
    input,
    step,
    snapshot,
    staticInfo
  };
}
