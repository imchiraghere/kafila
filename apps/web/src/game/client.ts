import { createSim } from '@mantar-jantar/game-core';
import { Team, ClientInput, DT, TICK_MS } from '@mantar-jantar/shared';
import { SFX, initAudio } from './audio';
import { GameRenderer, Particle, SpeechBubble, Camera } from './renderer';

export interface GameClientOptions {
  canvas: HTMLCanvasElement;
  name: string;
  team: Team;
  mudda: number;
  mode: 'online' | 'offline';
  wsUrl?: string;
  onStatusChange?: (status: string) => void;
  onGameOver?: (winner: string) => void;
  onScoreUpdate?: (score: number, kafila: number) => void;
}

export class GameClient {
  private canvas: HTMLCanvasElement;
  private renderer: GameRenderer;
  private name: string;
  private team: Team;
  private mudda: number;
  private mode: 'online' | 'offline';
  private wsUrl: string;

  private ws: WebSocket | null = null;
  private localSim: ReturnType<typeof createSim> | null = null;
  private localTimer: NodeJS.Timeout | null = null;
  private myId = 0;

  private animFrame = 0;
  private running = false;
  private seq = 0;

  private mouseX = 0;
  private mouseY = 0;
  private keys: Record<string, boolean> = {};

  private cam: Camera = { x: 3000, y: 2000, z: 1.15, shake: 0 };
  private entities: any[] = [];
  private bars: any[] = [];
  private gates: any[] = [];
  private particles: Particle[] = [];
  private bubbles: SpeechBubble[] = [];
  private myEntity: any = null;
  private rd: any[] = [480, 0, 0, 0, 0, ''];

  private onStatusChange?: (status: string) => void;
  private onGameOver?: (winner: string) => void;
  private onScoreUpdate?: (score: number, kafila: number) => void;

  constructor(opts: GameClientOptions) {
    this.canvas = opts.canvas;
    this.renderer = new GameRenderer(opts.canvas);
    this.name = opts.name;
    this.team = opts.team;
    this.mudda = opts.mudda;
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const defaultWs = !isLocal ? 'wss://kafila-server.vercel.app/ws' : 'ws://localhost:4000/ws';
    this.wsUrl = opts.wsUrl || defaultWs;
    this.onStatusChange = opts.onStatusChange;
    this.onGameOver = opts.onGameOver;
    this.onScoreUpdate = opts.onScoreUpdate;

    this.bindEvents();
  }

  private bindEvents() {
    window.addEventListener('resize', this.onResize);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('mousedown', this.onMouseDown);
    this.onResize();
  }

  private unbindEvents() {
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('mousedown', this.onMouseDown);
  }

  private onResize = () => {
    this.renderer.resize(window.innerWidth, window.innerHeight);
  };

  private onMouseMove = (ev: MouseEvent) => {
    this.mouseX = ev.clientX;
    this.mouseY = ev.clientY;
  };

  private onKeyDown = (ev: KeyboardEvent) => {
    this.keys[ev.key.toLowerCase()] = true;
    if (ev.key.toLowerCase() === 't') {
      this.switchTeam();
    }
  };

  private onKeyUp = (ev: KeyboardEvent) => {
    this.keys[ev.key.toLowerCase()] = false;
  };

  private onMouseDown = (ev: MouseEvent) => {
    initAudio();
    this.sendAction(ev.button === 2 ? 'secondary' : 'primary');
  };

  public triggerMobileAction(action: 'act' | 'lift' | 'gas' | 'run') {
    initAudio();
    if (action === 'act') this.sendAction('primary');
    else if (action === 'gas' || action === 'lift') this.sendAction('secondary');
    else if (action === 'run') this.keys['shift'] = !this.keys['shift'];
  }

