/* ============================================================
   events.js — 隨機事件
   ① 叮咚!家人隨機來訪(自動換成兄弟姊妹/爸媽/奶奶)
   ② 蝴蝶飛過
   ③ 餵莓果
   ============================================================ */
(function(){
const $ = s => document.querySelector(s);

/* ---------- ① 家人隨機來訪 ---------- */
let nextVisit = YY.now() + YY.rand(35000, 70000);
let swapping = false;

YY.updateVisits = function(t){
  if(swapping || YY.capsule) return;
  if(t < nextVisit) return;
  nextVisit = t + YY.rand(50000, 110000);

  /* 挑一位不是現任的家人,優先沒見過的 */
  const others = YY.FAMILY_ORDER.filter(id => id !== YY.currentChar);
  const fresh  = others.filter(id => !YY.metFamily.includes(id));
  const pool   = (fresh.length && Math.random() < .75) ? fresh : others;
  const id = pool[Math.floor(Math.random() * pool.length)];

  familyVisit(id);
};

function familyVisit(id){
  swapping = true;
  const F = YY.FAMILY[id];
  YY.sfx.doorbell();
  YY.flash(`叮咚!是${F.rel}——${F.n} 來玩了!`, 3000);

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
