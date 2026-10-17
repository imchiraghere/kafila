import * as THREE from 'three';
import {
  TAU,
  clamp,
  WORLD_SIZE,
  CP,
  JM,
  ZONE,
  ROADS,
  RINGS,
  PARKS,
  BUILD,
  TREES,
  MUDDAS,
  CameraPreset,
  GraphicsQuality,
  GameRendererInterface
} from '@mantar-jantar/shared';

export interface RenderState3D {
  me: any;
  entities: any[];
  buses?: any[];
  riders?: any[];
  bars?: any[];
  gates?: any[];
  bombs?: any[];
  gas?: any[];
  particles?: any[];
}

export class ThreeDRenderer implements GameRendererInterface {
  private canvas: HTMLCanvasElement;
  private width: number;
  private height: number;
  private cameraPreset: CameraPreset = 'iso';
  private quality: GraphicsQuality = 'hi';
  private dpr = 1;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;

  private worldGroup = new THREE.Group();
  private entitiesGroup = new THREE.Group();
  private vehiclesGroup = new THREE.Group();
  private barsGroup = new THREE.Group();
  private fxGroup = new THREE.Group();

  private charPool = new Map<number | string, THREE.Group>();
  private vehiclePool = new Map<string, THREE.Group>();
  private barPool = new Map<number | string, THREE.Group>();
  private bombMeshes = new Map<string, THREE.Mesh>();
  private tracers: { mesh?: THREE.Object3D; light?: THREE.PointLight; life: number; maxLife?: number }[] = [];

  private camTarget = new THREE.Vector3(3300, 0, 2950);
  private camPosSmoothed = new THREE.Vector3(3300, 110, 3085);
  private camYaw = 0;
  private camPitch = 0.785;
  private camDist = 135;
  private shakeIntensity = 0;
  private animTime = 0;
  private isInitialized = false;

