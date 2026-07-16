/* ============================================================
   focus.js — Focus Mode 專屬玩法
   #3 專注獎勵機制:累積 streakSec/totalSec,隨機觸發券/好感度/驚喜
   #4 異種牙寶隨機解鎖:飛飛芽、星星芽…(保底機制,越久沒中機率越高)
   #5 Focus Mode 限定的隨機小功能:精靈微光、角色打氣、異種限定小動作
   都建立在 config.js 的 YY.mode / YY.focus.streakSec / totalSec 之上
   ============================================================ */
(function(){

/* ---------- #4 異種牙寶資料(共 15 種,飛行 / 閃亮 / 光暈 / 樸素風格都有) ---------- */
YY.VARIANT_ORDER = [
  'feiya', 'xingya', 'leiya', 'yunya', 'caiya', 'jinya', 'mengya',
  'bingya', 'huoya', 'yeya', 'haiya', 'yingya', 'shaya', 'senya', 'muya',
];
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
  leiya: {
    n:'雷雷芽', rel:'帶靜電的異種', body:0xF2E24E, blush:0xE0B15E,
    size:.84, sprout:'single', greet:'噼哩啪啦!專注的感覺讓我充滿電!',
    variant:'flying',
  },
  yunya: {
    n:'雲雲芽', rel:'軟綿綿的異種', body:0xF5F7F2, blush:0xCFE0E8,
    size:.95, sprout:'flower', greet:'我是從專注的天空飄下來的雲朵唷~',
    variant:'flying',
  },
  caiya: {
    n:'彩彩芽', rel:'七彩斑斕的異種', body:0xF2A0B5, blush:0x9B7FD4,
    size:.9, sprout:'flower', greet:'你的專注讓我閃出好多顏色!',
    variant:'sparkle',
  },
  jinya: {
    n:'金金芽', rel:'金光閃閃的異種', body:0xF2C14E, blush:0xE0A93A,
    size:.92, sprout:'bun', greet:'叮~專注的價值,黃金也比不上。',
    variant:'sparkle',
  },
  mengya: {
    n:'夢夢芽', rel:'活在夢裡的異種', body:0xD9C7F0, blush:0xF2A0B5,
    size:.88, sprout:'berry', greet:'噓……你的專注,把我從夢裡叫醒了。',
    variant:'sparkle',
  },
  bingya: {
    n:'冰冰芽', rel:'冰冰涼涼的異種', body:0xCDEFF5, blush:0x8FCBE6,
    size:.9, sprout:'bun', greet:'你好冷靜、好專注,跟我很像呢。',
    variant:'glow', glowColor:0xBEEFFA,
  },
  huoya: {
    n:'火火芽', rel:'熱情如火的異種', body:0xE4573D, blush:0xF2984A,
    size:.94, sprout:'triple', greet:'你的專注力,把我燃燒起來了!',
    variant:'glow', glowColor:0xFFAE6B,
  },
  yeya: {
    n:'夜夜芽', rel:'愛熬夜的異種', body:0x6B5B95, blush:0x9B7FD4,
    size:.9, sprout:'twin', greet:'深夜的專注時光,只有我懂你。',
    variant:'glow', glowColor:0xB79BE8,
  },
  haiya: {
    n:'海海芽', rel:'來自遠方的異種', body:0x5A9BD8, blush:0x8FCBE6,
    size:.92, sprout:'berry', greet:'像海浪一樣,你的專注一波接著一波。',
    variant:'glow', glowColor:0x9AD8E8,
  },
  yingya: {
    n:'螢螢芽', rel:'會發光的異種', body:0xD8E85A, blush:0xB8D84A,
    size:.8, sprout:'single', greet:'黑暗中,你的專注就是我的光。',
    variant:'glow', glowColor:0xE8F58A,
  },
  shaya: {
    n:'沙沙芽', rel:'來自沙漠的異種', body:0xE0C088, blush:0xC98A5A,
    size:.9, sprout:'stache', greet:'一步一步,你的專注像沙漠裡的旅人。',
  },
  senya: {
    n:'森森芽', rel:'住在深林的異種', body:0x3F6B3A, blush:0x6FA25E,
    size:1.05, sprout:'triple', greet:'歡迎來到專注的森林深處。',
  },
  muya: {
    n:'木木芽', rel:'安安靜靜的異種', body:0x8A6A44, blush:0xC98A5A,
    size:.96, sprout:'single', greet:'像一棵樹一樣,靜靜陪你專注。',
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
  if(!YY.attention.trueGaze) return;   // 小功能只在你眼睛真的看著螢幕時才出現
  if(t / 1000 > nextFlavorAt){
    playFlavor();
    nextFlavorAt = t / 1000 + YY.rand(35, 70);
  }
};
})();
