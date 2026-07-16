/* ============================================================
   companion.js — 每一位牙寶都有自己的專屬小寵物
   外型/顏色依角色本身的配色決定,會跟在角色旁邊晃來晃去
   ============================================================ */
(function(){
const SHAPES = ['bunny', 'bird', 'fish', 'chick', 'snail'];

/* 用角色 id 決定固定的寵物外型(同一位角色每次都是同一隻寵物) */
function shapeFor(id){
  let h = 0;
  for(let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return SHAPES[h % SHAPES.length];
}
const SHAPE_NAME = { bunny:'兔兔精靈', bird:'小鳥精靈', fish:'小魚精靈', chick:'雛鳥精靈', snail:'蝸牛精靈' };

function buildCompanionMesh(id){
  const F = YY.FAMILY[id];
  const shape = shapeFor(id);
  const c = F.blush;   // 用角色自己的腮紅色當寵物主色,天生就是一對
  const g = new THREE.Group();

  const body = YY.M(new THREE.SphereGeometry(.2, 14, 10), c);
  body.scale.set(1, .92, 1);
  g.add(body);

  if(shape === 'bunny'){
    [-1, 1].forEach(s => {
      const ear = YY.M(new THREE.SphereGeometry(.06, 8, 6), c);
      ear.scale.set(.55, 1.7, .5);
      ear.position.set(s * .09, .3, -.02);
      g.add(ear);
    });
  } else if(shape === 'bird'){
    const beak = YY.M(new THREE.SphereGeometry(.05, 8, 6), 0xF2C14E);
    beak.scale.set(1, .6, 1.4);
    beak.position.set(0, -.02, .2);
    g.add(beak);
    [-1, 1].forEach(s => {
      const wing = YY.M(new THREE.SphereGeometry(.1, 10, 8), c, { transparent:true, opacity:.92 });
      wing.scale.set(.4, 1, .9);
      wing.position.set(s * .19, .02, -.02);
      wing.userData.flap = { side: s };
      g.add(wing);
    });
  } else if(shape === 'fish'){
    const tail = YY.M(new THREE.SphereGeometry(.09, 8, 6), c);
    tail.scale.set(.4, 1, 1.6);
    tail.position.set(0, 0, -.24);
    g.add(tail);
  } else if(shape === 'chick'){
    const tuft = YY.M(new THREE.SphereGeometry(.04, 6, 6), 0xF2C14E);
    tuft.position.set(0, .24, .06);
    g.add(tuft);
    const beak = YY.M(new THREE.SphereGeometry(.04, 6, 6), 0xF2C14E);
    beak.scale.set(1, .7, 1.3); beak.position.set(0, -.02, .19);
    g.add(beak);
  } else if(shape === 'snail'){
    const shell = YY.M(new THREE.SphereGeometry(.13, 10, 8), c);
    shell.position.set(0, .13, -.1);
    g.add(shell);
  }

  [-1, 1].forEach(s => {
    const eye = YY.M(new THREE.SphereGeometry(.032, 8, 6), 0x2C4034);
    eye.position.set(s * .08, .04, .18);
    g.add(eye);
  });

  g.userData.shape = shape;
  g.traverse(o => { if(o.isMesh) o.castShadow = true; });
  return g;
}

/* ---------- 目前的寵物 ---------- */
let comp = null;
YY.buildCompanionFor = function(id){
  if(comp && comp.mesh){ YY.scene.remove(comp.mesh); comp = null; }
  const cre = YY.cre;
  const mesh = buildCompanionMesh(id);
  const x = (cre ? cre.x : 0) - .9, z = (cre ? cre.z : 1.2) + .55;
  mesh.position.set(x, .2, z);
  YY.scene.add(mesh);
  comp = { mesh, x, z, bobT: Math.random() * 10, id };
};
YY.companionName = function(id){
  return SHAPE_NAME[shapeFor(id)] || '小精靈';
};

/* ---------- 每幀跟著主角晃 ---------- */
YY.updateCompanion = function(dt, t){
  if(!comp || !YY.cre) return;
  const cre = YY.cre;
  const tx = cre.x - .85 + Math.sin(t / 900) * .18;
  const tz = cre.z + .6 + Math.cos(t / 900) * .12;
  const dx = tx - comp.x, dz = tz - comp.z;
  const dist = Math.hypot(dx, dz);
  if(dist > .05){
    const sp = 1.5 * dt;
    comp.x += dx / dist * Math.min(sp, dist);
    comp.z += dz / dist * Math.min(sp, dist);
    comp.mesh.rotation.y += (Math.atan2(dx, dz) - comp.mesh.rotation.y) * .08;
  }
  comp.bobT += dt * 4.4;
  const hop = Math.abs(Math.sin(comp.bobT)) * .075;
  comp.mesh.position.set(comp.x, .2 + hop, comp.z);
  comp.mesh.children.forEach(ch => {
    if(ch.userData.flap){
      const f = Math.sin(t / 90) * .35;
      ch.rotation.z = ch.userData.flap.side * (.4 + f);
    }
  });
};
})();