  constructor(canvas: HTMLCanvasElement, preset: CameraPreset = 'iso', quality: GraphicsQuality = 'hi') {
    this.canvas = canvas;
    this.cameraPreset = preset;
    this.quality = quality;
    this.width = canvas.clientWidth || (typeof window !== 'undefined' ? window.innerWidth : 800);
    this.height = canvas.clientHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);
    this.dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, quality === 'ultra' ? 2 : 1.5) : 1;
    this.init();
  }

  private init() {
    if (this.isInitialized || typeof window === 'undefined') return;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.quality !== 'low',
      powerPreference: 'high-performance',
      stencil: false,
      alpha: true
    });
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    if (this.quality !== 'low') {
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = this.quality === 'ultra' ? THREE.PCFSoftShadowMap : THREE.BasicShadowMap;
    }

    this.scene = new THREE.Scene();
    const fogColor = new THREE.Color(0xd7c4a3);
    this.scene.background = fogColor;
    this.scene.fog = new THREE.FogExp2(0xd7c4a3, 0.00065);

    this.camera = new THREE.PerspectiveCamera(46, this.width / this.height, 1, 3500);
    this.setCameraPreset(this.cameraPreset);

    this.setupLighting();

    this.scene.add(this.worldGroup);
    this.scene.add(this.vehiclesGroup);
    this.scene.add(this.entitiesGroup);
    this.scene.add(this.barsGroup);
    this.scene.add(this.fxGroup);

    this.buildWorld();
    this.isInitialized = true;
  }

  private setupLighting() {
    this.hemiLight = new THREE.HemisphereLight(0xfff3dc, 0x5a5247, 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfffaed, 1.35);
    this.sunLight.position.set(2550, 750, 1350);
    this.sunLight.target.position.set(3000, 0, 2000);
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    if (this.quality !== 'low') {
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.width = 1024;
      this.sunLight.shadow.mapSize.height = 1024;
      this.sunLight.shadow.camera.near = 100;
      this.sunLight.shadow.camera.far = 1600;
      const d = 450;
      this.sunLight.shadow.camera.left = -d;
      this.sunLight.shadow.camera.right = d;
      this.sunLight.shadow.camera.top = d;
      this.sunLight.shadow.camera.bottom = -d;
    }
  }

  public setCameraPreset(preset: CameraPreset) {
    this.cameraPreset = preset;
    if (preset === 'third') {
      this.camPitch = 0.42;
      this.camDist = 65;
    } else if (preset === 'top') {
      this.camPitch = 1.35;
      this.camDist = 240;
    } else {
      this.camPitch = 0.785;
      this.camDist = 135;
    }
  }

  private buildWorld() {
    // 1. Ground plane
    const groundGeo = new THREE.PlaneGeometry(WORLD_SIZE, WORLD_SIZE, 16, 16);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x8fae63, roughness: 0.92 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(3000, -0.1, 3000);
    ground.receiveShadow = true;
    this.worldGroup.add(ground);

    // 2. Roads
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x423f3d, roughness: 0.88 });
    for (const r of ROADS) {
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

    // 3. Connaught Place concentric rings
    for (const g of RINGS) {
      const ringGeo = new THREE.RingGeometry(g.r - g.w / 2, g.r + g.w / 2, 64);
      const ringMesh = new THREE.Mesh(ringGeo, roadMat);
      ringMesh.rotation.x = -Math.PI / 2;
      ringMesh.position.set(g.x, 0.25, g.y);
      ringMesh.receiveShadow = true;
      this.worldGroup.add(ringMesh);
    }

    // 4. Parks
    const parkMat = new THREE.MeshStandardMaterial({ color: 0x5a7d3a, roughness: 0.95 });
    for (const p of PARKS) {
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

    // 5. Jantar Mantar Samrat Yantra Sundial
    const jmRedMat = new THREE.MeshStandardMaterial({ color: 0xbf360c, roughness: 0.72 });
    const rampShape = new THREE.Shape();
    rampShape.moveTo(0, 0);
    rampShape.lineTo(65, 0);
    rampShape.lineTo(0, 38);
    rampShape.closePath();
    const rampGeo = new THREE.ExtrudeGeometry(rampShape, { depth: 10, bevelEnabled: false });
    const ramp = new THREE.Mesh(rampGeo, jmRedMat);
    ramp.rotation.y = -Math.PI / 4;
    ramp.position.set(JM.x - 20, 0, JM.y + 15);
    ramp.castShadow = true;
    this.worldGroup.add(ramp);

    // Section 163 boundary
    const zoneGeo = new THREE.RingGeometry(ZONE.R - 2.5, ZONE.R + 2.5, 96);
    const zoneMat = new THREE.MeshBasicMaterial({ color: 0xd32f2f, side: THREE.DoubleSide, transparent: true, opacity: 0.65 });
    const zoneMesh = new THREE.Mesh(zoneGeo, zoneMat);
    zoneMesh.rotation.x = -Math.PI / 2;
    zoneMesh.position.set(ZONE.x, 0.35, ZONE.y);
    this.worldGroup.add(zoneMesh);

    // 6. Buildings (Instanced)
    if (BUILD && BUILD.length > 0) {
      const boxGeo = new THREE.BoxGeometry(1, 1, 1);
      const bMat = new THREE.MeshStandardMaterial({ color: 0xe8d6b5, roughness: 0.85 });
      const bInst = new THREE.InstancedMesh(boxGeo, bMat, BUILD.length);
      bInst.castShadow = this.quality !== 'low';
      bInst.receiveShadow = true;

      const dummy = new THREE.Object3D();
      for (let i = 0; i < BUILD.length; i++) {
        const b = BUILD[i];
        const H = b.H || 35;
        dummy.position.set(b.x + b.w / 2, H / 2, b.y + b.h / 2);
        dummy.scale.set(b.w, H, b.h);
        dummy.updateMatrix();
        bInst.setMatrixAt(i, dummy.matrix);
      }
      bInst.instanceMatrix.needsUpdate = true;
      this.worldGroup.add(bInst);
    }
  }

  private createCharacterMesh(team: string, mudIndex: number, isMe: boolean): THREE.Group {
    const char = new THREE.Group();
    const mud = MUDDAS[mudIndex] || MUDDAS[0];

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xc98a55, roughness: 0.8 });
    const shirtColor = isMe ? 0xff7f11 : (team === 'P' ? new THREE.Color(mud.c).getHex() : 0xc4a26c);
    const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.85 });

    const torsoGeo = new THREE.BoxGeometry(7, 10, 5);
    const torso = new THREE.Mesh(torsoGeo, shirtMat);
    torso.position.y = 11;
    torso.castShadow = true;
    char.add(torso);

    const headGeo = new THREE.SphereGeometry(3.6, 12, 10);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 18.5;
    head.castShadow = true;
    char.add(head);

    if (team === 'P') {
      const stickGeo = new THREE.CylinderGeometry(0.5, 0.5, 26, 6);
      const stickMat = new THREE.MeshStandardMaterial({ color: 0x5d4037 });
      const stick = new THREE.Mesh(stickGeo, stickMat);
      stick.position.set(3, 18, 2);
      char.add(stick);

      const boardGeo = new THREE.BoxGeometry(16, 11, 0.8);
      const boardMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(mud.c).getHex() });
      const board = new THREE.Mesh(boardGeo, boardMat);
      board.position.set(3, 27, 2);
      char.add(board);
    } else {
      const capGeo = new THREE.CylinderGeometry(4.2, 4, 2.2, 12);
      const capMat = new THREE.MeshStandardMaterial({ color: 0x1f4e9c });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 21.5;
      char.add(cap);

      const lathiGeo = new THREE.CylinderGeometry(0.7, 0.7, 22, 6);
      const lathiMat = new THREE.MeshStandardMaterial({ color: 0x3e2723 });
      const lathi = new THREE.Mesh(lathiGeo, lathiMat);
      lathi.rotation.x = Math.PI / 2;
      lathi.position.set(4, 9, 7);
      char.add(lathi);
    }

    return char;
  }

  public render(state: RenderState3D, dt: number) {
    if (!this.isInitialized || !this.renderer) return;

    this.animTime += dt;
    const me = state.me;

    if (me && Number.isFinite(me.x) && Number.isFinite(me.y)) {
      this.camTarget.x += (me.x - this.camTarget.x) * (dt * 6.5);
      this.camTarget.z += (me.y - this.camTarget.z) * (dt * 6.5);
      this.camTarget.y = 12;

      if (this.sunLight) {
        this.sunLight.position.set(this.camTarget.x - 350, 750, this.camTarget.z - 450);
        this.sunLight.target.position.set(this.camTarget.x, 0, this.camTarget.z);
      }
    }

    const cy = Math.cos(this.camPitch);
    const sy = Math.sin(this.camPitch);
    const cx = Math.sin(this.camYaw);
    const cz = Math.cos(this.camYaw);

    const targetCamX = this.camTarget.x + cx * cy * this.camDist;
    const targetCamY = Math.max(8, this.camTarget.y + sy * this.camDist);
    const targetCamZ = this.camTarget.z + cz * cy * this.camDist;

    this.camPosSmoothed.lerp(new THREE.Vector3(targetCamX, targetCamY, targetCamZ), clamp(dt * 7.5, 0, 1));
    this.camera.position.copy(this.camPosSmoothed);
    this.camera.lookAt(this.camTarget);

    // Entities
    const entities = state.entities || [];
    const activeIds = new Set<number | string>();
    for (const ent of entities) {
      const id = ent.id !== undefined ? ent.id : ent[0];
      const ex = ent.x !== undefined ? ent.x : ent[1];
      const ey = ent.y !== undefined ? ent.y : ent[2];
      const face = ent.face !== undefined ? ent.face : (ent[5] ? ent[5] / 100 : 0);
      const team = ent.team || ent[6] || 'P';
      const mud = ent.mud !== undefined ? ent.mud : ent[10] || 0;

      activeIds.add(id);
      let mesh = this.charPool.get(id);
      const isMe = me && me.id === id;
      if (!mesh) {
        mesh = this.createCharacterMesh(team, mud, isMe);
        this.entitiesGroup.add(mesh);
        this.charPool.set(id, mesh);
      }
      mesh.position.set(ex, 0, ey);
      mesh.rotation.y = -face + Math.PI / 2;
    }

    for (const [id, mesh] of this.charPool.entries()) {
      if (!activeIds.has(id)) {
        this.entitiesGroup.remove(mesh);
        this.charPool.delete(id);
      }
    }

    this.renderer.render(this.scene, this.camera);
  }

  public resize(w: number, h: number) {
    this.width = w;
    this.height = h;
    if (this.camera && this.renderer) {
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    }
  }

  public dispose() {
    if (this.renderer) {
      this.renderer.dispose();
    }
    this.isInitialized = false;
  }
}
