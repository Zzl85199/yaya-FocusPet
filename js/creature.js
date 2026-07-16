/* ============================================================
   creature.js — 把家族成員蓋成 3D 小生物
   身體是彈彈的球,臉會眨眼看人,頭上有各自的小芽
   飾品錨點:head / face / neck / back / aura
   ============================================================ */
(function(){
const INK = 0x2C4034;
const M = YY.M, mat = YY.mat;
const _ray = new THREE.Raycaster();
const _ndc = new THREE.Vector2();
const _v1 = new THREE.Vector3(), _v2 = new THREE.Vector3();
const _look = new THREE.Vector3(), _prevLook = new THREE.Vector3();

YY.buildCharacter = function(charId){
  const F = YY.FAMILY[charId];
  const root = new THREE.Group();          // 位移用(在地板上跳)
  const squash = new THREE.Group();        // 壓扁伸長用
  root.add(squash);

  /* ---------- 身體 ---------- */
  const body = M(new THREE.SphereGeometry(1, 28, 22), F.body);
  body.scale.set(1, .96, .92);
  body.position.y = .96;
  squash.add(body);

  /* ---------- 小腳 ---------- */
  [-1, 1].forEach(s => {
    const foot = M(new THREE.SphereGeometry(.2, 12, 10), F.body);
    foot.scale.set(1.1, .55, 1.2);
    foot.position.set(s * .42, .1, .18);
    squash.add(foot);
  });

  /* ---------- 臉(掛在身體上) ---------- */
  const face = new THREE.Group();
  face.position.set(0, .12, .78);
  body.add(face);

  const eyes = [], pupils = [];
  [-1, 1].forEach(s => {
    const eye = M(new THREE.SphereGeometry(.13, 12, 10), INK);
    eye.scale.set(1, 1.25, .5);
    eye.position.set(s * .34, .1, .28);
    const glint = M(new THREE.SphereGeometry(.045, 8, 8), 0xFFFFFF);
    glint.position.set(.04, .06, .1);
    eye.add(glint);
    face.add(eye); eyes.push(eye); pupils.push(glint);

    const cheek = M(new THREE.SphereGeometry(.13, 10, 8), F.blush);
    cheek.scale.set(1.3, .7, .4);
    cheek.position.set(s * .52, -.14, .18);
    face.add(cheek);
  });
  const mouth = M(new THREE.SphereGeometry(.075, 10, 8), INK);
  mouth.scale.set(1.35, .8, .4);
  mouth.position.set(0, -.14, .34);
  face.add(mouth);

  /* ---------- 頭頂小芽(家族特徵) ---------- */
  const sproutG = new THREE.Group();
  sproutG.position.y = 1.88;
  squash.add(sproutG);
  buildSprout(sproutG, F.sprout, face);

  /* ---------- 異種特徵(Focus Mode 解鎖的飛行 / 閃亮異種) ---------- */
  let variantFX = null;
  if(F.variant === 'flying'){
    variantFX = new THREE.Group();
    [-1, 1].forEach(s => {
      const w = M(new THREE.SphereGeometry(.38, 12, 10), 0xEAF7FB, { transparent:true, opacity:.85 });
      w.scale.set(1.3, .5, .16);
      w.position.set(s * .56, 1.16, -.22);
      w.rotation.z = s * .55;
      w.userData.flap = { side: s };
      variantFX.add(w);
    });
    squash.add(variantFX);
  } else if(F.variant === 'sparkle'){
    variantFX = new THREE.Group();
    for(let i = 0; i < 3; i++){
      const p = M(new THREE.SphereGeometry(.055, 8, 8), 0xF2E9C9, { transparent:true, opacity:.9 });
      p.userData.orbit = { a: i * 2.1, r: .78 + i * .1, h: .5 + i * .14 };
      variantFX.add(p);
    }
    variantFX.position.y = 1.85;
    squash.add(variantFX);
  } else if(F.variant === 'glow'){
    variantFX = new THREE.Group();
    const shell = M(new THREE.SphereGeometry(1.14, 20, 16), F.glowColor || 0xFFFFFF,
      { transparent:true, opacity:.22 });
    shell.userData.glow = true;
    shell.position.y = .96;
    variantFX.add(shell);
    squash.add(variantFX);
  }

  /* ---------- 飾品錨點 ---------- */
  const anchors = {
    head: pt(squash, 0, 1.92, 0),
    face: pt(face, 0, .08, .34),
    neck: pt(squash, 0, .5, 0),
    back: pt(squash, 0, 1.1, -.86),
    aura: pt(squash, 0, 2.5, 0),
  };

  root.scale.setScalar(F.size);
  root.traverse(o => { if(o.isMesh) o.castShadow = true; });

  return {
    id: charId, def: F, root, squash, body, face, eyes, mouth, anchors, variantFX,
    /* 動態 */
    x: 0, z: 1.2, tx: 0, tz: 1.2,
    vy: 0, air: 0, hopT: 0,
    squashV: 0, squashA: 0,          // 彈簧壓扁
    blinkAt: YY.now() + YY.rand(1200, 4000),
    doze: false, flinchAt: 0, spin: 0,
    goal: null,                       // 'berry' 之類
    accMeshes: {},
  };
};

function pt(parent, x, y, z){
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

function buildSprout(g, kind, face){
  const leaf = (x, rot, h, c) => {
    const l = M(new THREE.SphereGeometry(.18, 10, 8), c || 0x6FA25E);
    l.scale.set(.55, h, .3);
    l.position.x = x; l.rotation.z = rot;
    l.position.y = h * .12;
    g.add(l); return l;
  };
  const stem = M(new THREE.CylinderGeometry(.045, .06, .3, 8), 0x4E7C43);
  stem.position.y = .02;
  g.add(stem);

  switch(kind){
    case 'single': leaf(.1, -.5, 1.1); break;
    case 'twin':   leaf(-.14, .6, 1.2); leaf(.14, -.6, 1.2); break;
    case 'triple': leaf(-.2, .7, 1.1); leaf(0, 0, 1.5); leaf(.2, -.7, 1.1); break;
    case 'berry': {
      leaf(-.13, .6, 1.0); leaf(.13, -.6, 1.0);
      const b = M(new THREE.SphereGeometry(.14, 12, 10), 0xE4573D);
      b.position.y = .34; g.add(b);
      break;
    }
    case 'flower': {
      for(let i = 0; i < 5; i++){
        const p = M(new THREE.SphereGeometry(.11, 10, 8), 0xF2A0B5);
        const a = i / 5 * Math.PI * 2;
        p.scale.set(1, .6, .5);
        p.position.set(Math.cos(a) * .17, .32 + Math.sin(a) * .17, 0);
        p.rotation.z = a; g.add(p);
      }
      const c = M(new THREE.SphereGeometry(.09, 10, 8), 0xF2C14E);
      c.position.y = .32; g.add(c);
      break;
    }
    case 'stache': {
      leaf(.05, -.4, .9);
      // 鬍子掛在臉上
      [-1, 1].forEach(s => {
        const m = M(new THREE.SphereGeometry(.12, 10, 8), 0x8A6A44);
        m.scale.set(1.4, .45, .4);
        m.position.set(s * .2, -.1, .32);
        m.rotation.z = s * .25;
        face.add(m);
      });
      break;
    }
    case 'bun': {
      const b = M(new THREE.SphereGeometry(.2, 12, 10), 0xE8E4D4);
      b.position.y = .16; g.add(b);
      const pin = M(new THREE.CylinderGeometry(.02, .02, .4, 6), 0xC4704F);
      pin.rotation.z = 1.2; pin.position.y = .2; g.add(pin);
      break;
    }
  }
}

/* ---------- 穿戴飾品 ---------- */
YY.applyWear = function(cre){
  for(const slot in cre.accMeshes){
    const m = cre.accMeshes[slot];
    if(m && m.parent) m.parent.remove(m);
  }
  cre.accMeshes = {};
  for(const slot in YY.wear){
    const id = YY.wear[slot];
    if(!id || !YY.ITEMS[id]) continue;
    const mesh = YY.buildItem(id);
    if(!mesh) continue;
    cre.anchors[slot].add(mesh);
    cre.accMeshes[slot] = mesh;
  }
};

/* ---------- 每幀更新 ---------- */
YY.updateCreature = function(cre, dt, t){
  /* 走向目標(小跳步) */
  const dx = cre.tx - cre.x, dz = cre.tz - cre.z;
  const dist = Math.hypot(dx, dz);
  if(dist > .08){
    const sp = 1.7 * dt;
    cre.x += dx / dist * Math.min(sp, dist);
    cre.z += dz / dist * Math.min(sp, dist);
    cre.hopT += dt * 7;
    cre.root.rotation.y += (Math.atan2(dx, dz) - cre.root.rotation.y) * .12;
  } else {
    cre.hopT += (Math.round(cre.hopT / Math.PI) * Math.PI - cre.hopT) * .3;
    // 面向鏡頭慢慢轉回來
    cre.root.rotation.y *= .96;
    if(cre.goal === 'berry' && YY.eatBerry) YY.eatBerry(cre);
  }
  const hop = Math.abs(Math.sin(cre.hopT)) * (dist > .08 ? .34 : 0);
  const floatY = cre.def.variant === 'flying' ? .5 + Math.sin(t / 480) * .13 : 0;

  /* 彈簧壓扁(被摸 / 抽到扭蛋時 squashV 會被踢一下) */
  cre.squashA += (-cre.squashV * 90 - cre.squashA * 8) * dt;
  cre.squashV += cre.squashA * dt;
  const s = 1 + cre.squashV;
  cre.squash.scale.set(1 / Math.sqrt(Math.max(.4, s)), Math.max(.4, s), 1 / Math.sqrt(Math.max(.4, s)));
  if(cre.hiding) cre.squash.scale.multiplyScalar(.82);   // 躲起來時縮成一小團

  /* 呼吸 + 位置 */
  const breathe = 1 + Math.sin(t / 620) * .015;
  cre.root.position.set(cre.x, hop + floatY, cre.z);
  cre.body.scale.set(1 * breathe, .96 / breathe, .92 * breathe);

  /* 眨眼(打瞌睡時不眨) */
  if(!cre.doze && t > cre.blinkAt){
    cre.eyes.forEach(e => e.scale.y = .12);
    if(t > cre.blinkAt + 130){
      cre.eyes.forEach(e => e.scale.y = 1.25);
      cre.blinkAt = t + YY.rand(1600, 5200);
    }
  }
  if(!cre.doze && cre.eyes[0].scale.y < 1.2 && t > cre.blinkAt)
    cre.eyes.forEach(e => e.scale.y = 1.25);

  /* ---------- 視線互動:由「眼神感應」決定模式 ---------- */
  const mo = YY.mouse, att = YY.attention;
  if(mo && YY.camera){
    if(cre.doze){
      /* 睡午覺:眼皮垂下、頭歪歪 */
      cre.eyes.forEach(e => e.scale.y += (.14 - e.scale.y) * .06);
      cre.squash.rotation.z += (.12 - cre.squash.rotation.z) * .02;
      cre.squash.rotation.y *= .97;
      cre.face.position.x *= .95;
    } else if(att && att.watching){
      cre.squash.rotation.z *= .9;

      /* 你在看牠 → 牠盯回來:算出游標指向的世界座標 */
      _ray.setFromCamera(_ndc.set(mo.x, mo.y), YY.camera);
      const head = _v1.set(cre.x, 1.1 * cre.def.size, cre.z);
      const d = YY.camera.position.distanceTo(head);
      _ray.ray.at(d, _look);

      /* 突然衝向牠 → 嚇一跳!(好感度越低越容易被嚇到) */
      const nearDist = _look.distanceTo(head);
      if(mo.prevOk){
        const tier = YY.trustTier ? YY.trustTier() : 'warm';
        const flN  = tier === 'shy' ? 3.0 : tier === 'warm' ? 2.3 : 1.5;
        const flS  = tier === 'shy' ? 10  : tier === 'warm' ? 16  : 27;
        const flCd = tier === 'shy' ? 1200 : 1700;
        const speed = _look.distanceTo(_prevLook) / Math.max(dt, .001);
        if(nearDist < flN && speed > flS && t - cre.flinchAt > flCd){
          cre.flinchAt = t;
          cre.squashV = .38;
          YY.sfx.peep();
          const away = Math.sign(cre.x - _look.x) || (Math.random() < .5 ? -1 : 1);
          cre.tx = YY.clamp(cre.x + away * 1.4, -2.8, 2.8);
          cre.tz = YY.clamp(cre.z + YY.rand(-.5, .5), -1.2, 2.8);
          YY.flash(`${cre.def.n}:「嚇、嚇我一跳……」`, 2000);
        }
      }
      _prevLook.copy(_look); mo.prevOk = true;

      /* 頭轉向你 + 眼睛跟著飄 */
      cre.root.worldToLocal(_v2.copy(_look));
      const yaw = YY.clamp(Math.atan2(_v2.x, _v2.z), -.6, .6);
      cre.squash.rotation.y += (yaw - cre.squash.rotation.y) * .1;

      const lx = YY.clamp(_v2.x * .05, -.13, .13);
      const ly = YY.clamp((_v2.y - 1.1) * .04, -.08, .1);
      cre.face.position.x += (lx * 2 - cre.face.position.x) * .18;
      cre.eyes.forEach(e => {
        const s = Math.sign(e.position.x);
        e.position.x += (s * .34 + lx - e.position.x) * .18;
        e.position.y += (.1 + ly - e.position.y) * .18;
      });
      cre.mouth.position.x += (lx * .7 - cre.mouth.position.x) * .18;
    } else {
      /* 你不在看 → 專心玩自己的,五官回正 */
      mo.prevOk = false;
      cre.squash.rotation.z *= .95;
      cre.squash.rotation.y *= .95;
      cre.face.position.x *= .9;
      cre.eyes.forEach(e => {
        const s = Math.sign(e.position.x);
        e.position.x += (s * .34 - e.position.x) * .1;
        e.position.y += (.1 - e.position.y) * .1;
      });
      cre.mouth.position.x *= .9;
    }
  }

  /* 異種特徵動畫:翅膀拍動 / 星星繞圈 / 光暈脈動 */
  if(cre.variantFX){
    cre.variantFX.children.forEach(ch => {
      if(ch.userData.flap){
        const f = Math.sin(t / 100) * .3;
        ch.rotation.z = ch.userData.flap.side * (.5 + f);
      }
      const ob = ch.userData.orbit;
      if(ob){
        ob.a += dt * 1.6;
        ch.position.set(Math.cos(ob.a) * ob.r, Math.sin(ob.a * 2) * ob.h * .3, Math.sin(ob.a) * ob.r);
      }
      if(ch.userData.glow){
        const pulse = .16 + Math.sin(t / 420) * .09;
        ch.material.opacity = pulse;
        const sc = 1 + Math.sin(t / 420) * .04;
        ch.scale.setScalar(sc);
      }
    });
  }

  /* 飾品動畫:光環旋轉 / 翅膀拍動 / 氣球搖晃 */
  for(const slot in cre.accMeshes){
    const g = cre.accMeshes[slot];
    if(!g) continue;
    if(g.userData.spin) g.rotation.y += g.userData.spin * dt;
    g.children.forEach(ch => {
      const ob = ch.userData.orbit;
      if(ob){
        ob.a += dt * 1.4;
        ch.position.set(Math.cos(ob.a) * ob.r, Math.sin(ob.a * 2) * ob.h, Math.sin(ob.a) * ob.r);
        ch.rotation.y += dt * 3;
      }
      if(ch.userData.flap){
        const f = Math.sin(t / 110) * .28;
        ch.rotation.z = ch.userData.flap.side * (.5 + f);
      }
    });
    if(g.userData.sway) g.rotation.z = Math.sin(t / 900) * .12;
  }
};
})();
