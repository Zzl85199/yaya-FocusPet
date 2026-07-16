/* ============================================================
   vision.js — 眼神感應 👀
   開鏡頭偵測你的臉:有看著螢幕 → 牠來找你玩
   沒看(轉頭/離開)→ 牠自己玩自己的
   沒開鏡頭或被拒絕時,退回用「游標有沒有在動」判斷
   ============================================================ */
(function(){
const $ = s => document.querySelector(s);

YY.attention = {
  watching: true,       // 你現在有沒有在看牠
  since: 0,             // 這個狀態持續多久了
  camera: 'off',        // off | starting | on | denied
  lastFace: 0,
};

let video = null, detTimer = 0, prevWatch = true;

/* ---------- 內嵌模型檔:直接把 base64 解碼餵給 tfjs,完全不經過 fetch ----------
   原本用攔截 fetch('faceapi://...') 的做法會失敗,因為 face-api.js 內部的 tfjs
   在頁面載入當下就把原生 fetch 快取起來了,之後才 patch window.fetch 已經來不及。
   改用 tf.io.weightsLoaderFactory + loadFromWeightMap,整段流程零網路請求。 */
function b64ToBuffer(b64){
  const bin = atob(b64), bytes = new Uint8Array(bin.length);
  for(let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}
async function loadTinyFaceDetectorOffline(){
  if(faceapi.nets.tinyFaceDetector.isLoaded) return;
  const W = YY.FACE_WEIGHTS || {};
  const manifestB64 = W['tiny_face_detector_model-weights_manifest.json'];
  if(!manifestB64) throw new Error('缺少內嵌的臉部模型 manifest');
  const manifest = JSON.parse(atob(manifestB64));
  const loadWeights = faceapi.tf.io.weightsLoaderFactory(async (paths) => {
    return paths.map(p => {
      const name = p.split('/').pop();
      const b64 = W[name];
      if(!b64) throw new Error('缺少內嵌的權重檔:' + name);
      return b64ToBuffer(b64);
    });
  });
  const weightMap = await loadWeights(manifest, '');
  faceapi.nets.tinyFaceDetector.loadFromWeightMap(weightMap);
}

/* ---------- 開關鏡頭 ---------- */
async function enableCamera(){
  const A = YY.attention;
  if(A.camera === 'on'){ disableCamera(); return; }
  if(!window.faceapi || !navigator.mediaDevices){
    YY.flash('這個環境沒辦法用鏡頭,改用游標感應', 3000);
    return;
  }
  A.camera = 'starting'; renderEyeBtn();
  YY.flash('正在啟動 Focus Mode…(影像只在你的裝置上分析,不會上傳)', 3400);
  try{
    await loadTinyFaceDetectorOffline();
    // 放寬鏡頭參數:部分外接/USB 鏡頭沒有 facingMode 資訊,寫死 'user' 可能導致 OverconstrainedError
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width:{ideal:320}, height:{ideal:240}, facingMode:{ideal:'user'} }, audio:false });
    video = document.createElement('video');
    video.srcObject = stream; video.muted = true; video.playsInline = true;
    await video.play();
    A.camera = 'on';
    A.lastFace = YY.now();
    detTimer = setInterval(detect, 450);
    showPreview(stream);
    YY.setMode('focus');
    YY.flash('🎯 Focus Mode 啟動!看著牠、或轉頭走開,牠都會知道', 3600);
    YY.sfx.ding();
  }catch(e){
    A.camera = 'denied';
    console.error('[Focus Mode] 啟動失敗:', e);
    let msg = '拿不到鏡頭權限,改用游標感應(游標一陣子沒動=你不在看)';
    if(e && e.name === 'NotAllowedError') msg = '瀏覽器封鎖了鏡頭權限(可能之前按過「封鎖」),改用游標感應。要重開請點網址列左邊的鎖頭圖示調整權限';
    else if(e && e.name === 'NotFoundError') msg = '找不到鏡頭裝置,改用游標感應';
    else if(e && e.name === 'NotReadableError') msg = '鏡頭正被其他分頁或App佔用,改用游標感應';
    else if(e && e.name === 'OverconstrainedError') msg = '這個鏡頭不支援指定的畫面設定,改用游標感應';
    else if(!window.isSecureContext) msg = '這個網址不是 HTTPS,瀏覽器不允許用鏡頭,改用游標感應';
    YY.flash(msg + '(詳細錯誤已印在瀏覽器 Console,按 F12 可查看)', 4600);
  }
  renderEyeBtn();
}
/* ---------- 小鏡頭預覽:讓你親眼確認到底有沒有真的抓到畫面 ---------- */
let previewEl = null;
function showPreview(stream){
  if(!previewEl){
    previewEl = document.createElement('video');
    previewEl.id = 'camPreview';
    previewEl.muted = true; previewEl.playsInline = true; previewEl.autoplay = true;
    document.body.appendChild(previewEl);
  }
  previewEl.srcObject = stream;
  previewEl.style.display = 'block';
}
function hidePreview(){
  if(previewEl){ previewEl.style.display = 'none'; previewEl.srcObject = null; }
}

function disableCamera(){
  const A = YY.attention;
  clearInterval(detTimer);
  if(video && video.srcObject) video.srcObject.getTracks().forEach(tr => tr.stop());
  video = null; A.camera = 'off';
  hidePreview();
  YY.setMode('interact');
  YY.flash('Focus Mode 已關閉,改用游標感應', 2600);
  renderEyeBtn();
}

const detOpts = () => new faceapi.TinyFaceDetectorOptions({ inputSize:160, scoreThreshold:.4 });
async function detect(){
  if(!video || video.paused) return;
  try{
    const r = await faceapi.detectSingleFace(video, detOpts());
    if(r) YY.attention.lastFace = YY.now();
  }catch(e){ /* 單次失敗不理它 */ }
}

/* ---------- 每幀判斷:你在看嗎? ---------- */
YY.updateAttention = function(t){
  const A = YY.attention;
  let w;
  if(A.camera === 'on'){
    w = (t - A.lastFace) < 1700;           // 1.7 秒內有偵測到正臉
  } else {
    const mo = YY.mouse;
    w = mo.inside && (t - mo.lastMove) < 7000;  // 游標感應
  }
  if(w !== prevWatch){
    prevWatch = w;
    A.watching = w; A.since = t;
    if(YY.onAttentionChange) YY.onAttentionChange(w, t);
    renderStatus();
  }
  A.watching = w;
};

/* ---------- 介面 ---------- */
function renderEyeBtn(){
  const b = $('#btnEye'); if(!b) return;
  b.textContent = { off:'🎯 Focus Mode', starting:'🎯 啟動中…', on:'🎯 專注中', denied:'🎯 Focus Mode' }[YY.attention.camera];
  b.classList.toggle('live', YY.attention.camera === 'on');
}
function renderStatus(){
  const el = $('#watchState'); if(!el) return;
  el.textContent = YY.attention.watching ? '👀 牠知道你在看' : '🍃 你不在,自己玩中';
}
YY.renderWatchStatus = renderStatus;

YY.initVision = function(){
  $('#btnEye').onclick = enableCamera;
  renderEyeBtn(); renderStatus();
};
})();
