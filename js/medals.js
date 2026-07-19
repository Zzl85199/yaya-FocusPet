/* ============================================================
   medals.js — #4 勳章系統
   · 玩遊戲時「隨機」掉勳章(摸摸 / 抽蛋 / 誘捕 / 孵蛋 / 進化 /
     專注 / 認識家人 / 進森林都有機率)
   · 解鎖後會「掛在房間後方牆上」的勳章板上(3D)
   · 家族面板裡也有一區可以檢視全部勳章
   ============================================================ */
(function(){
const M = YY.M, mat = YY.mat;

/* ---------- 勳章資料 ---------- */
YY.MEDALS = [
  { id:'firstpat',  n:'初次摸摸', icon:'✋', c:0xF2A0B5, rib:0xE07090, d:'和牙寶的第一次親密接觸' },
  { id:'gachafan',  n:'扭蛋愛好', icon:'🥚', c:0xF2C14E, rib:0xE0A93A, d:'沉迷轉扭蛋的證明' },
  { id:'forester',  n:'森林旅人', icon:'🌲', c:0x6FA25E, rib:0x4E7C43, d:'一次又一次走進牙牙森林' },
  { id:'catcher',   n:'誘捕高手', icon:'🎯', c:0x5A9BD8, rib:0x3E6FD6, d:'莓果誘捕的好本領' },
  { id:'hatcher',   n:'孵蛋達人', icon:'🐣', c:0xF5D9A0, rib:0xE0B072, d:'耐心把蛋孵成了精靈' },
  { id:'evolver',   n:'進化見證', icon:'✨', c:0x9B7FD4, rib:0x7A5FB0, d:'陪寵物走到了新的樣子' },
  { id:'focused',   n:'專注之心', icon:'🧘', c:0x3F6B3A, rib:0x2E5028, d:'在 Focus Mode 裡沉澱下來' },
  { id:'reunion',   n:'團圓時刻', icon:'🏠', c:0xE0B072, rib:0xC98A5A, d:'家人一個個聚了過來' },
  { id:'bestie',    n:'最佳拍檔', icon:'💕', c:0xFF7B8E, rib:0xE05A6E, d:'和牙寶的感情越來越好' },
  { id:'collector', n:'蒐藏之星', icon:'👑', c:0xF2C14E, rib:0xC49A3A, d:'飾品櫃越來越豐富' },
  { id:'stargazer', n:'異種發現', icon:'🌟', c:0xB79BE8, rib:0x9B7FD4, d:'見到了神祕的異種牙寶' },
  { id:'lucky',     n:'幸運之星', icon:'🍀', c:0x8FCB6E, rib:0x6FA25E, d:'運氣好到不行' },
];

/* ---------- 解鎖邏輯 ---------- */
YY.unlockMedal = function(id){
  if(!id) return false;
  YY.medalsOwned = YY.medalsOwned || [];
  if(YY.medalsOwned.includes(id)) return false;
  const m = YY.MEDALS.find(x => x.id === id);
  if(!m) return false;
  YY.medalsOwned.push(id);
  YY.save();
  if(YY.rebuildMedals) YY.rebuildMedals();
  if(YY.sfx && YY.sfx.tada) YY.sfx.tada();
  if(YY.cre && YY.spawnConfetti) YY.spawnConfetti(YY.cre.x, 2.4, YY.cre.z, 30);
  YY.flash(`🏅 隨機解鎖新勳章:「${m.n}」!${m.d}——已經掛到房間後牆的勳章板上了`, 4600);
  const fam = document.getElementById('family');
  if(fam && fam.classList.contains('on') && YY.renderFamily) YY.renderFamily();
  return true;
};

/* 有機率(chance)隨機解鎖「一個還沒拿到的」勳章 */
YY.tryRandomMedal = function(chance){
  const pool = (YY.MEDALS || []).filter(m => !(YY.medalsOwned || []).includes(m.id));
  if(!pool.length) return false;
  if(Math.random() > (chance == null ? 1 : chance)) return false;
  const m = pool[Math.floor(Math.random() * pool.length)];
  return YY.unlockMedal(m.id);
};

/* ---------- 牆上的勳章板(3D) ---------- */
const COLS = 4;
const CELL_W = 1.08, CELL_H = 0.94;

function buildBadge(m, owned){
  const g = new THREE.Group();
  if(owned){
    /* 緞帶 */
    [-1, 1].forEach(s => {
      const rb = M(new THREE.BoxGeometry(.12, .36, .04), m.rib || 0xE0607A);
      rb.position.set(s * .11, -.34, .02); rb.rotation.z = s * .32; g.add(rb);
    });
    /* 金色外圈 + 彩色圓盤 + 星星 */
    const rim = M(new THREE.CylinderGeometry(.3, .3, .06, 22), 0xF2C14E);
    rim.rotation.x = Math.PI / 2; g.add(rim);
    const center = M(new THREE.CylinderGeometry(.23, .23, .08, 22), m.c);
    center.rotation.x = Math.PI / 2; center.position.z = .03; g.add(center);
    const star = M(new THREE.OctahedronGeometry(.1, 0), 0xFFF3C4);
    star.position.z = .1; g.add(star);
  } else {
    /* 還沒解鎖:淡淡的空圈,像牆上留了位置等你掛上去 */
    const ring = M(new THREE.TorusGeometry(.27, .035, 8, 22), 0xB8B0A0,
      { transparent:true, opacity:.5 });
    g.add(ring);
    const q = M(new THREE.SphereGeometry(.05, 8, 6), 0xB8B0A0, { transparent:true, opacity:.4 });
    q.position.z = .02; g.add(q);
  }
  return g;
}

YY.buildMedalWall = function(room){
  const board = new THREE.Group();
  const rows = Math.ceil(YY.MEDALS.length / COLS);
  const bw = COLS * CELL_W + .5, bh = rows * CELL_H + .7;

  const frame = M(new THREE.BoxGeometry(bw + .3, bh + .3, .12), 0x9C5F30);
  const cork  = M(new THREE.BoxGeometry(bw, bh, .08), 0xD8B98A);
  cork.position.z = .045;
  board.add(frame, cork);

  /* 標題牌:🏅 勳章牆 */
  const plate = M(new THREE.BoxGeometry(1.9, .5, .06), 0x6FA25E);
  plate.position.set(0, bh / 2 + .05, .1);
  const plate2 = M(new THREE.BoxGeometry(1.7, .32, .04), 0x87B96F);
  plate2.position.set(0, bh / 2 + .05, .13);
  board.add(plate, plate2);

  const badges = new THREE.Group();
  badges.position.z = .1;
  board.add(badges);
  YY.medalBadges = badges;
  YY.medalBoardRows = rows;

  board.position.set(-6.4, 6.0, -10.34);
  board.traverse(o => { if(o.isMesh) o.receiveShadow = true; });
  room.add(board);
  YY.medalBoard = board;

  YY.rebuildMedals();
};

YY.rebuildMedals = function(){
  const badges = YY.medalBadges;
  if(!badges) return;
  badges.children.slice().forEach(c => badges.remove(c));
  const rows = YY.medalBoardRows || Math.ceil(YY.MEDALS.length / COLS);
  YY.MEDALS.forEach((m, i) => {
    const cx = i % COLS, cy = Math.floor(i / COLS);
    const x = (cx - (COLS - 1) / 2) * CELL_W;
    const y = ((rows - 1) / 2 - cy) * CELL_H - .2;
    const owned = (YY.medalsOwned || []).includes(m.id);
    const b = buildBadge(m, owned);
    b.position.set(x, y, 0);
    badges.add(b);
  });
};

/* ---------- 家族面板裡的「勳章牆」區塊 ---------- */
YY.renderMedalSection = function(){
  const owned = YY.medalsOwned || [];
  let html = `<div class="fintro" style="margin-top:18px;">🏅 <b>勳章牆</b>——玩遊戲時會「隨機」掉勳章,
    解鎖後會掛到房間後方牆上的勳章板上,快去看看!(已收集 ${owned.length} / ${YY.MEDALS.length})</div><div class="fgrid">`;
  for(const m of YY.MEDALS){
    const has = owned.includes(m.id);
    const col = '#' + m.c.toString(16).padStart(6, '0');
    html += `<div class="fcard medal ${has ? '' : 'lock'}">
      <div class="dot" style="background:${has ? col : '#DDD'};display:grid;place-items:center;font-size:26px;">${has ? m.icon : ''}</div>
      <b>${has ? m.n : '???'}</b>
      <small>${has ? m.d : '尚未解鎖'}</small>
    </div>`;
  }
  return html + '</div>';
};
})();
