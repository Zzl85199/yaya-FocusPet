/* ============================================================
   items.js — 扭蛋飾品圖鑑(120+ 件)
   每件飾品 = 基底造型 × 顏色變化,外加獨一無二的傳說款
   slot:head 頭 / face 臉 / neck 脖子 / back 背後 / aura 光環
   r:0 普通 1 稀有 2 傳說
   ============================================================ */
(function(){

const COLORS = [
  { id:'red',    n:'草莓紅', c:0xE4573D },
  { id:'orange', n:'蜜柑橘', c:0xF2984A },
  { id:'yellow', n:'蜂蜜黃', c:0xF2C14E },
  { id:'green',  n:'抹茶綠', c:0x6FA25E },
  { id:'blue',   n:'湖水藍', c:0x5A9BD8 },
  { id:'purple', n:'薰衣草', c:0x9B7FD4 },
  { id:'pink',   n:'櫻花粉', c:0xF2A0B5 },
  { id:'cream',  n:'奶油白', c:0xF5EFE0 },
];

/* 基底造型:colors = 有幾種顏色變化 */
const BASES = [
  // 頭上 --------------------------------------------------
  { id:'bow',      n:'蝴蝶結',   slot:'head', r:0, colors:8 },
  { id:'beret',    n:'貝雷帽',   slot:'head', r:0, colors:6 },
  { id:'tophat',   n:'小禮帽',   slot:'head', r:1, colors:4 },
  { id:'strawhat', n:'草帽',     slot:'head', r:0, colors:4 },
  { id:'wizard',   n:'巫師帽',   slot:'head', r:1, colors:5 },
  { id:'crown',    n:'小皇冠',   slot:'head', r:1, colors:3 },
  { id:'clip',     n:'小葉髮夾', slot:'head', r:0, colors:6 },
  { id:'catears',  n:'貓耳朵',   slot:'head', r:0, colors:5 },
  { id:'bunny',    n:'兔耳朵',   slot:'head', r:1, colors:4 },
  { id:'party',    n:'派對帽',   slot:'head', r:0, colors:6 },
  { id:'chef',     n:'廚師帽',   slot:'head', r:1, colors:2 },
  { id:'nightcap', n:'睡帽',     slot:'head', r:0, colors:4 },
  // 臉上 --------------------------------------------------
  { id:'glasses',  n:'圓框眼鏡', slot:'face', r:0, colors:5 },
  { id:'shades',   n:'酷墨鏡',   slot:'face', r:1, colors:4 },
  { id:'monocle',  n:'單片眼鏡', slot:'face', r:1, colors:2 },
  { id:'patch',    n:'海盜眼罩', slot:'face', r:1, colors:3 },
  { id:'sticker',  n:'星星貼紙', slot:'face', r:0, colors:6 },
  // 脖子 --------------------------------------------------
  { id:'scarf',    n:'圍巾',     slot:'neck', r:0, colors:8 },
  { id:'bowtie',   n:'小領結',   slot:'neck', r:0, colors:6 },
  { id:'bell',     n:'鈴鐺項圈', slot:'neck', r:1, colors:4 },
  { id:'pearl',    n:'珍珠項鍊', slot:'neck', r:1, colors:3 },
  { id:'cape',     n:'小披風',   slot:'neck', r:1, colors:5 },
  // 背後 --------------------------------------------------
  { id:'wings',    n:'小翅膀',   slot:'back', r:1, colors:5 },
  { id:'backpack', n:'小背包',   slot:'back', r:0, colors:5 },
  { id:'shell',    n:'龜龜殼',   slot:'back', r:1, colors:3 },
  { id:'balloon',  n:'背後氣球', slot:'back', r:0, colors:6 },
  // 光環 --------------------------------------------------
  { id:'halo',     n:'光環',     slot:'aura', r:1, colors:4 },
  { id:'stars',    n:'星星環繞', slot:'aura', r:1, colors:4 },
  { id:'hearts',   n:'愛心環繞', slot:'aura', r:1, colors:3 },
];

/* 傳說款:獨一無二,不分顏色 */
const LEGENDS = [
  { id:'L_angel',    n:'天使光環',   slot:'aura' },
  { id:'L_devil',    n:'小惡魔角',   slot:'head' },
  { id:'L_rainbow',  n:'彩虹光環',   slot:'aura' },
  { id:'L_meteor',   n:'流星披風',   slot:'neck' },
  { id:'L_king',     n:'國王皇冠',   slot:'head' },
  { id:'L_mushroom', n:'蘑菇帽',     slot:'head' },
  { id:'L_goldbell', n:'黃金鈴鐺',   slot:'neck' },
  { id:'L_flutter',  n:'蝴蝶仙翅',   slot:'back' },
  { id:'L_ufo',      n:'幽浮小天線', slot:'head' },
  { id:'L_snow',     n:'雪花光環',   slot:'aura' },
];

/* 展開成完整圖鑑 */
const ITEMS = {};
BASES.forEach(b => {
  for(let i = 0; i < b.colors; i++){
    const col = COLORS[i];
    const r = Math.min(1, b.r + (i >= 6 ? 1 : 0)); // 最後幾色升為稀有
    ITEMS[b.id + '_' + col.id] = { n: col.n + b.n, slot: b.slot, r, base: b.id, c: col.c };
  }
});
LEGENDS.forEach(L => { ITEMS[L.id] = { n: L.n, slot: L.slot, r: 2, base: L.id, c: 0xF2C14E }; });

YY.ITEMS = ITEMS;
YY.ITEM_COUNT = Object.keys(ITEMS).length;
YY.RAR = [
  { n:'普通', w:68, css:'var(--r-common)' },
  { n:'稀有', w:27, css:'var(--r-rare)' },
  { n:'傳說', w:5,  css:'var(--r-legend)' },
];
YY.SLOT_NAME = { head:'頭上', face:'臉上', neck:'脖子', back:'背後', aura:'光環' };

/* ============================================================
   3D 建模工具
   ============================================================ */
const INK = 0x2C4034;
function mat(c, opt){ return new THREE.MeshToonMaterial(Object.assign({ color:c }, opt || {})); }
function M(geo, c, opt){ const m = new THREE.Mesh(geo, mat(c, opt)); m.castShadow = true; return m; }
YY.mat = mat; YY.M = M;

function heartGroup(c, s){
  const g = new THREE.Group();
  const a = M(new THREE.SphereGeometry(s, 10, 10), c);  a.position.x = -s * .62;
  const b = M(new THREE.SphereGeometry(s, 10, 10), c);  b.position.x =  s * .62;
  const t = M(new THREE.ConeGeometry(s * 1.5, s * 2.2, 4), c);
  t.rotation.x = Math.PI; t.rotation.y = Math.PI / 4; t.position.y = -s * 1.1;
  g.add(a, b, t);
  return g;
}
YY.heartGroup = heartGroup;
function starGeo(s){ return new THREE.OctahedronGeometry(s, 0); }

/* 每種基底的建模函式:回傳已擺好相對位置的 Group
   (掛在角色的對應錨點上,錨點座標見 creature.js) */
const BUILD = {

  /* ---------- 頭上 ---------- */
  bow(c){
    const g = new THREE.Group();
    const L = M(new THREE.ConeGeometry(.22, .42, 4), c); L.rotation.z =  Math.PI / 2; L.position.x = -.26;
    const R = M(new THREE.ConeGeometry(.22, .42, 4), c); R.rotation.z = -Math.PI / 2; R.position.x =  .26;
    const k = M(new THREE.SphereGeometry(.12, 10, 10), c);
    g.add(L, R, k); g.position.set(.32, .1, 0); g.rotation.z = -.35;
    return g;
  },
  beret(c){
    const g = new THREE.Group();
    const cap = M(new THREE.SphereGeometry(.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2.4), c);
    cap.scale.set(1.15, .62, 1.15);
    const nub = M(new THREE.SphereGeometry(.07, 8, 8), c); nub.position.y = .32;
    g.add(cap, nub); g.position.y = .02; g.rotation.z = .16;
    return g;
  },
  tophat(c){
    const g = new THREE.Group();
    const brim = M(new THREE.CylinderGeometry(.5, .5, .06, 20), c);
    const top  = M(new THREE.CylinderGeometry(.3, .32, .5, 20), c); top.position.y = .27;
    const band = M(new THREE.CylinderGeometry(.325, .335, .1, 20), 0xF5EFE0); band.position.y = .1;
    g.add(brim, top, band); g.position.y = .1;
    return g;
  },
  strawhat(c){
    const g = new THREE.Group();
    const brim = M(new THREE.CylinderGeometry(.72, .78, .05, 22), 0xE8C97A);
    const dome = M(new THREE.SphereGeometry(.38, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), 0xE8C97A);
    dome.position.y = .02;
    const band = M(new THREE.CylinderGeometry(.385, .39, .1, 20), c); band.position.y = .08;
    g.add(brim, dome, band); g.position.y = .06;
    return g;
  },
  wizard(c){
    const g = new THREE.Group();
    const brim = M(new THREE.CylinderGeometry(.52, .56, .06, 20), c);
    const cone = M(new THREE.ConeGeometry(.34, .85, 18), c); cone.position.y = .43;
    const star = M(starGeo(.09), 0xF2C14E); star.position.set(0, .5, .28);
    g.add(brim, cone, star); g.position.y = .08; g.rotation.z = -.1;
    return g;
  },
  crown(c){
    const g = new THREE.Group();
    const ring = M(new THREE.CylinderGeometry(.3, .34, .18, 12), c);
    for(let i = 0; i < 5; i++){
      const p = M(new THREE.ConeGeometry(.08, .2, 6), c);
      const a = i / 5 * Math.PI * 2;
      p.position.set(Math.cos(a) * .3, .17, Math.sin(a) * .3);
      g.add(p);
    }
    g.add(ring); g.position.y = .12; g.scale.setScalar(.9);
    return g;
  },
  clip(c){
    const g = new THREE.Group();
    const l1 = M(new THREE.SphereGeometry(.16, 10, 8), c); l1.scale.set(1, .45, .6); l1.rotation.z = .6;
    const l2 = l1.clone(); l2.rotation.z = -.6; l2.position.x = .2;
    g.add(l1, l2); g.position.set(-.35, .05, .1); g.rotation.z = .5;
    return g;
  },
  catears(c){
    const g = new THREE.Group();
    [-1, 1].forEach(s => {
      const ear = M(new THREE.ConeGeometry(.2, .34, 4), c);
      ear.position.set(s * .4, .1, 0); ear.rotation.z = -s * .35;
      const inner = M(new THREE.ConeGeometry(.1, .18, 4), 0xFFA8B4);
      inner.position.set(s * .4, .08, .07); inner.rotation.z = -s * .35;
      g.add(ear, inner);
    });
    return g;
  },
  bunny(c){
    const g = new THREE.Group();
    [-1, 1].forEach(s => {
      const ear = M(new THREE.CylinderGeometry(.11, .13, .72, 10), c);
      ear.position.set(s * .28, .38, 0); ear.rotation.z = -s * .22;
      const tip = M(new THREE.SphereGeometry(.12, 10, 8), c);
      tip.position.set(s * .28 - s * .08, .74, 0);
      g.add(ear, tip);
    });
    return g;
  },
  party(c){
    const g = new THREE.Group();
    const cone = M(new THREE.ConeGeometry(.3, .62, 16), c); cone.position.y = .3;
    const pom  = M(new THREE.SphereGeometry(.1, 10, 8), 0xF5EFE0); pom.position.y = .64;
    g.add(cone, pom); g.rotation.z = -.14;
    return g;
  },
  chef(c){
    const g = new THREE.Group();
    const base = M(new THREE.CylinderGeometry(.34, .36, .26, 18), c);
    const puff = M(new THREE.SphereGeometry(.42, 16, 12), c); puff.scale.set(1, .75, 1); puff.position.y = .3;
    g.add(base, puff); g.position.y = .1;
    return g;
  },
  nightcap(c){
    const g = new THREE.Group();
    const cone = M(new THREE.ConeGeometry(.36, .7, 14), c);
    cone.position.y = .26; cone.rotation.z = .55;
    const pom = M(new THREE.SphereGeometry(.11, 10, 8), 0xF5EFE0);
    pom.position.set(-.42, .5, 0);
    g.add(cone, pom);
    return g;
  },

  /* ---------- 臉上 ---------- */
  glasses(c){
    const g = new THREE.Group();
    [-1, 1].forEach(s => {
      const rim = M(new THREE.TorusGeometry(.2, .04, 8, 20), c);
      rim.position.x = s * .3;
      g.add(rim);
    });
    const bridge = M(new THREE.BoxGeometry(.22, .05, .05), c);
    g.add(bridge);
    return g;
  },
  shades(c){
    const g = new THREE.Group();
    [-1, 1].forEach(s => {
      const lens = M(new THREE.CylinderGeometry(.2, .2, .06, 18), 0x2C4034);
      lens.rotation.x = Math.PI / 2; lens.position.x = s * .3;
      const rim = M(new THREE.TorusGeometry(.2, .035, 8, 20), c); rim.position.x = s * .3;
      g.add(lens, rim);
    });
    g.add(M(new THREE.BoxGeometry(.22, .05, .05), c));
    return g;
  },
  monocle(c){
    const g = new THREE.Group();
    const rim = M(new THREE.TorusGeometry(.21, .04, 8, 20), c); rim.position.x = .3;
    const chain = M(new THREE.CylinderGeometry(.012, .012, .5, 6), c);
    chain.position.set(.44, -.28, 0); chain.rotation.z = .3;
    g.add(rim, chain);
    return g;
  },
  patch(c){
    const g = new THREE.Group();
    const pad = M(new THREE.CylinderGeometry(.2, .2, .07, 16), c);
    pad.rotation.x = Math.PI / 2; pad.position.x = -.3;
    const band = M(new THREE.TorusGeometry(.86, .03, 8, 28, Math.PI * 1.1), 0x2C4034);
    band.position.set(0, .1, -.85); band.rotation.y = 0; band.rotation.x = -.2;
    g.add(pad, band);
    return g;
  },
  sticker(c){
    const g = new THREE.Group();
    const s = M(starGeo(.13), c); s.scale.z = .35; s.position.set(-.42, -.16, 0); s.rotation.z = .4;
    g.add(s);
    return g;
  },

  /* ---------- 脖子 ---------- */
  scarf(c){
    const g = new THREE.Group();
    const ring = M(new THREE.TorusGeometry(.62, .16, 10, 24), c);
    ring.rotation.x = Math.PI / 2; ring.scale.set(1, 1, .8);
    const tail = M(new THREE.BoxGeometry(.26, .5, .12), c);
    tail.position.set(.3, -.34, .5); tail.rotation.z = .15;
    g.add(ring, tail);
    return g;
  },
  bowtie(c){
    const g = new THREE.Group();
    const L = M(new THREE.ConeGeometry(.16, .3, 4), c); L.rotation.z =  Math.PI / 2; L.position.x = -.19;
    const R = M(new THREE.ConeGeometry(.16, .3, 4), c); R.rotation.z = -Math.PI / 2; R.position.x =  .19;
    const k = M(new THREE.SphereGeometry(.09, 8, 8), c);
    g.add(L, R, k); g.position.z = .62;
    return g;
  },
  bell(c){
    const g = new THREE.Group();
    const strap = M(new THREE.TorusGeometry(.62, .07, 8, 24), c);
    strap.rotation.x = Math.PI / 2; strap.scale.set(1, 1, .82);
    const bell = M(new THREE.SphereGeometry(.14, 12, 10), 0xF2C14E);
    bell.position.set(0, -.14, .6);
    g.add(strap, bell);
    return g;
  },
  pearl(c){
    const g = new THREE.Group();
    for(let i = -3; i <= 3; i++){
      const a = i * .32;
      const p = M(new THREE.SphereGeometry(.09, 10, 8), c);
      p.position.set(Math.sin(a) * .64, -Math.abs(i) * .045, Math.cos(a) * .58);
      g.add(p);
    }
    return g;
  },
  cape(c){
    const g = new THREE.Group();
    const cloth = M(new THREE.CylinderGeometry(.55, .95, 1.15, 20, 1, true, Math.PI * .55, Math.PI * .9), c,
                    { side: THREE.DoubleSide });
    cloth.position.set(0, -.5, -.1);
    const knot = M(new THREE.SphereGeometry(.08, 8, 8), c); knot.position.set(0, .05, .62);
    g.add(cloth, knot);
    return g;
  },

  /* ---------- 背後 ---------- */
  wings(c){
    const g = new THREE.Group();
    [-1, 1].forEach(s => {
      const w = M(new THREE.SphereGeometry(.34, 12, 10), c, { transparent:true, opacity:.92 });
      w.scale.set(1.25, .55, .18);
      w.position.set(s * .42, .1, 0); w.rotation.z = s * .5;
      w.userData.flap = { side: s };
      g.add(w);
    });
    return g;
  },
  backpack(c){
    const g = new THREE.Group();
    const body = M(new THREE.SphereGeometry(.36, 14, 12), c); body.scale.set(1, 1.15, .7);
    const lid  = M(new THREE.SphereGeometry(.2, 10, 8), c);  lid.scale.set(1, .6, .7); lid.position.set(0, .32, .02);
    g.add(body, lid);
    return g;
  },
  shell(c){
    const g = new THREE.Group();
    const sh = M(new THREE.SphereGeometry(.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), c);
    sh.rotation.x = -Math.PI / 2;
    const rim = M(new THREE.TorusGeometry(.48, .07, 8, 22), c); rim.rotation.y = 0;
    g.add(sh, rim); g.scale.set(1, 1, .8);
    return g;
  },
  balloon(c){
    const g = new THREE.Group();
    const b = M(new THREE.SphereGeometry(.34, 14, 12), c); b.scale.set(1, 1.15, 1); b.position.y = 1.35;
    const str = M(new THREE.CylinderGeometry(.012, .012, 1.2, 6), 0x2C4034); str.position.y = .68;
    g.add(b, str);
    g.userData.sway = true;
    return g;
  },

  /* ---------- 光環 ---------- */
  halo(c){
    const g = new THREE.Group();
    const ring = M(new THREE.TorusGeometry(.42, .06, 10, 26), c);
    ring.rotation.x = Math.PI / 2;
    g.add(ring); g.userData.spin = .8;
    return g;
  },
  stars(c){
    const g = new THREE.Group();
    for(let i = 0; i < 3; i++){
      const s = M(starGeo(.11), c);
      s.userData.orbit = { a: i / 3 * Math.PI * 2, r: .72, h: .1 };
      g.add(s);
    }
    g.userData.spin = 1.6;
    return g;
  },
  hearts(c){
    const g = new THREE.Group();
    for(let i = 0; i < 3; i++){
      const h = heartGroup(c, .08);
      h.userData.orbit = { a: i / 3 * Math.PI * 2, r: .7, h: .12 };
      g.add(h);
    }
    g.userData.spin = 1.2;
    return g;
  },

  /* ---------- 傳說款 ---------- */
  L_angel(){
    const g = new THREE.Group();
    const ring = M(new THREE.TorusGeometry(.42, .07, 10, 28), 0xF7D774, { emissive:0xF2C14E, emissiveIntensity:.6 });
    ring.rotation.x = Math.PI / 2;
    [-1, 1].forEach(s => {
      const w = M(new THREE.SphereGeometry(.22, 10, 8), 0xFFFFFF, { transparent:true, opacity:.9 });
      w.scale.set(1.4, .5, .2); w.position.set(s * .58, -.15, 0); w.rotation.z = s * .5;
      g.add(w);
    });
    g.add(ring); g.userData.spin = .7;
    return g;
  },
  L_devil(){
    const g = new THREE.Group();
    [-1, 1].forEach(s => {
      const horn = M(new THREE.ConeGeometry(.12, .3, 10), 0xE4573D);
      horn.position.set(s * .4, .05, 0); horn.rotation.z = -s * .5;
      g.add(horn);
    });
    return g;
  },
  L_rainbow(){
    const g = new THREE.Group();
    [0xE4573D, 0xF2C14E, 0x6FA25E, 0x5A9BD8, 0x9B7FD4].forEach((c, i) => {
      const r = M(new THREE.TorusGeometry(.34 + i * .07, .028, 8, 26), c);
      r.rotation.x = Math.PI / 2;
      g.add(r);
    });
    g.userData.spin = .5;
    return g;
  },
  L_meteor(){
    const g = BUILD.cape(0x3A4C6B);
    const star = M(starGeo(.12), 0xF7D774, { emissive:0xF2C14E, emissiveIntensity:.7 });
    star.position.set(0, -.6, -.62);
    g.add(star);
    return g;
  },
  L_king(){
    const g = BUILD.crown(0xF2C14E);
    [0xE4573D, 0x5A9BD8, 0x6FA25E].forEach((c, i) => {
      const j = M(new THREE.SphereGeometry(.05, 8, 8), c);
      const a = i / 3 * Math.PI * 2 + .5;
      j.position.set(Math.cos(a) * .3, .08, Math.sin(a) * .3);
      g.add(j);
    });
    g.scale.setScalar(1.12);
    return g;
  },
  L_mushroom(){
    const g = new THREE.Group();
    const cap = M(new THREE.SphereGeometry(.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0xE4573D);
    cap.scale.set(1.1, .8, 1.1);
    for(let i = 0; i < 5; i++){
      const d = M(new THREE.SphereGeometry(.07, 8, 8), 0xF5EFE0);
      const a = i / 5 * Math.PI * 2 + .4;
      d.position.set(Math.cos(a) * .34, .22, Math.sin(a) * .34);
      d.scale.z = .5; g.add(d);
    }
    g.add(cap); g.position.y = .05;
    return g;
  },
  L_goldbell(){
    const g = BUILD.bell(0xF2C14E);
    g.children[1].material = mat(0xF7D774, { emissive:0xF2C14E, emissiveIntensity:.5 });
    g.children[1].scale.setScalar(1.3);
    return g;
  },
  L_flutter(){
    const g = new THREE.Group();
    [-1, 1].forEach(s => {
      const big = M(new THREE.SphereGeometry(.4, 12, 10), 0x9B7FD4, { transparent:true, opacity:.92 });
      big.scale.set(1.2, .7, .15); big.position.set(s * .48, .18, 0); big.rotation.z = s * .55;
      big.userData.flap = { side: s };
      const sm = M(new THREE.SphereGeometry(.26, 12, 10), 0xF2A0B5, { transparent:true, opacity:.92 });
      sm.scale.set(1.1, .6, .15); sm.position.set(s * .38, -.24, 0); sm.rotation.z = s * .95;
      sm.userData.flap = { side: s };
      g.add(big, sm);
    });
    return g;
  },
  L_ufo(){
    const g = new THREE.Group();
    [-1, 1].forEach(s => {
      const rod = M(new THREE.CylinderGeometry(.02, .02, .4, 6), 0x8AA0B8);
      rod.position.set(s * .22, .2, 0); rod.rotation.z = -s * .3;
      const orb = M(new THREE.SphereGeometry(.08, 10, 8), 0x9FE0D8, { emissive:0x5AC8B8, emissiveIntensity:.8 });
      orb.position.set(s * .34, .4, 0);
      g.add(rod, orb);
    });
    return g;
  },
  L_snow(){
    const g = new THREE.Group();
    for(let i = 0; i < 6; i++){
      const f = M(starGeo(.08), 0xCFE9F5, { emissive:0x9FD4EC, emissiveIntensity:.5 });
      f.userData.orbit = { a: i / 6 * Math.PI * 2, r: .74, h: .14 };
      g.add(f);
    }
    g.userData.spin = 1.1;
    return g;
  },
};

/* 建出一件飾品的 3D 模型 */
YY.buildItem = function(id){
  const it = ITEMS[id]; if(!it) return null;
  const fn = BUILD[it.base]; if(!fn) return null;
  const g = fn(it.c);
  g.userData.itemId = id;
  return g;
};

})();
