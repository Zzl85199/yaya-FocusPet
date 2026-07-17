/* ============================================================
   world.js — 3D 房間:地板、地毯、盆栽、窗光、扭蛋機、鏡頭
   ============================================================ */
(function(){
const P = YY.PAL, M = YY.M, mat = YY.mat;

YY.initWorld = function(){
  const renderer = new THREE.WebGLRenderer({ antialias:true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.88;   // 再降一點,避免整體死白
  document.getElementById('stage').appendChild(renderer.domElement);
  YY.renderer = renderer;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(P.bg);
  scene.fog = new THREE.Fog(P.bg, 26, 46);   // 霧往後推,畫面更透亮不糊
  YY.scene = scene;

  /* 房間裡的東西全部收進 roomGroup,進森林時整組隱藏(燈光留在 scene 照亮兩邊) */
  const room = new THREE.Group();
  scene.add(room);
  YY.roomGroup = room;

  const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, .1, 60);
  YY.camera = camera;
  YY.cam = { theta:.35, phi:1.12, radius:10.5, target:new THREE.Vector3(0, 1.5, 0) };
  updateCam();

  /* ---------- 光(整體調亮,正面補一盞柔光) ---------- */
  scene.add(new THREE.HemisphereLight(0xFBF3E0, 0xAFC49C, .55));
  scene.add(new THREE.AmbientLight(0xF3ECD8, .22));
  const sun = new THREE.DirectionalLight(0xFFF1D6, .90);
  sun.position.set(6, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -9; sun.shadow.camera.right = 9;
  sun.shadow.camera.top = 9;   sun.shadow.camera.bottom = -9;
  scene.add(sun);
  /* 正面補光:讓芽芽的臉不會黑黑的 */
  const fill = new THREE.DirectionalLight(0xFFFFFF, .20);
  fill.position.set(-3, 5, 9);
  scene.add(fill);

  /* ---------- 地板 / 牆 ---------- */
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, .3, 48), mat(P.floor));
  floor.position.y = -.15;
  floor.receiveShadow = true;
  room.add(floor);
  YY.floor = floor;

  const rug = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, .05, 40), mat(P.rug));
  rug.position.y = .03; rug.receiveShadow = true;
  room.add(rug);
  const rugRim = new THREE.Mesh(new THREE.TorusGeometry(3.4, .06, 8, 44), mat(0xE8C97A));
  rugRim.rotation.x = Math.PI / 2; rugRim.position.y = .06;
  room.add(rugRim);

  const wallMat = mat(P.wall, { side:THREE.DoubleSide });
  const wall1 = new THREE.Mesh(new THREE.PlaneGeometry(22, 9), wallMat);
  wall1.position.set(0, 4.5, -10.5);
  const wall2 = new THREE.Mesh(new THREE.PlaneGeometry(22, 9), wallMat);
  wall2.rotation.y = Math.PI / 2; wall2.position.set(-10.5, 4.5, 0);
  room.add(wall1, wall2);
  const skirt1 = new THREE.Mesh(new THREE.BoxGeometry(22, .5, .18), mat(0xE2DCC6));
  skirt1.position.set(0, .25, -10.42); room.add(skirt1);
  const skirt2 = skirt1.clone(); skirt2.rotation.y = Math.PI / 2; skirt2.position.set(-10.42, .25, 0);
  room.add(skirt2);

  /* ---------- 通往牙牙森林的門(#1:點門就走出房間到森林) ---------- */
  YY.roomDoor = buildDoor();
  YY.roomDoor.position.set(-4.2, 0, -10.32);
  room.add(YY.roomDoor);

  /* 窗戶(牆上一塊暖光) */
  const win = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 3.0),
    mat(0xF5E4B0, { emissive:0xF2DA96, emissiveIntensity:.3 }));
  win.position.set(3.2, 4.6, -10.44);
  room.add(win);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(3.7, .16, .1), mat(P.ink));
  const f1 = frame.clone(); f1.position.set(3.2, 6.15, -10.4);
  const f2 = frame.clone(); f2.position.set(3.2, 3.05, -10.4);
  const f3 = frame.clone(); f3.position.set(3.2, 4.6, -10.4);
  const f4 = new THREE.Mesh(new THREE.BoxGeometry(.16, 3.2, .1), mat(P.ink)); f4.position.set(3.2, 4.6, -10.4);
  const f5 = f4.clone(); f5.position.x = 1.4;  const f6 = f4.clone(); f6.position.x = 5.0;
  room.add(f1, f2, f3, f4, f5, f6);

  /* ---------- 盆栽(芽芽的躲藏點) ---------- */
  const plant = new THREE.Group();
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(.55, .42, .7, 18), mat(P.pot));
  pot.position.y = .35; pot.castShadow = true;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(.6, .58, .16, 18), mat(0xA85B3F));
  rim.position.y = .72;
  plant.add(pot, rim);
  for(let i = 0; i < 5; i++){
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(.3, 10, 8),
      mat(i % 2 ? P.leaf : P.leafDark));
    leaf.scale.set(.5, 1.6 + Math.random() * .8, .3);
    const a = i / 5 * Math.PI * 2;
    leaf.position.set(Math.cos(a) * .2, 1.15 + Math.random() * .3, Math.sin(a) * .2);
    leaf.rotation.z = Math.cos(a) * .5;
    leaf.rotation.x = Math.sin(a) * .5;
    leaf.castShadow = true;
    plant.add(leaf);
  }
  plant.position.set(-4.6, 0, -3.2);
  room.add(plant);

  /* ---------- 扭蛋機(本專案的招牌!) ---------- */
  YY.machine = buildMachine();
  YY.machine.position.set(4.4, 0, -2.6);
  YY.machine.rotation.y = -.5;
  room.add(YY.machine);

  /* ---------- 會被互動的小道具:積木塔 / 豆袋 / 紙箱 ---------- */
  buildProps(room);

  /* ---------- 躲藏點(好感度低時會躲去這些地方偷看你) ---------- */
  YY.hideSpots = [
    { x:-3.7, z:-2.3 },   // 盆栽旁
    { x: 3.0, z:-2.7 },   // 紙箱後面
  ];

  /* ---------- 粒子池 ---------- */
  YY.particles = [];

  addEventListener('resize', () => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  });

  /* 房間蓋好後,順手把森林也蓋起來(先隱藏) */
  if(YY.initForest) YY.initForest();
};

