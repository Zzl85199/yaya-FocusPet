/* ============================================================
   main.js — 開機、輸入、主迴圈
   拖曳空白處 → 旋轉房間 / 滾輪或雙指 → 縮放
   點小生物 → 摸摸(5 下 +1 券) / 點扭蛋機 → 直接抽
   ============================================================ */
(function(){
const $ = s => document.querySelector(s);

YY.load();
YY.initWorld();
YY.ensureSpiritGroup();

/* ---------- 模式切換(互動 / 探索 / Focus Mode)——
   guard 要在其他按鈕的 onclick 掛上去「之前」註冊,
   這樣切到別的模式時才能真的攔下點擊,而不是被原本的處理器搶先執行 ---------- */
const INTERACT_ONLY_BTNS = ['#btnDraw', '#btnWardrobe', '#btnFamily'];
INTERACT_ONLY_BTNS.forEach(sel => {
  const b = $(sel); if(!b) return;
  b.addEventListener('click', e => {
    if(YY.mode !== 'interact'){
      e.stopImmediatePropagation(); e.preventDefault();
      YY.flash(`${YY.MODE_LABEL[YY.mode]} 中無法使用,先切回互動模式才能用喔`, 2400);
    }
  }, true);
});

YY.switchCharacter(YY.currentChar, false);
YY.cre.tx = 0; YY.cre.tz = 1.2; YY.cre.x = 0; YY.cre.z = 1.2;
YY.initPanels();
if(YY.initSecrets) YY.initSecrets();
YY.initBerry();
YY.initToyBall();
YY.initVision();
if(YY.rebuildHomeSpirits) YY.rebuildHomeSpirits();
if(YY.refreshActivePet) YY.refreshActivePet();
$('#trustFill').style.width = YY.trust + '%';

function renderModeUI(){
  const interactBtn = $('#btnModeInteract'), exploreBtn = $('#btnModeExplore');
  interactBtn.classList.toggle('active', YY.mode === 'interact');
  interactBtn.classList.toggle('locked', !YY.canEnterMode('interact'));
  exploreBtn.classList.toggle('active', YY.mode === 'explore');
  exploreBtn.classList.toggle('locked', !YY.canEnterMode('explore'));

  const modeLabel = $('#modeLabel');
  if(YY.mode !== 'interact'){
    modeLabel.textContent = YY.MODE_LABEL[YY.mode];
    modeLabel.classList.add('on');
  } else {
    modeLabel.classList.remove('on');
  }
  INTERACT_ONLY_BTNS.forEach(sel => {
    const b = $(sel); if(b) b.classList.toggle('modeLocked', YY.mode !== 'interact');
  });
  const berryBtn = $('#btnBerry');
  berryBtn.textContent = YY.mode === 'explore' ? '🫐 誘捕' : '🫐 餵莓果';
  const eyeBtn = $('#btnEye');
  if(eyeBtn){
    if(YY.mode === 'explore'){
      eyeBtn.textContent = YY.forestCam && YY.forestCam.fpv ? '🐾 牙牙視角' : '🐾 切視角';
      eyeBtn.classList.toggle('live', !!(YY.forestCam && YY.forestCam.fpv));
    } else if(YY.renderEyeBtnDefault){
      YY.renderEyeBtnDefault();
    }
  }
}
YY.renderForestHint = renderModeUI;
YY.onModeChange = function(m, prev){
  renderModeUI();
  if(prev === 'explore' && m !== 'explore'){ YY.leaveForest(); }
  if(m === 'focus'){
    YY.flash('進入 Focus Mode!互動模式的功能先鎖起來,專心感受牠陪你的樣子', 3400);
    if(YY.setPiP) YY.setPiP(true);
  } else if(m === 'explore'){
    YY.enterForest();
    YY.flash('🌲 走出房間門,來到牙牙森林!點地板散步、點精靈/寵物選中牠、按「🫐 誘捕」丟莓果,還能撿蛋帶回家孵化', 5200);
    if(YY.tryRandomMedal) YY.tryRandomMedal(.12);
    if(YY.setPiP) YY.setPiP(false);
  } else if(YY.setPiP){
    YY.setPiP(false);
  }
};
$('#btnModeInteract').onclick = () => {
  if(!YY.canEnterMode('interact')){ YY.flash('Focus Mode 進行中,請先關閉才能切回互動模式', 2600); return; }
  YY.setMode('interact');
};
$('#btnModeExplore').onclick = () => {
  if(!YY.canEnterMode('explore')){ YY.flash('Focus Mode 進行中,請先關閉才能進入探索世界', 2600); return; }
  YY.setMode('explore');
};
renderModeUI();

/* ---------- 輸入 ---------- */
YY.mouse = { x:0, y:0, lastMove: YY.now(), inside:true, prevOk:false };
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
const pointers = new Map();
let dragging = false, pinchD = 0, moved = 0;

const dom = YY.renderer.domElement;

function setPtr(e){
  ptr.x = (e.clientX / innerWidth) * 2 - 1;
  ptr.y = -(e.clientY / innerHeight) * 2 + 1;
}
function hitTest(){
  ray.setFromCamera(ptr, YY.camera);
  const creHit = ray.intersectObject(YY.cre.root, true).length > 0;
  const macHit = YY.machine ? ray.intersectObject(YY.machine, true).length > 0 : false;
  const doorHit = YY.roomDoor ? ray.intersectObject(YY.roomDoor, true).length > 0 : false;
  return { creHit, macHit, doorHit };
}

dom.addEventListener('pointerdown', e => {
  pointers.set(e.pointerId, { x:e.clientX, y:e.clientY });
  if(pointers.size === 2){
    const [a, b] = [...pointers.values()];
    pinchD = Math.hypot(a.x - b.x, a.y - b.y);
    return;
  }
  dragging = true; moved = 0;
  dom.setPointerCapture(e.pointerId);
});

dom.addEventListener('pointermove', e => {
  YY.mouse.x = (e.clientX / innerWidth) * 2 - 1;
  YY.mouse.y = -(e.clientY / innerHeight) * 2 + 1;
  YY.mouse.lastMove = YY.now();
  YY.mouse.inside = true;
  const prev = pointers.get(e.pointerId);
  if(!prev) return;
  const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
  pointers.set(e.pointerId, { x:e.clientX, y:e.clientY });

  if(pointers.size === 2){
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y);
    if(YY.mode === 'explore'){ YY.forestCam.tpRadius *= pinchD / Math.max(1, d); }
    else { YY.cam.radius *= pinchD / Math.max(1, d); YY.updateCam(); }
    pinchD = d;
    return;
  }
  if(!dragging) return;
  moved += Math.abs(dx) + Math.abs(dy);
  if(YY.mode === 'explore'){
    const F = YY.forestCam;
    if(F.fpv){ F.yaw -= dx * .006; }                       // 第一人稱:左右張望
    else { F.tpTheta -= dx * .0055; F.tpPhi -= dy * .004; } // 第三人稱:繞著牠轉
    return;
  }
  YY.cam.theta -= dx * .0055;
  YY.cam.phi   -= dy * .004;
  YY.updateCam();
});

dom.addEventListener('pointerup', e => {
  pointers.delete(e.pointerId);
  if(!dragging) return;
  dragging = false;
  if(moved < 8){                    // 視為「點一下」
    if(YY.mode === 'focus') return;   // Focus Mode 中不觸發互動模式的點擊行為
    setPtr(e);
    if(YY.mode === 'explore'){
      YY.handleExploreTap(ptr.x, ptr.y);
      return;
    }
    const { creHit, macHit, doorHit } = hitTest();
    if(doorHit){
      if(YY.canEnterMode('explore')) YY.setMode('explore');
      else YY.flash('Focus Mode 進行中,請先關閉才能出門', 2600);
    }
    else if(creHit) pet();
    else if(macHit) YY.drawGacha();
  }
});
dom.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); dragging = false; });
dom.addEventListener('pointerleave', () => { YY.mouse.inside = false; YY.mouse.prevOk = false; });
document.addEventListener('visibilitychange', () => {
  if(document.hidden){ YY.mouse.inside = false; YY.mouse.prevOk = false; }
  else { YY.mouse.lastMove = YY.now(); YY.mouse.inside = true; }
});
dom.addEventListener('wheel', e => {
  if(YY.mode === 'explore'){ YY.forestCam.tpRadius *= 1 + Math.sign(e.deltaY) * .08; return; }
  YY.cam.radius *= 1 + Math.sign(e.deltaY) * .08;
  YY.updateCam();
}, { passive:true });

