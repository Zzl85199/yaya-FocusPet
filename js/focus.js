/* ============================================================
   focus.js — Focus Mode 專屬玩法
   #3 專注獎勵機制:累積 streakSec/totalSec,隨機觸發券/好感度/驚喜
   #4 異種牙寶隨機解鎖:飛飛芽、星星芽…(保底機制,越久沒中機率越高)
   #5 Focus Mode 限定的隨機小功能:精靈微光、角色打氣、異種限定小動作
   都建立在 config.js 的 YY.mode / YY.focus.streakSec / totalSec 之上
   ============================================================ */
(function(){

/* ---------- #4 異種牙寶資料 ---------- */
YY.VARIANT_ORDER = ['feiya', 'xingya'];
Object.assign(YY.FAMILY, {
  feiya: {
    n:'飛飛芽', rel:'會飛的異種', body:0xAEE3F5, blush:0x8FCBE6,
    size:.86, sprout:'twin', greet:'咻~我飛過來陪你一起專注!',
    variant:'flying',
  },
  xingya: {
    n:'星星芽', rel:'閃閃發光的異種', body:0x9B7FD4, blush:0xE0B15E,
    size:.9, sprout:'flower', greet:'✨你的專注,把我引來了……',
    variant:'sparkle',
  },
});

function lockedVariants(){
  return YY.VARIANT_ORDER.filter(id => !YY.metVariants.includes(id));
}
function unlockVariant(id){
  if(YY.metVariants.includes(id)) return false;
  YY.metVariants.push(id);
  YY.save();
  return true;
}
/* 保底機制:每次沒中,下次機率會提高一點 */
let variantRolls = 0;
function tryUnlockVariant(guaranteed){
  const pool = lockedVariants();
  if(!pool.length) return false;
  variantRolls++;
  const chance = guaranteed ? 1 : Math.min(.6, .06 + variantRolls * .035);
  if(Math.random() > chance) return false;
  const id = pool[Math.floor(Math.random() * pool.length)];
  if(!unlockVariant(id)) return false;
  variantRolls = 0;
  const V = YY.FAMILY[id];
  YY.sfx.tada();
  YY.spawnConfetti(YY.cre.x, 2.4 * YY.cre.def.size, YY.cre.z, 40);
  YY.flash(`🌟 異種解鎖!你的專注引來了「${V.n}」——去家族面板看看牠吧!`, 4600);
  if(document.getElementById('family').classList.contains('on') && YY.renderFamily) YY.renderFamily();
  return true;
}
YY.debugUnlockVariant = () => tryUnlockVariant(true);   // 除錯用

/* ---------- #3 專注獎勵機制 ---------- */
function rollReward(){
  const cre = YY.cre;
  const roll = Math.random();
  if(roll < .12 && lockedVariants().length){
    if(tryUnlockVariant(false)) return;
    // 沒中異種就順延成一般獎勵,不浪費這次觸發
  }
  if(roll < .62){
    YY.addTickets(1, `專注了好一陣子,${cre.def.n}偷偷幫你變出一張扭蛋券!`);
  } else if(roll < .88){
    YY.bumpTrust(3);
    cre.squashV = -.28; YY.sfx.chirp();
    YY.spawnHeart(cre.x, 2.1 * cre.def.size, cre.z);
    YY.flash(`${cre.def.n}被你的專注感動了,好感度悄悄上升 💕`, 2800);
  } else {
    YY.addTickets(2, `專注獎勵加倍!${cre.def.n}獻上 2 張扭蛋券!`);
    YY.sfx.tada();
    YY.spawnConfetti(cre.x, 2.2 * cre.def.size, cre.z, 26);
  }
}

/* ---------- #5 Focus Mode 限定隨機小功能 ---------- */
let nextFlavorAt = YY.rand(25, 55);
const FLAVOR_LINES = [
  '正在陪你一起專心~',
  '加油,你已經很專注了!',
  '再撐一下,你做得到的!',
  '我會乖乖在旁邊陪你,不吵你。',
];
function playFlavor(){
  const cre = YY.cre;
  const kind = Math.random();
  if(kind < .45){
    /* 小小打氣一下,不影響你正在做的事 */
    cre.squash.rotation.z = YY.rand(-.14, .14);
    cre.squashV = -.14; YY.sfx.peep();
    setTimeout(() => { if(YY.cre) YY.cre.squash.rotation.z = 0; }, 700);
    if(Math.random() < .45)
      YY.flash(`${cre.def.n}:「${FLAVOR_LINES[Math.floor(Math.random() * FLAVOR_LINES.length)]}」`, 2400);
  } else if(kind < .8){
    /* 精靈微光:場景裡飄過一顆小光點 */
    YY.spawnSparkle(cre.x + YY.rand(-1.2, 1.2), 1.6 + YY.rand(0, .6), cre.z + YY.rand(-1, 1));
  } else if(cre.def.variant === 'flying'){
    /* 飛行異種限定:繞一小圈飛 */
    cre.tx = YY.clamp(cre.x + YY.rand(-1.5, 1.5), -3.2, 3.2);
    cre.tz = YY.clamp(cre.z + YY.rand(-1, 1), -2, 2.8);
    cre.squashV = -.2;
  } else if(cre.def.variant === 'sparkle'){
    /* 閃亮異種限定:原地閃一下光 */
    YY.spawnSparkle(cre.x, 1.9 * cre.def.size, cre.z);
    cre.squashV = -.16;
  }
}

/* ---------- 每幀掛進 Focus Mode ---------- */
YY.updateFocusExtras = function(t, dt){
  if(YY.mode !== 'focus'){ nextFlavorAt = t / 1000 + YY.rand(25, 55); return; }
  const F = YY.focus;
  if(F.streakSec >= F.nextRewardAt){
    rollReward();
    F.nextRewardAt = F.streakSec + YY.rand(90, 180);
  }
  if(!YY.attention.watching) return;   // 小功能只在你看著螢幕、牠也在陪你的時候出現
  if(t / 1000 > nextFlavorAt){
    playFlavor();
    nextFlavorAt = t / 1000 + YY.rand(35, 70);
  }
};
})();
