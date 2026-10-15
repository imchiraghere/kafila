# Asset Inventory: Mantar Jantar

## 1. Asset Strategy & Licensure

The reference implementation `mantarjantar.com` uses **zero proprietary external raster images, models, or recorded audio files**. Everything is created natively at runtime through mathematical vectors on HTML5 Canvas and procedural sound waves via the browser's Web Audio API.

Our independent recreation adheres 100% to clean-room engineering best practices:
- **No copyright encumbrance**: All visual drawings and audio synthesizers are written as modern, modular TypeScript vector drawing routines and audio synthesis nodes.
- **Ultra-lightweight**: The total asset footprint is **0 bytes** of binary assets, guaranteeing sub-second load times on any network.

---

## 2. Visual & Sprite Inventory

### 2.1 Character Sprites (Canvas 2D Procedural Generation)
All characters are rendered dynamically at customizable scale with directional flipping, walking bob animation, and distinct equipment:
- **Protester (Gen Z / Student / Citizen / Kisan / Uncle / Aunty)**:
  - 5 skin tone variants (`#c98a55`, `#b8784a`, `#d9a06b`, `#a86b40`, `#e0b084`).
  - Clothing combinations (hoodies, kurtas, jackets, jeans) based on procedural RNG seed.
  - Accessories: Placards with chosen mudda slogan, backpacks, spectacles, gamchha.
- **Dilli Police Constable**:
  - Khaki uniform (`#c4a26c` top and `#a8875a` pants).
  - Delhi Police cap with red/blue band.
  - Wooden lathi with swinging animation.
- **Rapid Action Force (RAF)**:
  - Blue digital camouflage uniform (`#3f6fa8`).
  - Riot helmet with visor and protective shield.
- **Media Crew**:
  - Reporter with press card and boom microphone (`#f4f1ea` kurta, shoulder bag).
  - Cameraman with shoulder video camera (`#ff6f00` cap).
- **Chaiwala & Street Vendors**:
  - White kurta with gamchha headwrap and brass chai kettle.

### 2.2 Vehicles & Interactive Entities
- **DTC Police Bus**: Olive green/yellow Delhi Transport Corporation bus with barred windows and detention capacity.
- **Food Delivery Bike (Zomaato / Swiggi)**: Red or orange motorcycle with delivery box that navigates city roads.
- **Delhi Police Barricades**: Metal yellow-and-red frame with triangular legs, reflective warning tape, and Delhi Police stencil.
- **Section 163 Gates**: Heavy reinforced gate structures at road intersections leading into Connaught Place and Jantar Mantar.
- **Tear Gas Canister**: Spinning silver cylinder trailing expanding particulate smoke clouds.
- **Protest Mats (Dharna Dhari)**: Red-and-white patterned floor rugs at Jantar Mantar.

### 2.3 Environmental Buildings & Landmarks
- **Connaught Place Colonnades**: Georgian white circular colonnades with radial spokes.
- **Commercial Buildings**: 2200 procedural buildings with multi-story heights, pastel facades, water tanks (`Sintex`), satellite dishes, air conditioner outdoor units, and shop hoardings (*Sharma Sweets, Gupta Xerox, Raju Dhaba, IAS Coaching, etc.*).
- **Flora & Parks**: Procedural leafy trees with shaded canopy variations across Lodhi Garden and the Delhi Ridge.
- **Yamuna River**: Shimmering blue-gray water shader with bridge crossings.

---

## 3. Audio Inventory (Web Audio API Synthesizers)

All sound effects are synthesized mathematically in real time without external audio files:
1. **`SFX.whistle`**: Dual square-wave pulse with frequency sweep (2800–3000 Hz) simulating police whistle.
2. **`SFX.horn`**: Sawtooth oscillator (185 Hz -> 160 Hz) simulating Delhi traffic horn.
3. **`SFX.metro`**: Iconic Delhi Metro two-tone chime (880 Hz -> 660 Hz sine wave).
4. **`SFX.thwack`**: Square wave + burst noise simulating cartoon lathi impact.
5. **`SFX.whoosh`**: Bandpass filtered white noise (1800 Hz) for lathi swing.
6. **`SFX.pop` / `SFX.join`**: Upward pentatonic musical chime ladder (`[523, 587, 659, 784, 880, 1047, 1175, 1319] Hz`) as kafila recruits join.
7. **`SFX.ouch` / `vox`**: Dual-formant vowel resonant filter simulating cartoon vocalizations ("aiyo!", "oof!").
8. **`SFX.crowd` / `murmur`**: Continuous looping bandpass filtered noise whose volume scales dynamically with the player's kafila size.
9. **`SFX.dha` / `tin`**: Sine wave pitch drops combined with low-frequency noise simulating dholak and dharna beats.

---

## 4. Typography & System Fonts

- **Font Family**: `"Segoe UI", system-ui, -apple-system, Roboto, sans-serif`
- **Emoji Support**: Native OS color emoji for placard icons (📚, 💼, ⛽, 🗳️, 😷, 🌾, 👴, 🕳️, 🍅, ✊, 👮).
