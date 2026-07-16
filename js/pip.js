/* ============================================================
   pip.js — Focus Mode 專屬子母視窗(右下角)
   開啟 Focus Mode 時自動出現,用第二台攝影機即時渲染牙寶,
   加上好感度分級 / 專注時間 / 目前狀態的文字說明
   ============================================================ */
(function(){
const $ = s => document.querySelector(s);

let pipEl = null, pipCanvas = null, pipRenderer = null, pipCamera = null;
const PIP_W = 168, PIP_H = 122;

function buildPiP(){
  pipEl = document.createElement('div');
  pipEl.id = 'pipWindow';
  pipEl.innerHTML = `
    <div id="pipHead">🎯 專注觀察窗<button id="pipClose" title="關閉子母視窗">✕</button></div>
    <canvas id="pipCanvas" width="${PIP_W}" height="${PIP_H}"></canvas>
    <div id="pipStatus"></div>`;
  document.body.appendChild(pipEl);

  pipCanvas = $('#pipCanvas');
  pipRenderer = new THREE.WebGLRenderer({ canvas: pipCanvas, antialias:true, alpha:true });
  pipRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  pipRenderer.setSize(PIP_W, PIP_H, false);
  pipRenderer.outputEncoding = THREE.sRGBEncoding;
  pipRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  pipRenderer.toneMappingExposure = .9;

  pipCamera = new THREE.PerspectiveCamera(40, PIP_W / PIP_H, .1, 60);

  $('#pipClose').onclick = () => YY.setPiP(false);
}

/* ---------- 開關 ---------- */
YY.pipOn = false;
YY.setPiP = function(on){
  YY.pipOn = on;
  if(on){
    if(!pipEl) buildPiP();
    pipEl.classList.add('on');
  } else if(pipEl){
    pipEl.classList.remove('on');
  }
};

/* ---------- 每幀更新畫面 + 狀態文字 ---------- */
const TIER_LABEL = { shy:'還在怕你', warm:'跟你熟一點了', close:'超黏你' };
YY.updatePiP = function(t){
  if(!YY.pipOn || !pipEl || !YY.cre) return;
  const cre = YY.cre;

  /* 用第二台鏡頭盯著牠,固定的斜側視角 */
  const size = cre.def.size;
  pipCamera.position.set(cre.x + 1.7, 1.0 + 1.7 * size, cre.z + 2.4);
  pipCamera.lookAt(cre.x, 1.05 * size, cre.z);
  pipRenderer.render(YY.scene, pipCamera);

  const tier = YY.trustTier();
  const s = Math.floor(YY.focus.streakSec);
  const mm = Math.floor(s / 60), ss = String(s % 60).padStart(2, '0');
  const watchIcon = YY.attention.trueGaze ? '👀 在看你' : '🍃 自己玩中';
  $('#pipStatus').innerHTML =
    `<b>${cre.def.n}</b> · ${TIER_LABEL[tier] || ''}<br>🎯 ${mm}:${ss} ・ ${watchIcon}`;
};
})();