  private switchTeam() {
    const newTeam: Team = this.team === 'P' ? 'C' : 'P';
    this.team = newTeam;
    if (this.mode === 'online' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ t: 'team', team: newTeam, mud: this.mudda }));
    } else if (this.localSim) {
      this.localSim.setTeam(this.myId, newTeam, this.mudda);
    }
  }

  start() {
    initAudio();
    this.running = true;
    if (this.mode === 'online') {
      this.connectOnline();
    } else {
      this.startOffline();
    }
    this.loop();
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.animFrame);
    if (this.localTimer) clearInterval(this.localTimer);
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
    this.unbindEvents();
  }

  private startOffline() {
    this.onStatusChange?.('Playing Offline Practice Mode');
    this.localSim = createSim({ roundTime: 480, minP: 6, minC: 5 });
    const p = this.localSim.addPlayer(this.name, this.team, false, this.mudda);
    this.myId = p.id;

    // Simulation tick loop at 30 Hz
    let tickCount = 0;
    this.localTimer = setInterval(() => {
      if (!this.localSim) return;
      this.sendLocalInput();
      this.localSim.step();
      tickCount++;
      if (tickCount % 2 === 0) {
        const snap = this.localSim.snapshot(this.myId, { w: window.innerWidth, h: window.innerHeight });
        this.handleSnapshot(snap);
      }
    }, TICK_MS);
  }

  private connectOnline() {
    this.onStatusChange?.('Connecting to server…');
    try {
      const ws = (this.ws = new WebSocket(this.wsUrl));
      ws.onopen = () => {
        this.onStatusChange?.('Connected! Joining room…');
        ws.send(
          JSON.stringify({
            t: 'join',
            name: this.name,
            team: this.team,
            mud: this.mudda
          })
        );
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.t === 'welcome') {
            this.myId = msg.id;
            this.onStatusChange?.(`Playing Online (${msg.room})`);
          } else if (msg.t === 's') {
            this.handleSnapshot(msg);
          }
        } catch {}
      };

      ws.onclose = () => {
        if (!this.running) return;
        this.onStatusChange?.('Server disconnected. Falling back to offline practice…');
        this.mode = 'offline';
        this.startOffline();
      };

      ws.onerror = () => {
        this.onStatusChange?.('Server unreachable. Falling back to offline practice…');
        this.mode = 'offline';
        this.startOffline();
      };
    } catch {
      this.onStatusChange?.('Connection error. Starting offline mode…');
      this.mode = 'offline';
      this.startOffline();
    }
  }

  private sendLocalInput() {
    if (!this.localSim) return;
    const inp = this.calcInput();
    this.localSim.input(this.myId, inp);
  }

  private sendOnlineInput() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const inp = this.calcInput();
    this.ws.send(JSON.stringify(Object.assign({ t: 'in' }, inp)));
  }

  private sendAction(kind: 'primary' | 'secondary') {
    if (this.mode === 'online' && this.ws && this.ws.readyState === WebSocket.OPEN) {
      const inp = this.calcInput();
      if (kind === 'primary') inp.a = 1;
      else inp.e = 1;
      this.ws.send(JSON.stringify(Object.assign({ t: 'in' }, inp)));
    } else if (this.localSim) {
      const inp = this.calcInput();
      if (kind === 'primary') inp.a = 1;
      else inp.e = 1;
      this.localSim.input(this.myId, inp);
    }
  }

  private calcInput(): ClientInput {
    let dx = 0, dy = 0;
    if (this.keys['w'] || this.keys['arrowup']) dy -= 1;
    if (this.keys['s'] || this.keys['arrowdown']) dy += 1;
    if (this.keys['a'] || this.keys['arrowleft']) dx -= 1;
    if (this.keys['d'] || this.keys['arrowright']) dx += 1;

    // Aim toward mouse relative to center of screen
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const mx = this.mouseX - cx;
    const my = this.mouseY - cy;

    return {
      s: ++this.seq,
      x: dx !== 0 || dy !== 0 ? dx : mx,
      y: dx !== 0 || dy !== 0 ? dy : my,
      sp: this.keys['shift'] ? 1 : 0,
      a: this.keys[' '] ? 1 : 0,
      e: this.keys['e'] ? 1 : 0
    };
  }

  private handleSnapshot(s: any) {
    this.entities = s.e || [];
    this.bars = s.b || [];
    this.gates = s.g || [];
    this.rd = s.rd || this.rd;

    if (s.me) {
      this.myEntity = s.me;
      this.cam.x += (s.me.x - this.cam.x) * 0.2;
      this.cam.y += (s.me.y - this.cam.y) * 0.2;
      this.onScoreUpdate?.(s.me.score, s.me.k);
    }

    if (s.fx) {
      for (const f of s.fx) {
        const [k, x, y, a, b] = f;
        if (k === 'pop') {
          SFX.pop();
          this.particles.push({ x, y: y - 20, vx: 0, vy: -25, life: 1.0, max: 1.0, txt: '+1', c: '#a5d6a7' });
        } else if (k === 'hit') {
          SFX.thwack();
          this.cam.shake = 0.5;
          this.particles.push({ x, y: y - 30, vx: 0, vy: -30, life: 0.8, max: 0.8, txt: 'DHISHOOM!', c: '#ffeb3b', s: 16 });
        } else if (k === 'say') {
          this.bubbles.push({ id: a, txt: b, x, y, life: 2.5 });
        } else if (k === 'ring') {
          this.particles.push({ x, y, vx: 0, vy: 0, life: 0.8, max: 0.8, ring: true, R: a || 200 });
        } else if (k === 'over') {
          SFX.whistle();
          this.onGameOver?.(a === 'P' ? 'Protesters Reached Jantar Mantar!' : 'Dilli Police Cleared the Streets!');
        }
      }
    }
  }

  private loop = () => {
    if (!this.running) return;

    if (this.mode === 'online') {
      this.sendOnlineInput();
    }

    // Decay camera shake
    if (this.cam.shake > 0) {
      this.cam.shake = Math.max(0, this.cam.shake - 0.05);
    }

    // Update speech bubbles
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      this.bubbles[i].life -= DT;
      if (this.bubbles[i].life <= 0) this.bubbles.splice(i, 1);
    }

    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= DT;
      p.x += p.vx * DT;
      p.y += p.vy * DT;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    this.renderer.render(
      this.cam,
      this.entities,
      this.bars,
      this.gates,
      this.particles,
      this.bubbles,
      this.myEntity,
      this.rd
    );

    this.animFrame = requestAnimationFrame(this.loop);
  };
}
