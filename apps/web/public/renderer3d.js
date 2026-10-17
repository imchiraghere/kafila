// ===================================================================
// JANTAR MANTAR CHALO — REALISTIC 3D GAME ENGINE (THREE.JS / WEBGL)
// Senior Game Engine & Graphics Architecture
// ===================================================================
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ThreeDRenderer = factory();
})(typeof self !== 'undefined' ? self : this, function() {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  // Helper to generate canvas texture procedurally
  function createTexture(w, h, drawFn) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d');
    drawFn(g, w, h);
    const tex = new THREE.CanvasTexture(cv);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  // Generate road texture with asphalt grain and lane dash
  function makeRoadTexture() {
    return createTexture(128, 512, (g, w, h) => {
      g.fillStyle = '#2c2b2a';
      g.fillRect(0, 0, w, h);
      // Subtle asphalt grain
      for (let i = 0; i < 400; i++) {
        const x = Math.random() * w, y = Math.random() * h;
        const b = 35 + Math.random() * 25;
        g.fillStyle = `rgb(${b},${b},${b})`;
        g.fillRect(x, y, 1.5, 1.5);
      }
      // White dashed center line
      g.fillStyle = 'rgba(255, 255, 255, 0.75)';
      const dashH = 48, gapH = 32;
      for (let y = 0; y < h; y += dashH + gapH) {
        g.fillRect(w / 2 - 2, y, 4, dashH);
      }
      // Yellow edge lines
      g.fillStyle = 'rgba(255, 183, 77, 0.6)';
      g.fillRect(4, 0, 3, h);
      g.fillRect(w - 7, 0, 3, h);
    });
  }

  // Generate Barricade Warning Stripe Texture
  function makeBarricadeTexture() {
    return createTexture(256, 64, (g, w, h) => {
      g.fillStyle = '#f5c518';
      g.fillRect(0, 0, w, h);
      g.fillStyle = '#c62828';
      const stripeW = 24;
      for (let x = -h; x < w + h; x += stripeW * 2) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x + stripeW, 0);
        g.lineTo(x + stripeW - h, h);
        g.lineTo(x - h, h);
        g.closePath();
        g.fill();
      }
      g.fillStyle = '#1d1a16';
      g.font = '900 18px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('DILLI POLICE', w / 2, h / 2);
    });
  }

  // Generate Water Texture for Yamuna
  function makeWaterTexture() {
    return createTexture(256, 256, (g, w, h) => {
      g.fillStyle = '#37474f';
      g.fillRect(0, 0, w, h);
      g.fillStyle = 'rgba(96, 125, 139, 0.4)';
      for (let i = 0; i < 30; i++) {
        g.beginPath();
        g.arc(Math.random() * w, Math.random() * h, 15 + Math.random() * 25, 0, TAU);
        g.fill();
      }
    });
  }

  class ThreeDRenderer {
    constructor(canvas, options = {}) {
      this.canvas = canvas;
      this.options = options;
      this.width = canvas.clientWidth || window.innerWidth;
      this.height = canvas.clientHeight || window.innerHeight;

      // Camera preset modes: 'iso' | 'third' | 'top'
      this.cameraPreset = options.preset || 'iso';
      this.camYaw = 0;
      this.camPitch = 0.785; // 45 deg default
      this.camDist = 135;
      this.camHeight = 110;
      this.camTarget = new THREE.Vector3(3300, 0, 2950);
      this.camPosSmoothed = new THREE.Vector3(3300, 110, 3085);

      this.quality = options.quality || 'hi'; // 'low' | 'med' | 'hi' | 'ultra'
      this.dpr = Math.min(window.devicePixelRatio || 1, this.quality === 'ultra' ? 2 : 1.5);

      this.scene = null;
      this.camera = null;
      this.renderer = null;
      this.sunLight = null;
      this.hemiLight = null;

      // Meshes & Collections
      this.worldGroup = new THREE.Group();
      this.entitiesGroup = new THREE.Group();
      this.fxGroup = new THREE.Group();
      this.vehiclesGroup = new THREE.Group();
      this.barsGroup = new THREE.Group();

      // Dynamic entity pool
      this.charPool = new Map();
      this.vehiclePool = new Map();
      this.barricadePool = new Map();
      this.bulletTracers = [];
      this.bombMeshes = new Map();
      this.gasVolumes = [];

      this.waterMesh = null;
      this.dustParticles = null;
      this.shakeIntensity = 0;

      this.isInitialized = false;
      this.animTime = 0;

      // Mouse drag controls for 3D camera
      this.isDragging = false;
      this.prevMouseX = 0;
      this.prevMouseY = 0;

      this.init();
    }

    init() {
      if (this.isInitialized) return;

      // 1. Create WebGL Renderer
      try {
        this.renderer = new THREE.WebGLRenderer({
          canvas: this.canvas,
          antialias: this.quality !== 'low',
          powerPreference: 'high-performance',
          stencil: false,
          alpha: true
        });
      } catch (err) {
        console.error('Failed to create WebGLRenderer:', err);
        throw err;
      }

      this.renderer.setSize(this.width, this.height, false);
      this.renderer.setPixelRatio(this.dpr);
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;

      if (this.quality !== 'low') {
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = this.quality === 'ultra' ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
      }

      // 2. Create Scene & Atmospheric Fog
      this.scene = new THREE.Scene();
      const fogColor = new THREE.Color(0xd7c4a3);
      this.scene.background = fogColor;
      this.scene.fog = new THREE.FogExp2(0xd7c4a3, 0.00065);

      // 3. Camera
      this.camera = new THREE.PerspectiveCamera(46, this.width / this.height, 1, 3500);
      this.updateCameraPreset(this.cameraPreset);

      // 4. Lighting System
      this.setupLighting();

      // 5. Add Groups
      this.scene.add(this.worldGroup);
      this.scene.add(this.vehiclesGroup);
      this.scene.add(this.entitiesGroup);
      this.scene.add(this.barsGroup);
      this.scene.add(this.fxGroup);

      // 6. Build Procedural Delhi City
      this.buildDelhiEnvironment();

      // 7. Ambient dust motes
      this.buildAtmosphericParticles();

      // 8. Event Listeners for Camera Rotation
      this.bindControls();

      this.isInitialized = true;
    }

    setupLighting() {
      this.hemiLight = new THREE.HemisphereLight(0xfff3dc, 0x5a5247, 0.85);
      this.scene.add(this.hemiLight);

      this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.35);
      this.sunLight.position.set(3000 - 450, 750, 2000 - 650);
      this.sunLight.target.position.set(3000, 0, 2000);
      this.scene.add(this.sunLight);
      this.scene.add(this.sunLight.target);

      if (this.quality !== 'low') {
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = this.quality === 'ultra' ? 2048 : 1024;
        this.sunLight.shadow.mapSize.height = this.quality === 'ultra' ? 2048 : 1024;
        this.sunLight.shadow.camera.near = 100;
        this.sunLight.shadow.camera.far = 1600;
        const d = 450;
        this.sunLight.shadow.camera.left = -d;
        this.sunLight.shadow.camera.right = d;
        this.sunLight.shadow.camera.top = d;
        this.sunLight.shadow.camera.bottom = -d;
        this.sunLight.shadow.bias = -0.0008;
      }
    }

    bindControls() {
      const cv = this.canvas;
      const onMouseDown = (e) => {
        if (e.button === 2) {
          this.isDragging = true;
          this.prevMouseX = e.clientX;
          this.prevMouseY = e.clientY;
          e.preventDefault();
        }
      };
      const onMouseMove = (e) => {
        if (this.isDragging) {
          const dx = e.clientX - this.prevMouseX;
          const dy = e.clientY - this.prevMouseY;
          this.camYaw -= dx * 0.005;
          this.camPitch = clamp(this.camPitch + dy * 0.004, 0.2, 1.4);
          this.prevMouseX = e.clientX;
          this.prevMouseY = e.clientY;
        }
      };
      const onMouseUp = (e) => {
        if (e.button === 2) this.isDragging = false;
      };
      const onWheel = (e) => {
        if (e.target === cv) {
          this.camDist = clamp(this.camDist + e.deltaY * 0.12, 45, 320);
          e.preventDefault();
        }
      };
      const onContextMenu = (e) => {
        e.preventDefault();
      };

      window.addEventListener('mousedown', onMouseDown);
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      cv.addEventListener('wheel', onWheel, { passive: false });
      cv.addEventListener('contextmenu', onContextMenu);

      this.cleanupControls = () => {
        window.removeEventListener('mousedown', onMouseDown);
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
        cv.removeEventListener('wheel', onWheel);
        cv.removeEventListener('contextmenu', onContextMenu);
      };
    }

    setCameraPreset(preset) {
      this.cameraPreset = preset;
      this.updateCameraPreset(preset);
    }

    updateCameraPreset(preset) {
      if (preset === 'third') {
        this.camPitch = 0.42;
        this.camDist = 65;
        this.camHeight = 28;
      } else if (preset === 'top') {
        this.camPitch = 1.35;
        this.camDist = 240;
        this.camHeight = 220;
      } else {
        this.camPitch = 0.785;
        this.camDist = 135;
        this.camHeight = 110;
      }
    }

    buildDelhiEnvironment() {
      const Wd = window.World;
      if (!Wd) return;

      // 1. Terrain Ground Mesh (6000 x 6000)
      const groundGeo = new THREE.PlaneGeometry(6000, 6000, 16, 16);
      const groundMat = new THREE.MeshStandardMaterial({
        color: 0x8fae63,
        roughness: 0.92,
        metalness: 0.05
      });
      const groundMesh = new THREE.Mesh(groundGeo, groundMat);
      groundMesh.rotation.x = -Math.PI / 2;
      groundMesh.position.set(3000, -0.1, 3000);
      groundMesh.receiveShadow = true;
      this.worldGroup.add(groundMesh);

      // 2. Yamuna River Mesh
      const riverGeo = new THREE.BufferGeometry();
      const riverVerts = [];
      const riverIndices = [];
      const steps = 60;
      const stepY = 6000 / steps;
      for (let i = 0; i <= steps; i++) {
        const y = i * stepY;
        const xLeft = Wd.riverL ? Wd.riverL(y) : 5420;
        const xRight = 6000;
        riverVerts.push(xLeft, 0.4, y);
        riverVerts.push(xRight, 0.4, y);
        if (i < steps) {
          const base = i * 2;
          riverIndices.push(base, base + 1, base + 2);
          riverIndices.push(base + 1, base + 3, base + 2);
        }
      }
      riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(riverVerts, 3));
      riverGeo.setIndex(riverIndices);
      riverGeo.computeVertexNormals();

      const waterTex = makeWaterTexture();
      waterTex.repeat.set(6, 24);
      const riverMat = new THREE.MeshStandardMaterial({
        color: 0x455a64,
        map: waterTex,
        roughness: 0.22,
        metalness: 0.45
      });
      this.waterMesh = new THREE.Mesh(riverGeo, riverMat);
      this.worldGroup.add(this.waterMesh);

      // Bridges
      const bridgeYCoords = [2650, 4000];
      const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x616161, roughness: 0.8 });
      for (const by of bridgeYCoords) {
        const bridgeGeo = new THREE.BoxGeometry(600, 6, 42);
        const bridgeMesh = new THREE.Mesh(bridgeGeo, bridgeMat);
        bridgeMesh.position.set(5700, 3, by);
        bridgeMesh.receiveShadow = true;
        this.worldGroup.add(bridgeMesh);

        const railMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.7 });
        const railGeo = new THREE.BoxGeometry(600, 3, 2);
        const rail1 = new THREE.Mesh(railGeo, railMat);
        rail1.position.set(5700, 7.5, by - 20);
        const rail2 = new THREE.Mesh(railGeo, railMat);
        rail2.position.set(5700, 7.5, by + 20);
        this.worldGroup.add(rail1);
        this.worldGroup.add(rail2);
      }

      // 3. Roads & Arteries
      const roadMat = new THREE.MeshStandardMaterial({
        color: 0x423f3d,
        roughness: 0.88,
        metalness: 0.1
      });

      if (Wd.ROADS) {
        for (const r of Wd.ROADS) {
          if (!r.p || r.p.length < 2) continue;
          for (let i = 0; i < r.p.length - 1; i++) {
            const [ax, ay] = r.p[i];
            const [bx, by] = r.p[i + 1];
            const dx = bx - ax, dz = by - ay;
            const len = Math.hypot(dx, dz);
            const ang = Math.atan2(dz, dx);
            const rGeo = new THREE.PlaneGeometry(len, r.w);
            const rMesh = new THREE.Mesh(rGeo, roadMat);
            rMesh.rotation.x = -Math.PI / 2;
            rMesh.rotation.z = -ang;
            rMesh.position.set(ax + dx / 2, 0.2, ay + dz / 2);
            rMesh.receiveShadow = true;
            this.worldGroup.add(rMesh);
          }
        }
      }

      // 4. Connaught Place Concentric Rings
      if (Wd.RINGS) {
        for (const g of Wd.RINGS) {
          const ringGeo = new THREE.RingGeometry(g.r - g.w / 2, g.r + g.w / 2, 64);
          const ringMesh = new THREE.Mesh(ringGeo, roadMat);
          ringMesh.rotation.x = -Math.PI / 2;
          ringMesh.position.set(g.x, 0.25, g.y);
          ringMesh.receiveShadow = true;
          this.worldGroup.add(ringMesh);
        }
      }

      // 5. Connaught Place Colonnades (White Georgian pillars)
      const cpMat = new THREE.MeshStandardMaterial({ color: 0xf5f3ee, roughness: 0.65 });
      const colonnadeGeo = new THREE.CylinderGeometry(1.6, 1.8, 18, 12);
      const cpCenter = Wd.CP || { x: 3000, y: 2000 };
      for (let k = 0; k < 48; k++) {
        const ang = (k * TAU) / 48;
        const col1 = new THREE.Mesh(colonnadeGeo, cpMat);
        col1.position.set(cpCenter.x + Math.cos(ang) * 235, 9, cpCenter.y + Math.sin(ang) * 235);
        col1.castShadow = true;
        this.worldGroup.add(col1);

        const col2 = new THREE.Mesh(colonnadeGeo, cpMat);
        col2.position.set(cpCenter.x + Math.cos(ang) * 375, 9, cpCenter.y + Math.sin(ang) * 375);
        col2.castShadow = true;
        this.worldGroup.add(col2);
      }

      // 6. Parks & Greenery
      const parkMat = new THREE.MeshStandardMaterial({ color: 0x5a7d3a, roughness: 0.95 });
      if (Wd.PARKS) {
        for (const p of Wd.PARKS) {
          if (p.t === 'c') {
            const pGeo = new THREE.CircleGeometry(p.r || 50, 48);
            const pMesh = new THREE.Mesh(pGeo, parkMat);
            pMesh.rotation.x = -Math.PI / 2;
            pMesh.position.set(p.x, 0.28, p.y);
            this.worldGroup.add(pMesh);
          } else if (p.w && p.h) {
            const pGeo = new THREE.PlaneGeometry(p.w, p.h);
            const pMesh = new THREE.Mesh(pGeo, parkMat);
            pMesh.rotation.x = -Math.PI / 2;
            pMesh.position.set(p.x + p.w / 2, 0.28, p.y + p.h / 2);
            this.worldGroup.add(pMesh);
          }
        }
      }

      // 7. Jantar Mantar (Terracotta Samrat Yantra Sundial)
      const jmPos = Wd.JM || { x: 3300, y: 2950, r: 150 };
      const jmRedMat = new THREE.MeshStandardMaterial({ color: 0xbf360c, roughness: 0.72 });
      const jmWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, roughness: 0.45 });

      const jmBaseGeo = new THREE.CircleGeometry(jmPos.r, 64);
      const jmBaseMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.88 });
      const jmBase = new THREE.Mesh(jmBaseGeo, jmBaseMat);
      jmBase.rotation.x = -Math.PI / 2;
      jmBase.position.set(jmPos.x, 0.32, jmPos.y);
      this.worldGroup.add(jmBase);

      const rampShape = new THREE.Shape();
      rampShape.moveTo(0, 0);
      rampShape.lineTo(65, 0);
      rampShape.lineTo(0, 38);
      rampShape.closePath();
      const rampGeo = new THREE.ExtrudeGeometry(rampShape, { depth: 10, bevelEnabled: false });
      const rampMesh = new THREE.Mesh(rampGeo, jmRedMat);
      rampMesh.rotation.y = -Math.PI / 4;
      rampMesh.position.set(jmPos.x - 20, 0, jmPos.y + 15);
      rampMesh.castShadow = true;
      this.worldGroup.add(rampMesh);

      const quadrantGeo = new THREE.TorusGeometry(32, 4, 12, 32, Math.PI / 2);
      const quadrant1 = new THREE.Mesh(quadrantGeo, jmWhiteMat);
      quadrant1.rotation.x = Math.PI / 2;
      quadrant1.rotation.z = Math.PI / 4;
      quadrant1.position.set(jmPos.x - 5, 4, jmPos.y - 12);
      this.worldGroup.add(quadrant1);

      const bowlGeo = new THREE.SphereGeometry(14, 24, 12, 0, TAU, Math.PI / 2, Math.PI / 2);
      const bowlMesh = new THREE.Mesh(bowlGeo, jmWhiteMat);
      bowlMesh.rotation.x = Math.PI;
      bowlMesh.position.set(jmPos.x + 40, 2, jmPos.y - 30);
      this.worldGroup.add(bowlMesh);

      // Dharna Mats
      const matMat = new THREE.MeshStandardMaterial({ color: 0xb71c1c, roughness: 0.9 });
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU - Math.PI / 2;
        const mx = jmPos.x + Math.cos(a) * jmPos.r * 0.55;
        const my = jmPos.y + Math.sin(a) * jmPos.r * 0.55;
        const matGeo = new THREE.PlaneGeometry(36, 24);
        const matMesh = new THREE.Mesh(matGeo, matMat);
        matMesh.rotation.x = -Math.PI / 2;
        matMesh.rotation.z = a;
        matMesh.position.set(mx, 0.4, my);
        this.worldGroup.add(matMesh);
      }

      // Section 163 Warning Boundary Circle
      const zonePos = Wd.ZONE || { x: 3300, y: 2950, R: 340 };
      const zoneGeo = new THREE.RingGeometry(zonePos.R - 2.5, zonePos.R + 2.5, 96);
      const zoneMat = new THREE.MeshBasicMaterial({ color: 0xd32f2f, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });
      const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
      zoneMesh.rotation.x = -Math.PI / 2;
      zoneMesh.position.set(zonePos.x, 0.35, zonePos.y);
      this.worldGroup.add(zoneMesh);

      // 8. Procedural Buildings (Instanced)
      this.buildBuildings(Wd.BUILD || []);

      // 9. Trees (Instanced)
      this.buildTrees(Wd.TREES || []);
    }

    buildBuildings(buildings) {
      if (!buildings || buildings.length === 0) return;

      const boxGeo = new THREE.BoxGeometry(1, 1, 1);
      const tankGeo = new THREE.CylinderGeometry(3.5, 3.5, 7, 12);

      const palColors = [
        0xefe4cc, 0xe8d6b5, 0xf2e9d8, 0xdccbb0, 0xeadfd0,
        0xe7c9a9, 0xd9d2c4, 0xf0d9c0, 0xe3e0d6, 0xf4c7a5
      ];
      const matList = palColors.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
      const tankMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.7 });

      const batches = Array.from({ length: palColors.length }, () => []);
      for (let i = 0; i < buildings.length; i++) {
        batches[i % palColors.length].push(buildings[i]);
      }

      const dummy = new THREE.Object3D();
      for (let cIdx = 0; cIdx < palColors.length; cIdx++) {
        const list = batches[cIdx];
        if (list.length === 0) continue;
        const instMesh = new THREE.InstancedMesh(boxGeo, matList[cIdx], list.length);
        instMesh.castShadow = this.quality !== 'low';
        instMesh.receiveShadow = true;

        for (let j = 0; j < list.length; j++) {
          const b = list[j];
          const H = b.H || 35;
          dummy.position.set(b.x + b.w / 2, H / 2, b.y + b.h / 2);
          dummy.scale.set(b.w, H, b.h);
          dummy.updateMatrix();
          instMesh.setMatrixAt(j, dummy.matrix);
        }
        instMesh.instanceMatrix.needsUpdate = true;
        this.worldGroup.add(instMesh);
      }

      // Rooftop water tanks
      const tankCount = Math.min(600, buildings.length);
      const tankInst = new THREE.InstancedMesh(tankGeo, tankMat, tankCount);
      let tCount = 0;
      for (let i = 0; i < buildings.length && tCount < tankCount; i += 3) {
        const b = buildings[i];
        if (b.tank) {
          dummy.position.set(b.x + b.w * (0.3 + (b.tx || 0.4) * 0.4), b.H + 3.5, b.y + b.h * (0.3 + (b.ty || 0.4) * 0.4));
          dummy.scale.set(1, 1, 1);
          dummy.updateMatrix();
          tankInst.setMatrixAt(tCount++, dummy.matrix);
        }
      }
      tankInst.instanceMatrix.needsUpdate = true;
      this.worldGroup.add(tankInst);
    }

    buildTrees(trees) {
      if (!trees || trees.length === 0) return;

      const trunkGeo = new THREE.CylinderGeometry(1.2, 1.8, 14, 8);
      const foliageGeo = new THREE.SphereGeometry(12, 12, 10);
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4e342e, roughness: 0.95 });
      const foliageMat = new THREE.MeshStandardMaterial({ color: 0x33691e, roughness: 0.88 });

      const trunkInst = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
      const folInst = new THREE.InstancedMesh(foliageGeo, foliageMat, trees.length);
      trunkInst.castShadow = this.quality !== 'low';
      folInst.castShadow = this.quality !== 'low';

      const dummy = new THREE.Object3D();
      for (let i = 0; i < trees.length; i++) {
        const t = trees[i];
        const s = t.s || 1;
        dummy.position.set(t.x, 7 * s, t.y);
        dummy.scale.set(s, s, s);
        dummy.updateMatrix();
        trunkInst.setMatrixAt(i, dummy.matrix);

        dummy.position.set(t.x, (14 + 8) * s, t.y);
        dummy.scale.set(s, s * 1.15, s);
        dummy.updateMatrix();
        folInst.setMatrixAt(i, dummy.matrix);
      }
      trunkInst.instanceMatrix.needsUpdate = true;
      folInst.instanceMatrix.needsUpdate = true;
      this.worldGroup.add(trunkInst);
      this.worldGroup.add(folInst);
    }

    buildAtmosphericParticles() {
      const count = this.quality === 'low' ? 120 : 450;
      const geo = new THREE.BufferGeometry();
      const pos = [];
      for (let i = 0; i < count; i++) {
        pos.push(
          (Math.random() - 0.5) * 600,
          Math.random() * 80 + 2,
          (Math.random() - 0.5) * 600
        );
      }
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xffecb3,
        size: 2.2,
        transparent: true,
        opacity: 0.45
      });
      this.dustParticles = new THREE.Points(geo, mat);
      this.scene.add(this.dustParticles);
    }

    createCharacterMesh(team, mudIndex, lookIndex, isMe) {
      const charGroup = new THREE.Group();
      const Wd = window.World;
      const mud = (Wd && Wd.MUDDAS && Wd.MUDDAS[mudIndex]) || { c: '#1565c0', e: '📚', n: 'Paper Leak' };

      const skinColor = 0xc98a55;
      const shirtColor = isMe ? 0xff7f11 : (team === 'P' ? new THREE.Color(mud.c).getHex() : 0xc4a26c);
      const pantsColor = team === 'P' ? 0x3e2723 : 0x8d6e63;

      const skinMat = new THREE.MeshStandardMaterial({ color: skinColor, roughness: 0.8 });
      const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.85 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.9 });

      // Torso
      const torsoGeo = new THREE.BoxGeometry(7, 10, 5);
      const torso = new THREE.Mesh(torsoGeo, shirtMat);
      torso.position.y = 11;
      torso.castShadow = true;
      charGroup.add(torso);

      // Head
      const headGeo = new THREE.SphereGeometry(3.6, 12, 10);
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 18.5;
      head.castShadow = true;
      charGroup.add(head);

      // Legs
      const legGeo = new THREE.BoxGeometry(2.6, 8, 2.6);
      const leftLeg = new THREE.Mesh(legGeo, pantsMat);
      leftLeg.position.set(-1.8, 4, 0);
      const rightLeg = new THREE.Mesh(legGeo, pantsMat);
      rightLeg.position.set(1.8, 4, 0);
      charGroup.add(leftLeg);
      charGroup.add(rightLeg);
      charGroup.userData.leftLeg = leftLeg;
      charGroup.userData.rightLeg = rightLeg;

      // Arms
      const armGeo = new THREE.BoxGeometry(2.2, 8, 2.2);
      const leftArm = new THREE.Mesh(armGeo, shirtMat);
      leftArm.position.set(-4.6, 11, 0);
      const rightArm = new THREE.Mesh(armGeo, shirtMat);
      rightArm.position.set(4.6, 11, 0);
      charGroup.add(leftArm);
      charGroup.add(rightArm);
      charGroup.userData.leftArm = leftArm;
      charGroup.userData.rightArm = rightArm;

      if (team === 'P') {
        // Protester: Dynamic Placard
        const stickGeo = new THREE.CylinderGeometry(0.5, 0.5, 26, 6);
        const stickMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
        const stick = new THREE.Mesh(stickGeo, stickMat);
        stick.position.set(3, 18, 2);
        charGroup.add(stick);

        const boardGeo = new THREE.BoxGeometry(16, 11, 0.8);
        const placardTex = createTexture(128, 88, (g, w, h) => {
          g.fillStyle = '#ffffff';
          g.fillRect(0, 0, w, h);
          g.strokeStyle = mud.c;
          g.lineWidth = 6;
          g.strokeRect(0, 0, w, h);
          g.fillStyle = mud.c;
          g.font = 'bold 36px sans-serif';
          g.textAlign = 'center';
          g.fillText(mud.e, w / 2, 44);
          g.font = 'bold 16px sans-serif';
          g.fillText(mud.n.slice(0, 10), w / 2, 72);
        });
        const boardMat = new THREE.MeshStandardMaterial({ map: placardTex, roughness: 0.5 });
        const board = new THREE.Mesh(boardGeo, boardMat);
        board.position.set(3, 27, 2);
        charGroup.add(board);
      } else {
        // Dilli Police: Cap & Lathi
        const capGeo = new THREE.CylinderGeometry(4.2, 4, 2.2, 12);
        const capMat = new THREE.MeshStandardMaterial({ color: 0x1f4e9c, roughness: 0.6 });
        const cap = new THREE.Mesh(capGeo, capMat);
        cap.position.y = 21.5;
        charGroup.add(cap);

        const lathiGeo = new THREE.CylinderGeometry(0.7, 0.7, 22, 6);
        const lathiMat = new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.8 });
        const lathi = new THREE.Mesh(lathiGeo, lathiMat);
        lathi.rotation.x = Math.PI / 2;
        lathi.position.set(4, 9, 7);
        charGroup.add(lathi);
        charGroup.userData.lathi = lathi;
      }

      // Shadow Blob
      const shGeo = new THREE.CircleGeometry(6, 12);
      const shMat = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.35 });
      const shadowBlob = new THREE.Mesh(shGeo, shMat);
      shadowBlob.rotation.x = -Math.PI / 2;
      shadowBlob.position.y = 0.15;
      charGroup.add(shadowBlob);

      return charGroup;
    }

    createVehicleMesh(type) {
      const vGroup = new THREE.Group();

      if (type === 'bus') {
        const bodyGeo = new THREE.BoxGeometry(26, 22, 68);
        const busMat = new THREE.MeshStandardMaterial({ color: 0x1a3a6c, roughness: 0.55, metalness: 0.2 });
        const body = new THREE.Mesh(bodyGeo, busMat);
        body.position.y = 13;
        body.castShadow = true;
        vGroup.add(body);

        const glassGeo = new THREE.BoxGeometry(26.4, 8, 52);
        const glassMat = new THREE.MeshStandardMaterial({ color: 0x37474f, roughness: 0.15, metalness: 0.6 });
        const glass = new THREE.Mesh(glassGeo, glassMat);
        glass.position.set(0, 16, -2);
        vGroup.add(glass);

        const lightGeo = new THREE.CylinderGeometry(1.5, 1.5, 3, 8);
        const redLightMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
        const blueLightMat = new THREE.MeshBasicMaterial({ color: 0x2979ff });
        const redBeacon = new THREE.Mesh(lightGeo, redLightMat);
        redBeacon.position.set(-6, 25.5, 20);
        const blueBeacon = new THREE.Mesh(lightGeo, blueLightMat);
        blueBeacon.position.set(6, 25.5, 20);
        vGroup.add(redBeacon);
        vGroup.add(blueBeacon);
        vGroup.userData.beacons = [redBeacon, blueBeacon];

        const wheelGeo = new THREE.CylinderGeometry(4.5, 4.5, 4, 12);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x212121, roughness: 0.9 });
        for (const [wx, wz] of [[-13, 20], [13, 20], [-13, -20], [13, -20]]) {
          const w = new THREE.Mesh(wheelGeo, wheelMat);
          w.rotation.z = Math.PI / 2;
          w.position.set(wx, 4.5, wz);
          vGroup.add(w);
        }
      } else if (type === 'auto') {
        const lowerGeo = new THREE.BoxGeometry(16, 8, 28);
        const greenMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.6 });
        const lower = new THREE.Mesh(lowerGeo, greenMat);
        lower.position.y = 7;
        vGroup.add(lower);

        const hoodGeo = new THREE.BoxGeometry(16, 9, 20);
        const yellowMat = new THREE.MeshStandardMaterial({ color: 0xfbc02d, roughness: 0.5 });
        const hood = new THREE.Mesh(hoodGeo, yellowMat);
        hood.position.set(0, 14, -2);
        vGroup.add(hood);
      } else {
        const bikeGeo = new THREE.BoxGeometry(7, 9, 20);
        const bikeMat = new THREE.MeshStandardMaterial({ color: 0xd32f2f, roughness: 0.5 });
        const bike = new THREE.Mesh(bikeGeo, bikeMat);
        bike.position.y = 6;
        vGroup.add(bike);

        const bagGeo = new THREE.BoxGeometry(9, 9, 9);
        const bagMat = new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.7 });
        const bag = new THREE.Mesh(bagGeo, bagMat);
        bag.position.set(0, 12, -6);
        vGroup.add(bag);
      }

      return vGroup;
    }

    createBarricadeMesh(len) {
      const bGroup = new THREE.Group();
      const bTex = makeBarricadeTexture();
      bTex.repeat.set(Math.max(1, Math.round(len / 40)), 1);

      const barMat = new THREE.MeshStandardMaterial({
        map: bTex,
        roughness: 0.65,
        metalness: 0.35
      });
      const barGeo = new THREE.BoxGeometry(len, 14, 2.5);
      const plank = new THREE.Mesh(barGeo, barMat);
      plank.position.y = 8;
      plank.castShadow = true;
      bGroup.add(plank);

      const legMat = new THREE.MeshStandardMaterial({ color: 0x37474f, metalness: 0.6 });
      const legGeo = new THREE.CylinderGeometry(0.8, 0.8, 16, 6);
      const l1 = new THREE.Mesh(legGeo, legMat);
      l1.position.set(-len / 2 + 3, 8, 0);
      const l2 = new THREE.Mesh(legGeo, legMat);
      l2.position.set(len / 2 - 3, 8, 0);
      bGroup.add(l1);
      bGroup.add(l2);

      return bGroup;
    }

    spawnBulletTracer(fromX, fromY, fromZ, toX, toY, toZ) {
      const pts = [new THREE.Vector3(fromX, fromY, fromZ), new THREE.Vector3(toX, toY, toZ)];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: 0xffeb3b, linewidth: 2 });
      const line = new THREE.Line(geo, mat);
      this.fxGroup.add(line);
      this.bulletTracers.push({ mesh: line, life: 0.08 });
    }

    spawnExplosionFlash(x, y, z) {
      const pLight = new THREE.PointLight(0xff7043, 8, 180);
      pLight.position.set(x, y + 10, z);
      this.fxGroup.add(pLight);

      const ringGeo = new THREE.RingGeometry(2, 6, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffeb3b, transparent: true, opacity: 0.85, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(x, 0.5, z);
      this.fxGroup.add(ring);

      this.bulletTracers.push({
        light: pLight,
        ring: ring,
        mesh: ring,
        life: 0.35,
        maxLife: 0.35
      });
      this.shakeIntensity = Math.min(1.2, this.shakeIntensity + 0.6);
    }

    spawnTearGasCloud(x, z) {
      const sphereGeo = new THREE.SphereGeometry(18, 8, 8);
      const gasMat = new THREE.MeshStandardMaterial({
        color: 0xeeeeee,
        transparent: true,
        opacity: 0.55,
        roughness: 1.0
      });
      const gasMesh = new THREE.Mesh(sphereGeo, gasMat);
      gasMesh.position.set(x, 8, z);
      this.fxGroup.add(gasMesh);
      this.gasVolumes.push({ mesh: gasMesh, life: 3.5, maxLife: 3.5 });
    }

    render(state, dt) {
      if (!this.isInitialized || !this.renderer) return;

      this.animTime += dt;
      const me = state.me;

      // 1. Smooth Camera Follow
      if (me && Number.isFinite(me.x) && Number.isFinite(me.y)) {
        this.camTarget.x += (me.x - this.camTarget.x) * (dt * 6.5);
        this.camTarget.z += (me.y - this.camTarget.z) * (dt * 6.5);
        this.camTarget.y = 12;

        if (this.sunLight) {
          this.sunLight.position.set(this.camTarget.x - 350, 750, this.camTarget.z - 450);
          this.sunLight.target.position.set(this.camTarget.x, 0, this.camTarget.z);
        }
      }

      let shakeX = 0, shakeY = 0;
      if (this.shakeIntensity > 0) {
        shakeX = (Math.random() - 0.5) * this.shakeIntensity * 6;
        shakeY = (Math.random() - 0.5) * this.shakeIntensity * 4;
        this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 1.8);
      }

      const cy = Math.cos(this.camPitch);
      const sy = Math.sin(this.camPitch);
      const cx = Math.sin(this.camYaw);
      const cz = Math.cos(this.camYaw);

      const targetCamX = this.camTarget.x + cx * cy * this.camDist + shakeX;
      const targetCamY = Math.max(8, this.camTarget.y + sy * this.camDist + shakeY);
      const targetCamZ = this.camTarget.z + cz * cy * this.camDist;

      this.camPosSmoothed.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), clamp(dt * 7.5, 0, 1));
      this.camera.position.copy(this.camPosSmoothed);
      this.camera.lookAt(this.camTarget);

      if (this.waterMesh && this.waterMesh.material && this.waterMesh.material.map) {
        this.waterMesh.material.map.offset.y += dt * 0.08;
      }

      if (this.dustParticles) {
        this.dustParticles.position.set(this.camTarget.x, 0, this.camTarget.z);
        this.dustParticles.rotation.y += dt * 0.03;
      }

      // 2. Update Entities
      const entities = state.entities || [];
      const activeEntityIds = new Set();

      for (const ent of entities) {
        const id = ent.id !== undefined ? ent.id : ent[0];
        const ex = ent.x !== undefined ? ent.x : ent[1];
        const ey = ent.y !== undefined ? ent.y : ent[2];
        const vx = ent.vx !== undefined ? ent.vx : ent[3];
        const vy = ent.vy !== undefined ? ent.vy : ent[4];
        const face = (ent.face !== undefined ? ent.face : (ent[5] ? ent[5] / 100 : 0));
        const team = ent.team || ent[6] || 'P';
        const mud = ent.mud !== undefined ? ent.mud : ent[10] || 0;
        const look = ent.look !== undefined ? ent.look : ent[9] || 0;

        activeEntityIds.add(id);

        let charMesh = this.charPool.get(id);
        const isMe = me && me.id === id;

        if (!charMesh) {
          charMesh = this.createCharacterMesh(team, mud, look, isMe);
          this.entitiesGroup.add(charMesh);
          this.charPool.set(id, charMesh);
        }

        charMesh.position.x = ex;
        charMesh.position.z = ey;
        charMesh.rotation.y = -face + Math.PI / 2;

        const speed = Math.hypot(vx, vy);
        const isMoving = speed > 8;
        if (isMoving && charMesh.userData.leftLeg) {
          const swing = Math.sin(this.animTime * 14) * 0.65;
          charMesh.userData.leftLeg.rotation.x = swing;
          charMesh.userData.rightLeg.rotation.x = -swing;
          charMesh.userData.leftArm.rotation.x = -swing * 0.8;
          charMesh.userData.rightArm.rotation.x = swing * 0.8;
        } else if (charMesh.userData.leftLeg) {
          charMesh.userData.leftLeg.rotation.x = 0;
          charMesh.userData.rightLeg.rotation.x = 0;
          charMesh.userData.leftArm.rotation.x = 0;
          charMesh.userData.rightArm.rotation.x = 0;
        }
      }

      for (const [id, mesh] of this.charPool.entries()) {
        if (!activeEntityIds.has(id)) {
          this.entitiesGroup.remove(mesh);
          this.charPool.delete(id);
        }
      }

      // 3. Update Vehicles
      const buses = state.buses || [];
      const activeBusIds = new Set();
      for (let i = 0; i < buses.length; i++) {
        const b = buses[i];
        const id = 'bus_' + i;
        activeBusIds.add(id);
        let bMesh = this.vehiclePool.get(id);
        if (!bMesh) {
          bMesh = this.createVehicleMesh('bus');
          this.vehiclesGroup.add(bMesh);
          this.vehiclePool.set(id, bMesh);
        }
        bMesh.position.set(b[1], 0, b[2]);
        const ang = (b[3] || 0) * (TAU / 8);
        bMesh.rotation.y = -ang;

        if (bMesh.userData.beacons) {
          const flash = Math.floor(this.animTime * 6) % 2 === 0;
          bMesh.userData.beacons[0].visible = flash;
          bMesh.userData.beacons[1].visible = !flash;
        }
      }

      for (const [id, mesh] of this.vehiclePool.entries()) {
        if (!activeBusIds.has(id)) {
          this.vehiclesGroup.remove(mesh);
          this.vehiclePool.delete(id);
        }
      }

      // 4. Update Barricades
      const bars = state.bars || [];
      const activeBarIds = new Set();
      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        const id = bar.id !== undefined ? bar.id : (bar[0] || i);
        const bx = bar.x !== undefined ? bar.x : bar[1];
        const by = bar.y !== undefined ? bar.y : bar[2];
        const ang = bar.ang !== undefined ? bar.ang : (bar[3] ? bar[3] / 1000 : 0);
        const len = bar.len || bar[4] || 32;
        const up = bar.up !== undefined ? bar.up : (bar[5] !== undefined ? bar[5] : true);

        activeBarIds.add(id);
        let bMesh = this.barricadePool.get(id);
        if (!bMesh) {
          bMesh = this.createBarricadeMesh(len);
          this.barsGroup.add(bMesh);
          this.barricadePool.set(id, bMesh);
        }
        bMesh.position.set(bx, 0, by);
        bMesh.rotation.y = -ang;

        if (!up) {
          bMesh.rotation.x = Math.PI / 2;
          bMesh.position.y = 1;
        } else {
          bMesh.rotation.x = 0;
          bMesh.position.y = 0;
        }
      }

      for (const [id, mesh] of this.barricadePool.entries()) {
        if (!activeBarIds.has(id)) {
          this.barsGroup.remove(mesh);
          this.barricadePool.delete(id);
        }
      }

      // 5. Update Thrown Frag Bombs
      const bombs = state.bombs || [];
      const activeBombIds = new Set();
      for (let i = 0; i < bombs.length; i++) {
        const bm = bombs[i];
        const bid = 'bomb_' + (bm.id || i);
        activeBombIds.add(bid);
        let bMesh = this.bombMeshes.get(bid);
        if (!bMesh) {
          const bGeo = new THREE.SphereGeometry(3.5, 12, 10);
          const bMat = new THREE.MeshStandardMaterial({ color: 0x33691e, roughness: 0.6 });
          bMesh = new THREE.Mesh(bGeo, bMat);
          this.fxGroup.add(bMesh);
          this.bombMeshes.set(bid, bMesh);
        }
        const bH = Number.isFinite(bm.h) ? Math.max(1, bm.h) : 1;
        bMesh.position.set(bm.x, bH, bm.y);
        bMesh.rotation.x += dt * 8;
        bMesh.rotation.z += dt * 6;
      }
      for (const [id, mesh] of this.bombMeshes.entries()) {
        if (!activeBombIds.has(id)) {
          this.fxGroup.remove(mesh);
          this.bombMeshes.delete(id);
        }
      }

      // 6. Update FX
      for (let i = this.bulletTracers.length - 1; i >= 0; i--) {
        const tr = this.bulletTracers[i];
        tr.life -= dt;
        if (tr.ring) {
          const p = 1 - tr.life / tr.maxLife;
          tr.ring.scale.set(1 + p * 8, 1 + p * 8, 1);
          tr.ring.material.opacity = Math.max(0, 1 - p);
        }
        if (tr.life <= 0) {
          if (tr.mesh) this.fxGroup.remove(tr.mesh);
          if (tr.light) this.fxGroup.remove(tr.light);
          this.bulletTracers.splice(i, 1);
        }
      }

      for (let i = this.gasVolumes.length - 1; i >= 0; i--) {
        const g = this.gasVolumes[i];
        g.life -= dt;
        const p = 1 - g.life / g.maxLife;
        g.mesh.scale.set(1 + p * 2.5, 1 + p * 1.5, 1 + p * 2.5);
        g.mesh.material.opacity = Math.max(0, 0.55 * (1 - p));
        if (g.life <= 0) {
          this.fxGroup.remove(g.mesh);
          this.gasVolumes.splice(i, 1);
        }
      }

      // 7. Render Three.js Scene
      this.renderer.render(this.scene, this.camera);
    }

    resize(w, h) {
      this.width = w;
      this.height = h;
      if (this.camera && this.renderer) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
      }
    }

    dispose() {
      if (this.cleanupControls) this.cleanupControls();
      if (this.renderer) {
        this.renderer.dispose();
      }
      this.isInitialized = false;
    }
  }

  return ThreeDRenderer;
});
