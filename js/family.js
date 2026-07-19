/* ============================================================
   family.js — 芽芽的家族
   隨機觸發「叮咚!」家人來訪,見過一次就永久解鎖,可手動切換
   ============================================================ */
YY.FAMILY = {
  yaya: {
    n:'芽芽', rel:'本體', body:0xFFDF8E, blush:0xFFA8B4,
    size:1.0, sprout:'twin', greet:'……你、你好。(小小聲)',
    trait:'怕生的小主角', props:[],
  },
  doudou: {
    n:'芽豆', rel:'調皮的弟弟', body:0xBBDD8E, blush:0xFFB08A,
    size:0.82, sprout:'single', greet:'嘿嘿!換我玩換我玩!',
    trait:'頭戴竹蜻蜓帽,身邊總有顆玩具球', props:['beanie','toyball'],
  },
  meimei: {
    n:'芽莓', rel:'愛撒嬌的妹妹', body:0xFFC7D1, blush:0xFF8FA5,
    size:0.88, sprout:'berry', greet:'姊姊來看你了~抱抱!',
    trait:'綁著蝴蝶結,抱著愛心抱枕', props:['bow','heartplush'],
  },
  zhuang: {
    n:'芽壯', rel:'可靠的哥哥', body:0xFFC97A, blush:0xE89A6B,
    size:1.18, sprout:'triple', greet:'弟弟妹妹有沒有乖乖的啊。',
    trait:'披著英雄小披風、綁著頭帶', props:['cape','headband'],
  },
  mama: {
    n:'芽媽', rel:'溫柔的媽媽', body:0xF5B39A, blush:0xE88A7A,
    size:1.12, sprout:'flower', greet:'哎呀,家裡好熱鬧呀。',
    trait:'圍著圍裙、拿著木勺', props:['apron','spoon'],
  },
  baba: {
    n:'芽爸', rel:'憨憨的爸爸', body:0xE0B072, blush:0xC98A5A,
    size:1.28, sprout:'stache', greet:'嗯哼。(點頭致意)',
    trait:'留著鬍子、戴著老花眼鏡看報紙', props:['glasses','newspaper'],
  },
  nana: {
    n:'芽奶奶', rel:'見多識廣的奶奶', body:0xCFD8C0, blush:0xB8A8C8,
    size:0.95, sprout:'bun', greet:'小時候的芽芽呀,更怕生呢。',
    trait:'拄著拐杖、戴圓眼鏡、披著披肩', props:['cane','glasses','shawl'],
  },
};
YY.FAMILY_ORDER = ['yaya','doudou','meimei','zhuang','mama','baba','nana'];

/* ---------- 家人解鎖條件(各自不同,不再是「等時間到」而已) ----------
   type 對應到玩家實際累積的數值:
   - exploreSec  在牙牙森林探索的累積秒數
   - trust       好感度
   - catchCount  誘捕成功的累積次數
   - berryFed    在家餵莓果的累積次數
   - focusSec    Focus Mode 真的盯著螢幕的累積秒數
   - gachaDraws  抽扭蛋的累積次數
   ============================================================ */
YY.FAMILY_UNLOCK = {
  doudou: { type:'exploreSec', need:180, label:'森林探索時間', unit:'秒',
    hint:'常常去牙牙森林探索,弟弟最喜歡愛玩的人了', unlockMsg:'常常往森林跑,芽豆聽說了,好奇跑來找你玩!' },
  meimei: { type:'trust', need:45, label:'好感度', unit:'',
    hint:'多摸摸、多餵莓果,好感度提升就會吸引妹妹來', unlockMsg:'芽莓感覺到你跟芽芽感情變好了,也想來抱抱!' },
  zhuang: { type:'catchCount', need:6, label:'誘捕成功次數', unit:'隻',
    hint:'在森林裡多誘捕幾隻寵物或精靈,證明你夠可靠', unlockMsg:'芽壯聽說你在森林裡誘捕本領不錯,特地來考考你!' },
  mama: { type:'berryFed', need:8, label:'在家餵莓果次數', unit:'次',
    hint:'常常在家餵莓果,媽媽會覺得你把大家照顧得很好', unlockMsg:'芽媽看你把家裡照顧得妥妥貼貼,忍不住來看看!' },
  baba: { type:'focusSec', need:240, label:'Focus Mode 專注時間', unit:'秒',
    hint:'開著眼神感應認真 Focus Mode,累積專注時間', unlockMsg:'芽爸很欣賞你的專注力,難得誇獎地出現了!' },
  nana: { type:'gachaDraws', need:12, label:'抽扭蛋次數', unit:'次',
    hint:'多抽幾次扭蛋,見多識廣的奶奶自然會來串門子', unlockMsg:'芽奶奶聽你收集了不少扭蛋寶貝,笑咪咪地來看看!' },
};
/* 目前這個條件累積到多少了(給家族面板顯示解鎖進度用) */
YY.familyUnlockValue = function(type){
  switch(type){
    case 'exploreSec': return YY.exploreSec || 0;
    case 'trust':       return YY.trust || 0;
    case 'catchCount':  return YY.catchCount || 0;
    case 'berryFed':    return YY.berryFed || 0;
    case 'focusSec':    return (YY.focus && YY.focus.totalSec) || 0;
    case 'gachaDraws':  return YY.gachaDraws || 0;
    default: return 0;
  }
};
YY.familyUnlockProgress = function(id){
  const U = YY.FAMILY_UNLOCK[id];
  if(!U) return null;
  const cur = YY.familyUnlockValue(U.type);
  const pct = Math.min(100, Math.round(cur / U.need * 100));
  return Object.assign({ cur:Math.floor(cur), pct }, U);
};
