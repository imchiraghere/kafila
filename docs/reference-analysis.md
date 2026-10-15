# Reference Analysis: Mantar Jantar (Jantar Mantar Chalo)

## 1. REA MCP & Tooling Discovery (Phase 1 Report)

### 1.1 REA MCP Capabilities Evaluation
We evaluated the available tools exposed by the Reverse-Engineering Anything (REA) MCP server:
- **`list_browser_targets` & `inspect_web_page`**: Designed for passive loopback inspection via Chrome DevTools Protocol (`cdp_endpoint: http://127.0.0.1:PORT`). They do not accept remote URLs directly or initiate arbitrary outbound internet connections.
- **`analyze_web_bundle`**: Takes a local CDP target and statically extracts bundle chunks, routes, and WebMCP metadata.
- **`recover_javascript_sources`**: Requires local JavaScript files on disk and an x64 Linux runtime with Wakaru; not applicable directly for live remote websites.
- **REA Binary Tools** (`open_binary`, `inspect_binary_layout`, `procedure_assembly`): Designed for local executable binaries (Mach-O, ELF, PE, WASM), not remote HTTP websites.

### 1.2 Inspection Strategy & Environment Safe Fallback
1. **Interactive Browser Verification**: When launching `browser_subagent` on macOS ARM64, the Playwright driver installation failed due to an upstream Azure Edge 404 response (`playwright-1.57.0-mac-arm64.zip`).
2. **Direct Public Web Inspection**: Using Antigravity's HTTP extraction capabilities, we retrieved and examined the full, unminified public web resources directly from `https://mantarjantar.com/`:
   - `https://mantarjantar.com/` (Landing HTML & CSS)
   - `https://mantarjantar.com/shared/world.js` (Deterministic Delhi World Geography, Road Network, Building Generation, and Collision Math)
   - `https://mantarjantar.com/shared/sim.js` (Authoritative Game Simulation, Pathfinding, State Machine, AI Bots, and Combat/Crowd Logic)
   - `https://mantarjantar.com/client.js` (Canvas Rendering Engine, Web Audio Procedural Synthesizer, Camera Interpolation, Input Handling, and WebSocket Networking)

---

## 2. Reference Website Architecture & Visual Design

### 2.1 Visual Hierarchy & Aesthetic Style
- **Theme**: Satirical political-arcade browser game set in Central Delhi (Connaught Place to Jantar Mantar).
- **Color Palette**:
  - Background (Delhi Greenery / Grass): `#8fae63`
  - Indian Tricolor Strip: Saffron (`#ff9933`), White (`#ffffff`), Green (`#138808`)
  - Ink & Text: `#1d1a16` (Deep warm charcoal)
  - Card & Paper: `#f6eedd` (Parchment cream)
  - Accent Red: `#c0392b`
  - Police Blue: `#1f4e9c`
  - Button Gradient: `linear-gradient(90deg, #ff7f11, #ff9933)` with 3D button shadow `#b35900`
- **Typography**: `"Segoe UI", system-ui, -apple-system, Roboto, sans-serif`
  - Main Title: Bold sans-serif with clamp sizing (`clamp(32px, 6.5vw, 54px)`), tight letter-spacing (`-1.5px`).
  - Subtitle: Hindi script `"जंतर मंतर चलो! ✊🚧👮 · Multiplayer"`.

### 2.2 Landing UI Components & States
1. **Main Modal Card (`#menu`)**:
   - Centered overlay with radial gradient backdrop `radial-gradient(ellipse at center, rgba(30,20,10,.35), rgba(20,12,5,.82))`.
   - Top 9px tricolor accent border.
   - Max width: 720px, rounded corners (18px), drop shadow `0 20px 60px rgba(0,0,0,.5)`.
2. **Player Name Input (`#name`)**:
   - Max length: 18 characters.
   - Placeholder: `"Your name (e.g. Bunty from Burari)"`.
   - Cream border `#d8c7a8` turning Saffron on focus.
3. **Role Selector (`.roles`)**:
   - Two selectable cards:
     - **Andolankari (Protester)**: Icon `✊`. Tagline: *"Walk into people to grow your kafila. Reach Jantar Mantar."*
     - **Dilli Police**: Icon `👮`. Tagline: *"Break kafilas with the lathi, lift leaders onto the bus. Watch out for big crowds!"*
   - Active state has tinted background (`#fff3e0` for Protester, `#e8f0ff` for Police) and ring shadow.
4. **Muddas (Causes/Issues Chips)**:
   - 9 selectable issues (Paper Leak, Berozgari, E20 Petrol, Vote Chori, Saans/AQI, MSP, Purani Pension, Gaddhe, Mehngai).
   - Each chip has an emoji, custom theme color, slogans, and Hindi chants.
5. **Action Buttons**:
   - `PLAY ONLINE ▶`: Primary large orange button (connects to WebSocket server `/ws`).
   - `Practice offline`: Neutral secondary button (initializes the simulation locally in the browser).
6. **Status & Instructions**:
   - Server connectivity indicator (`#status`).
   - Keyboard cheatsheet: `<kbd>M</kbd> mute`, `<kbd>Q</kbd> graphics`, `<kbd>T</kbd> switch team`, `<kbd>Esc</kbd> menu`.
   - Satirical disclaimer: *"Satire. All characters, shops and brands are fictional. 🤖 = AI player."*
7. **Mobile Controls (`#mob`)**:
   - Four circular touch buttons for mobile screens:
     - `bAct`: NAARA (Shout slogan / cheer)
     - `bE`: LIFT (Police lift leader onto bus / interact)
     - `bGas`: GAS (Throw tear gas)
     - `bRun`: DASH (Sprint boost)

---

## 3. Client Engine & Runtime Architecture

### 3.1 Dual-Mode Architecture (Online + Offline)
- **Offline Practice**: Instantiates `Sim.createSim()` directly within `Local` client class using `setInterval(pump, 1000/60)` with fixed tick simulation rate (`30 Hz`), enabling instant zero-latency singleplayer without a backend server.
- **Online Multiplayer**: Connects via `WebSocket` to `/ws`, sending player viewports, input commands (direction vector, action buttons, sprint), and receiving authoritative state snapshots at 15 Hz with client prediction and reconciliation.

### 3.2 Procedural Rendering & Audio
- **Zero Heavy Assets**: The target site loads **zero external PNG, JPG, or audio files**. Everything is procedurally generated:
  - 2D Canvas vector drawing for all sprites, buildings, trees, vehicles, and particles.
  - Web Audio API oscillators, bandpass biquad filters, and noise buffer generators for all sound effects (lathi thwack, crowd murmurs, police sirens, whistles, slogans, and cheers).
