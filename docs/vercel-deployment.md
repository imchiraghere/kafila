# Vercel Deployment Guide — Jantar Mantar Chalo

This guide explains how to deploy **Jantar Mantar Chalo** to **Vercel** with full offline & online multiplayer support.

---

## 1. Architecture Overview

- **Frontend (`apps/web`)**: Next.js 14 App Router, HTML5 Canvas renderer, procedural Web Audio API, and built-in client simulation. **100% optimized for Vercel.**
- **Backend Server (`apps/server`)**: 30 Hz authoritative simulation and 15 Hz WebSocket broadcaster (`ws`). Because Vercel is a serverless environment (stateless request/response lambdas), persistent WebSocket servers run on container platforms like **Railway**, **Render**, or **Fly.io**.
- **Offline / Practice Mode**: Works **100% out-of-the-box on Vercel** with zero backend required. AI bots, physics, combat, audio, and the interactive tactical map all run natively inside the browser via WebAssembly/Web Workers/JS.

---

## 2. Deploying to Vercel (Step-by-Step)

### Step 1: Push Project to GitHub / GitLab / Bitbucket
Ensure your monorepo contains:
- `vercel.json` (configured at root)
- `apps/web/`
- `packages/shared/`
- `packages/game-core/`

### Step 2: Import into Vercel
1. Log in to [vercel.com](https://vercel.com/) and click **"Add New..." → "Project"**.
2. Select your Git repository.
3. In **Project Settings**:
   - **Framework Preset**: Next.js
   - **Root Directory**: `.` (leave as default root, or set to `apps/web`)
   - **Build Command**: `npm run build` (automatic via `vercel.json`)
   - **Output Directory**: `apps/web/.next` (automatic via `vercel.json`)

### Step 3: Configure Environment Variables (Optional for Online Server)
In the Vercel project dashboard under **Settings → Environment Variables**, add:

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_WS_URL` | WebSocket URL for live multiplayer | `wss://jantar-mantar-server.up.railway.app/ws` |
| `NEXT_PUBLIC_SERVER_HTTP_URL` | HTTP API URL for server /status | `https://jantar-mantar-server.up.railway.app` |

> [!NOTE]
> If you do not configure these environment variables, the game automatically runs in **Offline Practice Mode** (full game with AI bots) and will not throw errors.

### Step 4: Click "Deploy"
Vercel will compile the shared packages and the Next.js bundle. Once complete, you will receive your live URL (e.g. `https://your-game.vercel.app`).

---

## 3. Deploying the Online WebSocket Server (Optional)

If you want live multi-user online matches across internet players, host `apps/server` on a free/affordable container host:

### Deploying to Railway:
1. Create a new project on [Railway.app](https://railway.app).
2. Connect the same repository.
3. Set the start command:
   ```bash
   node apps/server/dist/index.js
   ```
4. Copy the public Railway URL (e.g. `https://my-server.up.railway.app`).
5. Set `NEXT_PUBLIC_SERVER_HTTP_URL` and `NEXT_PUBLIC_WS_URL` in Vercel as shown above.

---

## 4. Pre-Deployment Verification

All build and runtime tests have been completed:
- `npm run build` exits with code `0`.
- All routes and static pages generated.
- Footer displays: **Design & Developed by Boogiy Man · © 2026 Boogiy Man · All Rights Reserved.**
- Author metadata tags included: `<meta name="author" content="Boogiy Man" />`.
