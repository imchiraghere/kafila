# Gameplay Specification: Mantar Jantar

## 1. Core Concept & Objective

A top-down, real-time arcade simulation of protests in Central Delhi:
- **Protester (Andolankari) Objective**: Mobilize a large *kafila* (crowd), navigate Delhi streets, push through police barricades and Section 163 security cordons, reach **Jantar Mantar**, and hold the *dharna* on the protest mats to accumulate points before time runs out.
- **Police (Dilli Police) Objective**: Maintain law and order, disperse *kafilas* using lathis and tear gas, dismantle protest lines, detain protest leaders, and load them onto DTC police buses bound for Burari Ground.
- **Round Duration**: 480 seconds (8 minutes) per round.

---

## 2. World Space & Spatial Geometry

- **Coordinate System**: 6000 × 6000 pixels top-down Cartesian plane.
- **Connaught Place (CP)**: Centered at `(3000, 2000)` with 3 concentric rings (Inner Circle `r=225`, Middle Circle `r=385`, Outer Circle `r=560`).
- **Jantar Mantar (JM)**: Located at `(3300, 2950)` with inner sanctuary radius `r=150`.
- **Section 163 Exclusion Zone**: Circular boundary centered at `(3300, 2950)` with radius `R=340`.
  - Roads entering the zone have security gates (`GATE_DEFS`) that can be defended by police or forced open by protesters.
- **Yamuna River**: Procedural river curve on eastern edge (`riverL(y) = 5420 + 70*sin(y/520) + 40*sin(y/170 + 1)`) with passable bridges at `y=2650` (ITO Bridge) and `y=4000` (Noida Link).
- **Protester Spawn Points (Assembly Points)**:
  - DU North Campus, Singhu Border, Tikri Border, Ghazipur Border, JNU, Ramlila Maidan, Laxmi Nagar, Lajpat Nagar, Mukherjee Nagar, Kalkaji.
- **Police Spawn Points (Police Stations)**:
  - Parliament St PS, Tilak Marg PS, CP Police Station, Mandir Marg PS, Police HQ ITO, Kamla Market PS.
- **Metro Stations**: 15 stations (Rajiv Chowk, Patel Chowk, Mandi House, Central Secretariat, ITO, etc.).
- **Protest Pockets**: 24 locations across Delhi (student hostels, coaching centres, chai stalls, bus stops, dhabas) where uncommitted citizens gather.

---

## 3. Roles & Mechanics

### 3.1 Andolankari (Protester)
- **Base Speed**: 150 px/s (Sprint multiplier: 1.45× with stamina drain).
- **Kafila Building**:
  - Walking near unrecruited civilian NPCs pulls them into your kafila (up to a cap of 25 followers).
  - Kafila followers trail behind the leader, holding placards that match their chosen mudda.
  - Slogan Shouting (**NAARA / Click**): Emits an acoustic radial pulse (`R=260`) that rallies nearby neutrals, refreshes follower loyalty, and triggers chants.
- **Barricade Pushing**:
  - Yellow and red Delhi Police barricades block roads.
  - When protesters gather at a barricade, each protester adds push power.
  - If cumulative push power exceeds barricade resistance, the barricade topples over (`down = true`), opening the route.
- **Dharna Holding**:
  - 5 dharna mats are situated at Jantar Mantar.
  - Protesters sitting on mats earn continuous score points and fill the global Dharna Meter.
- **FIR Wanted Level (1 to 5 Stars)**:
  - Gained by increasing streak and protest activity (thresholds: 100, 250, 500, 850, 1300 pts).
  - Titles: "Suspicious element", "Urban Naxal", "Toolkit gang", "Tukde tukde", "100% ANTI-NATIONAL".
  - Multiplies score and kafila pull, but dispatches specialized police hunter units.

### 3.2 Dilli Police
- **Base Speed**: 150 px/s (Sprint multiplier: 1.45×).
- **Lathi Strike (Click / Space)**:
  - Wide arc melee attack (`swingT = 0.25s`).
  - Hits cause comic "DHISHOOM!" effects, send flip-flops flying, and stun protesters.
  - Direct hits on kafila followers scatter them and break the crowd cohesion.
- **Tear Gas (Right-Click / Q)**:
  - Launches a tear gas canister toward target coordinate.
  - Spawns expanding smoke cloud that slows protesters, drains stamina, and causes coughing.
- **Detention & Police Bus**:
  - Isolated protest leaders can be lifted onto DTC detention buses.
  - Buses transport detainees to Burari Ground, removing them from Central Delhi until they walk back or respawn.

---

## 4. Muddas (Causes & Plight System)

Protesters select 1 of 9 authentic social/satirical issues:
1. **Paper Leak** (📚 `#1565c0`): "NO PAPER LEAK!", "RE-EXAM KARAO"
2. **Berozgari** (💼 `#6a1b9a`): "NAUKRI DO", "DEGREE HAI JOB NAHI"
3. **E20 Petrol** (⛽ `#2e7d32`): "MILEAGE WAPAS DO", "ENGINE BACHAO"
4. **Vote Chori** (🗳️ `#ad1457`): "MERA VOTE KAHAN?", "VOTER LIST DIKHAO"
5. **Saans (AQI)** (😷 `#607d8b`): "SAANS LENE DO", "AQI 999?!"
6. **MSP** (🌾 `#f9a825`): "MSP GUARANTEE", "KISAN EKTA"
7. **Purani Pension** (👴 `#795548`): "PURANI PENSION", "OPS BAHAAL KARO"
8. **Gaddhe (Potholes)** (🕳️ `#5d4037`): "GADDHE BHARO", "ROAD YA POOL?"
9. **Mehngai** (🍅 `#d32f2f`): "TAMATAR ₹200?!", "CYLINDER SASTA KARO"

---

## 5. Dynamic Events & Satirical Elements

1. **Internet Shutdown**: Mobile data suspended; minimap is obscured and Naara range is halved.
2. **Metro Gates Closed**: DMRC closes key stations (Rajiv Chowk, Patel Chowk, ITO) forcing players onto the streets.
3. **Vajra Tear Gas Volley**: Anti-riot vehicle launches multiple tear gas shells at the largest crowd concentration.
4. **Viral Video Surge**: A protest clip trends on social media, doubling crowd recruitment for 30s.
5. **RAF Reinforcements**: Rapid Action Force jawans with riot shields arrive at Jantar Mantar gates.
6. **Street Life**:
   - **Zomaato / Swiggi Delivery Riders**: Motorbikes darting through traffic; players can hitch a quick ride.
   - **Lutyens' Monkeys**: Mischievous monkeys stealing snacks and power banks.
   - **Godi Media News Crew**: TV reporter with microphone shoving through the crowd asking *"Are you foreign funded?"*.
   - **News Ticker**: Continuous bottom bar displaying live Delhi satire news updates.
