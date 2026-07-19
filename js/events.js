/* ============================================================
   events.js — 隨機事件
   ① 叮咚!家人隨機來訪(自動換成兄弟姊妹/爸媽/奶奶)
   ② 蝴蝶飛過
   ③ 餵莓果
   ============================================================ */
(function(){
const $ = s => document.querySelector(s);

/* ---------- ① 家人來訪 ----------
   已認識的家人:偶爾隨機來串門子(單純調劑氣氛,不影響解鎖)
   還沒認識的家人:各自有專屬的解鎖條件(見 family.js 的 YY.FAMILY_UNLOCK),
   條件達成才會「叮咚!」來訪並永久解鎖,不再是單純等時間到。
   在牙牙森林探索時,家不在,所以兩種來訪都先暫停,回家後才會觸發。 */
let nextVisit = YY.now() + YY.rand(50000, 90000);
let swapping = false;
let lastUnlockCheck = 0;

YY.updateVisits = function(t){
  if(swapping || YY.capsule) return;
  if(YY.mode === 'explore') return;   // #4 人在森林裡,家人不會跑來按門鈴

  checkFamilyUnlocks(t);

  if(t < nextVisit) return;
  nextVisit = t + YY.rand(60000, 130000);
  /* 只從「已經認識」的家人裡隨機選一位來串門子 */
  const known = YY.FAMILY_ORDER.filter(id => id !== YY.currentChar && YY.metFamily.includes(id));
  if(!known.length) return;
  const id = known[Math.floor(Math.random() * known.length)];
  familyVisit(id);
};

/* 每 2.5 秒檢查一次(不用每幀檢查)哪個還沒解鎖的家人條件已經達成 */
function checkFamilyUnlocks(t){
  if(t - lastUnlockCheck < 2500) return;
  lastUnlockCheck = t;
  for(const id of YY.FAMILY_ORDER){
    if(id === 'yaya' || YY.metFamily.includes(id)) continue;
    const prog = YY.familyUnlockProgress(id);
    if(prog && prog.pct >= 100){
      familyVisit(id, prog.unlockMsg);
      break;   // 一次只解鎖一位
    }
  }
}

function familyVisit(id, unlockMsg){
  swapping = true;
  const F = YY.FAMILY[id];
  YY.sfx.doorbell();
  YY.flash(unlockMsg ? `叮咚!${unlockMsg}` : `叮咚!是${F.rel}——${F.n} 來玩了!`, 3400);

  const firstTime = !YY.metFamily.includes(id);

  /* 現任角色跳出畫面右邊 */
  const old = YY.cre;
  old.tx = 9; old.tz = 2;
  setTimeout(() => {
    YY.spawnPuff(old.x, .6, old.z);
    YY.switchCharacter(id, false, true);
    const cre = YY.cre;
    cre.x = -9; cre.z = 2; cre.tx = 0; cre.tz = 1.2;

    if(firstTime){
      YY.metFamily.push(id);
      YY.addTickets(2, `第一次見到 ${F.n}!`);
      if(YY.tryRandomMedal) YY.tryRandomMedal(.6);
    }
    YY.save();
    setTimeout(() => {
      YY.flash(`${F.n}:「${F.greet}」`, 3400);
      YY.sfx.chirp();
      swapping = false;
      if($('#family').classList.contains('on')) YY.renderFamily();
    }, 1400);
  }, 1600);
}
YY.familyVisit = familyVisit; // 除錯用:YY.familyVisit('meimei')

/* ---------- 切換角色(共用衣櫃) ---------- */
YY.switchCharacter = function(id, withPuff, keepPos){
  const oldCre = YY.cre;
  const px = oldCre ? oldCre.x : 0, pz = oldCre ? oldCre.z : 1.2;
  if(oldCre) YY.scene.remove(oldCre.root);

  const cre = YY.buildCharacter(id);
  if(keepPos !== true){ cre.x = px; cre.z = pz; cre.tx = px; cre.tz = pz; }
  YY.scene.add(cre.root);
  YY.cre = cre;
  YY.currentChar = id;
  YY.applyWear(cre);
  YY.save();

  $('#whoName').textContent = YY.FAMILY[id].n + ' · ' + YY.FAMILY[id].rel;
  if(YY.buildCompanionFor) YY.buildCompanionFor(id);
  if(withPuff){
    YY.spawnPuff(cre.x, .8, cre.z);
    YY.sfx.pop();
    YY.flash(`換 ${YY.FAMILY[id].n} 出來玩!`, 2200);
  }
};

/* ---------- ② 蝴蝶 ---------- */
let bf = null, bfNext = YY.now() + YY.rand(12000, 26000);
YY.butterflyPos = { on:false, x:0, z:0 };
YY.updateButterfly = function(t, dt){
  if(!bf){
    if(t > bfNext){
      const g = new THREE.Group();
      [-1, 1].forEach(s => {
        const w = new THREE.Mesh(new THREE.CircleGeometry(.16, 10),
          YY.mat(0xF2A0B5, { side:THREE.DoubleSide }));
        w.position.x = s * .12; w.userData.s = s;
        g.add(w);
      });
      g.position.set(-11, YY.rand(2.5, 5), YY.rand(-4, 2));
      YY.scene.add(g);
      bf = { g, x:-11 };
    }
    return;
  }
  bf.x += dt * 1.8;
  bf.g.position.x = bf.x;
  YY.butterflyPos.on = true;
  YY.butterflyPos.x = bf.x; YY.butterflyPos.z = bf.g.position.z;
  bf.g.position.y += Math.sin(bf.x * 2.2) * dt * 1.6;
  bf.g.children.forEach(w => w.rotation.y = w.userData.s * (Math.sin(t / 60) * .9));
  if(bf.x > 12){
    YY.scene.remove(bf.g); bf = null;
    YY.butterflyPos.on = false;
    bfNext = t + YY.rand(24000, 55000);
  }
};

/* ---------- ③ 餵莓果 ---------- */
let berry = null, berryCd = 0;
YY.initBerry = function(){
  $('#btnBerry').onclick = () => {
    if(YY.mode === 'explore'){ YY.throwLureBerry(); return; }
    if(YY.mode !== 'interact'){ YY.flash(`${YY.MODE_LABEL[YY.mode]} 中無法使用,先切回互動模式才能用喔`, 2400); return; }
    const t = YY.now();
    if(berry){ YY.flash('地上已經有一顆莓果了!', 2200); return; }
    if(t < berryCd){
      YY.flash(`莓果還在長,再等 ${Math.ceil((berryCd - t) / 1000)} 秒`, 2200);
      return;
    }
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.SphereGeometry(.22, 14, 12), YY.mat(0xE4573D));
    b.position.y = .22; b.castShadow = true;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(.09, 8, 6), YY.mat(0x6FA25E));
    leaf.scale.set(1.4, .5, .7); leaf.position.y = .44;
    g.add(b, leaf);
    const x = YY.rand(-2.4, 2.4), z = YY.rand(-.5, 2.6);
    g.position.set(x, 0, z);
    YY.scene.add(g);
    berry = { g, x, z };
    YY.sfx.pop();

    const cre = YY.cre;
    cre.tx = x; cre.tz = z; cre.goal = 'berry';
  };
};
YY.eatBerry = function(cre){
  if(!berry) { cre.goal = null; return; }
  cre.goal = null;
  YY.scene.remove(berry.g);
  YY.spawnPuff(berry.x, .4, berry.z);
  berry = null;
  berryCd = YY.now() + 18000;
  YY.sfx.munch();
  cre.squashV = -.32;
  setTimeout(() => YY.spawnHeart(cre.x, 2.0, cre.z), 300);
  YY.bumpTrust(4);                          // 餵食很加分,好感度 +4
  YY.berryFed = (YY.berryFed || 0) + 1;     // 給芽媽解鎖條件、也順便餵「餵莓果」條件的蛋
  if(YY.eggProgressBerry) YY.eggProgressBerry();
  if(YY.addEvoProgress) YY.addEvoProgress('berry', 1);   // #3 貪吃型寵物靠餵莓果進化
  if(YY.tryRandomMedal) YY.tryRandomMedal(.05);
  YY.save();
  /* 扭蛋券改成隨機掉落(約一半機率) */
  if(Math.random() < .55){
    YY.addTickets(1, `${cre.def.n}吃得好開心,還回送你一張扭蛋券!`);
  } else {
    YY.flash(`${cre.def.n}把莓果吃光光,滿足地蹭了蹭~`, 2800);
  }
  /* 吃飽後隨便逛逛 */
  setTimeout(() => { cre.tx = YY.rand(-2, 2); cre.tz = YY.rand(0, 2.4); }, 2500);
};

/* ---------- 加券小工具 ---------- */
YY.addTickets = function(n, why){
  YY.tickets += n; YY.save(); YY.renderWardrobe();
  YY.flash(`${why}(扭蛋券 +${n},現在有 ${YY.tickets} 張)`, 3000);
};
})();
