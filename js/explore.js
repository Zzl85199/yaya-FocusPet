/* ============================================================
   explore.js — 牙牙森林(房間外的世界)裡發生的事
   #1 走出房間門 → 森林場景;精靈與寵物都在森林誘捕
   #3 用莓果誘捕「寵物」和「精靈」,有機率成功 / 失敗
   #4 帶著選定的寵物散步 → 累積距離會進化
   #6 森林裡會出現蛋,點一下撿起來帶回家孵化
   ============================================================ */
(function(){

/* ---------- 進 / 出森林:房間 ↔ 森林 場景切換 ---------- */
YY.enterForest = function(){
  YY.showForest(true);
  const cre = YY.cre;
  if(cre){
    cre.hiding = false; cre.doze = false; cre.goal = null;
    cre.x = YY.forestSpawn.x; cre.z = YY.forestSpawn.z;
    cre.tx = cre.x; cre.tz = cre.z - 2;   // 往森林中央走幾步
  }
  YY.forestCam.fpv = false;
  YY.exploreWalk._lx = cre ? cre.x : 0; YY.exploreWalk._ly = cre ? cre.z : 0;
  nextSpawnAt = 0; nextEggRollAt = YY.now() + YY.rand(4000, 9000);
  if(YY.renderForestHint) YY.renderForestHint();
};
YY.leaveForest = function(){
  cleanupForest();
  YY.showForest(false);
  YY.tryForestCamPreview(false);
  const cre = YY.cre;
  if(cre){ cre.x = 0; cre.z = 1.2; cre.tx = 0; cre.tz = 1.2; }
};

/* ---------- 場上野生生物:寵物 or 精靈(同時最多 3 隻) ---------- */
let wild = [];        // { uid, kind, species, mesh, x,z,tx,tz, state, wanderAt }
let nextSpawnAt = 0;
YY.spiritGroup = new THREE.Group();   // 沿用舊名,給 raycast 用(其實裝的是所有野生生物)
YY.eggGroup = new THREE.Group();
let groupAdded = false;

function speciesInfo(w){
  return w.kind === 'pet' ? YY.PETS[w.species] : YY.SPIRITS[w.species];
}

function spawnWild(){
  /* 一半機率生寵物、一半生精靈,種類再依稀有度加權 */
  const kind = Math.random() < .5 ? 'pet' : 'spirit';
  const species = kind === 'pet' ? YY.pickPetSpecies() : YY.pickSpiritSpecies();
  const mesh = kind === 'pet' ? YY.buildPetMesh(species, 0) : YY.buildSpiritMesh(species);
  const a = Math.random() * Math.PI * 2, r = YY.rand(3, 7);
  const x = Math.cos(a) * r, z = Math.sin(a) * r - 1;
  mesh.position.set(x, .3, z);
  const uid = YY.newUid('wild');
  mesh.userData.uid = uid;
  YY.spiritGroup.add(mesh);
  wild.push({ uid, kind, species, mesh, x, z, tx:x, tz:z, state:'wander', wanderAt:0 });
}
function removeWild(w){
  YY.spiritGroup.remove(w.mesh);
  wild = wild.filter(o => o !== w);
  if(YY.exploreTarget === w.uid) YY.exploreTarget = null;
}

/* ---------- 蛋:森林裡「有機率」出現,不是每次都有,可撿起 ---------- */
let nextEggRollAt = 0;
function maybeSpawnEgg(t){
  if(YY.eggGroup.children.length >= 1) return;   // 同時最多 1 顆蛋在地上,比較稀有
  if(t < nextEggRollAt) return;
  nextEggRollAt = t + YY.rand(10000, 18000);
  if(Math.random() < .35) spawnEggOnGround();     // 每次骰只有 35% 機率真的生出蛋
}
function spawnEggOnGround(){
  const g = new THREE.Group();
  const tint = [0xF5EAD0, 0xE8D6F0, 0xD6EAF5, 0xF5E0D6, 0xE0F5D9, 0xF5D6E8][Math.floor(Math.random() * 6)];
  const shell = YY.M(new THREE.SphereGeometry(.24, 14, 12), tint);
  shell.scale.set(1, 1.25, 1); shell.position.y = .26;
  const dot1 = YY.M(new THREE.SphereGeometry(.05, 8, 6), 0xF2A0B5); dot1.position.set(.1, .3, .18);
  const dot2 = YY.M(new THREE.SphereGeometry(.05, 8, 6), 0x8FCBE6); dot2.position.set(-.08, .2, .2);
  g.add(shell, dot1, dot2);
  const a = Math.random() * Math.PI * 2, r = YY.rand(2.5, 6);
  g.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 1);
  const uid = YY.newUid('groundegg');
  g.userData.eggUid = uid; g.userData.tint = tint;
  g.traverse(o => { if(o.isMesh){ o.castShadow = true; o.userData.eggUid = uid; } });
  YY.eggGroup.add(g);
}

/* ---------- 選中一隻野生生物 ---------- */
YY.exploreTarget = null;
function selectWildByUid(uid){
  YY.exploreTarget = uid;
  const w = wild.find(o => o.uid === uid);
  if(!w) return;
  const info = speciesInfo(w);
  const label = w.kind === 'pet' ? '寵物' : '精靈';
  YY.flash(`盯上了${label}「${info.n}」!按「🫐 誘捕」丟顆莓果引牠過來`, 3000);
}

/* 給 main.js 呼叫:NDC 座標點擊判定(蛋 → 野生生物 → 地面走路) */
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
YY.handleExploreTap = function(ndcX, ndcY){
  _ndc.set(ndcX, ndcY);
  _ray.setFromCamera(_ndc, YY.camera);

  /* 先看有沒有點到蛋 */
  if(YY.eggGroup.children.length){
    const eh = _ray.intersectObject(YY.eggGroup, true);
    if(eh.length){
      let obj = eh[0].object; while(obj && !obj.userData.eggUid) obj = obj.parent;
      if(obj){
        const tint = obj.userData.tint;
        YY.eggGroup.remove(obj);
        YY.spawnPuff(obj.position.x, .4, obj.position.z);
        YY.addEgg(tint);
        return;
      }
    }
  }
  /* 再看野生生物 */
  const hits = YY.spiritGroup.children.length ? _ray.intersectObject(YY.spiritGroup, true) : [];
  if(hits.length){
    let obj = hits[0].object; while(obj && !obj.userData.uid) obj = obj.parent;
    if(obj) selectWildByUid(obj.userData.uid);
    return;
  }
  /* 都沒有 → 點地面走過去 */
  if(YY.forestFloor){
    const fh = _ray.intersectObject(YY.forestFloor, true);
    if(fh.length) walkTo(fh[0].point.x, fh[0].point.z);
  }
};

function walkTo(x, z){
  const cre = YY.cre; if(!cre) return;
  cre.tx = YY.clamp(x, -12, 12);
  cre.tz = YY.clamp(z, -12, 12);
}

/* ---------- 誘捕:丟莓果引導選中的野生生物 ---------- */
let lureBerry = null;
YY.throwLureBerry = function(){
  if(!YY.exploreTarget){ YY.flash('先點一隻精靈或寵物,才能丟莓果引誘牠喔!', 2600); return; }
  const w = wild.find(o => o.uid === YY.exploreTarget);
  if(!w){ YY.exploreTarget = null; YY.flash('那隻已經不見了,再找一隻試試!', 2400); return; }
  if(lureBerry){ YY.flash('地上已經有一顆誘餌莓果了!', 2200); return; }

  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(.2, 14, 12), YY.mat(0xE4573D));
  b.position.y = .2; b.castShadow = true;
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(.08, 8, 6), YY.mat(0x6FA25E));
  leaf.scale.set(1.4, .5, .7); leaf.position.y = .4;
  g.add(b, leaf);
  const x = w.x + YY.rand(-.4, .4), z = w.z + YY.rand(-.4, .4);
  g.position.set(x, 0, z);
  YY.scene.add(g);
  YY.sfx.pop();
  lureBerry = { g, x, z };
  w.state = 'lured'; w.tx = x; w.tz = z;
};

