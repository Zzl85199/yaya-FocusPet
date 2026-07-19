/* ============================================================
   config.js — 共用工具:調色盤 / 存檔 / 提示 / 音效
   ============================================================ */
window.YY = window.YY || {};   // faceweights.js 會先建好

YY.PAL = {
  bg:      0xC7E2AC,   // 再深一階,不要死白
  floor:   0xA8CF88,
  wall:    0xEDD394,
  rug:     0xE0B15E,
  ink:     0x2C4034,
  pot:     0xC4704F,
  leaf:    0x559244,
  leafDark:0x395F2E,
  glass:   0x8FCBE6,
};

YY.rand  = (a, b) => a + Math.random() * (b - a);
YY.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
YY.now   = () => performance.now();

/* ---------- 好感度分級(決定牠怎麼跟你互動) ---------- */
YY.TRUST_WARM  = 35;   // 到這裡就沒那麼怕你了
YY.TRUST_CLOSE = 70;   // 到這裡會超黏你
YY.trustTier = function(){
  const v = YY.trust || 0;
  return v < YY.TRUST_WARM ? 'shy' : v < YY.TRUST_CLOSE ? 'warm' : 'close';
};
const _curName = () =>
  (YY.FAMILY && YY.currentChar && YY.FAMILY[YY.currentChar]) ? YY.FAMILY[YY.currentChar].n : '牠';
/* 加好感度,順便更新那條進度條,跨過門檻時給一句話 */
YY.bumpTrust = function(n){
  const before = YY.trustTier();
  YY.trust = YY.clamp((YY.trust || 0) + n, 0, 100);
  const fill = document.getElementById('trustFill');
  if(fill) fill.style.width = YY.trust + '%';
  const after = YY.trustTier();
  YY.save();
  if(before === 'shy' && after !== 'shy')
    YY.flash(`${_curName()}好像沒那麼怕你了……願意靠近你一點了!`, 3600);
  else if(before !== 'close' && after === 'close')
    YY.flash(`${_curName()}現在超級黏你,好想一直待在你身邊 💕`, 3800);
};

/* ---------- 模式(Focus Mode / 互動模式 / 探索世界)----------
   三種模式互斥:Focus Mode 開啟時不能切去互動或探索,
   要先關閉 Focus Mode(眼神感應)才能換模式。
   探索世界目前尚未開發,先當作預留位置。 */
YY.MODES = ['interact', 'explore', 'focus'];
YY.mode = 'interact';
YY.MODE_LABEL = { interact:'🎮 互動模式', explore:'🌍 探索世界', focus:'🎯 Focus Mode 進行中' };
YY.setMode = function(m){
  if(YY.mode === m) return;
  const prev = YY.mode;
  YY.mode = m;
  if(YY.onModeChange) YY.onModeChange(m, prev);
};
/* 目前能不能切去某個模式 */
YY.canEnterMode = function(m){
  if(m === YY.mode) return true;
  if(YY.mode === 'focus') return false;   // Focus Mode 中,要先關閉才能換模式
  return true;
};

/* ---------- 專注度計時(給獎勵機制/異種解鎖之後用的地基) ----------
   連續看著螢幕的秒數會累積成 streakSec;
   短暫移開(容錯時間內)不會讓 streak 歸零,只有離開夠久才重置。 */
YY.FOCUS_GRACE_MS = 4000;   // 短暫移開的容錯時間
YY.focus = { streakSec:0, totalSec:0, graceUntil:0, nextRewardAt:YY.rand(70, 130) };
YY.updateFocusStreak = function(t, dt){
  const F = YY.focus;
  if(YY.mode !== 'focus'){ F.streakSec = 0; return; }
  if(YY.attention.trueGaze){
    F.streakSec += dt; F.totalSec += dt;
    F.graceUntil = t + YY.FOCUS_GRACE_MS;
    if(YY.eggProgressFocus) YY.eggProgressFocus(dt);   // 給「專注時間」條件的蛋累積進度
    if(YY.addEvoProgress) YY.addEvoProgress('focus', dt);   // #3 專注型寵物靠 Focus 進化
  } else if(t > F.graceUntil){
    if(F.streakSec > 0) F.nextRewardAt = YY.rand(70, 130);   // 重新開始一段專注,獎勵門檻也重置
    F.streakSec = 0;   // 移開太久了,重新計時
  }
  /* 移開但還在容錯時間內 → streak 暫停、不歸零 */
};


