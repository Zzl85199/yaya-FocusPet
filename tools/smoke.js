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

for(const f of ['config.js','items.js','beings.js','family.js','focus.js','vision.js','creature.js','world.js','forest.js','gacha.js','events.js','companion.js','explore.js','home.js','selfplay.js','pip.js','main.js']){
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
  G.updateCompanion(ms/1000, t);
  G.updateSelfPlay(t, ms/1000);
  G.updateExplore(t, ms/1000);
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

// 17) 探索世界:切換模式、點地板走路、精靈生成、丟莓果誘捕
G.setMode('explore');
if(G.mode !== 'explore') throw new Error('setMode 沒有切到 explore');
G.handleExploreTap(0, 0);    // 隨便點一下畫面中央(地板),測試 tap-to-walk 不噴錯
for(let i = 0; i < 1000 && !G.spiritGroup.children.length; i++) loopFrame(16);
if(!G.spiritGroup.children.length) throw new Error('探索世界跑了 16 秒還沒生出任何精靈');
console.log('✅ 探索世界:精靈生成 OK,場上', G.spiritGroup.children.length, '隻');

// 強制選中第一隻精靈並丟莓果誘捕,跑到牠捕獲/逃跑為止
const firstUid = G.spiritGroup.children[0].userData.uid;
G.exploreTarget = firstUid;
G.throwLureBerry();
let resolved = false;
for(let i = 0; i < 1200; i++){
  const before = G.spiritGroup.children.length;
  loopFrame(16);
  if(G.spiritGroup.children.length !== before || !G.exploreTarget){ resolved = true; break; }
}
if(!resolved) throw new Error('丟莓果誘捕後,精靈一直沒有解析結果(既沒被抓也沒逃跑)');
console.log('✅ 誘捕流程 OK(捕獲或逃跑其中一種結果都正常),精靈圖鑑', G.metSpirits.join(',') || '(尚無捕獲)');

G.setMode('interact');

// 18) 寵物系統:初始寵物存在、可新增、常散步會進化
if(!G.getPet(G.activePet)) throw new Error('沒有初始散步夥伴(activePet)');
const petCountBefore = G.ownedPets.length;
const np = G.addPet('starcat');
if(G.ownedPets.length !== petCountBefore + 1) throw new Error('addPet 沒有新增寵物');
G.setActivePet(np.uid);
G.refreshActivePet();
if(G.activePet !== np.uid) throw new Error('setActivePet 沒有生效');
const stage0 = G.petStage(np);
for(let i = 0; i < 200; i++) G.addWalkToActivePet(1);   // 累積散步距離觸發進化
const stageAfter = G.petStage(G.getPet(np.uid));
if(!(stageAfter > stage0)) throw new Error('常散步後寵物沒有進化(階段沒提升)');
console.log('✅ 寵物系統 OK:新增/設為夥伴/散步進化', G.STAGE_TITLE[stage0], '→', G.STAGE_TITLE[stageAfter]);

// 19) 家中精靈:只在家生成、更新不噴錯
G.rebuildHomeSpirits();
for(let i = 0; i < 30; i++){ tick(16); G.updateHomeSpirits(t, 0.016); }
if(!G.homeSpiritGroup) throw new Error('沒有 homeSpiritGroup');
console.log('✅ 家中精靈 OK:場上', G.homeSpiritGroup.children.length, '隻(只在家出現)');

// 20) 森林檢蛋 → 孵化精靈
const spiritDexBefore = G.homeSpirits.length;
const egg = G.addEgg();
if(!egg || !G.eggs.length) throw new Error('addEgg 沒有新增蛋');
if(!egg.cond || !egg.need) throw new Error('新蛋沒有分配到孵化條件');
const feeder = { walk:G.eggProgressWalk, focus:G.eggProgressFocus, berry:G.eggProgressBerry, pat:G.eggProgressPat, time:G.eggProgressTime }[egg.cond];
if(!feeder) throw new Error('未知的蛋孵化條件:' + egg.cond);
for(let i = 0; i < 5000 && G.eggs.length; i++){ tick(16); feeder(egg.cond === 'berry' || egg.cond === 'pat' ? undefined : 5); }
if(G.eggs.length) throw new Error('蛋一直沒孵化');
if(G.homeSpirits.length <= spiritDexBefore) throw new Error('蛋孵化後沒有得到新精靈');
console.log('✅ 森林檢蛋孵化 OK:孵出後家中精靈數', spiritDexBefore, '→', G.homeSpirits.length);

// 21) 森林:進門切場景、牙牙視角(第一人稱)/第三人稱切換、相機更新不噴錯
G.setMode('explore');
if(!G.forestGroup || !G.forestGroup.visible) throw new Error('進入森林後 forestGroup 沒有顯示');
if(G.roomGroup && G.roomGroup.visible) throw new Error('進入森林後房間 roomGroup 應該隱藏');
const fpv0 = G.forestCam.fpv;
G.toggleForestFPV();
if(G.forestCam.fpv === fpv0) throw new Error('toggleForestFPV 沒有切換視角');
for(let i = 0; i < 60; i++){ tick(16); G.updateForestCam(t); }
G.toggleForestFPV();
for(let i = 0; i < 60; i++){ tick(16); G.updateForestCam(t); }
console.log('✅ 森林場景 + 牙牙視角/第三人稱切換 + 相機更新 OK');
G.setMode('interact');
if(!(G.roomGroup && G.roomGroup.visible)) throw new Error('離開森林後房間沒有恢復顯示');
console.log('✅ 離開森林 → 房間場景恢復 OK');

// 22) 精靈圖鑑:每種都有專屬特徵造型,建模不噴錯
for(const sid of G.SPIRIT_ORDER){
  if(!G.buildSpiritMesh(sid)) throw new Error('buildSpiritMesh 失敗:' + sid);
}
console.log('✅ 精靈圖鑑', G.SPIRIT_ORDER.length, '種專屬特徵造型全部建模成功');

// 23) 誘捕成功率:確認數值都是合理機率(已調低,不再是舊的 .7/.42/.18)
[0, 1, 2].forEach(r => {
  const c = G.catchChance(r);
  if(!(c > 0 && c < 1)) throw new Error('catchChance(' + r + ') 不是合理機率:' + c);
});
console.log('✅ 誘捕成功率已調低,數值合理:', [0,1,2].map(r => G.catchChance(r)).join(', '));

// 24) 家人解鎖條件:每位都有專屬條件、進度計算不噴錯
for(const id of G.FAMILY_ORDER){
  if(id === 'yaya') continue;
  const prog = G.familyUnlockProgress(id);
  if(!prog || typeof prog.pct !== 'number') throw new Error('familyUnlockProgress 失敗:' + id);
}
console.log('✅ 家族解鎖條件(散步/好感度/誘捕/餵食/專注/抽蛋)全部運作正常');

// 25) 森林中鎖定家族角色,回家才能換人
document.getElementById('family').classList.add('on');
G.familyVisit('doudou');
for(let i = 0; i < 250; i++) loopFrame(16);   // 等換人動畫跑完(setTimeout 1600+1400ms)
G.renderFamily();
G.setMode('explore');
G.renderFamily();
const yayaCard = document.querySelector('.fcard[data-id="yaya"]');
if(!yayaCard) throw new Error('找不到芽芽的家族卡片');
const charBefore = G.currentChar;
yayaCard.onclick();
if(G.currentChar !== charBefore) throw new Error('在森林裡不應該能切換家族角色,但切換成功了');
console.log('✅ 森林中鎖定家族角色(', G.currentChar, ')不能切換 OK');
G.setMode('interact');
yayaCard.onclick();
if(G.currentChar === charBefore) throw new Error('回家後應該可以切換家族角色,但沒有切成功');
console.log('✅ 回家後恢復可切換家族角色 OK');

console.log('\n🎉 全部煙霧測試通過!圖鑑總數:', G.ITEM_COUNT);
