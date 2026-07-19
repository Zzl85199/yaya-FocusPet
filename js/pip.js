/* ============================================================
   pip.js — Focus Mode 專屬觀察窗
   ① 頁面內的右下角觀察窗(和原本一樣)
   ② YouTube 式「原生子母視窗(Picture-in-Picture)」:
      把牙寶畫面 + 狀態文字合成到一張 2D canvas,再用 captureStream
      餵給一個隱藏 <video>,呼叫 requestPictureInPicture()。
      這樣即使你把瀏覽器縮到最小、或切去別的視窗,牙寶都還飄在畫面上。
   ============================================================ */
(function(){
const $ = s => document.querySelector(s);

let pipEl = null, pipCanvas = null, pipRenderer = null, pipCamera = null;
let compCanvas = null, compCtx = null;          // 合成用的 2D 畫布(WebGL 畫面 + 文字)
let pipVideo = null, pipStream = null;           // 給原生 PiP 用的隱藏影片
let pipTimer = 0;                                // 背景也能跑的渲染迴圈
let sessionStart = 0;                            // Focus Mode 這次開了多久(牆上時鐘,最小化也會動)

const W = 320, H = 240;                           // 內部渲染解析度(顯示再縮放)

function buildPiP(){
  pipEl = document.createElement('div');
  pipEl.id = 'pipWindow';
  pipEl.innerHTML = `
    <div id="pipHead">🎯 專注觀察窗
      <span style="margin-left:auto;display:flex;gap:2px;">
        <button id="pipPop" title="彈出成可跨視窗的小視窗(最小化也看得到)">📺</button>
        <button id="pipClose" title="關閉觀察窗">✕</button>
      </span>
    </div>
    <canvas id="pipCanvas" width="${W}" height="${H}"></canvas>
    <div id="pipStatus"></div>`;
  document.body.appendChild(pipEl);

  pipCanvas = $('#pipCanvas');
  pipRenderer = new THREE.WebGLRenderer({ canvas: pipCanvas, antialias:true, alpha:true, preserveDrawingBuffer:true });
  pipRenderer.setPixelRatio(1);
  pipRenderer.setSize(W, H, false);
  pipRenderer.outputEncoding = THREE.sRGBEncoding;
  pipRenderer.toneMapping = THREE.ACESFilmicToneMapping;
  pipRenderer.toneMappingExposure = .9;
  pipCamera = new THREE.PerspectiveCamera(40, W / H, .1, 60);

  /* 合成畫布(離螢幕),把 3D 畫面 + 狀態文字疊在一起給原生 PiP */
  compCanvas = document.createElement('canvas');
  compCanvas.width = W; compCanvas.height = H;
  compCtx = compCanvas.getContext('2d');

  $('#pipClose').onclick = () => YY.setPiP(false);
  $('#pipPop').onclick = () => YY.enterNativePiP();
}

function ensureNativeVideo(){
  if(pipVideo) return;
  pipVideo = document.createElement('video');
  pipVideo.id = 'pipVideo';
  pipVideo.muted = true; pipVideo.playsInline = true; pipVideo.autoplay = true;
  pipVideo.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;opacity:0;pointer-events:none;';
  document.body.appendChild(pipVideo);
  try{
    pipStream = compCanvas.captureStream(30);
    pipVideo.srcObject = pipStream;
  }catch(e){ /* 不支援 captureStream 就會在 enterNativePiP 時被擋下 */ }

  pipVideo.addEventListener('leavepictureinpicture', () => {
    renderInPageStatus();               // 回到頁面內觀察窗
    if(!YY.pipOn) stopLoop();
  });
  pipVideo.addEventListener('enterpictureinpicture', () => {
    YY.flash('📺 牙寶已飄成小視窗~縮小視窗、切去工作也看得到牠', 4200);
  });
}

/* ---------- 開關(頁面內觀察窗) ---------- */
YY.pipOn = false;
YY.setPiP = function(on){
  YY.pipOn = on;
  if(on){
    if(!pipEl) buildPiP();
    pipEl.classList.add('on');
    sessionStart = Date.now();
    startLoop();
  } else if(pipEl){
    pipEl.classList.remove('on');
    /* 若原生 PiP 沒開著,才停掉渲染迴圈 */
    if(!(document.pictureInPictureElement && document.pictureInPictureElement === pipVideo)){
      stopLoop();
      exitNativePiP();
    }
  }
};

/* ---------- 原生子母視窗(跨視窗、最小化仍可見) ---------- */
YY.enterNativePiP = async function(){
  if(!pipEl) buildPiP();
  const supported = ('pictureInPictureEnabled' in document) && document.pictureInPictureEnabled
    && compCanvas && compCanvas.captureStream;
  if(!supported){
    YY.flash('這個瀏覽器不支援原生子母視窗;請改用畫面右下角的觀察窗(或用支援 PiP 的瀏覽器,如 Chrome / Edge)', 5200);
    return;
  }
  try{
    ensureNativeVideo();
    startLoop();
    renderPiPFrame();                        // 先確保有一張畫面
    try{ await pipVideo.play(); }catch(e){}
    if(document.pictureInPictureElement === pipVideo){
      await document.exitPictureInPicture(); return;    // 再按一次 = 收回
    }
    await pipVideo.requestPictureInPicture();
    YY.flash('📺 已彈出小視窗!就算把瀏覽器縮到最小、或切到別的程式,也看得到牙寶陪你專注', 5600);
  }catch(e){
    YY.flash('沒辦法開啟原生子母視窗(' + ((e && e.name) || '未知') + ');可改用右下角的觀察窗', 4600);
  }
};
function exitNativePiP(){
  try{
    if(document.pictureInPictureElement && document.pictureInPictureElement === pipVideo)
      document.exitPictureInPicture();
  }catch(e){}
}

/* ---------- 背景也能跑的渲染迴圈(用 setInterval,最小化時仍持續) ---------- */
function startLoop(){ if(!pipTimer) pipTimer = setInterval(renderPiPFrame, 66); }   // ~15fps
function stopLoop(){ if(pipTimer){ clearInterval(pipTimer); pipTimer = 0; } }

const TIER_LABEL = { shy:'還在怕你', warm:'跟你熟一點了', close:'超黏你' };

function fmt(sec){ const m = Math.floor(sec / 60), s = String(sec % 60).padStart(2, '0'); return `${m}:${s}`; }

/* 每次更新:3D 畫面 → 合成到 2D 畫布(含文字) → (原生 PiP 會自動吃 stream) */
function renderPiPFrame(){
  if(!pipEl || !YY.cre || !pipRenderer) return;
  const cre = YY.cre, size = cre.def.size;

  pipCamera.position.set(cre.x + 1.7, 1.0 + 1.7 * size, cre.z + 2.4);
  pipCamera.lookAt(cre.x, 1.05 * size, cre.z);
  pipRenderer.render(YY.scene, pipCamera);

  /* 合成 2D:底色 + 3D 畫面 + 上方狀態列 */
  const bg = (YY.mode === 'explore') ? '#BFE3F2' : '#C7E2AC';
  compCtx.fillStyle = bg; compCtx.fillRect(0, 0, W, H);
  try{ compCtx.drawImage(pipCanvas, 0, 0, W, H); }catch(e){}

  const tier = YY.trustTier ? YY.trustTier() : 'warm';
  const sessSec = sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : 0;
  const watching = YY.attention && YY.attention.trueGaze;

  compCtx.fillStyle = 'rgba(44,64,52,.82)';
  compCtx.fillRect(0, 0, W, 52);
  compCtx.fillStyle = '#FFFFFF';
  compCtx.font = 'bold 22px "PingFang TC","Microsoft JhengHei",sans-serif';
  compCtx.textBaseline = 'middle';
  compCtx.fillText(`${cre.def.n} · ${TIER_LABEL[tier] || ''}`, 12, 17);
  compCtx.font = 'bold 18px "PingFang TC","Microsoft JhengHei",sans-serif';
  compCtx.fillText(`🎯 ${fmt(sessSec)}   ${watching ? '👀 在看你' : '🍃 自己玩中'}`, 12, 39);

  renderInPageStatus();
}

function renderInPageStatus(){
  const el = $('#pipStatus'); if(!el || !YY.cre) return;
  const cre = YY.cre;
  const tier = YY.trustTier ? YY.trustTier() : 'warm';
  const sessSec = sessionStart ? Math.floor((Date.now() - sessionStart) / 1000) : 0;
  const watchIcon = (YY.attention && YY.attention.trueGaze) ? '👀 在看你' : '🍃 自己玩中';
  el.innerHTML = `<b>${cre.def.n}</b> · ${TIER_LABEL[tier] || ''}<br>🎯 ${fmt(sessSec)} ・ ${watchIcon}
    <br><span style="opacity:.7">按 📺 可彈出跨視窗小視窗</span>`;
}

/* 主迴圈仍會呼叫;前景時交給 setInterval 就好,這裡不重複渲染 */
YY.updatePiP = function(t){ /* no-op:渲染改由 setInterval 驅動,背景/最小化也能更新 */ };
})();
