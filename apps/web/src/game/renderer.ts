import {
  TAU, WORLD_SIZE, CP, JM, ZONE, ROADS, RINGS, PARKS, BUILD, TREES,
  MUDDAS, GATE_DEFS, riverL, GameRendererInterface
} from '@mantar-jantar/shared';

export interface Camera {
  x: number;
  y: number;
  z: number;
  shake: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  txt?: string;
  c?: string;
  s?: number;
  ring?: boolean;
  R?: number;
  emo?: string;
}

export interface SpeechBubble {
  id: number;
  txt: string;
  x: number;
  y: number;
  life: number;
}

export class GameRenderer implements GameRendererInterface {
  private cv: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.cv.width = Math.floor(w * dpr);
    this.cv.height = Math.floor(h * dpr);
    this.cv.style.width = w + 'px';
    this.cv.style.height = h + 'px';
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
  }

  render(
    cam: Camera,
    entities: any[],
    bars: any[],
    gates: any[],
    particles: Particle[],
    bubbles: SpeechBubble[],
    myEntity: any,
    rd: any[]
  ) {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.save();
    // Clear screen
    ctx.fillStyle = '#8fae63';
    ctx.fillRect(0, 0, w, h);

    // Apply Camera transform with shake
    const sx = (Math.random() - 0.5) * cam.shake * 10;
    const sy = (Math.random() - 0.5) * cam.shake * 10;
    ctx.translate(w / 2 + sx, h / 2 + sy);
    ctx.scale(cam.z, cam.z);
    ctx.translate(-cam.x, -cam.y);

    // Visible bounding box in world coordinates
    const halfW = w / (2 * cam.z) + 100;
    const halfH = h / (2 * cam.z) + 100;
    const minX = cam.x - halfW;
    const maxX = cam.x + halfW;
    const minY = cam.y - halfH;
    const maxY = cam.y + halfH;

    // 1. Draw River Yamuna
    ctx.fillStyle = '#607d8b';
    ctx.beginPath();
    ctx.moveTo(riverL(minY), minY);
    for (let y = minY; y <= maxY; y += 40) {
      ctx.lineTo(riverL(y), y);
    }
    ctx.lineTo(WORLD_SIZE, maxY);
    ctx.lineTo(WORLD_SIZE, minY);
    ctx.closePath();
    ctx.fill();

    // 2. Draw Roads
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const r of ROADS) {
      ctx.strokeStyle = '#4e4a46';
      ctx.lineWidth = r.w;
      ctx.beginPath();
      r.p.forEach(([x, y], i) => {
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Road dash markings
      if (!r.spoke && r.w >= 44) {
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 14]);
        ctx.beginPath();
        r.p.forEach(([x, y], i) => {
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // 3. Draw Concentric Rings (Connaught Place)
    for (const g of RINGS) {
      ctx.strokeStyle = '#4e4a46';
      ctx.lineWidth = g.w;
      ctx.beginPath();
      ctx.arc(g.x, g.y, g.r, 0, TAU);
      ctx.stroke();
    }

    // 4. Draw Parks
    for (const p of PARKS) {
      ctx.fillStyle = p.forest ? '#55723b' : '#6f9448';
      if (p.t === 'c') {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r || 50, 0, TAU);
        ctx.fill();
      } else if (p.w && p.h) {
        ctx.fillRect(p.x, p.y, p.w, p.h);
      }
    }

    // 5. Draw Section 163 Zone and Jantar Mantar
    ctx.strokeStyle = 'rgba(220, 50, 50, 0.4)';
    ctx.lineWidth = 6;
    ctx.setLineDash([16, 12]);
    ctx.beginPath();
    ctx.arc(ZONE.x, ZONE.y, ZONE.R, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    // Jantar Mantar inner dharna sanctuary
    ctx.fillStyle = 'rgba(255, 153, 51, 0.2)';
    ctx.beginPath();
    ctx.arc(JM.x, JM.y, JM.r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#ff9933';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Dharna mats
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU - Math.PI / 2;
      const mx = JM.x + Math.cos(a) * JM.r * 0.55;
      const my = JM.y + Math.sin(a) * JM.r * 0.55;
      ctx.fillStyle = '#b71c1c';
      ctx.fillRect(mx - 18, my - 12, 36, 24);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(mx - 16, my - 10, 32, 20);
    }

    // 6. Draw Buildings
    for (const b of BUILD) {
      if (b.x + b.w < minX || b.x > maxX || b.y + b.h < minY || b.y > maxY) continue;
      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(b.x + 6, b.y + 6, b.w, b.h);
      // Wall / Roof
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.strokeStyle = b.wall;
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);

      // Shop Signboards
      if (b.shop) {
        ctx.fillStyle = b.sign;
        ctx.fillRect(b.x + 4, b.y + b.h - 10, b.w - 8, 8);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(b.shop.slice(0, 16), b.x + b.w / 2, b.y + b.h - 3);
      }
    }

    // 7. Draw Trees
    for (const t of TREES) {
      if (t.x < minX || t.x > maxX || t.y < minY || t.y > maxY) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.15)';
      ctx.beginPath();
      ctx.arc(t.x + 3, t.y + 3, 14 * t.s, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#3e6328';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 14 * t.s, 0, TAU);
      ctx.fill();
      ctx.fillStyle = '#4e7a33';
      ctx.beginPath();
      ctx.arc(t.x - 2, t.y - 3, 9 * t.s, 0, TAU);
      ctx.fill();
    }

    // 8. Draw Barricades
    for (const bar of bars) {
      const [id, bx, by, ang1000, len, up] = bar;
      const ang = ang1000 / 1000;
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(ang);
      if (up) {
        // Upright barricade with yellow/red warning stripes
        ctx.fillStyle = '#f5c518';
        ctx.fillRect(-len / 2, -6, len, 12);
        ctx.strokeStyle = '#d32f2f';
        ctx.lineWidth = 3;
        ctx.strokeRect(-len / 2, -6, len, 12);
        // Stencil text
        ctx.fillStyle = '#1d1a16';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('DILLI POLICE', 0, 3);
      } else {
        // Knocked down flat
        ctx.fillStyle = 'rgba(180, 160, 40, 0.5)';
        ctx.fillRect(-len / 2, -10, len, 20);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 1;
        ctx.strokeRect(-len / 2, -10, len, 20);
      }
      ctx.restore();
    }

    // 9. Draw Entities
    for (const ent of entities) {
      const [id, ex, ey, vx, vy, face100, team, ctl, state, look, mud, followers, score, name] = ent;
      const face = face100 / 100;
      const isMe = myEntity && myEntity.id === id;

      ctx.save();
      ctx.translate(ex, ey);

      // Ground shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 10, 5, 0, 0, TAU);
      ctx.fill();

      if (team === 'P') {
        // Protester: Head, Shirt, Placard
        const mudObj = MUDDAS[mud] || MUDDAS[0];
        // Shirt
        ctx.fillStyle = isMe ? '#ff9933' : mudObj.c;
        ctx.beginPath();
        ctx.arc(0, -4, 7, 0, TAU);
        ctx.fill();
        // Head
        ctx.fillStyle = '#c98a55';
        ctx.beginPath();
        ctx.arc(0, -12, 5, 0, TAU);
        ctx.fill();

        // Placard
        ctx.save();
        ctx.rotate(face);
        ctx.fillStyle = '#fff';
        ctx.fillRect(4, -18, 16, 11);
        ctx.strokeStyle = mudObj.c;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(4, -18, 16, 11);
        ctx.fillStyle = mudObj.c;
        ctx.font = 'bold 7px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(mudObj.e, 12, -10);
        ctx.restore();
      } else {
        // Dilli Police: Khaki uniform, Cap, Lathi
        // Uniform
        ctx.fillStyle = '#c4a26c';
        ctx.beginPath();
        ctx.arc(0, -4, 7, 0, TAU);
        ctx.fill();
        // Head
        ctx.fillStyle = '#b8784a';
        ctx.beginPath();
        ctx.arc(0, -12, 5, 0, TAU);
        ctx.fill();
        // Police Cap
        ctx.fillStyle = '#1f4e9c';
        ctx.beginPath();
        ctx.arc(0, -15, 5, Math.PI, TAU);
        ctx.fill();

        // Lathi baton
        ctx.save();
        ctx.rotate(face);
        ctx.strokeStyle = '#5d4037';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(5, 0);
        ctx.lineTo(22, 0);
        ctx.stroke();
        ctx.restore();
      }

      // Name label
      if (name) {
        ctx.fillStyle = isMe ? '#ffd54f' : '#ffffff';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 2.5;
        ctx.strokeText(name, 0, -22);
        ctx.fillText(name, 0, -22);
      }

      // Kafila count badge
      if (team === 'P' && followers > 0) {
        ctx.fillStyle = '#ff7f11';
        ctx.beginPath();
        ctx.arc(10, -22, 6, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 7px sans-serif';
        ctx.fillText(String(followers), 10, -20);
      }

      ctx.restore();
    }

    // 10. Draw Speech Bubbles
    for (const b of bubbles) {
      ctx.save();
      ctx.translate(b.x, b.y - 35);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.strokeStyle = '#1d1a16';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.roundRect(-45, -14, 90, 20, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#1d1a16';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(b.txt.slice(0, 18), 0, 0);
      ctx.restore();
    }

    // 11. Draw Particles
    for (const p of particles) {
      ctx.save();
      if (p.ring) {
        ctx.strokeStyle = p.c || 'rgba(255,153,51,0.8)';
        ctx.lineWidth = 3 * (p.life / p.max);
        ctx.beginPath();
        ctx.arc(p.x, p.y, (p.R || 100) * (1 - p.life / p.max), 0, TAU);
        ctx.stroke();
      } else if (p.txt) {
        ctx.fillStyle = p.c || '#fff';
        ctx.font = `bold ${p.s || 14}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 2;
        ctx.strokeText(p.txt, p.x, p.y);
        ctx.fillText(p.txt, p.x, p.y);
      }
      ctx.restore();
    }

    ctx.restore();

    // 12. Draw Compass Needle pointing to Jantar Mantar
    if (myEntity) {
      const ang = Math.atan2(JM.y - myEntity.y, JM.x - myEntity.x);
      const cx = w - 60, cy = 60;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.fillStyle = 'rgba(30, 20, 10, 0.7)';
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ff9933';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.rotate(ang);
      ctx.fillStyle = '#ff7f11';
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-8, -8);
      ctx.lineTo(-4, 0);
      ctx.lineTo(-8, 8);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('JM', 0, 14);
      ctx.restore();
    }
  }
}
