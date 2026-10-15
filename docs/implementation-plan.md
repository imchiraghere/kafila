# Implementation Plan: Mantar Jantar Recreation

## 1. Project Organization & Safety
To preserve all existing CRM projects (`cosmify-crm-api` and `cosmify-crm-webapp`) in the workspace, the new game codebase is organized cleanly into modular packages/apps as specified in the prompt:
```
/Volumes/EXTRA_STORE/crm/
├── docs/                        # Specifications and reference analyses
├── packages/
│   ├── shared/                  # Common math, world constants, roads, types, protocol
│   └── game-core/               # Deterministic game simulation, physics, AI bots
└── apps/
    ├── web/                     # Next.js 14 / React 18 / TypeScript frontend & Canvas renderer
    └── server/                  # Node.js / Express / WebSockets multiplayer server
```

---

## 2. Technical Stack & Dependencies

- **Frontend (`apps/web`)**:
  - Framework: Next.js (with React, TypeScript)
  - Styling: Pure modern CSS with Indian tricolor accents, glassmorphic HUD, responsive layout
  - Game Engine: 60 FPS HTML5 Canvas renderer with decoupled requestAnimationFrame loop
  - Audio: Native browser Web Audio API procedural sound engine
  - Offline Practice: Runs client-side local instance of `game-core` simulation
- **Backend (`apps/server`)**:
  - Runtime: Node.js with TypeScript
  - HTTP Server: Express for health check, room info, and diagnostics
  - Realtime: `ws` (WebSockets) supporting room management, client synchronization at 15 Hz, binary/JSON delta compression, and client prediction reconciliation
- **Shared Libraries (`packages/shared` & `packages/game-core`)**:
  - Deterministic 30 Hz tick simulation
  - BFS navigation grid & pathfinding for 40x40m grid cells
  - Continuous collision resolution for 2200 buildings, 18 gates, and barricades

---

## 3. Phase-by-Phase Roadmap

### Step 1: Shared Core & World Geography (`packages/shared` & `packages/game-core`)
- Implement `world.ts`: Delhi road network, Connaught Place circles, Jantar Mantar coordinates, Section 163 zone, Yamuna river curve, 2200 procedural buildings, and spatial grid index.
- Implement `sim.ts`: Authoritative room simulation with 30 Hz physics, player state, kafila follower management, lathi collision, tear gas smoke particle diffusion, barricade pushing, and AI bot navigation.

### Step 2: Web Application & Canvas Renderer (`apps/web`)
- Create landing page UI matching `mantarjantar.com` with name input, role cards (Andolankari vs Dilli Police), 9 mudda chips, and audio controls.
- Implement HTML5 Canvas 2D renderer:
  - Procedural character generator with directional walking animations, customizable skin tones, shirts, and placards.
  - Procedural vehicles (DTC police buses, food delivery motorbikes).
  - Procedural city scenery (Connaught Place white colonnades, multi-story buildings, paan stalls, signage, trees).
  - Particle systems: confetti, dust, tear gas clouds, flying chappals, punch shockwaves.
  - HUD: Mini-map radar, news ticker with satire headlines, score tracker, wanted level stars, dharna meter, and touch controls.
- Implement Web Audio synthesizer:
  - Lathi thwacks, whistles, crowd cheering, chants, vocalizations, and dholak beats.
- Implement Local offline practice loop:
  - Immediate zero-latency singleplayer against AI police and AI protesters.

### Step 3: Multiplayer Server (`apps/server`)
- Implement WebSocket server supporting rooms, client connections, inputs, snapshots, and reconnection handling.
- Authoritative state synchronization broadcasting at 15 Hz with tick interpolation.

### Step 4: Verification & Testing
- Validate TypeScript compilation across all packages and apps.
- Test offline singleplayer mode and controls.
- Test online multiplayer room flow and snapshot replication.
