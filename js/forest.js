/* ============================================================
   forest.js — 牙牙森林(房間外的世界)
   #1 房間外的世界:整片森林,精靈/寵物都在這裡誘捕
   #5 森林裡可切換「牙牙視角(第一人稱)」與「第三人稱視角」
   平常隱藏,進入探索模式時才顯示;和房間互相切換
   ============================================================ */
(function(){
const M = YY.M, mat = YY.mat;

YY.FOREST = { bg:0xBFE3F2, ground:0x9BC46E, groundDark:0x86B45D };
YY.forestSpawn = { x:0, z:5 };          // 從房間門走出來的落點
YY.forestGroup = null;
YY.forestFloor = null;

function tree(x, z, scale){
  const g = new THREE.Group();
  const trunk = M(new THREE.CylinderGeometry(.22 * scale, .3 * scale, 1.6 * scale, 8), 0x8A5A3A);
  trunk.position.y = .8 * scale; g.add(trunk);
  const greens = [0x5E9A48, 0x6FA25E, 0x4E8340];
  for(let i = 0; i < 3; i++){
    const blob = M(new THREE.SphereGeometry((.9 - i * .16) * scale, 12, 10), greens[i % greens.length]);
    blob.position.set(YY.rand(-.2, .2) * scale, (1.7 + i * .5) * scale, YY.rand(-.2, .2) * scale);
    g.add(blob);
  }
  g.position.set(x, 0, z);
  g.traverse(o => { if(o.isMesh) o.castShadow = true; });
  return g;
}
function bush(x, z){
  const g = new THREE.Group();
  for(let i = 0; i < 3; i++){ const b = M(new THREE.SphereGeometry(YY.rand(.3, .5), 10, 8), 0x6FA25E);
    b.position.set(YY.rand(-.4, .4), YY.rand(.2, .4), YY.rand(-.4, .4)); g.add(b); }
  g.position.set(x, 0, z); g.traverse(o => { if(o.isMesh) o.castShadow = true; });
  return g;
}
function rock(x, z){
  const r = M(new THREE.DodecahedronGeometry(YY.rand(.25, .45), 0), 0xA9A99A);
  r.position.set(x, .18, z); r.rotation.set(YY.rand(0, 3), YY.rand(0, 3), YY.rand(0, 3));
  r.castShadow = true; return r;
}

YY.initForest = function(){
  const g = new THREE.Group();
  g.visible = false;

  /* 一大片草地 */
  const ground = new THREE.Mesh(new THREE.CircleGeometry(30, 48), mat(YY.FOREST.ground));
  ground.rotation.x = -Math.PI / 2; ground.position.y = 0; ground.receiveShadow = true;
  g.add(ground); YY.forestFloor = ground;

  /* 深色草叢圓斑,讓地面不單調 */
  for(let i = 0; i < 10; i++){
    const patch = new THREE.Mesh(new THREE.CircleGeometry(YY.rand(1.2, 2.6), 20), mat(YY.FOREST.groundDark));
    patch.rotation.x = -Math.PI / 2; patch.position.set(YY.rand(-12, 12), .01, YY.rand(-12, 12));
    g.add(patch);
  }

  /* 小池塘 */
  const pond = new THREE.Mesh(new THREE.CircleGeometry(2.4, 28), mat(0x8FCBE6, { transparent:true, opacity:.85 }));
  pond.rotation.x = -Math.PI / 2; pond.position.set(-7, .02, -6); g.add(pond);

  /* 樹木 / 灌木 / 石頭 圍成一圈,中央留空地散步 */
  const spots = [];
  for(let i = 0; i < 22; i++){
    const a = i / 22 * Math.PI * 2, r = YY.rand(8, 14);
    spots.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  spots.forEach(([x, z], i) => {
    if(i % 3 === 0) g.add(bush(x, z));
    else g.add(tree(x, z, YY.rand(.8, 1.4)));
  });
  for(let i = 0; i < 6; i++) g.add(rock(YY.rand(-6, 6), YY.rand(-6, 6)));
  /* 幾朵點綴小花 */
  for(let i = 0; i < 14; i++){
    const f = M(new THREE.SphereGeometry(.1, 8, 6), [0xF2A0B5, 0xF2C14E, 0xE4573D][i % 3]);
    f.position.set(YY.rand(-7, 7), .1, YY.rand(-7, 7)); g.add(f);
  }

  /* 回家的門(小木屋),站在森林邊緣,點它就回房間 */
  const home = buildHomeHut();
  home.position.set(0, 0, 9.5);
  g.add(home);
  YY.forestHome = home;

  YY.scene.add(g);
  YY.forestGroup = g;
};

function buildHomeHut(){
  const g = new THREE.Group();
  const wall = M(new THREE.BoxGeometry(2.4, 1.8, 1.8), 0xEDD394); wall.position.y = .9; g.add(wall);
  const roof = M(new THREE.ConeGeometry(1.9, 1.2, 4), 0xC4704F); roof.position.y = 2.2; roof.rotation.y = Math.PI / 4; g.add(roof);
  const door = M(new THREE.BoxGeometry(.8, 1.3, .1), 0x8A5A3A); door.position.set(0, .65, .92); g.add(door);
  const knob = M(new THREE.SphereGeometry(.06, 8, 6), 0xF2C14E); knob.position.set(.24, .65, .98); g.add(knob);
  g.userData.isHomeDoor = true;
  g.traverse(o => { if(o.isMesh) o.castShadow = true; o.userData.isHomeDoor = true; });
  return g;
}

/* ---------- 顯示 / 隱藏:房間 ↔ 森林 ---------- */
YY.showForest = function(on){
  if(!YY.forestGroup) return;
  YY.forestGroup.visible = on;
  if(YY.roomGroup) YY.roomGroup.visible = !on;
  YY.scene.background = new THREE.Color(on ? YY.FOREST.bg : YY.PAL.bg);
  YY.scene.fog = on ? new THREE.Fog(YY.FOREST.bg, 30, 55) : new THREE.Fog(YY.PAL.bg, 26, 46);
};

/* ============================================================
   森林鏡頭:第三人稱(跟拍)/ 第一人稱(牙牙視角)
   ============================================================ */
YY.forestCam = { fpv:false, yaw:0, tpTheta:.35, tpPhi:1.1, tpRadius:8,
  headYaw:0, headPitch:0, _tHeadYaw:0, _tHeadPitch:0, faceSync:false };

YY.updateForestCam = function(t){
  const cre = YY.cre; if(!cre || !YY.camera) return;
  const F = YY.forestCam, cam = YY.camera;
  if(F.fpv){
    /* 臉部同步:把偵測到的頭部角度平滑地帶進來 */
    F.headYaw   += ((F._tHeadYaw   || 0) - F.headYaw)   * .15;
    F.headPitch += ((F._tHeadPitch || 0) - F.headPitch) * .15;

    /* 第一人稱:相機在牙牙頭部,朝(拖曳基準 + 你的頭轉向)看,加一點走路晃動 */
    const eyeY = 1.35 * cre.def.size;
    const bob = Math.sin(t / 140) * .04;
    const lookYaw = F.yaw + F.headYaw * 1.15;          // 你轉頭 → 牙牙跟著轉頭看
    const lookY = eyeY - .3 + F.headPitch * 2.4;        // 你抬頭/低頭 → 牙牙視線上下
    cam.position.set(cre.x, eyeY + bob, cre.z);
    const look = new THREE.Vector3(
      cre.x + Math.sin(lookYaw) * 4,
      lookY,
      cre.z + Math.cos(lookYaw) * 4,
    );
    cam.lookAt(look);
    cre.root.rotation.y = lookYaw;   // 身體跟著視角轉
  } else {
    /* 第三人稱:繞著牙牙的跟拍鏡頭 */
    F.tpPhi = YY.clamp(F.tpPhi, .5, 1.4);
    F.tpRadius = YY.clamp(F.tpRadius, 4, 14);
    const cx = cre.x, cy = 1.4, cz = cre.z;
    cam.position.set(
      cx + F.tpRadius * Math.sin(F.tpPhi) * Math.sin(F.tpTheta),
      cy + F.tpRadius * Math.cos(F.tpPhi),
      cz + F.tpRadius * Math.sin(F.tpPhi) * Math.cos(F.tpTheta),
    );
    cam.lookAt(cx, cy, cz);
  }
};

/* 切換第一 / 第三人稱(給「🎯」按鈕在森林裡呼叫) */
YY.toggleForestFPV = function(){
  const F = YY.forestCam;
  F.fpv = !F.fpv;
  if(F.fpv){
    F.yaw = F.tpTheta;   // 從目前第三人稱角度接手
    YY.flash('🐾 切到「牙牙視角」(第一人稱)!開了鏡頭後,轉動你的頭牙牙就會跟著看;也可拖曳張望、點地面前進', 5200);
    YY.tryForestCamPreview(true);
  } else {
    YY.flash('🌳 切回第三人稱視角', 2600);
    YY.tryForestCamPreview(false);
  }
  if(YY.renderForestHint) YY.renderForestHint();
};

/* 森林裡「開鏡頭」:開一個小預覽,同時偵測你的頭部角度來同步牙牙視線 */
let fStream = null, fDetTimer = 0;
YY.tryForestCamPreview = async function(on){
  const F = YY.forestCam;
  if(!on){
    if(fDetTimer){ clearInterval(fDetTimer); fDetTimer = 0; }
    F.faceSync = false; F._tHeadYaw = 0; F._tHeadPitch = 0;
    if(fStream){ fStream.getTracks().forEach(tr => tr.stop()); fStream = null; }
    const el = document.getElementById('camPreview'); if(el){ el.style.display = 'none'; el.srcObject = null; }
    return;
  }
  if(!navigator.mediaDevices) return;
  try{
    fStream = await navigator.mediaDevices.getUserMedia({ video:{ width:{ideal:320}, height:{ideal:240} }, audio:false });
    let el = document.getElementById('camPreview');
    if(!el){ el = document.createElement('video'); el.id = 'camPreview';
      el.muted = true; el.playsInline = true; el.autoplay = true; document.body.appendChild(el); }
    el.srcObject = fStream; el.style.display = 'block';
    try{ await el.play(); }catch(e){}

    /* 載入臉部模型 → 定時偵測頭部角度 → 同步到 forestCam(#1) */
    if(YY.ensureFaceModels){
      YY.ensureFaceModels().then(ok => {
        if(!ok || !F.fpv){
          if(F.fpv) YY.flash('臉部同步模型載入失敗,改用拖曳左右張望', 3200);
          return;
        }
        F.faceSync = true;
        YY.flash('🐾 臉部同步開啟!轉動你的頭,牙牙的視線就會跟著轉動', 4200);
        fDetTimer = setInterval(async () => {
          if(!F.fpv){ return; }
          const a = await YY.detectHeadAngle(el);
          if(a){ F._tHeadYaw = a.yaw; F._tHeadPitch = a.pitch; }
        }, 180);
      });
    }
  }catch(e){ /* 拿不到鏡頭也沒關係,第一人稱照樣能用拖曳張望 */ }
};
})();
