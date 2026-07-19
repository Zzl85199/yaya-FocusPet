/* ============================================================
   secrets.js — #5 牙牙的小祕密 / 心得 / 小故事
   · 在「🌲 牙牙森林」散步、或「🎯 Focus Mode」認真專注時,
     有機率「隨機」解鎖一則小祕密,並記錄到「📖 祕密」面板
   ============================================================ */
(function(){

/* k = 分類:祕密 / 心得 / 小故事 / 冷知識 */
YY.SECRETS = [
  { id:'s01', k:'祕密', t:'牙牙其實聽得懂你說話,只是太害羞,都假裝沒聽到。' },
  { id:'s02', k:'祕密', t:'牙牙睡覺時頭上的小芽會一起一伏,那是牠在做夢的證據。' },
  { id:'s03', k:'祕密', t:'第一次見到你的時候,牙牙偷偷數過你眨了幾次眼睛。' },
  { id:'s04', k:'祕密', t:'牙牙最怕的其實不是你,是打雷。你一看牠躲起來,牠反而覺得安心。' },
  { id:'s05', k:'祕密', t:'牙牙的臉頰紅紅的不是害羞,是因為牠剛剛偷吃了一顆莓果。' },
  { id:'s06', k:'祕密', t:'扭蛋機裡最上面那顆金色的蛋,牙牙盯了好久好久,一直捨不得抽。' },
  { id:'s07', k:'祕密', t:'牙牙會趁你不注意的時候,對著窗戶的光練習跳高。' },
  { id:'s08', k:'祕密', t:'紙箱裡有牙牙藏起來的寶物:一片特別漂亮的葉子。' },

  { id:'s09', k:'心得', t:'牙牙發現,你越專注做自己的事,牠就越安心地待在旁邊。' },
  { id:'s10', k:'心得', t:'「被看見」原來沒有那麼可怕——牙牙是這樣一點一點學會的。' },
  { id:'s11', k:'心得', t:'牙牙覺得,一起安靜地待著,也是一種很棒的陪伴。' },
  { id:'s12', k:'心得', t:'散步的時候,牙牙學會了:走得慢一點,才看得到路邊的小花。' },
  { id:'s13', k:'心得', t:'牙牙說,好感度不是討好來的,是慢慢相處出來的。' },
  { id:'s14', k:'心得', t:'牙牙發現,你偶爾離開一下再回來,牠反而更開心見到你。' },
  { id:'s15', k:'心得', t:'每次專注結束,牙牙都覺得你又變得更可靠了一點點。' },

  { id:'s16', k:'小故事', t:'有天芽豆把積木塔疊到比自己還高,結果一打噴嚏就全倒了,笑到肚子痛。' },
  { id:'s17', k:'小故事', t:'芽莓第一次來找牙牙時,抱著牠不肯放,兩個滾成一團,像兩顆糰子。' },
  { id:'s18', k:'小故事', t:'芽壯偷偷幫大家把倒掉的積木疊回去,再假裝什麼都沒發生。真不愧是哥哥。' },
  { id:'s19', k:'小故事', t:'芽媽的木勺其實從來沒煮過東西,但揮起來特別有媽媽的架式。' },
  { id:'s20', k:'小故事', t:'芽爸看報紙看到睡著,報紙蓋在臉上,鬍子還一抖一抖的。' },
  { id:'s21', k:'小故事', t:'芽奶奶年輕時據說是誘捕高手,一顆莓果就能收服傳說級的精靈。' },
  { id:'s22', k:'小故事', t:'某個下雨天,一隻迷路的精靈躲進了牙牙家,從此再也不肯走了。' },
  { id:'s23', k:'小故事', t:'森林深處有一棵會發光的樹,傳說願意等的人,總有一天會遇到它。' },
  { id:'s24', k:'小故事', t:'牙牙撿到的第一顆蛋,足足抱了三天三夜才捨得放進孵蛋器。' },

  { id:'s25', k:'冷知識', t:'牙牙頭上的芽和芽芽的名字沒關係——是先有芽,才有名字的。' },
  { id:'s26', k:'冷知識', t:'精靈只待在家,是因為牠們認床;寵物願意跟出門,是因為牠們認你。' },
  { id:'s27', k:'冷知識', t:'每顆蛋的顏色都不一樣,那其實對應著裡面精靈喜歡的天氣。' },
  { id:'s28', k:'冷知識', t:'越稀有的精靈越難誘捕,因為牠們比較聰明,不會為了一顆莓果就上當。' },
  { id:'s29', k:'冷知識', t:'異種牙寶只在專注的時候出現——牠們被安靜又認真的氣息吸引。' },
  { id:'s30', k:'冷知識', t:'家人們的衣櫃是共用的,所以誰出場,誰就把大家的寶貝穿在身上。' },
  { id:'s31', k:'冷知識', t:'牙牙的腳步聲其實是「啵、啵」的,因為牠是用彈的,不是用走的。' },
  { id:'s32', k:'冷知識', t:'如果你很久沒來,牙牙會把每一件飾品都試穿一遍等你——牠是這麼說的啦。' },
];

const TAG_COL = { '祕密':'#C4703A', '心得':'#3E6FD6', '小故事':'#6FA25E', '冷知識':'#9B7FD4' };

/* ---------- 隨機解鎖一則(尚未發現的)小祕密 ---------- */
YY.tryUnlockSecret = function(chance, where){
  const pool = (YY.SECRETS || []).filter(s => !(YY.metSecrets || []).includes(s.id));
  if(!pool.length) return false;
  if(Math.random() > (chance == null ? 1 : chance)) return false;
  const s = pool[Math.floor(Math.random() * pool.length)];
  YY.metSecrets = YY.metSecrets || [];
  YY.metSecrets.push(s.id);
  YY.save();
  if(YY.sfx && YY.sfx.ding) YY.sfx.ding();
  const tag = where === 'forest' ? '🌲 散步途中' : (where === 'focus' ? '🎯 專注時' : '');
  YY.flash(`📖 ${tag}發現牙牙的小祕密!「${s.t}」`, 6000);
  if(YY.updateSecretBtn) YY.updateSecretBtn();
  const panel = document.getElementById('secrets');
  if(panel && panel.classList.contains('on') && YY.renderSecrets) YY.renderSecrets();
  return true;
};

/* ---------- 記錄面板 ---------- */
YY.renderSecrets = function(){
  const body = document.getElementById('secretsBody');
  if(!body) return;
  const owned = YY.metSecrets || [];
  const cnt = document.getElementById('secretCount');
  if(cnt) cnt.textContent = `已發現 ${owned.length} / ${YY.SECRETS.length}`;

  let html = `<div class="fintro">在「🌲 牙牙森林」散步、或開著眼神感應認真「🎯 Focus Mode」的時候,
    有機率「隨機」發現一則牙牙的小祕密、心得或小故事,發現後就會記在這裡。</div>`;

  if(!owned.length){
    html += `<div class="wempty">還沒發現任何小祕密。<br>去森林散散步,或進 Focus Mode 專注一下,
      說不定牙牙會偷偷告訴你一個祕密~</div>`;
    body.innerHTML = html;
    return;
  }

  const byId = {};
  YY.SECRETS.forEach(s => byId[s.id] = s);
  html += `<div class="seclist">`;
  owned.slice().reverse().forEach(id => {          // 最新發現的排在最上面
    const s = byId[id]; if(!s) return;
    const col = TAG_COL[s.k] || '#5C7263';
    html += `<div class="secrow">
      <span class="sectag" style="color:${col};border-color:${col}">${s.k}</span>
      <div class="sectext">${s.t}</div>
    </div>`;
  });
  const lockN = YY.SECRETS.length - owned.length;
  if(lockN > 0)
    html += `<div class="wtiny" style="margin-top:14px;text-align:center;">還有 ${lockN} 則小祕密等你發現…… 🔒</div>`;
  body.innerHTML = html + `</div>`;
};

/* 底部按鈕上的數字徽章 */
YY.updateSecretBtn = function(){
  const btn = document.getElementById('btnSecrets');
  if(!btn) return;
  const n = (YY.metSecrets || []).length;
  btn.textContent = `📖 祕密 ${n}/${YY.SECRETS.length}`;
};

/* ---------- 開關 ---------- */
YY.initSecrets = function(){
  const btn = document.getElementById('btnSecrets');
  if(btn){
    btn.onclick = () => {
      const w = document.getElementById('wardrobe'), f = document.getElementById('family');
      if(w) w.classList.remove('on');
      if(f) f.classList.remove('on');
      document.getElementById('secrets').classList.toggle('on');
      YY.renderSecrets();
    };
  }
  YY.updateSecretBtn();
};
})();
