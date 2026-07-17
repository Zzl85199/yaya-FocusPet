/* ============================================================
   home.js — 家裡的精靈 + 蛋的孵化
   #2 精靈只會待在家:在房間裡輕輕飄來飄去,不會跟出門
   #6 森林撿到的蛋:在家孵化,時間到就變成一隻精靈住進家裡
   ============================================================ */
(function(){

/* ---------- 家裡的精靈(只在房間出現) ---------- */
let homeMeshes = [];   // { uid, sp, mesh, x, z, tx, tz, wanderAt, bobT }
YY.homeSpiritGroup = null;

function ensureGroup(){
  if(!YY.homeSpiritGroup){
    YY.homeSpiritGroup = new THREE.Group();
    (YY.roomGroup || YY.scene).add(YY.homeSpiritGroup);
  }
}

YY.rebuildHomeSpirits = function(){
  ensureGroup();
  homeMeshes.forEach(h => YY.homeSpiritGroup.remove(h.mesh));
  homeMeshes = [];
  (YY.homeSpirits || []).forEach((s, i) => {
    const mesh = YY.buildSpiritMesh(s.sp);
    const a = i / Math.max(1, YY.homeSpirits.length) * Math.PI * 2;
    const x = Math.cos(a) * YY.rand(1.6, 3), z = -1 + Math.sin(a) * YY.rand(1.6, 3);
    mesh.position.set(x, .3, z);
    YY.homeSpiritGroup.add(mesh);
    homeMeshes.push({ uid:s.uid, sp:s.sp, mesh, x, z, tx:x, tz:z, wanderAt:0, bobT:Math.random() * 10 });
  });
};

YY.updateHomeSpirits = function(t, dt){
  if(YY.mode === 'explore') return;   // 精靈只待在家,出門時不更新(而且已被 roomGroup 隱藏)
  for(const h of homeMeshes){
    const dx = h.tx - h.x, dz = h.tz - h.z, dist = Math.hypot(dx, dz);
    if(dist > .06){
      const sp = .7 * dt;
      h.x += dx / dist * Math.min(sp, dist);
      h.z += dz / dist * Math.min(sp, dist);
      h.mesh.rotation.y += (Math.atan2(dx, dz) - h.mesh.rotation.y) * .08;
    } else if(t > h.wanderAt){
      h.wanderAt = t + YY.rand(3000, 7000);
      h.tx = YY.clamp(h.x + YY.rand(-1.6, 1.6), -3.4, 3.4);
      h.tz = YY.clamp(h.z + YY.rand(-1.4, 1.4), -3, 2.6);
    }
    h.bobT += dt * 3;
    const hop = Math.abs(Math.sin(h.bobT)) * .12;
    h.mesh.position.set(h.x, .3 + hop, h.z);
    h.mesh.children.forEach(ch => {
      if(ch.userData.flap){ const f = Math.sin(t / 90) * .3; ch.rotation.z = ch.userData.flap.side * (.5 + f); }
      if(ch.userData.glow) ch.material.opacity = .14 + Math.sin(t / 500 + h.bobT) * .07;
    });
  }
};

/* ---------- 蛋的孵化 ----------
   撿到蛋 → 放進孵化器,散步累積 or 時間流逝會讓孵化進度前進,滿了就破殼 */
YY.EGG_HATCH = 100;   // 孵化所需進度
YY.addEgg = function(){
  const species = YY.pickSpiritSpecies();      // 蛋裡是哪隻精靈,先藏起來,孵出才知道
  const egg = { uid: YY.newUid('egg'), sp: species, prog: 0 };
  YY.eggs.push(egg);
  YY.save();
  YY.flash('🥚 撿到一顆蛋!帶回家會慢慢孵化(散步或等待都會加快),孵出來是一隻精靈!', 4200);
  YY.sfx.pop();
  return egg;
};
/* 進度來源:①森林散步(walkUnits)②時間自然孵(dt) */
YY.progressEggs = function(walkUnits, dt){
  if(!YY.eggs || !YY.eggs.length) return;
  let hatched = null;
  for(const egg of YY.eggs){
    egg.prog += (walkUnits || 0) * 6 + (dt || 0) * 1.4;   // 散步孵得比較快
    if(egg.prog >= YY.EGG_HATCH){ hatched = egg; break; }
  }
  if(hatched){
    YY.eggs = YY.eggs.filter(e => e !== hatched);
    const S = YY.SPIRITS[hatched.sp];
    const firstTime = !YY.metSpirits.includes(hatched.sp);
    YY.addHomeSpirit(hatched.sp);
    YY.sfx.tada();
    if(YY.cre) YY.spawnConfetti(YY.cre.x, 1.6, YY.cre.z, 30);
    YY.flash(firstTime
      ? `🐣 蛋孵化了!首次發現「${S.n}」——牠住進你家了!`
      : `🐣 蛋孵化了!又一隻「${S.n}」住進你家!`, 4200);
    if(document.getElementById('family') && document.getElementById('family').classList.contains('on') && YY.renderFamily)
      YY.renderFamily();
  }
  YY.save();
};
})();