/* ---------- 通往森林的門 ---------- */
function buildDoor(){
  const g = new THREE.Group();
  const jamb = mat(0x8A5A3A);
  const frame = new THREE.Mesh(new THREE.BoxGeometry(1.7, 3.1, .2), jamb);
  frame.position.y = 1.55; g.add(frame);
  const panel = new THREE.Mesh(new THREE.BoxGeometry(1.35, 2.75, .12), mat(0xC98A5A));
  panel.position.set(0, 1.42, .1); g.add(panel);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), mat(0xF2C14E));
  knob.position.set(.5, 1.4, .2); g.add(knob);
  /* 門上小牌子:牙牙森林 */
  const sign = new THREE.Mesh(new THREE.BoxGeometry(1.4, .5, .08), mat(0x6FA25E));
  sign.position.set(0, 3.05, .12); g.add(sign);
  g.userData.isDoor = true;
  g.traverse(o => { if(o.isMesh){ o.castShadow = true; o.userData.isDoor = true; } });
  return g;
}

function buildMachine(){
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.95, 1.05, 1.5, 20), mat(0xE4573D));
  base.position.y = .75; base.castShadow = true;
  const trim = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, .18, 20), mat(YY.PAL.ink));
  trim.position.y = 1.5;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(.92, 22, 16),
    mat(P.glass, { transparent:true, opacity:.4 }));
  dome.position.y = 2.25;
  g.add(base, trim, dome);

  /* 裡面的彩色扭蛋 */
  const cols = [0xE4573D, 0xF2C14E, 0x6FA25E, 0x5A9BD8, 0x9B7FD4, 0xF2A0B5, 0xF5EFE0];
  for(let i = 0; i < 16; i++){
    const b = new THREE.Mesh(new THREE.SphereGeometry(.19, 12, 10), mat(cols[i % cols.length]));
    const a = Math.random() * Math.PI * 2, r = Math.random() * .55;
    b.position.set(Math.cos(a) * r, 1.9 + Math.random() * .5, Math.sin(a) * r);
    g.add(b);
  }

  /* 轉盤 + 出蛋口 */
  const knob = new THREE.Group();
  const kbase = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .1, 14), mat(0xF5EFE0));
  kbase.rotation.x = Math.PI / 2;
  const kbar = new THREE.Mesh(new THREE.BoxGeometry(.36, .09, .12), mat(YY.PAL.ink));
  knob.add(kbase, kbar);
  knob.position.set(0, 1.0, .98);
  g.add(knob);
  g.userData.knob = knob;

  const chute = new THREE.Mesh(new THREE.CylinderGeometry(.26, .26, .12, 14), mat(YY.PAL.ink));
  chute.rotation.x = Math.PI / 2.4;
  chute.position.set(0, .42, .96);
  g.add(chute);
  g.userData.shake = 0;
  return g;
}

