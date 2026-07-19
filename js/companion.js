/* ============================================================
   companion.js — 跟隨主人的「當前寵物」
   #2 寵物才能跟隨主人:玩家選定的 activePet 會跟在牙寶旁邊,
      不論在房間還是森林都跟著;精靈則只待在家(見 home.js)
   #4 帶去散步會進化:stage 由 walks 決定,外觀會跟著長大
   ============================================================ */
(function(){

let comp = null;   // { mesh, x, z, bobT, uid, stage }

/* 依 activePet 重新建立跟隨寵物(換寵物 / 進化後呼叫) */
YY.refreshActivePet = function(){
  if(comp && comp.mesh){ YY.scene.remove(comp.mesh); comp = null; }
  const pet = YY.getPet(YY.activePet);
  if(!pet) return;                 // 還沒有寵物 → 沒有跟隨者
  const stage = YY.petStage(pet);
  const mesh = YY.buildPetMesh(pet.sp, stage);
  const cre = YY.cre;
  const x = (cre ? cre.x : 0) - .9, z = (cre ? cre.z : 1.2) + .55;
  mesh.position.set(x, .2, z);
  YY.scene.add(mesh);
  comp = { mesh, x, z, bobT: Math.random() * 10, uid: pet.uid, stage };
};

/* 兼容舊呼叫:切換角色時仍會叫 buildCompanionFor,轉呼叫 refreshActivePet */
YY.buildCompanionFor = function(){ YY.refreshActivePet(); };

YY.companionName = function(){
  const pet = YY.getPet(YY.activePet);
  return pet ? YY.petDisplayName(pet) : '小寵物';
};

/* #3 通用:依「這隻寵物的進化方式」餵進度,只有方式吻合的當前寵物才會前進。
   各種行為(散步 / 餵莓果 / 摸摸 / Focus / 陪伴)分別呼叫這個函式。 */
YY.addEvoProgress = function(method, amount){
  if(!amount) return;
  const pet = YY.getPet(YY.activePet);
  if(!pet) return;
  if(YY.petEvoMethod(pet) !== method) return;   // 方式不對 → 這隻不吃這種進度

  const before = YY.petStage(pet);
  pet.prog = YY.petProgVal(pet) + amount;
  if(method === 'walk') pet.walks = pet.prog;    // 散步型同步舊欄位,存檔相容
  const after = YY.petStage(pet);

  if(after > before){
    YY.save();
    YY.refreshActivePet();
    YY.sfx.tada();
    if(YY.cre) YY.spawnConfetti(comp ? comp.x : YY.cre.x, 1.4, comp ? comp.z : YY.cre.z, 30);
    const petName = (YY.PETS[pet.sp] && YY.PETS[pet.sp].n) || '小寵物';
    const L = YY.PET_EVO_LABEL[method] || YY.PET_EVO_LABEL.walk;
    YY.flash(`✨ 進化!「${petName}」升級成【${YY.STAGE_TITLE[after]}】了!(${L.name})`, 4600);
    if(YY.tryRandomMedal) YY.tryRandomMedal(.5);
    if(document.getElementById('family') && document.getElementById('family').classList.contains('on') && YY.renderFamily)
      YY.renderFamily();
  } else {
    YY.save();
  }
};

/* 相容舊呼叫:散步距離 → 只餵給「散步型」寵物 */
YY.addWalkToActivePet = function(units){ YY.addEvoProgress('walk', units); };

/* ---------- 每幀:跟在主人旁邊晃 ---------- */
YY.updateCompanion = function(dt, t){
  if(!comp || !YY.cre) return;
  const cre = YY.cre;
  /* #3 「陪伴進化」型寵物:只要當散步夥伴,靜靜陪你就會慢慢累積進度 */
  if(YY.addEvoProgress) YY.addEvoProgress('time', dt);
  const tx = cre.x - .85 + Math.sin(t / 900) * .18;
  const tz = cre.z + .6 + Math.cos(t / 900) * .12;
  const dx = tx - comp.x, dz = tz - comp.z;
  const dist = Math.hypot(dx, dz);
  if(dist > .05){
    const sp = 1.8 * dt;
    comp.x += dx / dist * Math.min(sp, dist);
    comp.z += dz / dist * Math.min(sp, dist);
    comp.mesh.rotation.y += (Math.atan2(dx, dz) - comp.mesh.rotation.y) * .08;
  }
  comp.bobT += dt * 4.4;
  const hop = Math.abs(Math.sin(comp.bobT)) * .075;
  comp.mesh.position.set(comp.x, .2 + hop, comp.z);
  comp.mesh.children.forEach(ch => {
    if(ch.userData.flap){ const f = Math.sin(t / 90) * .35; ch.rotation.z = ch.userData.flap.side * (.4 + f); }
    const ob = ch.userData.orbit;
    if(ob){ ob.a += dt * 1.8; ch.position.set(Math.cos(ob.a) * ob.r, .18 + Math.sin(ob.a * 2) * ob.h, Math.sin(ob.a) * ob.r); }
    if(ch.userData.glow) ch.material.opacity = .14 + Math.sin(t / 420) * .07;
  });
};
})();
