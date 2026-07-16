/* ============================================================
   gacha.js — 抽扭蛋 / 衣櫃 / 家族面板
   ============================================================ */
(function(){
const $ = s => document.querySelector(s);

/* ---------- 抽!---------- */
let drawing = false;
YY.drawGacha = function(){
  if(drawing) return;
  if(YY.tickets <= 0){
    YY.flash('沒有扭蛋券了——摸摸、餵莓果、等家人來訪都能賺券!', 3200);
    YY.sfx.peep();
    return;
  }
  drawing = true;
  YY.tickets--; YY.save(); renderWardrobe();

  /* 決定結果 */
  const roll = Math.random() * 100;
  let r = 0, acc = 0;
  for(let i = 0; i < YY.RAR.length; i++){ acc += YY.RAR[i].w; if(roll < acc){ r = i; break; } }
  const pool = Object.keys(YY.ITEMS).filter(k => YY.ITEMS[k].r === r);
  const id = pool[Math.floor(Math.random() * pool.length)];

  /* 演出:機器搖 → 蛋掉出來 → 彈跳 → 打開 */
  YY.machine.userData.shake = 1;
  YY.sfx.crank();
  setTimeout(() => YY.sfx.crank(), 250);
  setTimeout(() => spawnCapsule(id), 620);
};

function spawnCapsule(id){
  const it = YY.ITEMS[id];
  const cols = [0xE4573D, 0xF2C14E, 0x5A9BD8, 0x9B7FD4, 0xF2A0B5];
  const c = it.r === 2 ? 0xF2C14E : cols[Math.floor(Math.random() * cols.length)];

  const cap = new THREE.Group();
  const top = new THREE.Mesh(new THREE.SphereGeometry(.34, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), YY.mat(c));
  const bot = new THREE.Mesh(new THREE.SphereGeometry(.34, 16, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    YY.mat(0xF5EFE0, { transparent:true, opacity:.94 }));
  top.castShadow = bot.castShadow = true;
  cap.add(top, bot);

  const m = YY.machine.position;
  cap.position.set(m.x, .6, m.z + 1.0);
  YY.scene.add(cap);
  YY.sfx.pop();

  /* 朝場中央彈跳 */
  const state = { vx:(0 - cap.position.x) * .55, vz:(1.6 - cap.position.z) * .55, vy:3.4, bounces:0 };
  YY.capsule = { mesh:cap, top, bot, state, id, phase:'fly', t:0 };
}

YY.updateCapsule = function(dt){
  const C = YY.capsule; if(!C) return;
  const s = C.state, o = C.mesh;

  if(C.phase === 'fly'){
    s.vy -= 9 * dt;
    o.position.x += s.vx * dt; o.position.y += s.vy * dt; o.position.z += s.vz * dt;
    o.rotation.x += 4 * dt; o.rotation.z += 3 * dt;
    if(o.position.y < .34){
      o.position.y = .34;
      s.vy = Math.abs(s.vy) * .55; s.vx *= .7; s.vz *= .7;
      YY.sfx.pop();
      if(++s.bounces >= 3){ C.phase = 'open'; C.t = 0; o.rotation.set(0, 0, 0); }
    }
  } else if(C.phase === 'open'){
    C.t += dt;
    if(C.t > .45 && !C.opened){
      C.opened = true;
      YY.sfx.ding();
      YY.spawnConfetti(o.position.x, o.position.y + .3, o.position.z, YY.ITEMS[C.id].r === 2 ? 40 : 22);
      resolveDraw(C.id, o.position);
    }
    if(C.opened){
      C.top.position.y += 2.6 * dt; C.top.rotation.z += 5 * dt;
      C.top.material.transparent = true;
      C.top.material.opacity = Math.max(0, 1 - (C.t - .45) * 2);
      C.bot.material.opacity = Math.max(0, .94 - (C.t - .45) * 2);
      if(C.t > 1.1){ YY.scene.remove(o); YY.capsule = null; }
    } else {
      // 開蛋前抖一下
      o.rotation.z = Math.sin(C.t * 50) * .12;
    }
  }
};

function resolveDraw(id, pos){
  const it = YY.ITEMS[id];
  const cre = YY.cre;

  if(YY.owned.includes(id)){
    YY.tickets++; // 重複安慰獎:退券
    YY.save(); renderWardrobe();
    YY.flash(`轉出「${it.n}」…已經有了!退你一張券`, 3000);
    drawing = false;
    return;
  }
  YY.owned.push(id);
  YY.wear[it.slot] = id;              // 新飾品直接穿上
  YY.save();
  YY.applyWear(cre);
  renderWardrobe();

  cre.squashV = -.4;                  // 開心一跳
  YY.sfx.chirp();
  if(it.r === 2){
    YY.sfx.tada();
    for(let i = 0; i < 8; i++)
      setTimeout(() => YY.spawnHeart(cre.x, 2.2, cre.z), i * 130);
    YY.flash(`✨ 傳說級!【${it.n}】!${cre.def.n}馬上戴起來了!`, 4200);
  } else {
    YY.spawnHeart(cre.x, 2.1, cre.z);
    YY.flash(`轉出【${YY.RAR[it.r].n}】${it.n}!${cre.def.n}馬上穿戴起來`, 3400);
  }
  drawing = false;
}

/* ---------- 衣櫃面板 ---------- */
function renderWardrobe(){
  $('#btnDraw').textContent = `🥚 抽扭蛋 ×${YY.tickets}`;
  $('#collCount').textContent = `圖鑑 ${YY.owned.length} / ${YY.ITEM_COUNT}`;
  const body = $('#wardrobeBody');
  if(!$('#wardrobe').classList.contains('on')) return;

  let html = `<button class="wdraw" id="wDraw">抽一顆扭蛋(用 1 張券,剩 ${YY.tickets} 張)</button>
    <div class="wtiny">賺券:摸摸 有機率掉券 · 餵莓果 有機率掉券 · 家人來訪 +2<br>
    (摸摸、餵莓果同時會提升好感度,好感度越高越願意親近你)<br>
    全部共 ${YY.ITEM_COUNT} 件飾品等你收集!</div>`;

  const bySlot = {};
  YY.owned.forEach(id => {
    const it = YY.ITEMS[id]; if(!it) return;
    (bySlot[it.slot] = bySlot[it.slot] || []).push(id);
  });

  if(!YY.owned.length){
    html += `<div class="wempty">衣櫃空空的,抽一顆扭蛋吧!</div>`;
  } else {
    for(const slot of ['head','face','neck','back','aura']){
      if(!bySlot[slot]) continue;
      html += `<div class="wslot">${YY.SLOT_NAME[slot]}(${bySlot[slot].length})</div>`;
      bySlot[slot]
        .sort((a, b) => YY.ITEMS[b].r - YY.ITEMS[a].r)
        .forEach(id => {
          const it = YY.ITEMS[id], on = YY.wear[slot] === id;
          html += `<div class="wrow">
            <i style="color:${YY.RAR[it.r].css}">${YY.RAR[it.r].n}</i>
            <em>${it.n}</em>
            <button data-id="${id}" class="${on ? 'on' : ''}">${on ? '穿著中' : '穿上'}</button>
          </div>`;
        });
    }
  }
  body.innerHTML = html;
  $('#wDraw').onclick = YY.drawGacha;
  body.querySelectorAll('button[data-id]').forEach(b => {
    b.onclick = () => {
      const id = b.dataset.id, slot = YY.ITEMS[id].slot;
      YY.wear[slot] = (YY.wear[slot] === id) ? null : id;
      YY.save(); YY.applyWear(YY.cre); renderWardrobe();
      YY.sfx.peep();
    };
  });
}
YY.renderWardrobe = renderWardrobe;

/* ---------- 家族面板 ---------- */
function renderFamily(){
  $('#famCount').textContent = `已認識 ${YY.metFamily.length} / ${YY.FAMILY_ORDER.length}`;
  const body = $('#familyBody');
  if(!$('#family').classList.contains('on')) return;

  let html = `<div class="fintro">家人會不定時「叮咚!」來訪,見過一次就永久認識,
    之後隨時可以點頭像換人陪你。飾品是全家共用的衣櫃喔。</div><div class="fgrid">`;
  for(const id of YY.FAMILY_ORDER){
    const F = YY.FAMILY[id];
    const met = YY.metFamily.includes(id);
    const now = YY.currentChar === id;
    const col = '#' + F.body.toString(16).padStart(6, '0');
    html += `<div class="fcard ${met ? '' : 'lock'} ${now ? 'now' : ''}" data-id="${id}">
      <div class="dot" style="background:${met ? col : '#DDD'}"></div>
      <b>${met ? F.n : '???'}</b>
      <small>${met ? F.rel : '還沒來訪'}</small>
    </div>`;
  }
  body.innerHTML = html + '</div>' + renderVariantSection();
  body.querySelectorAll('.fcard[data-id]').forEach(card => {
    card.onclick = () => {
      const id = card.dataset.id;
      const known = YY.metFamily.includes(id) || (YY.metVariants && YY.metVariants.includes(id));
      if(!known){
        const isVariant = YY.VARIANT_ORDER && YY.VARIANT_ORDER.includes(id);
        YY.flash(isVariant ? '這隻異種還沒解鎖——在 Focus Mode 專注久一點試試看!' : '這位家人還沒來訪過,再等等吧!', 2600);
        return;
      }
      if(id === YY.currentChar) return;
      YY.switchCharacter(id, true);
      renderFamily();
    };
  });
}
function renderVariantSection(){
  if(!YY.VARIANT_ORDER || !YY.VARIANT_ORDER.length) return '';
  let html = `<div class="fintro" style="margin-top:18px;">🌟 <b>異種牙寶</b>——Focus Mode 專注久一點,
    有機率隨機解鎖(已解鎖 ${YY.metVariants.length} / ${YY.VARIANT_ORDER.length})</div><div class="fgrid">`;
  for(const id of YY.VARIANT_ORDER){
    const F = YY.FAMILY[id];
    const met = YY.metVariants.includes(id);
    const now = YY.currentChar === id;
    const col = '#' + F.body.toString(16).padStart(6, '0');
    html += `<div class="fcard variant ${met ? '' : 'lock'} ${now ? 'now' : ''}" data-id="${id}">
      <div class="dot" style="background:${met ? col : '#DDD'}"></div>
      <b>${met ? F.n : '???'}</b>
      <small>${met ? F.rel : '尚未解鎖'}</small>
    </div>`;
  }
  return html + '</div>';
}
YY.renderFamily = renderFamily;

/* ---------- 面板開關 ---------- */
YY.initPanels = function(){
  $('#btnDraw').onclick = YY.drawGacha;
  $('#btnWardrobe').onclick = () => { $('#family').classList.remove('on');
    $('#wardrobe').classList.toggle('on'); renderWardrobe(); };
  $('#btnFamily').onclick = () => { $('#wardrobe').classList.remove('on');
    $('#family').classList.toggle('on'); renderFamily(); };
  document.querySelectorAll('.x').forEach(x => {
    x.onclick = () => document.getElementById(x.dataset.close).classList.remove('on');
  });
  renderWardrobe();
};
})();
