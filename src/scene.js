import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RunState, LANES, crossedPlayer, makeRow } from './rules.js';

const CYAN = 0x53efde;
const ORANGE = 0xff6536;
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const diamondGeometry = new THREE.OctahedronGeometry(0.36);
const temp = new THREE.Object3D();
const random = (a, b) => a + Math.random() * (b - a);
const lerp = THREE.MathUtils.lerp;

function basic(color) { return new THREE.MeshBasicMaterial({ color }); }
function box(parent, material, x, y, z, w, h, d) {
  const mesh = new THREE.Mesh(boxGeometry, material);
  mesh.position.set(x, y, z);
  mesh.scale.set(w, h, d);
  parent.add(mesh);
  return mesh;
}

export class Afterburn {
  constructor(container, events) {
    this.container = container;
    this.events = events;
    this.state = new RunState();
    this.mode = 'menu';
    this.targetLane = 1;
    this.keys = new Set();
    this.obstacles = [];
    this.pickups = [];
    this.particles = [];
    this.roadDistance = 0;
    this.spawnDistance = 0;
    this.shake = 0;
    this.elapsed = 0;
    this.countdown = 0;
    this.lastCountdown = '';
    this.fps = 60;
    this.reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x1b142b, 0.009);
    this.camera = new THREE.PerspectiveCamera(57, 1, 0.1, 550);
    this.camera.position.set(0, 4.6, 16);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    container.appendChild(this.renderer.domElement);

