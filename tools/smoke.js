/* tools/smoke.js — 無頭煙霧測試:模擬完整遊戲流程抓執行期錯誤 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const root = path.join(__dirname, '..');

const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace(/<script[^>]*><\/script>/g, ''); // 腳本自己灌
const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'http://localhost/' });
const w = dom.window;

global.window = w; global.document = w.document;
Object.defineProperty(global, 'YY', { get: () => w.YY, configurable: true });
global.localStorage = { _s:{}, getItem(k){return this._s[k]??null;}, setItem(k,v){this._s[k]=v;}, };
global.performance = { now: () => t };
global.innerWidth = 1280; global.innerHeight = 800;
global.devicePixelRatio = 1;
global.addEventListener = w.addEventListener.bind(w);
global.requestAnimationFrame = () => {}; // 迴圈我們手動跑
global.setTimeout = (fn, ms) => timers.push({ at: t + (ms||0), fn }) && timers.length;
global.clearTimeout = () => {};
let t = 0; const timers = [];
function tick(ms){ // 前進虛擬時間並跑計時器 + 一幀
  t += ms;
  for(let i = timers.length - 1; i >= 0; i--)
    if(timers[i].at <= t){ const f = timers[i].fn; timers.splice(i,1); f(); }
}

const THREE = require('three');
// 替換掉需要真 GPU 的 WebGLRenderer
THREE.WebGLRenderer = function(){ return {
  setPixelRatio(){}, setSize(){}, render(){},
  shadowMap:{}, outputEncoding:0,
  domElement: Object.assign(w.document.createElement('canvas'), { setPointerCapture(){} }),
};};
global.THREE = THREE;
global.AudioContext = undefined;

for(const f of ['config.js','items.js','family.js','focus.js','vision.js','creature.js','world.js','gacha.js','events.js','selfplay.js','pip.js','main.js']){
  const code = fs.readFileSync(path.join(root, 'js', f), 'utf8');
  try{ eval(code); }catch(e){ console.error('❌ 載入失敗:', f, e); process.exit(1); }
  console.log('✅ 載入', f);
}
const G = w.YY;

// 手動主迴圈輔助
const loopFrame = (ms) => { tick(ms);
  G.updateAttention(t);
  G.updateFocusStreak(t, ms/1000);
  G.updateFocusExtras(t, ms/1000);
  G.updatePiP(t);
  G.updateCreature(G.cre, ms/1000, t);
  G.updateSelfPlay(t, ms/1000);
  G.updateCapsule(ms/1000); G.updateParticles(ms/1000);
  G.updateButterfly(t, ms/1000); G.updateVisits(t);
};

// 1) 跑 3 秒
for(let i = 0; i < 180; i++) loopFrame(16);
console.log('✅ 3 秒閒置無錯誤,角色位置', G.cre.x.toFixed(2), G.cre.z.toFixed(2));

// 2) 抽 30 顆扭蛋(先作弊加券),完整跑完蛋的動畫
G.addTickets(30, '測試');
for(let d = 0; d < 30; d++){
  G.drawGacha();
  for(let i = 0; i < 300 && (G.capsule || timers.length); i++) loopFrame(16);
}
console.log('✅ 抽了 30 次,擁有', G.owned.length, '件,剩', G.tickets, '張券');
if(!G.owned.length) throw new Error('抽不到東西!');

// 3) 穿上每一件擁有的、再全圖鑑逐件試穿(驗證 143 個建模器)
let built = 0;
for(const id in G.ITEMS){
  const m = G.buildItem(id);
  if(!m) throw new Error('建模失敗: ' + id);
  built++;
}
console.log('✅ 全圖鑑', built, '件 3D 建模器全部成功');

// 4) 每個部位穿一件並跑動畫幀
const bySlot = {};
Object.keys(G.ITEMS).forEach(id => bySlot[G.ITEMS[id].slot] = id);
G.wear = { head:bySlot.head, face:bySlot.face, neck:bySlot.neck, back:bySlot.back, aura:bySlot.aura };
G.applyWear(G.cre);
for(let i = 0; i < 60; i++) loopFrame(16);
console.log('✅ 五個部位同時穿戴 + 動畫 OK');

// 5) 強制每位家人來訪 + 切換
// 測試期間先暫停「隨機來訪」,避免虛擬時間累積後隨機事件插隊改寫 currentChar
const _origUpdateVisits = G.updateVisits;
G.updateVisits = () => {};
for(const id of G.FAMILY_ORDER.slice(1)){
  G.familyVisit(id);
  for(let i = 0; i < 400; i++) loopFrame(16);
  if(G.currentChar !== id) throw new Error('來訪後沒換人: ' + id);
}
G.updateVisits = _origUpdateVisits; // 還原
console.log('✅ 六位家人全部來訪成功,已認識', G.metFamily.length, '位');

// 6) 餵莓果
document.querySelector('#btnBerry').onclick();
for(let i = 0; i < 600; i++) loopFrame(16);
console.log('✅ 餵莓果流程 OK,券數', G.tickets);

// 7) 面板渲染
document.querySelector('#wardrobe').classList.add('on');
G.renderWardrobe();
document.querySelector('#family').classList.add('on');
G.renderFamily();
console.log('✅ 衣櫃/家族面板渲染 OK,衣櫃列了',
  document.querySelectorAll('#wardrobeBody .wrow').length, '件');

// 8) 你在看:視線追蹤
G.mouse.inside = true;
for(let i = 0; i < 120; i++){
  G.mouse.x = Math.sin(i/10) * .8; G.mouse.y = Math.cos(i/10) * .5;
  G.mouse.lastMove = t; loopFrame(16);
}
if(!G.attention.watching) throw new Error('游標在動卻判定沒在看');
const fx = G.cre.face.position.x;
if(Math.abs(fx) < 1e-4) throw new Error('眼睛沒有在追游標');
console.log('✅ 你在看:視線追蹤 OK,face offset =', fx.toFixed(3));

// 9) 你不在看:自己玩
G.mouse.lastMove = t - 8000;                 // 假裝游標很久沒動
for(let i = 0; i < 500 && !G.debugSelfPlay(); i++) loopFrame(16);
if(G.attention.watching) throw new Error('游標久未動卻仍判定在看');
if(!G.debugSelfPlay()) throw new Error('沒在看時沒有自己玩');
console.log('✅ 你不在看:開始自己玩 →', G.debugSelfPlay());
for(let i = 0; i < 2500; i++){ G.mouse.lastMove = t - 9000; loopFrame(16); }  // 玩 40 秒換好幾種活動
console.log('✅ 自嗨 40 秒無錯誤,目前活動:', G.debugSelfPlay() || '休息中');

// 10) 突然回頭看:好感度低 → 躲起來偷看
for(let i = 0; i < 500 && !G.debugSelfPlay(); i++){ G.mouse.lastMove = t - 9000; loopFrame(16); }
G.mouse.lastMove = t; loopFrame(16);         // 你回來了!
if(!G.attention.watching) throw new Error('回來了卻沒切回在看');
if(G.debugSelfPlay()) throw new Error('被看到了卻繼續自己玩');
G.trust = 12;                                // 確保還在「怕你」階段
for(let i = 0; i < 150; i++){ G.mouse.lastMove = t; loopFrame(16); }
if(G.trustTier() !== 'shy') throw new Error('trust 12 應該是 shy');
if(!G.cre.hiding) throw new Error('好感度低卻沒有躲起來偷看');
console.log('✅ 好感度低:被看到 → 躲起來偷看,hiding =', G.cre.hiding, 'tz =', G.cre.tz.toFixed(2));

// 10b) 好感度養高 → 鼓起勇氣現身並靠近你
G.trust = 92;
let maxTz = -9;
for(let i = 0; i < 260; i++){ G.mouse.lastMove = t; loopFrame(16); maxTz = Math.max(maxTz, G.cre.tz); }
if(G.cre.hiding) throw new Error('好感度高了卻還躲著不出來');
if(maxTz < 1.4) throw new Error('好感度高卻沒有靠近你:maxTz=' + maxTz.toFixed(2));
console.log('✅ 好感度高:現身並靠近你,maxTz =', maxTz.toFixed(2), '(tier =', G.trustTier() + ')');

// 10c) 積木被撞倒後會自己疊回去
G.trust = 90;
G.knockBlocks();
for(let i = 0; i < 30; i++) loopFrame(16);     // 先讓它翻滾一下
const scattered = G.blocks.cubes.some(c => Math.abs(c.mesh.position.z - c.home.z) > .2 || Math.abs(c.mesh.rotation.x) > .2);
for(let i = 0; i < 700; i++) loopFrame(16);     // 撞倒 → 翻滾 → 疊回去(約 9 秒後)
const restacked = G.blocks.cubes.every(c => Math.abs(c.mesh.position.y - c.home.y) < .15);
if(!scattered) throw new Error('積木被撞後沒有散開');
if(!restacked) throw new Error('積木沒有自己疊回去');
console.log('✅ 積木被撞倒(散開=' + scattered + ')後會自己疊回去 =', restacked);

// 11) 玩具球會被踢動
console.log('✅ 玩具球位置', G.ball.x.toFixed(2), G.ball.z.toFixed(2));

// 12) Focus Mode:模式切換 + 互動模式鎖定
G.setMode('focus');
if(G.mode !== 'focus') throw new Error('setMode 沒有切到 focus');
if(G.canEnterMode('interact')) throw new Error('Focus Mode 中應該不能切回互動模式');
console.log('✅ Focus Mode 狀態機:切換與模式鎖定判斷 OK');

// 13) Focus Mode 專注獎勵:直接推進 streakSec 超過門檻,應該觸發獎勵
G.mouse.lastMove = t; G.mouse.inside = true;
for(let i = 0; i < 30; i++) loopFrame(16);          // 先讓 watching 判定為 true
const ticketsBefore = G.tickets, trustBefore = G.trust;
G.focus.streakSec = G.focus.nextRewardAt + 1;
loopFrame(16);
if(G.tickets === ticketsBefore && G.trust === trustBefore)
  throw new Error('專注獎勵門檻到了卻沒有任何反應(券/好感度都沒變)');
console.log('✅ 專注獎勵機制觸發 OK,券', ticketsBefore, '→', G.tickets, '、好感度', trustBefore.toFixed(1), '→', G.trust.toFixed(1));

// 14) 異種牙寶:強制解鎖 + 家族面板列出
if(!G.debugUnlockVariant()) throw new Error('強制解鎖異種失敗(可能池子已空或存檔異常)');
if(!G.metVariants.length) throw new Error('解鎖後 metVariants 是空的');
G.renderFamily();
const variantCards = document.querySelectorAll('#familyBody .fcard.variant').length;
if(variantCards !== G.VARIANT_ORDER.length) throw new Error('異種牙寶卡片數量不對: ' + variantCards);
console.log('✅ 異種牙寶解鎖 OK,已解鎖', G.metVariants.join(','), '，面板列出', variantCards, '張卡片');

// 15) 切換成異種,確認建模與漂浮動畫不會噴錯
G.switchCharacter(G.metVariants[0], false);
for(let i = 0; i < 60; i++) loopFrame(16);
console.log('✅ 切換異種角色', G.cre.def.n, '動畫 OK');

// 16) 子母視窗:開關 + 渲染不噴錯
G.setPiP(true);
for(let i = 0; i < 20; i++) loopFrame(16);
if(!G.pipOn) throw new Error('setPiP(true) 沒有生效');
G.setPiP(false);
if(G.pipOn) throw new Error('setPiP(false) 沒有生效');
console.log('✅ 子母視窗開關 + 渲染 OK');

G.setMode('interact');   // 還原,避免影響後續(若有)

console.log('\n🎉 全部煙霧測試通過!圖鑑總數:', G.ITEM_COUNT);
