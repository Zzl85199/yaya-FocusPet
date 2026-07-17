/* ============================================================
   beings.js — 寵物(會跟隨)與 精靈(只待在家)的資料與 3D 建模
   #2 讓寵物 / 精靈的種類與造型更多樣化
   寵物 PETS:在牙牙森林用莓果誘捕 → 會跟著主人到處走、帶去散步會進化
   精靈 SPIRITS:在森林誘捕 或 撿蛋孵化 → 只會待在家(房間裡)閒晃
   ============================================================ */
(function(){
const M = YY.M, mat = YY.mat;
const INK = 0x2C4034;

/* ============================================================
   一、寵物 PETS(會跟隨主人)
   base = 造型;c = 主色;r = 稀有度(0 普通 / 1 稀有 / 2 傳說)
   ============================================================ */
YY.PETS = {
  cottonbun: { n:'棉花兔',   base:'bunny',    c:0xF4C9D6, r:0 },
  pip:       { n:'啾啾鳥',   base:'bird',     c:0x8FCBE6, r:0 },
  bubble:    { n:'泡泡魚',   base:'fish',     c:0x7FB8E0, r:0 },
  fluff:     { n:'絨絨雞',   base:'chick',    c:0xF2D66A, r:0 },
  slowpoke:  { n:'慢慢蝸',   base:'snail',    c:0xC7B18F, r:0 },
  mochi:     { n:'麻糬貓',   base:'cat',      c:0xF3E4CE, r:0 },
  hoppy:     { n:'呱呱蛙',   base:'frog',     c:0x8FCB7E, r:0 },
  toffee:    { n:'太妃犬',   base:'puppy',    c:0xE0B072, r:1 },
  spike:     { n:'栗子蝟',   base:'hedgehog', c:0xB98A5A, r:1 },
  paddle:    { n:'搖搖鴨',   base:'duck',     c:0xF2C14E, r:1 },
  ember:     { n:'火尾狐',   base:'fox',      c:0xE8814A, r:1 },
  starcat:   { n:'星辰貓',   base:'cat',      c:0x9B7FD4, r:2 },
  crystalfox:{ n:'晶耀狐',   base:'fox',      c:0x7FE0D0, r:2 },
};
YY.PET_ORDER = Object.keys(YY.PETS);

/* 帶去散步累積的距離門檻:0→1 需 24,1→2 再 40(共 64) */
YY.PET_EVOLVE = [24, 64];
YY.STAGE_TITLE = ['幼生', '成長', '完全體'];
YY.petStage = function(pet){
  const w = pet.walks || 0;
  if(w >= YY.PET_EVOLVE[1]) return 2;
  if(w >= YY.PET_EVOLVE[0]) return 1;
  return 0;
};
YY.petStageProgress = function(pet){
  const st = YY.petStage(pet), w = pet.walks || 0;
  if(st >= 2) return { st, pct:100, need:0, max:1 };
  const lo = st === 0 ? 0 : YY.PET_EVOLVE[0];
  const hi = YY.PET_EVOLVE[st];
  return { st, pct: Math.round((w - lo) / (hi - lo) * 100), need: Math.ceil(hi - w), max: hi - lo };
};
YY.petDisplayName = function(pet){
  const P = YY.PETS[pet.sp]; if(!P) return '小寵物';
  return P.n + '（' + YY.STAGE_TITLE[YY.petStage(pet)] + '）';
};

/* ---------- 寵物造型:各種小動物,依 stage 逐漸長大 + 多長點特徵 ---------- */
function petShape(g, base, c){
  const body = M(new THREE.SphereGeometry(.2, 14, 10), c);
  body.scale.set(1, .92, 1);
  g.add(body);

  if(base === 'bunny'){
    [-1, 1].forEach(s => { const e = M(new THREE.SphereGeometry(.06, 8, 6), c);
      e.scale.set(.55, 1.7, .5); e.position.set(s * .09, .3, -.02); g.add(e); });
  } else if(base === 'bird'){
    const beak = M(new THREE.SphereGeometry(.05, 8, 6), 0xF2C14E);
    beak.scale.set(1, .6, 1.4); beak.position.set(0, -.02, .2); g.add(beak);
    [-1, 1].forEach(s => { const w = M(new THREE.SphereGeometry(.1, 10, 8), c, { transparent:true, opacity:.92 });
      w.scale.set(.4, 1, .9); w.position.set(s * .19, .02, -.02); w.userData.flap = { side:s }; g.add(w); });
  } else if(base === 'fish'){
    const tail = M(new THREE.SphereGeometry(.09, 8, 6), c);
    tail.scale.set(.4, 1, 1.6); tail.position.set(0, 0, -.24); g.add(tail);
    const fin = M(new THREE.SphereGeometry(.07, 8, 6), c, { transparent:true, opacity:.8 });
    fin.scale.set(.3, 1.2, .7); fin.position.set(0, .18, 0); g.add(fin);
  } else if(base === 'chick'){
    const tuft = M(new THREE.SphereGeometry(.04, 6, 6), 0xF2C14E); tuft.position.set(0, .24, .06); g.add(tuft);
    const beak = M(new THREE.SphereGeometry(.04, 6, 6), 0xF2984A); beak.scale.set(1, .7, 1.3); beak.position.set(0, -.02, .19); g.add(beak);
  } else if(base === 'snail'){
    const shell = M(new THREE.SphereGeometry(.13, 10, 8), c); shell.position.set(0, .13, -.1); g.add(shell);
    const swirl = M(new THREE.TorusGeometry(.08, .02, 6, 14), 0xFFFFFF); swirl.position.set(0, .13, -.02); g.add(swirl);
    [-1, 1].forEach(s => { const h = M(new THREE.SphereGeometry(.02, 6, 6), c);
      h.position.set(s * .05, .22, .12); g.add(h); });
  } else if(base === 'cat'){
    [-1, 1].forEach(s => { const ear = M(new THREE.ConeGeometry(.06, .12, 4), c);
      ear.position.set(s * .1, .24, 0); g.add(ear); });
    const tail = M(new THREE.SphereGeometry(.05, 8, 6), c); tail.scale.set(1, 1, 2.4); tail.position.set(.14, .12, -.18); g.add(tail);
  } else if(base === 'frog'){
    [-1, 1].forEach(s => { const bump = M(new THREE.SphereGeometry(.06, 8, 6), c);
      bump.position.set(s * .09, .17, .04); g.add(bump);
      const eye = M(new THREE.SphereGeometry(.03, 6, 6), 0xFFFFFF); eye.position.set(s * .09, .19, .09); g.add(eye); });
  } else if(base === 'puppy'){
    [-1, 1].forEach(s => { const ear = M(new THREE.SphereGeometry(.06, 8, 6), 0x9A6A3E);
      ear.scale.set(.6, 1.3, .5); ear.position.set(s * .17, .06, -.02); g.add(ear); });
    const snout = M(new THREE.SphereGeometry(.06, 8, 6), c); snout.position.set(0, -.04, .18); g.add(snout);
  } else if(base === 'hedgehog'){
    for(let i = 0; i < 10; i++){ const sp = M(new THREE.ConeGeometry(.03, .12, 4), 0x6A4A2E);
      const a = i / 10 * Math.PI * 2; sp.position.set(Math.cos(a) * .12, .12 + Math.sin(a) * .06, -.05 + Math.sin(a) * .12);
      sp.rotation.x = -1.1; g.add(sp); }
    const snout = M(new THREE.SphereGeometry(.05, 8, 6), 0x3A2A1E); snout.position.set(0, -.02, .19); g.add(snout);
  } else if(base === 'duck'){
    const beak = M(new THREE.SphereGeometry(.06, 8, 6), 0xF2984A); beak.scale.set(1.3, .5, 1.2); beak.position.set(0, -.02, .2); g.add(beak);
    const wing = M(new THREE.SphereGeometry(.09, 8, 6), c, { transparent:true, opacity:.9 });
    wing.scale.set(.35, .9, 1); wing.position.set(.17, .02, 0); g.add(wing);
  } else if(base === 'fox'){
    [-1, 1].forEach(s => { const ear = M(new THREE.ConeGeometry(.05, .16, 4), c);
      ear.position.set(s * .1, .26, 0); g.add(ear); });
    const tail = M(new THREE.SphereGeometry(.07, 8, 6), 0xFFFFFF); tail.scale.set(1, 1, 2.2); tail.position.set(-.1, .1, -.2); g.add(tail);
    const snout = M(new THREE.SphereGeometry(.05, 8, 6), 0xFFFFFF); snout.position.set(0, -.05, .18); g.add(snout);
  }

  [-1, 1].forEach(s => { const eye = M(new THREE.SphereGeometry(.032, 8, 6), INK);
    eye.position.set(s * .08, .04, .18); g.add(eye); });
}

/* stage 進化外觀:1 加小芽冠、2 再加閃亮環繞 */
function petEvolveFX(g, stage, c){
  if(stage >= 1){
    const crest = M(new THREE.ConeGeometry(.05, .16, 5), 0x6FA25E);
    crest.position.set(0, .3, 0); g.add(crest);
  }
  if(stage >= 2){
    for(let i = 0; i < 3; i++){ const p = M(new THREE.SphereGeometry(.03, 8, 8), 0xFFE9A6, { transparent:true, opacity:.95 });
      p.userData.orbit = { a: i * 2.1, r:.3, h:.12 }; g.add(p); }
    const glow = M(new THREE.SphereGeometry(.28, 16, 12), c, { transparent:true, opacity:.16 });
    glow.userData.glow = true; g.add(glow);
  }
}

YY.buildPetMesh = function(species, stage){
  const P = YY.PETS[species] || YY.PETS.cottonbun;
  const g = new THREE.Group();
  petShape(g, P.base, P.c);
  petEvolveFX(g, stage || 0, P.c);
  const sc = 1 + (stage || 0) * .28;
  g.scale.setScalar(sc);
  g.userData.base = P.base;
  g.traverse(o => { if(o.isMesh) o.castShadow = true; });
  return g;
};

/* ============================================================
   二、精靈 SPIRITS(只待在家)—— 種類更多、加上顏色/會飛/發光變化
   每種都加一個專屬 feature,外型才不會只有換色而已
   ============================================================ */
YY.SPIRITS = {
  leaf:   { n:'葉葉精靈', c:0x8FCB6E, r:0, feature:'leafcap' },   // 頭上頂一片葉子
  dew:    { n:'露露精靈', c:0x8FCBE6, r:0, feature:'droplet' },   // 頭頂一滴水珠
  pebble: { n:'石石精靈', c:0xC4A47A, r:0, feature:'rockbumps' },// 背上一排石粒
  sprout: { n:'芽芽精靈', c:0xBEE39A, r:0, feature:'twinsprout' },// 頭上兩根小嫩芽
  bloom:  { n:'花花精靈', c:0xF2A0B5, r:0, feature:'petals' },   // 一圈花瓣裙擺
  moth:   { n:'蛾蛾精靈', c:0xB79BE8, r:1, flying:true, feature:'antennae' },  // 觸角 + 花紋翅膀
  ember:  { n:'燼燼精靈', c:0xF2984A, r:1, glow:true, feature:'flame' },       // 頭頂小火苗
  frost:  { n:'霜霜精靈', c:0xCDEFF5, r:1, glow:true, feature:'icespikes' },   // 身上冰刺
  spark:  { n:'電電精靈', c:0xF2E24E, r:1, flying:true, feature:'bolt' },     // 之字形閃電尾巴
  moon:   { n:'月月精靈', c:0xE8E4D4, r:2, glow:true, feature:'crescent' },   // 頭頂懸浮弦月
  aurora: { n:'極光精靈', c:0x9BE8D4, r:2, flying:true, glow:true, feature:'ribbon' }, // 拖曳彩帶
};
YY.SPIRIT_ORDER = Object.keys(YY.SPIRITS);

YY.buildSpiritMesh = function(speciesId){
  const S = YY.SPIRITS[speciesId] || YY.SPIRITS.leaf;
  const g = new THREE.Group();
  const body = M(new THREE.SphereGeometry(.24, 14, 10), S.c, { transparent:true, opacity:.95 });
  body.scale.set(1, .9, 1); g.add(body);
  [-1, 1].forEach(s => { const eye = M(new THREE.SphereGeometry(.04, 8, 6), INK);
    eye.position.set(s * .09, .05, .21); g.add(eye); });

  /* ---- 每種精靈的專屬外觀特徵 ---- */
  switch(S.feature){
    case 'leafcap': {
      const leaf = M(new THREE.SphereGeometry(.09, 8, 6), 0x5C9A4A);
      leaf.scale.set(1.3, .3, .8); leaf.position.set(0, .27, 0); leaf.rotation.y = .4;
      g.add(leaf);
      break;
    }
    case 'droplet': {
      const drop = M(new THREE.SphereGeometry(.06, 8, 8), 0xCFE9F5, { transparent:true, opacity:.85 });
      drop.scale.set(.8, 1.3, .8); drop.position.set(0, .32, .02); g.add(drop);
      break;
    }
    case 'rockbumps': {
      for(let i = 0; i < 3; i++){ const r = M(new THREE.SphereGeometry(.05, 8, 6), 0xA88A5E);
        r.position.set((i - 1) * .09, .16, -.16); g.add(r); }
      break;
    }
    case 'twinsprout': {
      [-1, 1].forEach(s => { const sp = M(new THREE.ConeGeometry(.03, .13, 5), 0x6FA25E);
        sp.position.set(s * .06, .29, 0); sp.rotation.z = s * -.2; g.add(sp); });
      break;
    }
    case 'petals': {
      for(let i = 0; i < 6; i++){ const a = i / 6 * Math.PI * 2;
        const p = M(new THREE.SphereGeometry(.06, 8, 6), 0xF7C7D6, { transparent:true, opacity:.9 });
        p.scale.set(1, .35, 1.3); p.position.set(Math.cos(a) * .2, -.08, Math.sin(a) * .2 * .6 + .05);
        p.rotation.y = a; g.add(p); }
      break;
    }
    case 'antennae': {
      [-1, 1].forEach(s => { const a = M(new THREE.CylinderGeometry(.012, .012, .14, 5), INK);
        a.position.set(s * .06, .28, .06); a.rotation.z = s * -.4; g.add(a);
        const tip = M(new THREE.SphereGeometry(.02, 6, 6), INK); tip.position.set(s * .1, .34, .1); g.add(tip); });
      break;
    }
    case 'flame': {
      const flame = M(new THREE.ConeGeometry(.06, .16, 8), 0xF2C14E, { transparent:true, opacity:.9 });
      flame.position.set(0, .32, 0); g.add(flame);
      break;
    }
    case 'icespikes': {
      for(let i = 0; i < 4; i++){ const a = i / 4 * Math.PI * 2;
        const sp = M(new THREE.ConeGeometry(.04, .14, 5), 0xB8E6F0, { transparent:true, opacity:.85 });
        sp.position.set(Math.cos(a) * .19, .06, Math.sin(a) * .19);
        sp.rotation.z = Math.cos(a) * -1.2; sp.rotation.x = Math.sin(a) * 1.2; g.add(sp); }
      break;
    }
    case 'bolt': {
      const bolt = M(new THREE.ConeGeometry(.03, .22, 4), 0xE8D63A);
      bolt.position.set(0, .1, -.22); bolt.rotation.x = 2.4; bolt.rotation.z = .3; g.add(bolt);
      break;
    }
    case 'crescent': {
      const moon = M(new THREE.TorusGeometry(.1, .035, 8, 16, Math.PI * 1.3), 0xFFF6D8, { transparent:true, opacity:.95 });
      moon.position.set(0, .34, 0); moon.rotation.x = Math.PI / 2;
      g.add(moon);
      break;
    }
    case 'ribbon': {
      for(let i = 0; i < 3; i++){ const rib = M(new THREE.SphereGeometry(.05, 8, 6),
        [0xF2A0B5, 0xB79BE8, 0x8FCBE6][i], { transparent:true, opacity:.75 });
        rib.scale.set(.5, .3, 1.6); rib.position.set(0, .02, -.22 - i * .12); g.add(rib); }
      break;
    }
  }

  if(S.flying){
    [-1, 1].forEach(s => { const w = M(new THREE.SphereGeometry(.12, 10, 8), S.c, { transparent:true, opacity:.6 });
      w.scale.set(1, .5, .18); w.position.set(s * .26, .12, -.05); w.rotation.z = s * .5;
      w.userData.flap = { side:s }; g.add(w); });
  }
  if(S.glow){
    const halo = M(new THREE.SphereGeometry(.34, 16, 12), S.c, { transparent:true, opacity:.18 });
    halo.userData.glow = true; g.add(halo);
  }
  g.userData.speciesId = speciesId;
  g.traverse(o => { if(o.isMesh) o.castShadow = true; });
  return g;
};

/* 依稀有度加權隨機挑一種精靈 / 寵物(給森林生怪 & 撿蛋用) */
const SP_WEIGHT = { 0:30, 1:12, 2:4 };
function weightedPick(order, table){
  const pool = [];
  order.forEach(id => { for(let i = 0; i < SP_WEIGHT[table[id].r]; i++) pool.push(id); });
  return pool[Math.floor(Math.random() * pool.length)];
}
YY.pickSpiritSpecies = () => weightedPick(YY.SPIRIT_ORDER, YY.SPIRITS);
YY.pickPetSpecies    = () => weightedPick(YY.PET_ORDER, YY.PETS);
/* 誘捕成功率調低(原本 .7/.42/.18 太容易了),稀有度越高越難抓 */
YY.catchChance = r => [.4, .22, .09][r];

/* ============================================================
   三、玩家擁有資料的小工具(存檔欄位在 config.js)
   ============================================================ */
let uidSeq = 0;
YY.newUid = p => (p || 'u') + Date.now().toString(36) + (uidSeq++);

YY.addPet = function(species){
  const pet = { uid: YY.newUid('pet'), sp: species, walks:0 };
  YY.ownedPets.push(pet);
  if(!YY.metPets.includes(species)) YY.metPets.push(species);
  if(!YY.activePet) YY.activePet = pet.uid;
  YY.save();
  return pet;
};
YY.addHomeSpirit = function(species){
  const sp = { uid: YY.newUid('sp'), sp: species };
  YY.homeSpirits.push(sp);
  if(!YY.metSpirits.includes(species)) YY.metSpirits.push(species);
  YY.save();
  if(YY.rebuildHomeSpirits) YY.rebuildHomeSpirits();
  return sp;
};
YY.getPet = uid => YY.ownedPets.find(p => p.uid === uid) || null;
YY.setActivePet = function(uid){
  YY.activePet = uid;
  YY.save();
  if(YY.refreshActivePet) YY.refreshActivePet();
};
})();