/* ============================================================
   房間小道具:芽芽沒人看時會自己跑去玩
   ============================================================ */
function buildProps(scene){
  /* --- ① 積木塔(會被撞倒,過幾秒自己疊回去) --- */
  const bx = -2.6, bz = -3.0;
  const cols = [0xE4573D, 0xF2C14E, 0x6FA25E, 0x5A9BD8, 0x9B7FD4];
  const cubes = [];
  for(let i = 0; i < 5; i++){
    const size = .5 - i * .03;
    const cube = new THREE.Mesh(new THREE.BoxGeometry(size, size, size),
      mat(cols[i % cols.length]));
    const home = { x: bx + YY.rand(-.04, .04), y: size / 2 + i * .46, z: bz };
    cube.position.set(home.x, home.y, home.z);
    cube.castShadow = true;
    scene.add(cube);
    cubes.push({ mesh: cube, home, size, vx:0, vy:0, vz:0, rx:0, rz:0, tumbling:false });
  }
  YY.blocks = { x: bx, z: bz, cubes, knockedAt: 0 };

  /* --- ② 豆袋坐墊(可以撲上去彈) --- */
  const cush = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.SphereGeometry(.7, 20, 14), mat(0xE7A6B8));
  seat.scale.set(1, .5, 1); seat.position.y = .32; seat.castShadow = true;
  const seam = new THREE.Mesh(new THREE.TorusGeometry(.66, .06, 8, 26), mat(0xD98CA0));
  seam.rotation.x = Math.PI / 2; seam.position.y = .34;
  cush.add(seat, seam);
  cush.position.set(-3.7, 0, 1.7);
  scene.add(cush);
  YY.cushion = { g: cush, x:-3.7, z:1.7 };

  /* --- ③ 紙箱(可以跳進去偷看,也是躲藏點) --- */
  const box = new THREE.Group();
  const cardboard = 0xD8B98A, edge = 0xC9A876;
  const w = 1.1, h = .8, d = 1.1, th = .07;
  const side = (sx, sy, sz, w2, h2, d2) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w2, h2, d2), mat(cardboard));
    m.position.set(sx, sy, sz); m.castShadow = m.receiveShadow = true; box.add(m);
  };
  side(0, h/2, -d/2, w, h, th);           // 後
  side(0, h/2,  d/2, w, h, th);           // 前
  side(-w/2, h/2, 0, th, h, d);           // 左
  side( w/2, h/2, 0, th, h, d);           // 右
  const bottom = new THREE.Mesh(new THREE.BoxGeometry(w, th, d), mat(edge));
  bottom.position.y = th / 2; bottom.receiveShadow = true; box.add(bottom);
  // 一片打開的箱蓋
  const flap = new THREE.Mesh(new THREE.BoxGeometry(w, th, d * .6), mat(edge));
  flap.position.set(0, h + .02, -d * .5); flap.rotation.x = -.9; box.add(flap);
  box.position.set(3.4, 0, -3.4);
  scene.add(box);
  YY.box = { g: box, x:3.4, z:-3.4 };
}

/* 撞倒積木!(自嗨 AI 會呼叫) */
YY.knockBlocks = function(){
  const B = YY.blocks; if(!B) return;
  B.cubes.forEach((c, i) => {
    c.tumbling = true;
    c.vx = YY.rand(-2.6, 2.6);
    c.vz = YY.rand(-2.6, 2.6);
    c.vy = YY.rand(1.4, 3.2) + i * .25;
    c.rx = YY.rand(-7, 7); c.rz = YY.rand(-7, 7);
  });
  B.knockedAt = YY.now();
  YY.sfx.pop();
};

/* 每幀:讓撞倒的積木翻滾落地,幾秒後自己疊回去 */
YY.updateProps = function(dt){
  const B = YY.blocks; if(!B) return;
  const age = B.knockedAt ? (YY.now() - B.knockedAt) : 0;
  const resetting = B.knockedAt && age > 5000;
  B.cubes.forEach(c => {
    const m = c.mesh;
    if(resetting){
      m.position.x += (c.home.x - m.position.x) * .06;
      m.position.y += (c.home.y - m.position.y) * .06;
      m.position.z += (c.home.z - m.position.z) * .06;
      m.rotation.x += (0 - m.rotation.x) * .1;
      m.rotation.z += (0 - m.rotation.z) * .1;
      c.tumbling = false;
    } else if(c.tumbling){
      c.vy -= 9 * dt;
      m.position.x += c.vx * dt; m.position.y += c.vy * dt; m.position.z += c.vz * dt;
      m.rotation.x += c.rx * dt; m.rotation.z += c.rz * dt;
      const fy = c.size / 2;
      if(m.position.y < fy){ m.position.y = fy; c.vy = Math.abs(c.vy) * .38; c.vx *= .7; c.vz *= .7; c.rx *= .5; c.rz *= .5; }
    }
  });
  if(resetting && age > 8500) B.knockedAt = 0;   // 疊好了,可以再被撞
};

