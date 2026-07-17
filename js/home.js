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
   撿到蛋 → 放進孵化器,依「這顆蛋的孵化條件」慢慢前進,滿了就破殼
   每顆蛋隨機抽到不同的孵化條件(散步 / 專注 / 餵莓果 / 摸摸 / 靜置等待),
   這樣就不會每顆蛋都只是「等時間到」。 */
YY.EGG_COND = {
  walk:  { label:'森林散步距離', unit:'', icon:'🚶', hint:'帶牠去牙牙森林走走路' },
  focus: { label:'專注時間累積', unit:'秒', icon:'🎯', hint:'開著眼神感應,認真 Focus Mode 一下' },
  berry: { label:'在家餵食莓果', unit:'次', icon:'🫐', hint:'在房間裡餵牠吃莓果' },
  pat:   { label:'摸摸互動次數', unit:'次', icon:'✋', hint:'常常點牠、摸摸牠' },
  time:  { label:'靜靜陪伴時間', unit:'秒', icon:'🕰️', hint:'什麼都不用做,開著遊戲慢慢等' },
};
const EGG_COND_ORDER = Object.keys(YY.EGG_COND);
const EGG_COND_NEED = { walk:[45,80], focus:[70,150], berry:[4,8], pat:[16,30], time:[220,420] };
const EGG_TINTS = [0xF5EAD0, 0xE8D6F0, 0xD6EAF5, 0xF5E0D6, 0xE0F5D9, 0xF5D6E8];

YY.pickEggCondition = function(){
  const cond = EGG_COND_ORDER[Math.floor(Math.random() * EGG_COND_ORDER.length)];
  const [lo, hi] = EGG_COND_NEED[cond];
  return { cond, need: Math.round(YY.rand(lo, hi)) };
};

YY.addEgg = function(tint){
  const species = YY.pickSpiritSpecies();      // 蛋裡是哪隻精靈,先藏起來,孵出才知道
  const { cond, need } = YY.pickEggCondition();
  const egg = { uid: YY.newUid('egg'), sp: species, cond, need, prog: 0,
    tint: tint ?? EGG_TINTS[Math.floor(Math.random() * EGG_TINTS.length)] };
  YY.eggs.push(egg);
  YY.save();
  const C = YY.EGG_COND[cond];
  YY.flash(`🥚 撿到一顆蛋!牠好像需要「${C.label}」才會孵化——${C.hint}~`, 4400);
  YY.sfx.pop();
  return egg;
};

/* 依條件類型分別餵進度,只有符合條件的蛋才會前進 */
function feedEggs(cond, amount){
  if(!amount || !YY.eggs || !YY.eggs.length) return;
  let hatched = null;
  for(const egg of YY.eggs){
    if(egg.cond !== cond) continue;
    egg.prog += amount;
    if(egg.prog >= egg.need){ hatched = egg; break; }
  }
  if(hatched) hatchEgg(hatched);
  else YY.save();
}
function hatchEgg(egg){
  YY.eggs = YY.eggs.filter(e => e !== egg);
  const S = YY.SPIRITS[egg.sp];
  const firstTime = !YY.metSpirits.includes(egg.sp);
  YY.addHomeSpirit(egg.sp);
  YY.sfx.tada();
  if(YY.cre) YY.spawnConfetti(YY.cre.x, 1.6, YY.cre.z, 30);
  YY.flash(firstTime
    ? `🐣 蛋孵化了!首次發現「${S.n}」——牠住進你家了!`
    : `🐣 蛋孵化了!又一隻「${S.n}」住進你家!`, 4200);
  if(document.getElementById('family') && document.getElementById('family').classList.contains('on') && YY.renderFamily)
    YY.renderFamily();
  YY.save();
}

/* 各種行為個別呼叫,只會餵給對應條件的蛋 */
YY.eggProgressWalk  = (units) => feedEggs('walk', units);
YY.eggProgressFocus = (dt)    => feedEggs('focus', dt);
YY.eggProgressBerry = ()      => feedEggs('berry', 1);
YY.eggProgressPat   = ()      => feedEggs('pat', 1);
YY.eggProgressTime  = (dt)    => feedEggs('time', dt);

/* 舊 API 相容(給既有呼叫者):等同散步 + 靜置雙軌餵一次 */
YY.progressEggs = function(walkUnits, dt){
  if(walkUnits) YY.eggProgressWalk(walkUnits);
  if(dt) YY.eggProgressTime(dt);
};
})();