function resolveCatch(w){
  const info = speciesInfo(w);
  const success = Math.random() < YY.catchChance(info.r);

  if(success){
    YY.sfx.tada();
    YY.spawnConfetti(w.x, .6, w.z, info.r === 2 ? 44 : 26);
    YY.catchCount = (YY.catchCount || 0) + 1;
    if(w.kind === 'pet'){
      const firstTime = !YY.metPets.includes(w.species);
      YY.addPet(w.species);
      YY.flash(firstTime
        ? `🎉 首次捕獲寵物!「${info.n}」加入!去「家族→我的寵物」設牠當散步夥伴吧`
        : `捕獲成功!寵物「${info.n}」又收服一隻~`, 4200);
    } else {
      const firstTime = !YY.metSpirits.includes(w.species);
      YY.addHomeSpirit(w.species);
      YY.flash(firstTime
        ? `🎉 首次捕獲精靈!「${info.n}」住進你家了(精靈只會待在家喔)`
        : `捕獲成功!精靈「${info.n}」也住進你家~`, 4200);
    }
    YY.addTickets(info.r === 2 ? 3 : info.r === 1 ? 2 : 1, `捕獲「${info.n}」的獎勵`);
    removeWild(w);
  } else {
    YY.flash(`「${info.n}」吃完莓果就溜走了……下次再試試!`, 3000);
    w.state = 'fleeing';
    const cx = YY.cre ? YY.cre.x : 0, cz = YY.cre ? YY.cre.z : 0;
    const away = Math.atan2(w.x - cx, w.z - cz);
    w.tx = YY.clamp(w.x + Math.sin(away) * 6, -12, 12);
    w.tz = YY.clamp(w.z + Math.cos(away) * 6, -12, 12);
  }
}

