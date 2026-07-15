/* ============================================================
   config.js — 共用工具:調色盤 / 存檔 / 提示 / 音效
   ============================================================ */
window.YY = window.YY || {};   // faceweights.js 會先建好

YY.PAL = {
  bg:      0xDCEEC4,   // 飽和度提高的房間底色(不那麼死白)
  floor:   0xBFDCA0,   // 更有份量的草綠地板
  wall:    0xF5DFAE,   // 暖一點、更飽和的牆面
  rug:     0xEEC373,   // 濃一點的芥末黃地毯
  ink:     0x2C4034,
  pot:     0xC4704F,
  leaf:    0x5D9A4B,
  leafDark:0x3F6D35,
  glass:   0xA9D8EC,   // 更藍、更透的天空窗
};

YY.rand  = (a, b) => a + Math.random() * (b - a);
YY.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
YY.now   = () => performance.now();

/* ---------- 好感度分級(決定牠怎麼跟你互動) ---------- */
YY.TRUST_WARM  = 30;   // 到這裡就沒那麼怕你了
YY.TRUST_CLOSE = 62;   // 到這裡會超黏你
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

/* ---------- 存檔 ---------- */
YY.save = function(){
  try{
    localStorage.setItem('yy3d', JSON.stringify({
      t: YY.tickets, o: YY.owned, w: YY.wear,
      f: YY.metFamily, cur: YY.currentChar, tr: Math.round(YY.trust),
    }));
  }catch(e){}
};
YY.load = function(){
  YY.tickets = 6; YY.owned = [];
  YY.wear = { head:null, face:null, neck:null, back:null, aura:null };
  YY.metFamily = ['yaya']; YY.currentChar = 'yaya'; YY.trust = 12;
  try{
    const g = JSON.parse(localStorage.getItem('yy3d') || 'null');
    if(g){
      YY.tickets = g.t ?? 6; YY.owned = g.o || [];
      YY.wear = Object.assign(YY.wear, g.w || {});
      YY.metFamily = g.f || ['yaya']; YY.currentChar = g.cur || 'yaya';
      YY.trust = g.tr ?? 12;
    }
  }catch(e){}
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