/* ---------- 摸摸 ---------- */
let lastPet = 0;
function pet(){
  const t = YY.now(), cre = YY.cre;
  if(t - lastPet < 260) return;
  lastPet = t;
  cre.squashV = -.28;
  YY.sfx.chirp();
  YY.spawnHeart(cre.x, 2.1 * cre.def.size, cre.z, 0xFF7B8E);
  YY.bumpTrust(2);                       // 摸摸會加好感度(順便更新那條進度條)
  YY.patCount = (YY.patCount || 0) + 1;
  if(YY.eggProgressPat) YY.eggProgressPat();
  if(YY.addEvoProgress) YY.addEvoProgress('pat', 1);   // #3 撒嬌型寵物靠摸摸進化
  if(YY.tryRandomMedal) YY.tryRandomMedal(.04);
  /* 扭蛋券改成「隨機掉落」,不再是摸幾下就一定有 */
  const chance = .14 + (YY.trust / 100) * .12;   // 好感度越高、掉券機率略高(約 14%~26%)
  if(Math.random() < chance){
    YY.addTickets(1, `${cre.def.n}被摸得好舒服~竟然掉出一張扭蛋券!`);
  }
  YY.save();
}

/* ---------- 閒逛 AI ---------- */
let wanderAt = YY.now() + 5000;
function updateWander(t){
  const cre = YY.cre;
  if(!YY.attention.watching) return;   // 你不在看時,由 selfplay 接管
  if(cre.goal || YY.capsule || cre.hiding) return;   // 躲起來時別亂走
  if(YY.trustTier() === 'shy') return;               // 還在怕你 → 交給躲藏邏輯
  if(t > wanderAt){
    wanderAt = t + YY.rand(6000, 14000);
    if(Math.random() < .7){
      cre.tx = YY.rand(-2.6, 2.6);
      cre.tz = YY.rand(-1.2, 2.8);
    }
  }
}

