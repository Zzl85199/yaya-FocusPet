/* ============================================================
   selfplay.js — 你在看 vs 你不在看,兩種人生
   你在看:牠會跑到前面找你玩、開心蹦跳、討摸摸
   你不在看:牠自己玩——踢球球、追蝴蝶、轉圈圈、睡午覺
   突然回頭看牠 → 會被抓包,愣住臉紅!
   ============================================================ */
(function(){

let act = null;          // 目前的自嗨活動 {kind, until, ...}
YY.debugSelfPlay = () => act && act.kind;
let nextActAt = 0;
let engageAt = 0;        // 下次「找你玩」動作
let kicks = 0;
let shyNoted = false;    // 這次注視有沒有提示過「躲起來」

/* ---------- 玩具球 ---------- */
YY.initToyBall = function(){
  const g = new THREE.Group();
  const b = new THREE.Mesh(new THREE.SphereGeometry(.3, 16, 12), YY.mat(0xF2A0B5));
  b.castShadow = true;
  const stripe = new THREE.Mesh(new THREE.TorusGeometry(.3, .05, 8, 22), YY.mat(0xF5EFE0));
  stripe.rotation.x = Math.PI / 2;
  g.add(b, stripe);
  g.position.set(-2.2, .3, -.8);
  (YY.roomGroup || YY.scene).add(g);
  YY.ball = { g, x:-2.2, z:-.8, vx:0, vz:0 };
};
function updateBall(dt){
  const B = YY.ball; if(!B) return;
  B.x += B.vx * dt; B.z += B.vz * dt;
  B.vx *= (1 - 1.6 * dt); B.vz *= (1 - 1.6 * dt);
  const r = Math.hypot(B.x, B.z);
  if(r > 4.2){ // 滾出地毯外會被牆彈回來
    B.vx = -B.x / r * Math.abs(B.vx || 1) * .7;
    B.vz = -B.z / r * Math.abs(B.vz || 1) * .7;
    B.x = B.x / r * 4.2; B.z = B.z / r * 4.2;
  }
  B.g.position.set(B.x, .3, B.z);
  B.g.rotation.z -= B.vx * dt * 3;
  B.g.rotation.x += B.vz * dt * 3;
}

/* ---------- 看/不看 切換的瞬間 ---------- */
YY.onAttentionChange = function(watching, t){
  const cre = YY.cre; if(!cre) return;
  if(watching){
    /* 被抓包! */
    const caught = act && act.kind !== 'nap';
    const napping = cre.doze;
    stopAct();
    if(napping){
      cre.doze = false;
      cre.squashV = -.34; YY.sfx.peep();
      YY.flash(`${cre.def.n}:「!!我、我沒有在睡覺!」`, 2600);
    } else if(caught){
      cre.squashV = .3; YY.sfx.peep();
      YY.flash(`${cre.def.n}:「被、被看到了……」(愣住)`, 2600);
    }
    /* 依好感度決定:躲起來 / 保持距離 / 撲過來 */
    const delay = (caught || napping) ? 1300 : 200;
    setTimeout(() => { if(YY.attention.watching) reactToLook(caught || napping); }, delay);
    engageAt = t + 5000;
  } else {
    cre.hiding = false;
    shyNoted = false;
    /* 依好感度決定「你走開了」這一刻的反應和之後多快開始自己玩 */
    const tier = YY.trustTier();
    let delay;
    if(tier === 'shy'){
      delay = YY.rand(1200, 2400);          // 怕生:你一走馬上鬆一口氣
      if(Math.random() < .5) YY.flash(`${cre.def.n}鬆了一口氣:「呼……終於不看我了」`, 2600);
    } else if(tier === 'close'){
      delay = YY.rand(3200, 6000);          // 超黏你:捨不得,慢一點才開始自己玩
      if(Math.random() < .4) YY.flash(`${cre.def.n}:「妳要去忙了嗎?那我在旁邊等妳~」`, 2800);
    } else {
      delay = YY.rand(2500, 5000);          // 普通:一如往常
    }
    nextActAt = t + delay;
  }
};

/* 你在看牠時,牠會怎麼反應——這就是好感度改變互動的地方 */
function reactToLook(startled){
  const cre = YY.cre; if(!cre) return;
  const tier = YY.trustTier();
  if(tier === 'shy'){
    /* 好感度低:躲到最近的躲藏點偷看你 */
    startHide();
    if(!startled) YY.flash(`${cre.def.n}被你一看,「咻」地躲起來了……只露出眼睛偷看你`, 2800);
  } else if(tier === 'warm'){
    /* 有點熟了:靠近一點,但還是保持一點距離 */
    cre.hiding = false;
    cre.tx = YY.clamp(cre.x + YY.rand(-.8, .8), -1.4, 1.4);
    cre.tz = YY.rand(2.4, 3.0);
    if(!startled) YY.flash(`${cre.def.n}小心翼翼地靠近你一點點`, 2400);
  } else {
    /* 超黏你:直接蹦到你面前討摸摸 */
    cre.hiding = false;
    cre.tx = YY.rand(-.7, .7);
    cre.tz = YY.rand(1.7, 2.3);
    cre.squashV = -.3; YY.sfx.chirp();
    YY.spawnHeart(cre.x, 2.1 * cre.def.size, cre.z);
    if(!startled) YY.flash(`${cre.def.n}開開心心地蹦到你面前!`, 2400);
  }
}

/* 躲起來:跑去最近的躲藏點,壓低身子偷看 */
function startHide(){
  const cre = YY.cre; if(!cre) return;
  const spots = YY.hideSpots || [{ x:-3.7, z:-2.3 }];
  let best = spots[0], bd = 1e9;
  for(const s of spots){
    const d = Math.hypot(s.x - cre.x, s.z - cre.z);
    if(d < bd){ bd = d; best = s; }
  }
  cre.hiding = true;
  cre.tx = best.x; cre.tz = best.z;
  cre.peekAt = YY.now() + YY.rand(1400, 2600);
}

function stopAct(){
  const cre = YY.cre;
  if(cre){ cre.goal = null; cre.spin = 0; }
  act = null;
}

/* ---------- 每幀 ---------- */
YY.updateSelfPlay = function(t, dt){
  const cre = YY.cre; if(!cre) return;
  updateBall(dt);
  if(YY.updateProps) YY.updateProps(dt);   // 積木物理

  if(YY.attention.watching){
    /* —— 躲起來偷看你(好感度低) —— */
    if(cre.hiding){
      /* 好感度養夠了 → 鼓起勇氣現身 */
      if(YY.trustTier() !== 'shy'){
        cre.hiding = false;
        cre.tx = YY.rand(-.8, .8); cre.tz = YY.rand(2.2, 2.8);
        YY.sfx.chirp(); cre.squashV = -.26;
        YY.flash(`${cre.def.n}悄悄從躲藏的地方探出來,朝你走過來了……`, 3000);
        return;
      }
      /* 偶爾探個頭偷看 */
      if(t > cre.peekAt){
        cre.peekAt = t + YY.rand(1600, 3200);
        cre.squash.rotation.z = YY.rand(-.22, .22);
        cre.squashV = -.12;
        setTimeout(() => { if(YY.cre) YY.cre.squash.rotation.z = 0; }, 700);
      }
      return;
    }

    /* —— 好感度低:只要被你盯著就躲起來 —— */
    if(YY.trustTier() === 'shy'){
      if(!cre.hiding){
        startHide();
        if(!shyNoted){ shyNoted = true; YY.flash(`${cre.def.n}被你看得好害羞,躲起來偷偷觀察你……`, 3000); }
      }
      return;
    }

    /* —— 你在看:依好感度找你玩 —— */
    if(t > engageAt && !YY.capsule && !cre.goal){
      engageAt = t + YY.rand(8000, 16000);
      const tier = YY.trustTier();
      const roll = Math.random();
      if(tier === 'close' && roll < .5){       // 超黏:開心跳 + 愛心
        cre.squashV = -.3; YY.sfx.chirp();
        setTimeout(() => { if(YY.cre) YY.cre.squashV = -.24; }, 320);
        YY.spawnHeart(cre.x, 2.1 * cre.def.size, cre.z);
      } else if(roll < .8){                     // 湊近一點點(熟了會近一點)
        const near = tier === 'close' ? [1.8, 2.4] : [2.4, 3.0];
        cre.tx = YY.clamp(cre.x + YY.rand(-.8, .8), -1.4, 1.4);
        cre.tz = YY.rand(near[0], near[1]);
      } else {                                  // 歪頭看你
        cre.squash.rotation.z = .16; YY.sfx.peep();
        setTimeout(() => { if(YY.cre) YY.cre.squash.rotation.z = 0; }, 900);
      }
    }
    return;
  }

  /* —— 你不在看:自己玩 —— */
  if(act){
    runAct(t, dt);
    return;
  }
  if(t > nextActAt && !YY.capsule && !cre.goal){
    startAct(pickIdleKind(), t);
  }
};

/* 你不在看時,牠自己玩什麼——依好感度分級,行為明顯不同 */
function pickIdleKind(){
  const tier = YY.trustTier();
  let menu;
  if(tier === 'shy'){
    /* 還怕生:多躲多睡,不太敢在空曠地方玩 */
    menu = ['wander', 'wander', 'wander', 'nap', 'nap'];
    if(YY.box) menu.push('box', 'box');
  } else if(tier === 'close'){
    /* 超黏你:活潑愛玩,還會不時偷瞄你在不在座位上 */
    menu = ['ball', 'ball', 'spin', 'wander', 'glance', 'glance'];
    if(YY.blocks)  menu.push('blocks', 'blocks');
    if(YY.cushion) menu.push('cushion', 'cushion');
    if(YY.butterflyPos && YY.butterflyPos.on) menu.push('chase', 'chase');
    if(Math.random() < .12) menu.push('nap');
  } else {
    /* 普通熟悉度:原本那套均衡菜單 */
    menu = ['ball', 'spin', 'wander', 'wander'];
    if(YY.blocks)  menu.push('blocks', 'blocks');
    if(YY.cushion) menu.push('cushion');
    if(YY.box)     menu.push('box');
    if(YY.butterflyPos && YY.butterflyPos.on) menu.push('chase', 'chase');
    if(Math.random() < .3) menu.push('nap');
  }
  return menu[Math.floor(Math.random() * menu.length)];
}

function startAct(kind, t){
  const cre = YY.cre;
  act = { kind, until: t + 9000 };
  if(kind === 'ball'){
    kicks = 0;
    cre.tx = YY.ball.x; cre.tz = YY.ball.z;
    act.until = t + 16000;
  } else if(kind === 'spin'){
    cre.spin = YY.rand(4, 6) * (Math.random() < .5 ? 1 : -1);
    act.until = t + YY.rand(1400, 2200);
    YY.sfx.chirp();
  } else if(kind === 'nap'){
    cre.tx = -3.4; cre.tz = -2.2;          // 走去盆栽旁邊
    act.until = t + YY.rand(14000, 26000);
  } else if(kind === 'chase'){
    act.until = t + 6500;
  } else if(kind === 'blocks'){            // 跑去撞積木塔
    cre.tx = YY.blocks.x; cre.tz = YY.blocks.z + .95;
    act.done = false;
    act.until = t + 12000;
  } else if(kind === 'cushion'){           // 撲上豆袋彈幾下
    cre.tx = YY.cushion.x; cre.tz = YY.cushion.z;
    act.bounces = 0; act.next = 0;
    act.until = t + 9000;
  } else if(kind === 'box'){               // 跳進紙箱偷看
    cre.tx = YY.box.x; cre.tz = YY.box.z + .8;
    act.in = false; act.next = 0;
    act.until = t + 11000;
  } else if(kind === 'glance'){            // 偷瞄一下你在不在座位上(超黏你限定)
    cre.squash.rotation.x = -.18; YY.sfx.peep();
    act.until = t + 1000;
    setTimeout(() => { if(YY.cre) YY.cre.squash.rotation.x = 0; }, 850);
  } else { // wander
    cre.tx = YY.rand(-3, 3); cre.tz = YY.rand(-2, 2.6);
    act.until = t + YY.rand(4000, 8000);
  }
}

function runAct(t, dt){
  const cre = YY.cre;
  if(t > act.until){ 
    if(act.kind === 'nap') cre.doze = false;
    stopAct(); nextActAt = t + YY.rand(3000, 9000);
    return;
  }
  switch(act.kind){
    case 'ball': {
      const B = YY.ball;
      const d = Math.hypot(B.x - cre.x, B.z - cre.z);
      if(d < .75){                          // 踢!
        const a = Math.atan2(B.x - cre.x, B.z - cre.z) + YY.rand(-.4, .4);
        B.vx = Math.sin(a) * YY.rand(2.4, 3.6);
        B.vz = Math.cos(a) * YY.rand(2.4, 3.6);
        cre.squashV = -.26; YY.sfx.pop();
        if(++kicks >= 3){ stopAct(); nextActAt = t + YY.rand(4000, 9000); return; }
      }
      cre.tx = B.x; cre.tz = B.z;           // 繼續追球
      break;
    }
    case 'spin':
      cre.root.rotation.y += cre.spin * dt;
      if(Math.random() < dt * 2) cre.squashV = -.18;
      break;
    case 'nap': {
      const arrived = Math.hypot(cre.tx - cre.x, cre.tz - cre.z) < .15;
      if(arrived && !cre.doze){ cre.doze = true; }
      break;
    }
    case 'chase': {
      const bp = YY.butterflyPos;
      if(!bp || !bp.on){ stopAct(); nextActAt = t + 2000; return; }
      cre.tx = YY.clamp(bp.x, -3.4, 3.4);
      cre.tz = YY.clamp(bp.z + .6, -2.5, 2.8);
      if(Math.random() < dt * 1.5) cre.squashV = -.2;   // 邊追邊跳
      break;
    }
    case 'blocks': {
      const B = YY.blocks;
      const d = Math.hypot(B.x - cre.x, (B.z + .95) - cre.z);
      if(!act.done && d < .9){                 // 撞倒它!
        act.done = true;
        YY.knockBlocks();
        cre.squashV = -.3; YY.sfx.pop();
        YY.spawnPuff(B.x, .5, B.z);
        cre.tx = YY.clamp(cre.x + YY.rand(-1.2, 1.2), -3, 3);  // 撞完蹦開
        cre.tz = YY.rand(-1, 2);
        act.until = t + 2500;                  // 得意一下就結束
      }
      break;
    }
    case 'cushion': {
      const C = YY.cushion;
      const d = Math.hypot(C.x - cre.x, C.z - cre.z);
      if(d < .5 && t > act.next){              // 到了就彈跳
        act.next = t + YY.rand(420, 620);
        cre.squashV = -.42; YY.sfx.pop();
        if(++act.bounces >= 4){ stopAct(); nextActAt = t + YY.rand(3500, 8000); return; }
      }
      break;
    }
    case 'box': {
      const B = YY.box;
      const d = Math.hypot(B.x - cre.x, (B.z + .8) - cre.z);
      if(!act.in && d < .6){                   // 跳進箱子
        act.in = true; cre.squashV = -.3; YY.sfx.pop();
        cre.tx = B.x; cre.tz = B.z + .15;
      }
      if(act.in && t > act.next){              // 在箱子裡探頭偷看
        act.next = t + YY.rand(700, 1400);
        cre.squashV = -.24; YY.sfx.peep();
      }
      break;
    }
  }
}
})();