YY.save = function(){
  try{
    localStorage.setItem('yy3d', JSON.stringify({
      t: YY.tickets, o: YY.owned, w: YY.wear,
      f: YY.metFamily, cur: YY.currentChar, tr: Math.round(YY.trust),
      v: YY.metVariants, sp: YY.metSpirits,
      op: YY.ownedPets, ap: YY.activePet, hs: YY.homeSpirits,
      eg: YY.eggs, mp: YY.metPets,
      es: Math.round(YY.exploreSec || 0), cc: YY.catchCount || 0,
      bf: YY.berryFed || 0, gd: YY.gachaDraws || 0, pc: YY.patCount || 0,
      fs: Math.round((YY.focus && YY.focus.totalSec) || 0),
      me: YY.medalsOwned || [], sc: YY.metSecrets || [],
    }));
  }catch(e){}
};
YY.load = function(){
  YY.tickets = 6; YY.owned = [];
  YY.wear = { head:null, face:null, neck:null, back:null, aura:null };
  YY.metFamily = ['yaya']; YY.currentChar = 'yaya'; YY.trust = 12;
  YY.metVariants = []; YY.metSpirits = [];
  YY.ownedPets = []; YY.activePet = null; YY.homeSpirits = [];
  YY.eggs = []; YY.metPets = [];
  YY.exploreSec = 0; YY.catchCount = 0; YY.berryFed = 0; YY.gachaDraws = 0; YY.patCount = 0;
  YY.medalsOwned = []; YY.metSecrets = [];
  let fresh = true;
  try{
    const g = JSON.parse(localStorage.getItem('yy3d') || 'null');
    if(g){
      fresh = false;
      YY.tickets = g.t ?? 6; YY.owned = g.o || [];
      YY.wear = Object.assign(YY.wear, g.w || {});
      YY.metFamily = g.f || ['yaya']; YY.currentChar = g.cur || 'yaya';
      YY.trust = g.tr ?? 12;
      YY.metVariants = g.v || [];
      YY.metSpirits = g.sp || [];
      YY.ownedPets = g.op || [];
      YY.activePet = g.ap ?? null;
      YY.homeSpirits = g.hs || [];
      YY.eggs = g.eg || [];
      YY.metPets = g.mp || [];
      YY.exploreSec = g.es || 0; YY.catchCount = g.cc || 0;
      YY.berryFed = g.bf || 0; YY.gachaDraws = g.gd || 0; YY.patCount = g.pc || 0;
      YY.focus.totalSec = g.fs || 0;
      YY.medalsOwned = g.me || []; YY.metSecrets = g.sc || [];
    }
  }catch(e){}
  /* 第一次玩:送一隻起始寵物,讓牙寶一開始就有夥伴陪 */
  if(fresh && YY.PETS){
    const starter = { uid:'pet_starter', sp:'cottonbun', walks:0 };
    YY.ownedPets = [starter];
    YY.activePet = starter.uid;
    YY.metPets = ['cottonbun'];
  }
};

/* ---------- 提示泡泡 ---------- */
let toastTimer = 0;
YY.flash = function(msg, ms = 2600){
  const el = document.getElementById('toast');
  el.textContent = msg; el.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('on'), ms);
};

/* ---------- 迷你音效(WebAudio 合成,不用任何音檔) ---------- */
const AC = window.AudioContext || window.webkitAudioContext;
let ctx = null;
function ac(){ if(!ctx && AC) ctx = new AC(); if(ctx && ctx.state === 'suspended') ctx.resume(); return ctx; }
function tone(f0, f1, dur, type = 'sine', vol = .16){
  const c = ac(); if(!c) return;
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  o.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + .02);
}
YY.sfx = {
  chirp(){ tone(760, 1240, .14, 'triangle'); },
  peep(){ tone(980, 620, .1, 'sine', .12); },
  pop(){ tone(300, 90, .12, 'square', .1); },
  ding(){ tone(1180, 1180, .3, 'sine', .12); setTimeout(() => tone(1560, 1560, .34, 'sine', .1), 90); },
  crank(){ tone(180, 140, .18, 'sawtooth', .06); },
  tada(){ [660, 880, 1100, 1320].forEach((f, i) => setTimeout(() => tone(f, f, .18, 'triangle', .12), i * 110)); },
  munch(){ tone(220, 130, .09, 'square', .09); setTimeout(() => tone(200, 110, .09, 'square', .08), 120); },
  doorbell(){ tone(880, 880, .25, 'sine', .14); setTimeout(() => tone(700, 700, .3, 'sine', .13), 240); },
};