/* ---------- 鏡頭 ---------- */
function updateCam(){
  const c = YY.cam;
  c.phi = YY.clamp(c.phi, .55, 1.42);
  c.radius = YY.clamp(c.radius, 5.5, 16);
  YY.camera.position.set(
    c.target.x + c.radius * Math.sin(c.phi) * Math.sin(c.theta),
    c.target.y + c.radius * Math.cos(c.phi),
    c.target.z + c.radius * Math.sin(c.phi) * Math.cos(c.theta),
  );
  YY.camera.lookAt(c.target);
}
YY.updateCam = updateCam;

/* ---------- 粒子:愛心 / 彩紙 / 泡泡 ---------- */
YY.spawnHeart = function(x, y, z, c){
  const h = YY.heartGroup(c || 0xFF7B8E, .1);
  h.position.set(x + YY.rand(-.4, .4), y, z + YY.rand(-.2, .2));
  h.userData.p = { vy: YY.rand(1.4, 2.2), life: 1.3, kind:'heart', vx: YY.rand(-.3, .3) };
  YY.scene.add(h); YY.particles.push(h);
};
YY.spawnConfetti = function(x, y, z, n){
  const cols = [0xE4573D, 0xF2C14E, 0x6FA25E, 0x5A9BD8, 0x9B7FD4, 0xF2A0B5];
  for(let i = 0; i < (n || 22); i++){
    const p = new THREE.Mesh(new THREE.PlaneGeometry(.13, .09),
      mat(cols[i % cols.length], { side:THREE.DoubleSide }));
    p.position.set(x, y, z);
    p.userData.p = {
      vx: YY.rand(-2.4, 2.4), vy: YY.rand(2.5, 5.2), vz: YY.rand(-2.4, 2.4),
      life: YY.rand(1.2, 2.0), kind:'confetti',
      rx: YY.rand(-6, 6), rz: YY.rand(-6, 6),
    };
    YY.scene.add(p); YY.particles.push(p);
  }
};
YY.spawnPuff = function(x, y, z){
  for(let i = 0; i < 6; i++){
    const p = new THREE.Mesh(new THREE.SphereGeometry(YY.rand(.06, .13), 8, 6),
      mat(0xFFFFFF, { transparent:true, opacity:.85 }));
    p.position.set(x + YY.rand(-.3, .3), y + YY.rand(0, .3), z + YY.rand(-.3, .3));
    p.userData.p = { vy: YY.rand(.4, 1.0), life: .7, kind:'puff', vx: YY.rand(-.5, .5) };
    YY.scene.add(p); YY.particles.push(p);
  }
};
/* Focus Mode 限定的精靈微光:緩緩飄起、閃爍後消失 */
YY.spawnSparkle = function(x, y, z){
  const p = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 8),
    mat(0xFFE9A6, { transparent:true, opacity:.95 }));
  p.position.set(x, y, z);
  p.userData.p = { vy: YY.rand(.25, .45), life: 2.0, kind:'sparkle', vx: YY.rand(-.15, .15) };
  YY.scene.add(p); YY.particles.push(p);
};
YY.updateParticles = function(dt){
  for(let i = YY.particles.length - 1; i >= 0; i--){
    const o = YY.particles[i], p = o.userData.p;
    p.life -= dt;
    if(p.life <= 0){ YY.scene.remove(o); YY.particles.splice(i, 1); continue; }
    if(p.kind === 'confetti'){
      p.vy -= 7 * dt;
      o.position.x += p.vx * dt; o.position.y += p.vy * dt; o.position.z += p.vz * dt;
      o.rotation.x += p.rx * dt; o.rotation.z += p.rz * dt;
      if(o.position.y < .05){ o.position.y = .05; p.vy = 0; p.vx *= .9; p.vz *= .9; }
    } else {
      o.position.y += p.vy * dt;
      o.position.x += (p.vx || 0) * dt;
      const s = Math.max(.01, p.life / (p.kind === 'puff' ? .7 : 1.3));
      o.scale.setScalar(p.kind === 'puff' ? 2 - s : s);
      if(o.material && o.material.transparent) o.material.opacity = s;
    }
  }
};
})();