    this.materials = {
      cyan: basic(CYAN), orange: basic(ORANGE), dimCyan: basic(0x1c5d61), dimOrange: basic(0x9f3b30),
      black: new THREE.MeshStandardMaterial({ color: 0x171722, roughness: 0.42, metalness: 0.65 }),
      silver: new THREE.MeshStandardMaterial({ color: 0xaaa6b2, roughness: 0.35, metalness: 0.75 }),
      hull: new THREE.MeshStandardMaterial({ color: 0xd3d0d2, roughness: 0.4, metalness: 0.65 }),
      window: new THREE.MeshStandardMaterial({ color: 0x102331, emissive: 0x0c4a60, emissiveIntensity: 0.8, metalness: 0.95, roughness: 0.15 }),
      barrier: new THREE.MeshStandardMaterial({ color: 0x682a29, emissive: 0x461811, roughness: 0.6, metalness: 0.4 }),
      particle: basic(CYAN),
    };
    this.scene.add(new THREE.HemisphereLight(0x8ca8ec, 0x39283b, 3));
    const rim = new THREE.DirectionalLight(0xff7d51, 4);
    rim.position.set(4, 14, -50);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0x4acaca, 3);
    fill.position.set(-12, 5, 10);
    this.scene.add(fill);

    this.buildSky();
    this.buildRoad();
    this.buildCity();
    this.buildShip();
    this.buildParticles();
    this.seedMenu();

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(800, 500), 0.62, 0.55, 0.72);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.bindInput();
    this.lastTime = performance.now();
    this.animate = this.animate.bind(this);
    this.animationFrame = requestAnimationFrame(this.animate);
    this.renderer.domElement.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      this.pause();
      this.events.onSector('— // GRAPHICS INTERRUPTED. RELOAD TO RECONNECT');
    });
  }

  buildSky() {
    const sky = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      vertexShader: 'varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
      fragmentShader: 'varying vec3 vPosition; void main(){float h=normalize(vPosition).y;vec3 low=vec3(.27,.105,.185);vec3 high=vec3(.038,.035,.085);gl_FragColor=vec4(mix(low,high,smoothstep(-.08,.65,h)),1.);}',
    }));
    this.scene.add(sky);
    const sun = new THREE.Mesh(new THREE.PlaneGeometry(112, 112), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false,
      vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `varying vec2 vUv;
        void main(){vec2 uv=vUv-.5;float r=length(uv);if(r>.49)discard;
        float stripe=step(.14,fract(vUv.y*17.));if(vUv.y<.55&&stripe<.5)discard;
        vec3 color=mix(vec3(1.3,.055,.025),vec3(1.3,.34,.065),vUv.y);
        gl_FragColor=vec4(color,smoothstep(.49,.475,r)*.96);}`,
    }));
    sun.position.set(0, 51, -290);
    this.scene.add(sun);
    const stars = new Float32Array(240 * 3);
    for (let i = 0; i < 240; i++) {
      stars[i * 3] = random(-300, 300);
      stars[i * 3 + 1] = random(35, 180);
      stars[i * 3 + 2] = random(-350, -80);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.BufferAttribute(stars, 3));
    this.scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xc1a2cb, size: 0.23, transparent: true, opacity: 0.6, fog: false })));
  }

  buildRoad() {
    const roadMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec3 vWorld; void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: `uniform float uTime;varying vec3 vWorld;
        void main(){float x=vWorld.x;float z=vWorld.z-uTime;
        float gridX=1.-smoothstep(.015,.04,abs(fract(x/4.2+.5)-.5));
        float gridZ=1.-smoothstep(.012,.025,abs(fract(z/9.)-.5));
        float edge=pow(max(0.,1.-abs(abs(x)-6.9)/5.),3.);
        vec3 color=vec3(.025,.025,.045)+vec3(.015,.045,.055)*(gridX+gridZ)+vec3(.012,.035,.04)*edge;
        float fade=exp(-max(0.,-vWorld.z)*.01);color=mix(vec3(.085,.045,.105),color,fade);
        gl_FragColor=vec4(color,1.);}`,
    });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(15.5, 510), roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, -0.1, -225);
    this.roadMaterial = roadMaterial;
    this.scene.add(road);
    box(this.scene, basic(0x100e1a), 0, -0.55, -225, 400, 0.6, 510);
    for (const x of [-7.7, 7.7]) {
      box(this.scene, this.materials.black, x, 0.15, -225, 0.5, 0.5, 510);
      box(this.scene, this.materials.cyan, x, 0.42, -225, 0.09, 0.06, 510);
      box(this.scene, this.materials.dimCyan, x, -0.05, -225, 0.8, 0.04, 510);
    }
    this.roadMarks = new THREE.InstancedMesh(boxGeometry, basic(0x647383), 100);
    this.scene.add(this.roadMarks);
    this.sideLights = new THREE.InstancedMesh(boxGeometry, this.materials.cyan, 80);
    this.scene.add(this.sideLights);
    this.updateRoad(0);
    this.gates = [];
    const gateMaterial = basic(0x393344);
    for (let i = 0; i < 5; i++) {
      const gate = new THREE.Group();
      for (const x of [-8.3, 8.3]) {
        box(gate, this.materials.black, x, 4.8, 0, 0.7, 9.8, 0.7);
        box(gate, this.materials.dimCyan, x - Math.sign(x) * 0.37, 5, 0, 0.06, 9.8, 0.15);
      }
      box(gate, gateMaterial, 0, 9.8, 0, 17, 0.7, 0.7);
      box(gate, this.materials.orange, 0, 9.4, 0.4, 3.2, 0.12, 0.04);
      gate.position.z = -i * 85 - 25;
      this.scene.add(gate);
      this.gates.push(gate);
    }
  }

  buildCity() {
    const count = 150;
    this.buildings = new THREE.InstancedMesh(boxGeometry, new THREE.MeshStandardMaterial({ color: 0x1c1a2a, roughness: 0.85, metalness: 0.3 }), count);
    this.buildings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.buildingData = [];
    this.windowLines = new THREE.InstancedMesh(boxGeometry, basic(0x38777f), count * 4);
    this.accentLines = new THREE.InstancedMesh(boxGeometry, this.materials.dimCyan, count);
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const nearRoad = i < 60;
      const x = side * (nearRoad ? random(14, 29) : random(27, 105));
      const z = nearRoad ? random(-400, 25) : random(-380, -45);
      const w = nearRoad ? random(3, 7) : random(4, 15);
      const h = nearRoad ? random(5, 30) : random(10, 65);
      const d = random(3, 10);
      this.buildingData.push({ x, z, w, h, d });
    }
    this.scene.add(this.buildings, this.windowLines, this.accentLines);
    this.updateCity(0);

    // Floating signs are drawn locally so the whole city works without image requests.
    for (const [text, x, z, color] of [['夜行', -14, -46, '#72e8d9'], ['24 / 7', 16, -79, '#ff734e'], ['NEO', -17, -145, '#ff734e'], ['高速', 13, -215, '#69dcd8']]) {
      const canvas = document.createElement('canvas');
      canvas.width = 256; canvas.height = 512;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#17101f'; ctx.fillRect(0, 0, 256, 512);
      ctx.strokeStyle = color; ctx.lineWidth = 8; ctx.strokeRect(7, 7, 242, 498);
      ctx.fillStyle = color; ctx.textAlign = 'center';
      ctx.font = 'bold 95px sans-serif';
      if (text.length === 2) { ctx.fillText(text[0], 128, 200); ctx.fillText(text[1], 128, 340); }
      else { ctx.save(); ctx.translate(128, 256); ctx.rotate(Math.PI / 2); ctx.font = 'bold 76px sans-serif'; ctx.fillText(text, 0, 27); ctx.restore(); }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 6.4), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
      sign.position.set(x, 9, z);
      sign.rotation.y = x < 0 ? 0.25 : -0.25;
      this.scene.add(sign);
    }

    const hills = new THREE.Group();
    for (let i = 0; i < 22; i++) {
      const h = random(10, 55);
      const mountain = new THREE.Mesh(new THREE.ConeGeometry(random(18, 40), h, 4), basic(0x201528));
      mountain.position.set((i - 11) * 20, h / 2 - 5, -320 - random(0, 40));
      mountain.rotation.y = Math.PI / 4;
      hills.add(mountain);
    }
    this.scene.add(hills);
  }

  buildShip() {
    this.ship = new THREE.Group();
    const hullShape = new THREE.Shape();
    hullShape.moveTo(0, -2.1);
    hullShape.lineTo(0.58, -0.9);
    hullShape.lineTo(0.8, 1.3);
    hullShape.lineTo(0.35, 1.65);
    hullShape.lineTo(-0.35, 1.65);
    hullShape.lineTo(-0.8, 1.3);
    hullShape.lineTo(-0.58, -0.9);
    hullShape.closePath();
    const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(hullShape, { depth: 0.42, bevelEnabled: true, bevelSize: 0.14, bevelThickness: 0.13, bevelSegments: 1, steps: 1 }), this.materials.hull);
    hull.rotation.x = Math.PI / 2;
    hull.position.y = 0.32;
    this.ship.add(hull);
    box(this.ship, this.materials.black, 0, 0.3, 0.2, 0.56, 0.42, 2.8);
    const canopy = box(this.ship, this.materials.window, 0, 0.66, -0.2, 0.58, 0.42, 1.45);
    canopy.rotation.x = -0.12;
    box(this.ship, this.materials.orange, 0, 0.39, -1.47, 0.12, 0.06, 1.3);
    box(this.ship, this.materials.orange, -0.36, 0.39, 1.06, 0.1, 0.09, 0.9);
    box(this.ship, this.materials.orange, 0.36, 0.39, 1.06, 0.1, 0.09, 0.9);
    this.engines = [];
    this.flames = [];
    for (const side of [-1, 1]) {
      const wing = box(this.ship, this.materials.silver, side * 1.12, 0.07, 0.65, 1.45, 0.16, 1.8);
      wing.rotation.y = side * -0.22;
      box(this.ship, this.materials.black, side * 1.65, 0.2, 0.75, 0.45, 0.5, 2.35);
      box(this.ship, this.materials.orange, side * 1.65, 0.49, 0.75, 0.11, 0.05, 2.3);
      box(this.ship, this.materials.cyan, side * 1.65, 0.21, 1.95, 0.28, 0.26, 0.08);
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.17, 2, 8), new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
      flame.rotation.x = Math.PI / 2;
      flame.position.set(side * 1.65, 0.22, 2.9);
      this.ship.add(flame);
      this.flames.push(flame);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.08, 1.2, 6), basic(0xd4ffff));
      inner.rotation.x = Math.PI / 2;
      inner.position.set(side * 1.65, 0.22, 2.5);
      this.ship.add(inner);
      this.engines.push(inner);
      const fin = box(this.ship, this.materials.black, side * 1.65, 0.75, 1.15, 0.09, 0.8, 0.9);
      fin.rotation.z = side * -0.2;
    }
    const headlight = new THREE.PointLight(CYAN, 6, 8, 2);
    headlight.position.set(0, 0.4, -1.5);
    this.ship.add(headlight);
    this.ship.position.set(0, 0.8, 6);
    this.scene.add(this.ship);
    this.shipGlow = new THREE.Mesh(new THREE.PlaneGeometry(7, 9), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
      fragmentShader: 'varying vec2 vUv;void main(){float a=pow(max(0.,1.-length((vUv-.5)*2.)),2.);gl_FragColor=vec4(.08,.6,.6,a*.23);}',
    }));
    this.shipGlow.rotation.x = -Math.PI / 2;
    this.shipGlow.position.set(0, 0.01, 6);
    this.scene.add(this.shipGlow);
  }

  buildParticles() {
    this.trailCount = 100;
    this.trailPositions = new Float32Array(this.trailCount * 3);
    this.trailLife = new Float32Array(this.trailCount);
    for (let i = 0; i < this.trailCount; i++) this.trailPositions[i * 3 + 1] = -10;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
    this.trail = new THREE.Points(geometry, new THREE.PointsMaterial({ color: CYAN, size: 0.1, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.scene.add(this.trail);
    this.trailIndex = 0;
    this.sparks = new THREE.Group();
    this.scene.add(this.sparks);
    this.speedStreaks = [];
    const streakMaterial = new THREE.LineBasicMaterial({ color: 0x70e4e4, transparent: true, opacity: 0.27 });
    for (let i = 0; i < 45; i++) {
      const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, random(2, 10))]);
      const streak = new THREE.Line(geometry, streakMaterial);
      streak.position.set((i % 2 ? -1 : 1) * random(7, 23), random(0.5, 13), random(-160, 12));
      this.scene.add(streak);
      this.speedStreaks.push(streak);
    }
  }

  createBarrier(lane, z) {
    const group = new THREE.Group();
    box(group, this.materials.black, 0, 0.16, 0, 3.45, 0.32, 1.75);
    box(group, this.materials.barrier, 0, 0.95, 0, 3.0, 1.5, 1.25);
    box(group, this.materials.orange, 0, 1.73, 0, 3.25, 0.12, 1.45);
    box(group, this.materials.orange, 0, 0.48, 0.65, 3.0, 0.08, 0.08);
    for (const x of [-1.35, 1.35]) box(group, this.materials.orange, x, 1.05, 0.66, 0.12, 1.1, 0.08);
    for (const x of [-0.7, 0, 0.7]) {
      const slash = box(group, this.materials.orange, x, 1.1, 0.67, 0.12, 0.75, 0.04);
      slash.rotation.z = -0.5;
    }
    group.position.set(LANES[lane], 0, z);
    this.scene.add(group);
    this.obstacles.push({ mesh: group, lane, passed: false, hit: false });
  }

  createPickup(lane, z) {
    const group = new THREE.Group();
    const diamond = new THREE.Mesh(diamondGeometry, this.materials.cyan);
    group.add(diamond);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.57, 0.018, 4, 20), this.materials.dimCyan);
    halo.rotation.x = Math.PI / 2;
    group.add(halo);
    group.position.set(LANES[lane], 1.08, z);
    this.scene.add(group);
    this.pickups.push({ mesh: group, phase: Math.random() * 6 });
  }

  spawnRow(z) {
    const row = makeRow(Math.random, this.state.time / 20);
    row.blocked.forEach(lane => this.createBarrier(lane, z));
    for (let i = 0; i < 3; i++) this.createPickup(row.safeLane, z - i * 5.5);
  }

  seedMenu() {
    this.clearObjects();
    this.createBarrier(0, -35);
    this.createBarrier(2, -70);
    this.createBarrier(1, -105);
    for (let i = 0; i < 6; i++) this.createPickup(1, -15 - i * 7);
    for (let i = 0; i < 4; i++) this.createPickup(2, -90 - i * 7);
  }

  clearObjects() {
    for (const entity of [...this.obstacles, ...this.pickups]) this.removeEntity(entity);
    this.obstacles = [];
    this.pickups = [];
    for (const particle of this.particles) this.sparks.remove(particle.mesh);
    this.particles = [];
  }

  removeEntity(entity) {
    this.scene.remove(entity.mesh);
    // Shared geometries and materials are retained. Only pickup halo geometry is unique.
    entity.mesh.traverse(child => {
      if (child.geometry?.type === 'TorusGeometry') child.geometry.dispose();
    });
  }

  start() {
    this.state.reset();
    this.targetLane = 1;
    this.ship.position.x = 0;
    this.ship.visible = true;
    this.clearObjects();
    this.keys.clear();
    this.touchBoost = false;
    this.shake = 0;
    this.roadDistance = 0;
    this.spawnDistance = 0;
    this.countdown = 3.7;
    this.lastCountdown = '';
    this.state.speed = 34;
    for (let z = -78; z > -220; z -= 38) this.spawnRow(z);
    this.setMode('countdown');
  }

  home() {
    this.keys.clear();
    this.touchBoost = false;
    this.ship.visible = true;
    this.targetLane = 1;
    this.seedMenu();
    this.setMode('menu');
  }

  setMode(mode) { this.mode = mode; this.events.onMode(mode); }

  pause() {
    if (this.mode !== 'playing' && this.mode !== 'countdown') return;
    this.resumeMode = this.mode;
    this.keys.clear();
    this.touchBoost = false;
    this.setMode('paused');
  }

  resume() {
    if (this.mode !== 'paused') return;
    this.keys.clear();
    this.setMode(this.resumeMode || 'playing');
    this.lastTime = performance.now();
  }

  moveLane(direction) {
    if (this.mode !== 'playing' && this.mode !== 'countdown') return;
    this.targetLane = THREE.MathUtils.clamp(this.targetLane + direction, 0, 2);
  }

  bindInput() {
    window.addEventListener('keydown', e => {
      if (document.querySelector('dialog[open]')) return;
      this.keys.add(e.code);
      if (!e.repeat) {
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') this.moveLane(-1);
        if (e.code === 'ArrowRight' || e.code === 'KeyD') this.moveLane(1);
      }
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.pause());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pause(); });
  }

  attachTouch(left, right, boost, surface) {
    for (const [element, direction] of [[left, -1], [right, 1]]) element.addEventListener('pointerdown', e => { e.preventDefault(); this.moveLane(direction); });
    boost.addEventListener('pointerdown', e => { e.preventDefault(); boost.setPointerCapture(e.pointerId); this.touchBoost = true; });
    const stopBoost = () => { this.touchBoost = false; };
    boost.addEventListener('pointerup', stopBoost);
    boost.addEventListener('pointercancel', stopBoost);
    boost.addEventListener('lostpointercapture', stopBoost);
    let touchX = 0;
    surface.addEventListener('pointerdown', e => { touchX = e.clientX; surface.setPointerCapture(e.pointerId); });
    surface.addEventListener('pointerup', e => { if (Math.abs(e.clientX - touchX) > 25) this.moveLane(e.clientX > touchX ? 1 : -1); });
  }

  updateRoad(distance) {
    this.roadMaterial.uniforms.uTime.value = distance;
    for (let i = 0; i < 100; i++) {
      temp.position.set(i % 2 ? -2.1 : 2.1, -0.075, -(Math.floor(i / 2) * 9) + distance % 9 + 15);
      temp.rotation.set(0, 0, 0);
      temp.scale.set(0.06, 0.015, 2.0);
      temp.updateMatrix();
      this.roadMarks.setMatrixAt(i, temp.matrix);
    }
    this.roadMarks.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < 80; i++) {
      temp.position.set(i % 2 ? -7.35 : 7.35, 0.08, -Math.floor(i / 2) * 12 + distance % 12 + 15);
      temp.scale.set(0.3, 0.04, 2.7);
      temp.updateMatrix();
      this.sideLights.setMatrixAt(i, temp.matrix);
    }
    this.sideLights.instanceMatrix.needsUpdate = true;
  }

  updateCity(movement) {
    this.buildingData.forEach((building, i) => {
      building.z += movement;
      if (building.z > 35) building.z -= 430;
      const { x, z, w, h, d } = building;
      temp.position.set(x, h / 2 - 0.3, z);
      temp.scale.set(w, h, d);
      temp.rotation.set(0, 0, 0);
      temp.updateMatrix(); this.buildings.setMatrixAt(i, temp.matrix);
      for (let j = 0; j < 4; j++) {
        temp.position.set(x, h * (0.25 + j * 0.18), z + d / 2 + 0.02);
        temp.scale.set(w * 0.7, j % 2 ? 0.09 : 0.18, 0.03);
        temp.updateMatrix(); this.windowLines.setMatrixAt(i * 4 + j, temp.matrix);
      }
      temp.position.set(x - Math.sign(x) * (w / 2 + 0.02), h / 2, z + d / 2 + 0.04);
      temp.scale.set(0.065, h * 0.9, 0.06);
      temp.updateMatrix(); this.accentLines.setMatrixAt(i, temp.matrix);
    });
    this.buildings.instanceMatrix.needsUpdate = true;
    this.windowLines.instanceMatrix.needsUpdate = true;
    this.accentLines.instanceMatrix.needsUpdate = true;
    // Moving city instances must not use a stale bounding sphere for culling.
    this.buildings.frustumCulled = false;
    this.windowLines.frustumCulled = false;
    this.accentLines.frustumCulled = false;
  }

  burst(x, z, color, amount = 16) {
    for (let i = 0; i < amount; i++) {
      const mesh = new THREE.Mesh(boxGeometry, color === CYAN ? this.materials.cyan : this.materials.orange);
      mesh.position.set(x, 1, z);
      mesh.scale.setScalar(random(0.045, 0.13));
      this.sparks.add(mesh);
      this.particles.push({ mesh, vx: random(-5, 5), vy: random(1, 6), vz: random(-5, 8), life: random(0.3, 0.8) });
    }
  }

  updateGameplay(dt) {
    const previousSector = this.state.sector;
    this.state.update(dt, this.keys.has('Space') || this.keys.has('ArrowUp') || this.keys.has('KeyW') || this.touchBoost);
    const step = this.state.speed * dt;
    this.roadDistance += step;
    this.spawnDistance += step;
    if (this.spawnDistance > 38) { this.spawnDistance -= 38; this.spawnRow(-220 + this.spawnDistance); }
    if (this.state.sector > previousSector) this.events.onSector(this.state.sector);
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obstacle = this.obstacles[i];
      const previousZ = obstacle.mesh.position.z;
      obstacle.mesh.position.z += step;
      const dx = Math.abs(this.ship.position.x - obstacle.mesh.position.x);
      if (!obstacle.hit && crossedPlayer(previousZ, obstacle.mesh.position.z) && dx < 2.12) {
        obstacle.hit = true;
        if (this.state.hit()) {
          this.events.onHit();
          this.shake = this.reducedMotion ? 0.05 : 0.5;
          this.burst(this.ship.position.x, 6, ORANGE, 30);
        }
      }
      if (!obstacle.passed && obstacle.mesh.position.z > 9) {
        obstacle.passed = true;
        if (!obstacle.hit && dx < 4.9 && dx >= 2.12 && !this.state.over) {
          this.state.nearMiss();
          this.events.onNearMiss();
        }
      }
      if (obstacle.mesh.position.z > 25) {
        this.removeEntity(obstacle);
        this.obstacles.splice(i, 1);
      }
    }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      const previousZ = pickup.mesh.position.z;
      pickup.mesh.position.z += step;
      if (crossedPlayer(previousZ, pickup.mesh.position.z, 6, 1.2) && Math.abs(pickup.mesh.position.x - this.ship.position.x) < 1.45) {
        this.state.pickup();
        this.events.onPickup();
        this.burst(pickup.mesh.position.x, pickup.mesh.position.z, CYAN, 8);
        this.removeEntity(pickup); this.pickups.splice(i, 1);
      } else if (pickup.mesh.position.z > 25) { this.removeEntity(pickup); this.pickups.splice(i, 1); }
    }
    if (this.state.over) {
      this.keys.clear();
      this.touchBoost = false;
      this.ship.visible = true;
      this.setMode('over');
    }
    return step;
  }

  updateEffects(dt, movement) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      p.vy -= 8 * dt;
      p.mesh.position.x += p.vx * dt;
      p.mesh.position.y += p.vy * dt;
      p.mesh.position.z += p.vz * dt + movement * 0.2;
      p.mesh.rotation.x += dt * 4;
      if (p.life <= 0) { this.sparks.remove(p.mesh); this.particles.splice(i, 1); }
    }
    const active = this.mode === 'playing' || this.mode === 'menu' || this.mode === 'countdown';
    if (active) {
      for (const side of [-1, 1]) {
        const i = this.trailIndex++ % this.trailCount;
        this.trailPositions[i * 3] = this.ship.position.x + side * 1.65;
        this.trailPositions[i * 3 + 1] = this.ship.position.y + 0.15;
        this.trailPositions[i * 3 + 2] = 8.3;
        this.trailLife[i] = 0.65;
      }
    }
    for (let i = 0; i < this.trailCount; i++) {
      this.trailLife[i] -= dt;
      if (this.trailLife[i] > 0) { this.trailPositions[i * 3 + 2] += Math.max(movement, dt * 12); this.trailPositions[i * 3 + 1] -= dt * 0.2; }
      else this.trailPositions[i * 3 + 1] = -10;
    }
    this.trail.geometry.attributes.position.needsUpdate = true;
    this.trail.frustumCulled = false;
    for (const streak of this.speedStreaks) {
      streak.visible = this.state.boosting && this.mode === 'playing' && !this.reducedMotion;
      streak.position.z += movement * 2.2;
      if (streak.position.z > 18) streak.position.z -= 180;
    }
    for (const pickup of this.pickups) {
      pickup.mesh.rotation.y += dt * 1.7;
      pickup.mesh.children[0].rotation.z = Math.sin(this.elapsed * 2 + pickup.phase) * 0.2;
      pickup.mesh.position.y = 1.1 + Math.sin(this.elapsed * 3 + pickup.phase) * 0.12;
    }
  }

  resize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (!width || !height) return;
    this.width = width; this.height = height;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
    this.bloom.resolution.set(width * 0.5, height * 0.5);
  }

  animate(now) {
    this.animationFrame = requestAnimationFrame(this.animate);
    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(0.05, rawDt);
    this.lastTime = now;
    if (document.hidden) return;
    this.fps = lerp(this.fps, 1 / Math.max(0.001, rawDt), 0.025);
    this.elapsed += dt;
    let movement = 0;
    if (this.mode === 'countdown') {
      this.countdown -= dt;
      const number = this.countdown > 0.7 ? String(Math.ceil(this.countdown - 0.7)) : 'GO';
      if (number !== this.lastCountdown) { this.lastCountdown = number; this.events.onCountdown(number); }
      if (this.countdown <= 0) this.setMode('playing');
    }
    const active = this.mode === 'playing';
    this.ship.position.x = lerp(this.ship.position.x, LANES[this.targetLane], 1 - Math.exp(-dt * 11));
    if (active) movement = this.updateGameplay(dt);
    else if (this.mode === 'menu') { movement = dt * 8; this.roadDistance += movement; }
    const frozen = this.mode === 'paused' || this.mode === 'over';
    if (!frozen) {
      this.updateRoad(this.roadDistance);
      this.updateCity(movement * 0.72);
      for (const gate of this.gates) { gate.position.z += movement; if (gate.position.z > 25) gate.position.z -= 425; }
      this.ship.position.y = 0.78 + Math.sin(this.elapsed * 5) * 0.055;
      this.ship.rotation.z = lerp(this.ship.rotation.z, (this.ship.position.x - LANES[this.targetLane]) * 0.08, 1 - Math.exp(-dt * 8));
      this.ship.rotation.x = Math.sin(this.elapsed * 3) * 0.012;
      this.ship.visible = !(this.state.invulnerable > 0 && active) || Math.floor(this.elapsed * 15) % 2 === 0;
      this.shipGlow.position.x = this.ship.position.x;
      this.flames.forEach((flame, i) => { const size = this.state.boosting && active ? 2.3 : 0.75; flame.scale.y = size + Math.sin(this.elapsed * 35 + i) * 0.15; flame.position.z = 1.8 + flame.scale.y; });
      this.updateEffects(dt, movement);
    }
    const menu = this.mode === 'menu';
    const narrow = this.width / this.height < 1.05;
    const desiredCameraX = menu ? (narrow ? -0.8 : -4.8) : this.ship.position.x * 0.3;
    const desiredCameraY = menu ? 5.0 : 4.3;
    const desiredCameraZ = menu ? (narrow ? 22 : 18.5) : 16;
    const ease = 1 - Math.exp(-dt * 3.5);
    this.camera.position.x = lerp(this.camera.position.x, desiredCameraX, ease);
    this.camera.position.y = lerp(this.camera.position.y, desiredCameraY, ease);
    this.camera.position.z = lerp(this.camera.position.z, desiredCameraZ, ease);
    this.shake = Math.max(0, this.shake - dt);
    if (this.shake && active) { this.camera.position.x += random(-1, 1) * this.shake * 0.2; this.camera.position.y += random(-1, 1) * this.shake * 0.15; }
    this.camera.lookAt(menu ? (narrow ? -0.8 : -4.8) : this.ship.position.x * 0.38, menu ? 1.5 : 1.45, menu ? -24 : -30);
    const fov = this.state.boosting && active && !this.reducedMotion ? 69 : 57;
    if (Math.abs(this.camera.fov - fov) > 0.01) { this.camera.fov = lerp(this.camera.fov, fov, ease); this.camera.updateProjectionMatrix(); }
    if (active || this.mode === 'countdown') this.events.onTick(this.state);
    this.composer.render();
  }
}
