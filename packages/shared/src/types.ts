export type Team = 'P' | 'C'; // P = Protester (Andolankari), C = Police (Dilli Police)
export type ControlType = 'human' | 'bot' | 'npc';

export interface Point {
  x: number;
  y: number;
}

export interface Mudda {
  k: string;
  n: string;
  e: string;
  c: string;
  sl: string[];
  ch: string[];
}

export interface Road {
  n: string;
  w: number;
  spoke?: number;
  p: [number, number][];
  L?: number[];
  len?: number;
  bb?: [number, number, number, number];
}

export interface Ring {
  x: number;
  y: number;
  r: number;
  w: number;
}

export interface Park {
  t: 'c' | 'r';
  x: number;
  y: number;
  r?: number;
  w?: number;
  h?: number;
  n?: string;
  forest?: number;
  ground?: number;
}

export interface Building {
  x: number;
  y: number;
  w: number;
  h: number;
  H: number;
  c: string;
  roof: string;
  wall: string;
  shop: string | null;
  poster: string | null;
  sign: string;
  tank: boolean;
  tx: number;
  ty: number;
  dish: boolean;
  solar: boolean;
  laundry: boolean;
  ac: number;
  paan: boolean;
  seed: number;
}

export interface Barricade {
  id: number;
  x: number;
  y: number;
  ang: number;
  tx: number;
  ty: number;
  nx: number;
  ny: number;
  len: number;
  x1: number;
  y1: number;
  hp: number;
  max: number;
  up: boolean;
  nPush: number;
  nHold: number;
  armor: number;
  ttl: number;
  rebuild: number;
  downT: number;
  name: string;
  pushers: number[];
  check?: boolean;
  cordon?: boolean;
}

export interface Gate {
  ang: number;
  w: number;
  road: string;
  nx: number;
  ny: number;
  tx: number;
  ty: number;
  x: number;
  y: number;
  ox: number;
  oy: number;
  ix: number;
  iy: number;
  half: number;
  name: string;
}

export interface GateState {
  hp: number;
  max: number;
  armor: number;
  up: boolean;
  rebuild: number;
  nPush: number;
  nHold: number;
  crowd: number;
  pushers: number[];
}

export interface ClientInput {
  s: number; // sequence
  x: number; // aim/dir x
  y: number; // aim/dir y
  sp: number; // sprint 1/0
  a: number; // action 1/0 (slogan or lathi)
  e: number; // secondary action (lift / tear gas)
  g?: [number, number];
  q?: number;
  ff?: number;
  f?: number;
  r?: number;
  aim?: number;
}

export interface NetMessage {
  t: string;
  [key: string]: any;
}

export interface EntitySnapshot {
  id: number;
  team: Team;
  x: number;
  y: number;
  vx: number;
  vy: number;
  face: number;
  ctl: ControlType;
  state: string;
  score: number;
  streak: number;
  mud: number;
  followers?: number;
  name?: string;
  role?: string;
}
