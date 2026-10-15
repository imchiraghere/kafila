# Kafila (Jantar Mantar Chalo) — Multiplayer Satire Game ✊🚧👮

[![Author](https://img.shields.io/badge/Author-Chirag%20Soni%20(Boogiy%20Man)-FF6F00?style=for-the-badge&logo=github)](https://github.com/imchiraghere)
[![GitHub Repo](https://img.shields.io/badge/GitHub-kafila-181717?style=for-the-badge&logo=github)](https://github.com/imchiraghere/kafila)
[![Framework](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com)

> **Designed & Developed by [Chirag Soni (Boogiy Man)](https://github.com/imchiraghere)**  
> *A top-down, real-time multiplayer and offline satirical browser arcade game recreating the Delhi protest dynamics.*

---

## 1. Project Overview & Deliverables

- **Reference Analysis**: Detailed inspection of the live website, DOM structure, canvas rendering, audio synthesis, and network protocol in [docs/reference-analysis.md](file:///Volumes/EXTRA_STORE/crm/docs/reference-analysis.md).
- **Gameplay Specification**: Complete mathematical mechanics, roles, movement, collision, barricades, and scoring in [docs/gameplay-spec.md](file:///Volumes/EXTRA_STORE/crm/docs/gameplay-spec.md).
- **Asset Inventory**: Procedural graphics and Web Audio API synthesis catalog in [docs/asset-inventory.md](file:///Volumes/EXTRA_STORE/crm/docs/asset-inventory.md).
- **Implementation Plan**: Architecture and phased roadmap in [docs/implementation-plan.md](file:///Volumes/EXTRA_STORE/crm/docs/implementation-plan.md).
- **Environment Example**: Configuration template in [.env.example](file:///Volumes/EXTRA_STORE/crm/.env.example).

---

## 2. Monorepo Architecture

```
/Volumes/EXTRA_STORE/crm/
├── docs/
│   ├── reference-analysis.md    # Tooling findings and reference analysis
│   ├── gameplay-spec.md         # Full gameplay formulas and rule set
│   ├── asset-inventory.md       # Zero-footprint procedural asset catalog
│   └── implementation-plan.md   # Phased implementation plan
├── packages/
│   ├── shared/                  # World map, constants, types, math utilities
│   │   ├── src/
│   │   │   ├── constants.ts     # 9 authentic muddas, news headlines, world dimensions
│   │   │   ├── world.ts         # Delhi road network, 2200 buildings, collision hash grid
│   │   │   └── types.ts         # TypeScript data contracts & network protocol
│   └── game-core/               # Deterministic 30 Hz simulation engine
│       └── src/
│           └── sim.ts           # Authoritative state machine, bots, and combat
└── apps/
    ├── web/                     # Next.js 14 frontend & HTML5 Canvas renderer (Port 3001)
    │   └── src/
    │       ├── app/             # App Router pages and global CSS
    │       ├── components/      # LandingMenu, GameView HUD
    │       └── game/            # Procedural renderer, Web Audio synths, client controller
    └── server/                  # Node.js + Express + WebSocket server (Port 4000)
        └── src/
            ├── index.ts         # Room manager, 15 Hz snapshot broadcaster
            └── test-client.ts   # Automated multi-client synchronization test
```

---

## 3. Verified Features

- [x] **Visual Design Parity**: Indian tricolor top border strip, parchment cream card (`#f6eedd`), Delhi greenery background (`#8fae63`), and Saffron buttons.
- [x] **Role Selection**: Andolankari (Protester ✊) and Dilli Police (👮) with distinct controls and descriptions.
- [x] **9 Authentic Social Causes (Muddas)**:
  - 📚 Paper Leak (`#1565c0`)
  - 💼 Berozgari (`#6a1b9a`)
  - ⛽ E20 Petrol (`#2e7d32`)
  - 🗳️ Vote Chori (`#ad1457`)
  - 😷 Saans (AQI) (`#607d8b`)
  - 🌾 MSP (`#f9a825`)
  - 👴 Purani Pension (`#795548`)
  - 🕳️ Gaddhe (`#5d4037`)
  - 🍅 Mehngai (`#d32f2f`)
- [x] **Delhi World Map**:
  - 6000 × 6000 px world space
  - Connaught Place (Inner, Middle, Outer Rings)
  - Jantar Mantar with 5 dharna mats
  - Section 163 security cordon with directional gates
  - 2,200 procedurally generated buildings with shops, signs, and posters
  - River Yamuna with passable bridges
- [x] **Combat & Crowd Mechanics**:
  - Protesters recruit neutral civilians into their kafila (up to 25 followers).
  - Slogans (Naara) emit radial shockwaves rallying followers and gaining points.
  - Delhi Police lathi swings hit in directional arcs, scattering crowds and knocking off chappals.
  - Tear gas canisters launch and create smoke clouds draining stamina.
- [x] **Audio System**:
  - 100% procedural Web Audio API synthesis (oscillators, biquad filters, and noise).
  - Whistles, vehicle horns, lathi thwacks, cartoon vocal grunts ("aiyo!"), crowd murmurs, and cheering.
- [x] **Satirical News Ticker**:
  - Scrolling bottom banner featuring authentic Delhi satire headlines.
- [x] **Dual-Mode Gameplay**:
  - **Online**: Authoritative WebSocket room replication with client reconciliation.
  - **Offline Practice**: Runs local simulation in-browser against AI bots with zero latency.
- [x] **Mobile Controls**:
  - Touch action buttons (`NAARA`, `PUSH`, `RALLY`, `DASH`).

---

## 4. Setup & Running Instructions

### Prerequisites
- Node.js >= 18 (Tested on Node v25.2.1)
- npm >= 9

### Installation
```bash
npm install
npm run build
```

### Starting the Backend Server
```bash
npm --workspace=apps/server run dev
# Or run built server:
node apps/server/dist/index.js
```
The server runs on `http://localhost:4000` with WebSocket on `ws://localhost:4000/ws`.

### Starting the Frontend Web App
```bash
npm --workspace=apps/web run dev
# Or run production build:
npm --workspace=apps/web run start
```
The web app runs on `http://localhost:3001` (configured on 3001 to avoid colliding with any services on 3000).

### Running Integration Tests
```bash
npx tsx apps/server/src/test-client.ts
```
### Deploying to Vercel
See the complete guide in [docs/vercel-deployment.md](file:///Volumes/EXTRA_STORE/crm/docs/vercel-deployment.md).
- Ready out of the box with `vercel.json`.
- Automatic build and static generation with Next.js 14.
- Runs 100% offline with zero configuration; connect `NEXT_PUBLIC_WS_URL` to your backend for live multiplayer.

---

## 5. Verification & Test Results

| Test Case | Description | Result |
| :--- | :--- | :--- |
| **Shared Package Build** | TypeScript compilation of `@mantar-jantar/shared` | **PASSED** |
| **Game Core Build** | TypeScript compilation of `@mantar-jantar/game-core` | **PASSED** |
| **Server Build** | TypeScript compilation of `@mantar-jantar/server` | **PASSED** |
| **Web Production Build** | Next.js 14 static page generation & bundle optimization | **PASSED** |
| **Server Health Endpoint** | `GET http://localhost:4000/health` | **PASSED** |
| **Server Room Diagnostic** | `GET http://localhost:4000/api/rooms` | **PASSED** |
| **Web HTTP Response** | `GET http://localhost:3001/` | **PASSED** (200 OK) |
| **Multiplayer WebSocket Test** | Simultaneous 2-player join, input stream & snapshot exchange | **PASSED** |

---

## 6. Known Limitations & Next Steps

1. **Browser Subagent Driver Issue**: Playwright driver v1.57.0 on macOS arm64 failed upstream download from Azure Edge. The game was validated via standard headless HTTP verification and integration test runners.
2. **Additional Satirical Events**: Future enhancements could expand additional mini-events such as Water Cannons and Delhi Fog/Smog visual fog shaders.

---

## 7. Author & Credits

- **Creator & Lead Developer**: **[Chirag Soni (Boogiy Man)](https://github.com/imchiraghere)**
- **GitHub Profile**: [@imchiraghere](https://github.com/imchiraghere)
- **Email**: `chirag7049959351@gmail.com`
- **Repository**: [https://github.com/imchiraghere/kafila](https://github.com/imchiraghere/kafila)

---

## 8. License & Copyright

**Copyright © 2026 Boogiy Man. All Rights Reserved.**  
*Satire game. All characters, locations, events, shops, and brands depicted in the game are fictional.*