/* ---------- 主迴圈 ---------- */
let last = YY.now();
let lastStreakLabel = -1;
function renderFocusStreak(){
  const el = $('#focusStreak'); if(!el) return;
  if(YY.mode !== 'focus'){ el.classList.remove('on'); lastStreakLabel = -1; return; }
  const s = Math.floor(YY.focus.streakSec);
  if(s === lastStreakLabel) return;
  lastStreakLabel = s;
  const mm = Math.floor(s / 60), ss = s % 60;
  el.textContent = `🎯 已專注 ${mm}:${String(ss).padStart(2, '0')}`;
  el.classList.add('on');
}
function loop(){
  const t = YY.now();
  const dt = Math.min(.05, (t - last) / 1000); last = t;

  YY.updateAttention(t);
  YY.updateFocusStreak(t, dt);
  YY.updateFocusExtras(t, dt);
  renderFocusStreak();
  YY.updatePiP(t);
  YY.updateCreature(YY.cre, dt, t);
  YY.updateCompanion(dt, t);
  YY.updateHomeSpirits(t, dt);
  if(YY.mode !== 'explore'){
    YY.updateSelfPlay(t, dt);
    updateWander(t);
  }
  YY.updateCapsule(dt);
  YY.updateParticles(dt);
  YY.updateButterfly(t, dt);
  YY.updateVisits(t);
  YY.updateExplore(t, dt);
  if(YY.eggProgressTime) YY.eggProgressTime(dt);   // 靜靜等待的蛋,不管在不在森林都會慢慢孵

  if(YY.mode === 'explore') YY.updateForestCam(t);

  /* 扭蛋機搖晃 */
  const m = YY.machine;
  if(m.userData.shake > 0){
    m.userData.shake -= dt * 1.4;
    m.rotation.z = Math.sin(t / 28) * .045 * m.userData.shake;
    m.userData.knob.rotation.z += dt * 9;
  } else m.rotation.z *= .9;

  YY.renderer.render(YY.scene, YY.camera);
  requestAnimationFrame(loop);
}
loop();

/* 開場提示 */
setTimeout(() => YY.flash(`${YY.FAMILY[YY.currentChar].n}:「${YY.FAMILY[YY.currentChar].greet}」`, 3200), 900);
setTimeout(() => YY.flash('剛認識時牠會怕你——你一看,牠就躲起來偷看。多摸摸、餵莓果養好感度,牠會慢慢願意靠近你', 5200), 4600);
setTimeout(() => YY.flash(`一共有 ${YY.ITEM_COUNT} 件扭蛋飾品可以收集!摸摸和餵莓果有機率掉扭蛋券`, 4200), 10200);
setTimeout(() => YY.flash('按「🎯 Focus Mode」開鏡頭——牠會知道你有沒有在看牠!沒人看的時候牠會自己去撞積木、撲豆袋、鑽紙箱', 5200), 15200);
})();
