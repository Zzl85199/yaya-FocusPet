/* ============================================================
   explore.js — 探索世界(牙牙森林)
   #5 散步/運動:點地板走過去;野生精靈會在場景裡閒晃
   #6 用莓果誘捕精靈:選中一隻精靈 → 丟莓果引牠過去 → 吃完判定捕獲
   ============================================================ */
(function(){
const $ = s => document.querySelector(s);

/* ---------- 精靈圖鑑資料(共 6 種,含普通/稀有/傳說) ---------- */
YY.SPIRITS = {
  leaf:   { n:'葉葉精靈', c:0x8FCB6E, r:0 },
  dew:    { n:'露露精靈', c:0x8FCBE6, r:0 },
  pebble: { n:'石石精靈', c:0xC4A47A, r:0 },
  moth:   { n:'蛾蛾精靈', c:0xB79BE8, r:1, flying:true },
  ember:  { n:'燼燼精靈', c:0xF2984A, r:1 },
  moon:   { n:'月月精靈', c:0xE8E4D4, r:2 },
};
YY.SPIRIT_ORDER = ['leaf', 'dew', 'pebble', 'moth', 'ember', 'moon'];
const CATCH_CHANCE = [.7, .42, .18];     // 依稀有度 r:0/1/2
const SPAWN_WEIGHT = { 0:30, 1:12, 2:4 };

function pickSpiritSpecies(){
  const pool = [];
  YY.SPIRIT_ORDER.forEach(id => {
    for(let i = 0; i < SPAWN_WEIGHT[YY.SPIRITS[id].r]; i++) pool.push(id);
  });
  return pool[Math.floor(Math.random() * pool.length)];
}

/* ---------- 精靈的 3D 造型:簡單小生物,顏色依種類決定 ---------- */
function buildSpiritMesh(speciesId){
  const S = YY.SPIRITS[speciesId];
  const g = new THREE.Group();
  const body = YY.M(new THREE.SphereGeometry(.24, 14, 10), S.c, { transparent:true, opacity:.95 });
  body.scale.set(1, .9, 1);
  g.add(body);
  [-1, 1].forEach(s => {
    const eye = YY.M(new THREE.SphereGeometry(.04, 8, 6), 0x2C4034);
    eye.position.set(s * .09, .05, .21);
    g.add(eye);
  });
  if(S.flying){
    [-1, 1].forEach(s => {
      const w = YY.M(new THREE.SphereGeometry(.12, 10, 8), S.c, { transparent:true, opacity:.6 });
      w.scale.set(1, .5, .18);
      w.position.set(s * .26, .12, -.05);
      w.rotation.z = s * .5;
      w.userData.flap = { side: s };
      g.add(w);
    });
  }
  g.userData.speciesId = speciesId;
  g.traverse(o => { if(o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- 場上目前的野生精靈(同時最多 2 隻) ---------- */
let spirits = [];             // { uid, speciesId, mesh, x,z,tx,tz, state, wanderAt }
let nextSpawnAt = 0;
let uidSeq = 0;
YY.spiritGroup = new THREE.Group();   // 給 main.js raycast 用
let groupAdded = false;

function spawnSpirit(){
  const speciesId = pickSpiritSpecies();
  const mesh = buildSpiritMesh(speciesId);
  const x = YY.rand(-3.2, 3.2), z = YY.rand(-2, 2.8);
  mesh.position.set(x, .3, z);
  const uid = 'sp' + (uidSeq++);
  mesh.userData.uid = uid;
  YY.spiritGroup.add(mesh);
  spirits.push({ uid, speciesId, mesh, x, z, tx:x, tz:z, state:'wander', wanderAt:0 });
}

function removeSpirit(sp){
  YY.spiritGroup.remove(sp.mesh);
  spirits = spirits.filter(s => s !== sp);
  if(YY.exploreTarget === sp.uid) YY.exploreTarget = null;
}

/* ---------- 選中一隻精靈(點擊觸發) ---------- */
YY.exploreTarget = null;
function selectSpiritByUid(uid){
  YY.exploreTarget = uid;
  const sp = spirits.find(s => s.uid === uid);
  const S = sp && YY.SPIRITS[sp.speciesId];
  YY.flash(S ? `盯上了「${S.n}」!按「🫐 誘捕」丟顆莓果引牠過來` : '選中一隻精靈', 2600);
}

/* 給 main.js 呼叫:傳入 NDC 座標(-1~1)做點擊判定 */
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
YY.handleExploreTap = function(ndcX, ndcY){
  _ndc.set(ndcX, ndcY);
  _ray.setFromCamera(_ndc, YY.camera);

  const spiritHits = YY.spiritGroup.children.length ? _ray.intersectObject(YY.spiritGroup, true) : [];
  if(spiritHits.length){
    let obj = spiritHits[0].object;
    while(obj && !obj.userData.uid) obj = obj.parent;
    if(obj) selectSpiritByUid(obj.userData.uid);
    return;
  }
  if(YY.floor){
    const floorHits = _ray.intersectObject(YY.floor, true);
    if(floorHits.length) walkTo(floorHits[0].point.x, floorHits[0].point.z);
  }
};

/* ---------- 散步 / 運動:點地板走過去,走久了偶爾給點小獎勵 ---------- */
YY.exploreWalk = { dist:0, nextRewardAt: YY.rand(18, 30) };
function walkTo(x, z){
  const cre = YY.cre; if(!cre) return;
  cre.tx = YY.clamp(x, -4, 4);
  cre.tz = YY.clamp(z, -3, 3.2);
}

/* ---------- 誘捕:丟莓果引導選中的精靈過去 ---------- */
let lureBerry = null;
YY.throwLureBerry = function(){
  if(!YY.exploreTarget){ YY.flash('先點一隻精靈,才能丟莓果引誘牠喔!', 2400); return; }
  const sp = spirits.find(s => s.uid === YY.exploreTarget);
  if(!sp){ YY.exploreTarget = null; YY.flash('那隻精靈已經不見了,再找一隻試試!', 2400); return; }
  if(lureBerry){ YY.flash('地上已經有一顆誘餌莓果了!', 2200); return; }

  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(.2, 14, 12), YY.mat(0xE4573D));
  b.position.y = .2; b.castShadow = true;
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), YY.mat(0x6FA25E));
  leaf.scale.set(1.4, .5, .7); leaf.position.y = .4;
  g.add(b, leaf);
  const x = sp.x + YY.rand(-.4, .4), z = sp.z + YY.rand(-.4, .4);
  g.position.set(x, 0, z);
  YY.scene.add(g);
  YY.sfx.pop();

  lureBerry = { g, x, z };
  sp.state = 'lured'; sp.tx = x; sp.tz = z;
};

function resolveCatch(sp){
  const S = YY.SPIRITS[sp.speciesId];
  const chance = CATCH_CHANCE[S.r];
  const success = Math.random() < chance;
  const firstTime = !YY.metSpirits.includes(sp.speciesId);

  if(success){
    if(firstTime) YY.metSpirits.push(sp.speciesId);
    YY.save();
    YY.sfx.tada();
    YY.spawnConfetti(sp.x, .6, sp.z, S.r === 2 ? 40 : 24);
    YY.flash(firstTime
      ? `🎉 首次捕獲!「${S.n}」加入精靈圖鑑了!`
      : `捕獲成功!「${S.n}」又被抓到一隻~`, 3600);
    YY.addTickets(S.r === 2 ? 3 : S.r === 1 ? 2 : 1, `捕獲「${S.n}」的獎勵`);
    removeSpirit(sp);
  } else {
    YY.flash(`「${S.n}」吃完莓果就溜走了……下次再試試!`, 2800);
    sp.state = 'fleeing';
    const away = Math.atan2(sp.x - (YY.cre ? YY.cre.x : 0), sp.z - (YY.cre ? YY.cre.z : 0));
    sp.tx = YY.clamp(sp.x + Math.sin(away) * 3, -4, 4);
    sp.tz = YY.clamp(sp.z + Math.cos(away) * 3, -3, 3.2);
  }
}

/* ---------- 每幀更新:精靈閒晃 / 被引誘 / 逃跑,以及誘餌莓果動畫 ---------- */
YY.updateExplore = function(t, dt){
  if(YY.mode !== 'explore'){
    /* 離開探索世界時清乾淨,回來再重新開始 */
    if(spirits.length || lureBerry) cleanupExplore();
    return;
  }

  if(spirits.length < 2 && t > nextSpawnAt){
    spawnSpirit();
    nextSpawnAt = t + YY.rand(6000, 14000);
  }

  for(const sp of spirits.slice()){
    const dx = sp.tx - sp.x, dz = sp.tz - sp.z;
    const dist = Math.hypot(dx, dz);
    if(dist > .06){
      const spSpeed = (sp.state === 'fleeing' ? 2.6 : 1.1) * dt;
      sp.x += dx / dist * Math.min(spSpeed, dist);
      sp.z += dz / dist * Math.min(spSpeed, dist);
      sp.mesh.rotation.y += (Math.atan2(dx, dz) - sp.mesh.rotation.y) * .1;
    } else if(sp.state === 'wander' && t > sp.wanderAt){
      sp.wanderAt = t + YY.rand(2500, 5500);
      sp.tx = YY.clamp(sp.x + YY.rand(-1.4, 1.4), -3.6, 3.6);
      sp.tz = YY.clamp(sp.z + YY.rand(-1.2, 1.2), -2.6, 3);
    } else if(sp.state === 'lured' && lureBerry){
      /* 到莓果旁邊了 → 吃掉、判定捕獲 */
      YY.scene.remove(lureBerry.g);
      YY.spawnPuff(lureBerry.x, .3, lureBerry.z);
      YY.sfx.munch();
      lureBerry = null;
      resolveCatch(sp);
    } else if(sp.state === 'fleeing'){
      removeSpirit(sp);
    }
    const hop = Math.abs(Math.sin(t / 130 + sp.uid.length)) * (dist > .06 ? .18 : 0);
    sp.mesh.position.set(sp.x, .3 + hop, sp.z);
    sp.mesh.children.forEach(ch => {
      if(ch.userData.flap){
        const f = Math.sin(t / 90) * .3;
        ch.rotation.z = ch.userData.flap.side * (.5 + f);
      }
    });
  }

  /* 散步運動小獎勵 */
  const cre = YY.cre;
  if(cre){
    const W = YY.exploreWalk;
    const dx = cre.x - (W._lx ?? cre.x), dz = cre.z - (W._lz ?? cre.z);
    W.dist += Math.hypot(dx, dz);
    W._lx = cre.x; W._lz = cre.z;
    if(W.dist > W.nextRewardAt){
      W.nextRewardAt = W.dist + YY.rand(18, 30);
      YY.bumpTrust(1);
      if(Math.random() < .4) YY.flash(`散步運動好舒服~${cre.def.n}的好感度悄悄 +1`, 2200);
    }
  }
};

function cleanupExplore(){
  spirits.slice().forEach(sp => YY.spiritGroup.remove(sp.mesh));
  spirits = [];
  if(lureBerry){ YY.scene.remove(lureBerry.g); lureBerry = null; }
  YY.exploreTarget = null;
  nextSpawnAt = 0;
}

/* 場景初始化後把精靈群組掛進去(只需一次) */
YY.ensureSpiritGroup = function(){
  if(!groupAdded && YY.scene){ YY.scene.add(YY.spiritGroup); groupAdded = true; }
};
})();