/* ---------- 散步小獎勵 + 寵物進化 + 蛋孵化 ---------- */
YY.exploreWalk = { dist:0, nextRewardAt: YY.rand(18, 30) };

/* ---------- 每幀更新 ---------- */
YY.updateExplore = function(t, dt){
  if(YY.mode !== 'explore'){
    if(wild.length || lureBerry || YY.eggGroup.children.length) cleanupForest();
    return;
  }

  if(wild.length < 2 && t > nextSpawnAt){ spawnWild(); nextSpawnAt = t + YY.rand(6000, 13000); }
  maybeSpawnEgg(t);

  for(const w of wild.slice()){
    const dx = w.tx - w.x, dz = w.tz - w.z, dist = Math.hypot(dx, dz);
    if(dist > .06){
      const sp = (w.state === 'fleeing' ? 3.0 : 1.1) * dt;
      w.x += dx / dist * Math.min(sp, dist);
      w.z += dz / dist * Math.min(sp, dist);
      w.mesh.rotation.y += (Math.atan2(dx, dz) - w.mesh.rotation.y) * .1;
    } else if(w.state === 'wander' && t > w.wanderAt){
      w.wanderAt = t + YY.rand(2500, 5500);
      w.tx = YY.clamp(w.x + YY.rand(-2, 2), -8, 8);
      w.tz = YY.clamp(w.z + YY.rand(-2, 2), -8, 8);
    } else if(w.state === 'lured' && lureBerry){
      YY.scene.remove(lureBerry.g);
      YY.spawnPuff(lureBerry.x, .3, lureBerry.z);
      YY.sfx.munch();
      lureBerry = null;
      resolveCatch(w);
    } else if(w.state === 'fleeing'){
      removeWild(w);
    }
    const hop = Math.abs(Math.sin(t / 130 + w.uid.length)) * (dist > .06 ? .18 : 0);
    w.mesh.position.set(w.x, .3 + hop, w.z);
    w.mesh.children.forEach(ch => {
      if(ch.userData.flap){ const f = Math.sin(t / 90) * .3; ch.rotation.z = ch.userData.flap.side * (.5 + f); }
    });
  }

  /* 蛋在地上輕輕搖 */
  YY.eggGroup.children.forEach((e, i) => { e.rotation.z = Math.sin(t / 400 + i) * .12; });

  /* 累積在森林探索的時間(給芽弟解鎖條件用) */
  YY.exploreSec = (YY.exploreSec || 0) + dt;

  /* 散步:累積距離 → 好感度 / 寵物進化 / 蛋孵化(只有「散步」條件的蛋會前進) */
  const cre = YY.cre;
  if(cre){
    const W = YY.exploreWalk;
    const dx = cre.x - (W._lx ?? cre.x), dz = cre.z - (W._ly ?? cre.z);
    const step = Math.hypot(dx, dz);
    W.dist += step;
    W._lx = cre.x; W._ly = cre.z;
    if(step > 0.0005){
      YY.addWalkToActivePet(step);     // #4 帶去散步 → 進化
      if(YY.eggProgressWalk) YY.eggProgressWalk(step);   // #6 邊散步邊孵蛋(僅限「散步」條件的蛋)
    }
    if(W.dist > W.nextRewardAt){
      W.nextRewardAt = W.dist + YY.rand(18, 30);
      YY.bumpTrust(1);
      if(Math.random() < .4) YY.flash('一起散步好舒服~好感度悄悄 +1', 2200);
    }
  }
};

function cleanupForest(){
  wild.slice().forEach(w => YY.spiritGroup.remove(w.mesh));
  wild = [];
  YY.eggGroup.children.slice().forEach(e => YY.eggGroup.remove(e));
  if(lureBerry){ YY.scene.remove(lureBerry.g); lureBerry = null; }
  YY.exploreTarget = null;
  nextSpawnAt = 0;
}

/* 場景初始化後把兩個群組掛進森林(只需一次) */
YY.ensureSpiritGroup = function(){
  if(!groupAdded && YY.scene){
    if(YY.forestGroup){ YY.forestGroup.add(YY.spiritGroup); YY.forestGroup.add(YY.eggGroup); }
    else { YY.scene.add(YY.spiritGroup); YY.scene.add(YY.eggGroup); }
    groupAdded = true;
  }
};
})();
