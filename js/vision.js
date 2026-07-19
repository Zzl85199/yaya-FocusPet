/* ============================================================
   vision.js — 眼神感應 👀
   開鏡頭偵測你的臉:有看著螢幕 → 牠來找你玩
   沒看(轉頭/離開)→ 牠自己玩自己的
   沒開鏡頭或被拒絕時,退回用「游標有沒有在動」判斷
   ============================================================ */
(function(){
const $ = s => document.querySelector(s);

YY.attention = {
  watching: true,       // 你現在有沒有在看牠(臉在鏡頭前 / 游標有動)
  trueGaze: true,       // 眼睛有沒有真的睜開看螢幕(Focus Mode 專注判定用,比 watching 更嚴格)
  since: 0,             // 這個狀態持續多久了
  camera: 'off',        // off | starting | on | denied
  lastFace: 0,
  lastGazeOk: 0,
  landmarkReady: false,
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
async function loadNetOffline(net, weightsObj, manifestKey){
  if(net.isLoaded) return;
  const W = weightsObj || {};
  const manifestB64 = W[manifestKey];
  if(!manifestB64) throw new Error('缺少內嵌的模型 manifest:' + manifestKey);
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
  net.loadFromWeightMap(weightMap);
}
async function loadTinyFaceDetectorOffline(){
  return loadNetOffline(faceapi.nets.tinyFaceDetector, YY.FACE_WEIGHTS,
    'tiny_face_detector_model-weights_manifest.json');
}
/* 眼神真的有沒有看螢幕(而不是只有臉在鏡頭前),要靠 68 點臉部特徵點:
   算眼睛開合(EAR)+ 鼻尖是不是落在兩眼中間(沒有把頭轉開)才算數 */
async function loadFaceLandmarkOffline(){
  return loadNetOffline(faceapi.nets.faceLandmark68TinyNet, YY.LANDMARK_WEIGHTS,
    'face_landmark_68_tiny_model-weights_manifest.json');
}

/* ---------- 開關鏡頭 ---------- */
async function enableCamera(){
  const A = YY.attention;
  /* 在森林裡:「🎯」改成切換第一/第三人稱視角(#5),不進入 Focus Mode */
  if(YY.mode === 'explore'){ YY.toggleForestFPV(); return; }
  if(A.camera === 'on'){ disableCamera(); return; }
  if(!window.faceapi || !navigator.mediaDevices){
    YY.flash('這個環境沒辦法用鏡頭,改用游標感應', 3000);
    return;
  }
  A.camera = 'starting'; renderEyeBtn();
  YY.flash('正在啟動 Focus Mode…(影像只在你的裝置上分析,不會上傳)', 3400);
  try{
    await loadTinyFaceDetectorOffline();
    try{
      await loadFaceLandmarkOffline();
      YY.attention.landmarkReady = true;
    }catch(le){
      YY.attention.landmarkReady = false;
      console.warn('[Focus Mode] 臉部特徵點模型載入失敗,眼神判定退回「有臉就算」:', le);
    }
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

/* Eye Aspect Ratio:眼睛睜開程度,數值越小代表眼睛越瞇/閉 */
function eyeAspectRatio(eye){
  const d = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  return (d(eye[1], eye[5]) + d(eye[2], eye[4])) / (2 * d(eye[0], eye[3]));
}
async function detect(){
  if(!video || video.paused) return;
  try{
    const A = YY.attention;
    if(A.landmarkReady){
      const r = await faceapi.detectSingleFace(video, detOpts()).withFaceLandmarks(true);
      if(r){
        A.lastFace = YY.now();
        const leftEye = r.landmarks.getLeftEye(), rightEye = r.landmarks.getRightEye();
        const ear = (eyeAspectRatio(leftEye) + eyeAspectRatio(rightEye)) / 2;
        const eyesOpen = ear > .16;

        /* 粗略估計有沒有把頭轉開:鼻尖應該落在兩眼中點附近 */
        const nose = r.landmarks.getNose();
        const noseTip = nose[nose.length - 1];
        const eyeMidX = (leftEye[0].x + rightEye[3].x) / 2;
        const eyeSpan = Math.abs(rightEye[3].x - leftEye[0].x) || 1;
        const facingForward = Math.abs(noseTip.x - eyeMidX) / eyeSpan < .34;

        if(eyesOpen && facingForward) A.lastGazeOk = YY.now();
      }
    } else {
      const r = await faceapi.detectSingleFace(video, detOpts());
      if(r){ A.lastFace = YY.now(); A.lastGazeOk = YY.now(); }   // 沒有特徵點模型,退回「有臉就算」
    }
  }catch(e){ /* 單次失敗不理它 */ }
}

/* ============================================================
   #1 給「牙牙森林第一人稱」用:偵測玩家頭部角度 → 同步牙牙視線
   確保模型載好 + 由一段影片估計頭部左右(yaw)/上下(pitch)角度
   ============================================================ */
let modelsLoading = null;
YY.ensureFaceModels = function(){
  if(!window.faceapi) return Promise.resolve(false);
  if(faceapi.nets.tinyFaceDetector.isLoaded && YY.attention.landmarkReady) return Promise.resolve(true);
  if(modelsLoading) return modelsLoading;
  modelsLoading = (async () => {
    try{
      await loadTinyFaceDetectorOffline();
      try{ await loadFaceLandmarkOffline(); YY.attention.landmarkReady = true; }
      catch(e){ YY.attention.landmarkReady = false; }
      return true;
    }catch(e){ modelsLoading = null; return false; }
  })();
  return modelsLoading;
};

/* 回傳 { yaw, pitch }(各 -1~1)或 null。
   yaw:頭往左右轉;pitch:抬頭 / 低頭。用 68 點特徵點的鼻尖 vs 兩眼中點估算。 */
YY.detectHeadAngle = async function(videoEl){
  if(!videoEl || videoEl.paused || !window.faceapi || !YY.attention.landmarkReady) return null;
  try{
    const r = await faceapi.detectSingleFace(videoEl, detOpts()).withFaceLandmarks(true);
    if(!r) return null;
    const le = r.landmarks.getLeftEye(), re = r.landmarks.getRightEye();
    const nose = r.landmarks.getNose();
    const noseTip = nose[nose.length - 1];
    const eyeMidX = (le[0].x + re[3].x) / 2;
    const eyeMidY = (le[0].y + re[3].y) / 2;
    const eyeSpan = Math.abs(re[3].x - le[0].x) || 1;
    /* 鼻尖相對兩眼中點的水平偏移 → 轉頭。原始鏡頭未鏡像,轉頭時鼻尖往反方向偏,
       這裡取 (eyeMidX - noseTip.x) 讓「往右轉頭 → 往右看」符合直覺。 */
    const yaw   = YY.clamp((noseTip.x - eyeMidX) / eyeSpan * 2.6, -1, 1);
    /* 鼻尖相對眼睛線的高低 → 抬頭/低頭(扣掉臉正對時的基準比例) */
    const pitch = YY.clamp(((noseTip.y - eyeMidY) / eyeSpan - 0.62) * 1.9, -1, 1);
    return { yaw, pitch };
  }catch(e){ return null; }
};

/* ---------- 每幀判斷:你在看嗎?(watching = 一般用途) / trueGaze(Focus Mode 專用,更嚴格) ---------- */
YY.updateAttention = function(t){
  const A = YY.attention;
  let w, gaze;
  if(A.camera === 'on'){
    w = (t - A.lastFace) < 1700;              // 1.7 秒內有偵測到正臉(一般互動用)
    gaze = (t - A.lastGazeOk) < 1700;          // 1.7 秒內眼睛真的睜開、朝前(Focus Mode 專注判定用)
  } else {
    const mo = YY.mouse;
    w = mo.inside && (t - mo.lastMove) < 7000;  // 游標感應
    gaze = w;   // 沒有鏡頭時沒辦法判斷眼神,退回跟 watching 一致
  }
  if(w !== prevWatch){
    prevWatch = w;
    A.watching = w; A.since = t;
    if(YY.onAttentionChange) YY.onAttentionChange(w, t);
    renderStatus();
  }
  A.watching = w;
  A.trueGaze = gaze;
};

/* ---------- 介面 ---------- */
function renderEyeBtn(){
  const b = $('#btnEye'); if(!b) return;
  if(YY.mode === 'explore') return;   // 森林裡的按鈕文字交給 main 的 renderModeUI 管
  b.textContent = { off:'🎯 Focus Mode', starting:'🎯 啟動中…', on:'🎯 專注中', denied:'🎯 Focus Mode' }[YY.attention.camera];
  b.classList.toggle('live', YY.attention.camera === 'on');
}
YY.renderEyeBtnDefault = renderEyeBtn;
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
