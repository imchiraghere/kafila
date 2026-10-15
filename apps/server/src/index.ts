import http from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';

// Use the exact authentic simulation engine
const { createSim } = require('./shared/sim.js');

const PORT = parseInt(process.env.PORT || '4000', 10);

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

app.get('/status', (_req, res) => {
  const roomList = Array.from(rooms.entries()).map(([id, r]) => ({
    id,
    players: r.clients.length,
    round: r.sim.S.round ? r.sim.S.round.num : 1,
    timeLeft: Math.round(r.sim.S.round ? r.sim.S.round.t : 0)
  }));
  res.json({
    players: clients.size,
    rooms: rooms.size,
    roomList
  });
});

app.get('/api/info', (_req, res) => {
  res.json({
    title: 'Jantar Mantar Chalo Multiplayer Server',
    author: 'Boogiy Man',
    version: '1.0.0',
    rooms: rooms.size,
    clients: clients.size
  });
});

app.get('/api/rooms', (_req, res) => {
  const roomData = Array.from(rooms.entries()).map(([id, r]) => ({
    id,
    players: r.clients.length,
    over: r.sim.S.round ? r.sim.S.round.over : false,
    timeLeft: Math.round(r.sim.S.round ? r.sim.S.round.t : 0)
  }));
  res.json({ rooms: roomData });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

interface ClientSession {
  ws: WebSocket;
  id: number;
  roomId: string;
  name: string;
  team: 'P' | 'C';
  mud: number;
  view: { w: number; h: number };
  cl: { fxTick: number; barsVer?: number; namesVer?: number; mmT?: number; lbT?: number };
}

interface Room {
  id: string;
  sim: any;
  clients: ClientSession[];
  simTimer: NodeJS.Timeout;
  netTimer: NodeJS.Timeout;
  emptySince?: number;
}

const rooms = new Map<string, Room>();
const clients = new Map<WebSocket, ClientSession>();

function sanitizeRoomId(raw: any): string {
  if (typeof raw !== 'string') return 'main';
  const clean = raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
  return clean || 'main';
}

function getOrCreateRoom(rawId = 'main'): Room {
  const roomId = sanitizeRoomId(rawId);
  let r = rooms.get(roomId);
  if (r) {
    r.emptySince = undefined;
    return r;
  }

  const sim = createSim({ roundTime: 480, minP: 6, minC: 5 });
  const clientsList: ClientSession[] = [];

  const room: Room = {
    id: roomId,
    sim,
    clients: clientsList,
    simTimer: null as any,
    netTimer: null as any
  };

  // 30 Hz simulation tick loop
  room.simTimer = setInterval(() => {
    try {
      sim.step();
    } catch (e) {
      console.error(`[Room ${roomId}] Simulation step error:`, e);
    }
  }, 1000 / 30);

  // 15 Hz network broadcast loop
  room.netTimer = setInterval(() => {
    try {
      for (let i = room.clients.length - 1; i >= 0; i--) {
        const c = room.clients[i];
        if (c.ws.readyState === WebSocket.OPEN) {
          const snap = sim.snapshot(c.id, c.view, c.cl);
          snap.t = 's';
          snap.tk = sim.S.tick;
          c.ws.send(JSON.stringify(snap));
        } else if (c.ws.readyState === WebSocket.CLOSED || c.ws.readyState === WebSocket.CLOSING) {
          room.clients.splice(i, 1);
          sim.removePlayer(c.id);
          clients.delete(c.ws);
          if (room.clients.length === 0 && room.id !== 'main') {
            room.emptySince = Date.now();
          }
        }
      }
    } catch (e) {
      console.error(`[Room ${roomId}] Network broadcast error:`, e);
    }
  }, 1000 / 15);

  rooms.set(roomId, room);
  return room;
}

// Cleanup idle custom rooms every 30 seconds
setInterval(() => {
  const now = Date.now();
  for (const [id, r] of rooms.entries()) {
    if (id !== 'main' && r.clients.length === 0 && r.emptySince && now - r.emptySince > 90000) {
      clearInterval(r.simTimer);
      clearInterval(r.netTimer);
      rooms.delete(id);
      console.log(`[Room ${id}] Idle room pruned`);
    }
  }
}, 30000);

wss.on('connection', (ws) => {
  let session: ClientSession | null = null;

  ws.on('message', (data) => {
    let msg: any;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    if (msg.t === 'join') {
      const roomId = sanitizeRoomId(msg.room);
      const room = getOrCreateRoom(roomId);
      const team = msg.team === 'C' ? 'C' : 'P';
      const name = (msg.name || '').slice(0, 18);
      const mud = Number.isInteger(msg.mud) ? msg.mud : 0;

      const player = room.sim.addPlayer(name, team, false, mud);
      session = {
        ws,
        id: player.id,
        roomId: room.id,
        name: player.name,
        team,
        mud,
        view: { w: 1200, h: 900 },
        cl: { fxTick: 0 }
      };

      clients.set(ws, session);
      room.clients.push(session);

      ws.send(JSON.stringify({
        t: 'welcome',
        id: player.id,
        room: room.id,
        info: room.sim.staticInfo(),
        spawn: {
          x: player.x,
          y: player.y,
          spawnName: player.spawnName || '',
          team: player.team,
          mud: player.mud
        }
      }));

      // Immediately send first snapshot so the client doesn't have a blank window
      const firstSnap = room.sim.snapshot(player.id, session.view, session.cl);
      firstSnap.t = 's';
      firstSnap.tk = room.sim.S.tick;
      ws.send(JSON.stringify(firstSnap));
      return;
    }

    if (!session) return;
    const room = rooms.get(session.roomId);
    if (!room) return;

    if (msg.t === 'in') {
      room.sim.input(session.id, msg);
    } else if (msg.t === 'team') {
      const team = msg.team === 'C' ? 'C' : 'P';
      session.team = team;
      session.mud = Number.isInteger(msg.mud) ? msg.mud : 0;
      room.sim.setTeam(session.id, team, session.mud);
    } else if (msg.t === 'switchRoom') {
      const targetRoomId = sanitizeRoomId(msg.room);
      if (targetRoomId !== session.roomId) {
        const oldRoom = rooms.get(session.roomId);
        if (oldRoom) {
          const idx = oldRoom.clients.indexOf(session);
          if (idx !== -1) oldRoom.clients.splice(idx, 1);
          oldRoom.sim.removePlayer(session.id);
          if (oldRoom.clients.length === 0 && oldRoom.id !== 'main') {
            oldRoom.emptySince = Date.now();
          }
        }
        const newRoom = getOrCreateRoom(targetRoomId);
        const player = newRoom.sim.addPlayer(session.name, session.team, false, session.mud);
        session.id = player.id;
        session.roomId = newRoom.id;
        newRoom.clients.push(session);
        ws.send(JSON.stringify({
          t: 'welcome',
          id: player.id,
          room: newRoom.id,
          info: newRoom.sim.staticInfo(),
          spawn: {
            x: player.x,
            y: player.y,
            spawnName: player.spawnName || '',
            team: player.team,
            mud: player.mud
          }
        }));
        const firstSnap = newRoom.sim.snapshot(player.id, session.view, session.cl);
        firstSnap.t = 's';
        firstSnap.tk = newRoom.sim.S.tick;
        ws.send(JSON.stringify(firstSnap));
      }
    } else if (msg.t === 'view') {
      session.view = { w: msg.w || 1200, h: msg.h || 900 };
    } else if (msg.t === 'ping') {
      ws.send(JSON.stringify({ t: 'pong', c: msg.c }));
    }
  });

  ws.on('close', () => {
    if (session) {
      const room = rooms.get(session.roomId);
      if (room) {
        const idx = room.clients.indexOf(session);
        if (idx !== -1) {
          room.clients.splice(idx, 1);
        }
        room.sim.removePlayer(session.id);
        if (room.clients.length === 0 && room.id !== 'main') {
          room.emptySince = Date.now();
        }
      }
      clients.delete(ws);
      session = null;
    }
  });

  ws.on('error', () => {
    ws.close();
  });
});

server.listen(PORT, () => {
  console.log(`[Mantar Jantar Server] HTTP and WebSocket listening on http://localhost:${PORT}`);
});
