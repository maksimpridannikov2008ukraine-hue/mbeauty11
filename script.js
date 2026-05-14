const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

// ========== СИСТЕМА ШАРІВ/КАДРІВ ==========
let layers = [];
let currentLayerIndex = 0;
let onionSkinEnabled = false;
let clipboardLayer = null;
let fps = 12;
let frameDurationSec = 0.2;

function initLayers() {
  const emptyCanvas = document.createElement("canvas");
  emptyCanvas.width = canvas.width;
  emptyCanvas.height = canvas.height;
  const emptyCtx = emptyCanvas.getContext("2d");
  emptyCtx.fillStyle = "white";
  emptyCtx.fillRect(0, 0, canvas.width, canvas.height);
  layers = [{ imageData: emptyCanvas.toDataURL(), name: "Кадр 1", duration: frameDurationSec }];
  currentLayerIndex = 0;
  renderCurrentLayer();
  updateLayersUI();
}

function renderCurrentLayer() {
  const img = new Image();
  img.src = layers[currentLayerIndex].imageData;
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    if (onionSkinEnabled && currentLayerIndex > 0) {
      const prevImg = new Image();
      prevImg.src = layers[currentLayerIndex - 1].imageData;
      prevImg.onload = () => {
        ctx.globalAlpha = 0.3;
        ctx.drawImage(prevImg, 0, 0);
        ctx.globalAlpha = 1;
      };
    }
    if (onionSkinEnabled && currentLayerIndex < layers.length - 1) {
      const nextImg = new Image();
      nextImg.src = layers[currentLayerIndex + 1].imageData;
      nextImg.onload = () => {
        ctx.globalAlpha = 0.3;
        ctx.drawImage(nextImg, 0, 0);
        ctx.globalAlpha = 1;
      };
    }
    setContext();
  };
}

function saveCurrentLayer() {
  layers[currentLayerIndex].imageData = canvas.toDataURL();
}

function updateLayersUI() {
  const container = document.getElementById("layersList");
  container.innerHTML = "";
  layers.forEach((layer, idx) => {
    const div = document.createElement("div");
    div.className = "layer-item" + (idx === currentLayerIndex ? " active" : "");
    div.innerHTML = `
      <div class="layer-name" contenteditable="true">${layer.name}</div>
      <div class="layer-duration">⏱️ ${(layer.duration || frameDurationSec).toFixed(2)}с</div>
      <div class="layer-buttons">
        <button class="copy-layer" data-idx="${idx}">📋</button>
        <button class="del-layer" data-idx="${idx}">❌</button>
        <button class="dura-up" data-idx="${idx}">⏫</button>
        <button class="dura-down" data-idx="${idx}">⏬</button>
      </div>
    `;
    div.onclick = (e) => {
      if (e.target.tagName !== "BUTTON" && !e.target.classList?.contains("layer-name")) {
        saveCurrentLayer();
        currentLayerIndex = idx;
        renderCurrentLayer();
        updateLayersUI();
      }
    };
    container.appendChild(div);
  });
  document.getElementById("frameCounter").innerText = `Кадр ${currentLayerIndex + 1}/${layers.length}`;
  document.getElementById("onionStatus").innerText = onionSkinEnabled ? "Увімк" : "Вимк";

  document.querySelectorAll(".copy-layer").forEach((btn) => {
    btn.onclick = (e) => { e.stopPropagation(); duplicateLayer(parseInt(btn.dataset.idx)); };
  });
  document.querySelectorAll(".del-layer").forEach((btn) => {
    btn.onclick = (e) => { e.stopPropagation(); deleteLayer(parseInt(btn.dataset.idx)); };
  });
  document.querySelectorAll(".dura-up").forEach((btn) => {
    btn.onclick = (e) => { e.stopPropagation(); adjustDuration(parseInt(btn.dataset.idx), 0.05); };
  });
  document.querySelectorAll(".dura-down").forEach((btn) => {
    btn.onclick = (e) => { e.stopPropagation(); adjustDuration(parseInt(btn.dataset.idx), -0.05); };
  });
}

function adjustDuration(idx, delta) {
  layers[idx].duration = Math.max(0.05, (layers[idx].duration || frameDurationSec) + delta);
  updateLayersUI();
}

function duplicateLayer(idx) {
  saveCurrentLayer();
  const newLayer = { ...layers[idx], name: `${layers[idx].name} (копія)`, imageData: layers[idx].imageData };
  layers.splice(idx + 1, 0, newLayer);
  if (currentLayerIndex > idx) currentLayerIndex++;
  updateLayersUI();
  saveGlobalHistory();
}

function deleteLayer(idx) {
  if (layers.length <= 1) return;
  saveCurrentLayer();
  layers.splice(idx, 1);
  if (currentLayerIndex >= layers.length) currentLayerIndex = layers.length - 1;
  if (currentLayerIndex < 0) currentLayerIndex = 0;
  renderCurrentLayer();
  updateLayersUI();
  saveGlobalHistory();
}

function addFrame() {
  saveCurrentLayer();
  const emptyCanvas = document.createElement("canvas");
  emptyCanvas.width = canvas.width;
  emptyCanvas.height = canvas.height;
  const emptyCtx = emptyCanvas.getContext("2d");
  emptyCtx.fillStyle = "white";
  emptyCtx.fillRect(0, 0, canvas.width, canvas.height);
  layers.push({ imageData: emptyCanvas.toDataURL(), name: `Кадр ${layers.length + 1}`, duration: frameDurationSec });
  currentLayerIndex = layers.length - 1;
  renderCurrentLayer();
  updateLayersUI();
  saveGlobalHistory();
}

function deleteFrame() { deleteLayer(currentLayerIndex); }
function duplicateCurrentFrame() { duplicateLayer(currentLayerIndex); }

function cutFrame() {
  if (layers.length <= 1) return;
  clipboardLayer = { ...layers[currentLayerIndex] };
  layers.splice(currentLayerIndex, 1);
  if (currentLayerIndex >= layers.length) currentLayerIndex = layers.length - 1;
  renderCurrentLayer();
  updateLayersUI();
  saveGlobalHistory();
}

function moveFrameLeft() {
  if (currentLayerIndex > 0) {
    [layers[currentLayerIndex - 1], layers[currentLayerIndex]] = [layers[currentLayerIndex], layers[currentLayerIndex - 1]];
    currentLayerIndex--;
    renderCurrentLayer();
    updateLayersUI();
    saveGlobalHistory();
  }
}

function moveFrameRight() {
  if (currentLayerIndex < layers.length - 1) {
    [layers[currentLayerIndex + 1], layers[currentLayerIndex]] = [layers[currentLayerIndex], layers[currentLayerIndex + 1]];
    currentLayerIndex++;
    renderCurrentLayer();
    updateLayersUI();
    saveGlobalHistory();
  }
}

let animationInterval = null;
function playAnimation() {
  if (animationInterval) clearInterval(animationInterval);
  let frame = 0;
  function playFrame() {
    saveCurrentLayer();
    currentLayerIndex = frame % layers.length;
    renderCurrentLayer();
    updateLayersUI();
    frame++;
    const duration = (layers[currentLayerIndex].duration || frameDurationSec) * 1000;
    animationInterval = setTimeout(playFrame, duration);
  }
  playFrame();
}
function stopAnimation() { if (animationInterval) clearTimeout(animationInterval); animationInterval = null; }

// ========== ФОН ==========
function setBackgroundColor() {
  const bgColor = prompt("Введіть колір фону (назва або HEX):", "#f0f0f0");
  if (bgColor) {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveCurrentLayer();
    saveGlobalHistory();
  }
}

function setBackgroundImage() {
  document.getElementById("bgFileInput").click();
}

document.getElementById("bgFileInput").onchange = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    saveCurrentLayer();
    saveGlobalHistory();
    URL.revokeObjectURL(url);
  };
  img.src = url;
};

// ========== ЕКСПОРТ ==========
async function exportToGif() {
  alert("Створення GIF... Це може зайняти кілька секунд.");
  const gif = new GIF({ workers: 2, quality: 10, width: canvas.width, height: canvas.height, workerScript: "https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.worker.js" });
  for (let i = 0; i < layers.length; i++) {
    const img = new Image();
    img.src = layers[i].imageData;
    await new Promise((resolve) => { img.onload = resolve; });
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(img, 0, 0);
    gif.addFrame(tempCanvas, { delay: (layers[i].duration || frameDurationSec) * 1000 });
  }
  gif.on("finished", function (blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "animation.gif";
    a.click();
    URL.revokeObjectURL(url);
    alert("GIF збережено!");
  });
  gif.render();
}

function exportToMp4() {
  alert("Зараз буде згенеровано відео через MediaRecorder API (WebM).");
  const stream = canvas.captureStream(fps);
  const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  const chunks = [];
  mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "animation.webm";
    a.click();
    URL.revokeObjectURL(url);
    alert("Відео збережено у форматі WebM");
  };
  mediaRecorder.start();
  let frame = 0;
  const interval = setInterval(() => {
    saveCurrentLayer();
    currentLayerIndex = frame % layers.length;
    renderCurrentLayer();
    updateLayersUI();
    frame++;
    if (frame >= layers.length * 3) {
      clearInterval(interval);
      mediaRecorder.stop();
      stopAnimation();
    }
  }, 1000 / fps);
}

// ========== ЗАЛИВКА ЗАМКНЕНОЇ ОБЛАСТІ (Flood Fill) ==========
function floodFill(x, y, targetColor, fillColor) {
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const targetR = (targetColor >> 16) & 0xff;
  const targetG = (targetColor >> 8) & 0xff;
  const targetB = targetColor & 0xff;
  const fillR = (fillColor >> 16) & 0xff;
  const fillG = (fillColor >> 8) & 0xff;
  const fillB = fillColor & 0xff;

  const stack = [{ x: Math.floor(x), y: Math.floor(y) }];
  const visited = new Set();

  while (stack.length) {
    const { x: px, y: py } = stack.pop();
    if (px < 0 || px >= canvas.width || py < 0 || py >= canvas.height) continue;
    const key = `${px},${py}`;
    if (visited.has(key)) continue;

    const idx = (py * canvas.width + px) * 4;
    if (Math.abs(data[idx] - targetR) < 10 && Math.abs(data[idx + 1] - targetG) < 10 && Math.abs(data[idx + 2] - targetB) < 10) {
      visited.add(key);
      data[idx] = fillR;
      data[idx + 1] = fillG;
      data[idx + 2] = fillB;
      stack.push({ x: px + 1, y: py }, { x: px - 1, y: py }, { x: px, y: py + 1 }, { x: px, y: py - 1 });
    }
  }
  ctx.putImageData(imageData, 0, 0);
  saveCurrentLayer();
  saveGlobalHistory();
}

function bucketFill(x, y) {
  const pixel = ctx.getImageData(x, y, 1, 1).data;
  const targetColor = (pixel[0] << 16) | (pixel[1] << 8) | pixel[2];
  const fillColor = parseInt(color.slice(1), 16);
  floodFill(x, y, targetColor, fillColor);
}

// ========== ІНСТРУМЕНТИ ==========
let painting = false;
let currentTool = "brush";
let color = "#000000";
let size = 4;
let lastX = 0, lastY = 0, startX = 0, startY = 0;
let snapshot = null;
let hollowMode = false;
let zoomLevel = 1;
let symmetryAxes = 0;

const colorPick = document.getElementById("colorPick");
const brushSizeElem = document.getElementById("brushSize");
const sizeValue = document.getElementById("sizeValue");
document.getElementById("fpsInput").onchange = (e) => fps = parseInt(e.target.value);
document.getElementById("frameDuration").onchange = (e) => frameDurationSec = parseFloat(e.target.value);

const toolsDef = {
  brush: { btn: "brushBtn", name: "Пензель" }, pencil: { btn: "pencilBtn", name: "Олівець" },
  eraser: { btn: "eraserBtn", name: "Гумка" }, fill: { btn: "fillBtn", name: "Заливка всього" },
  bucketFill: { btn: "bucketFillBtn", name: "Заливка замкненої" }, pipette: { btn: "pipetteBtn", name: "Піпетка" },
  zoom: { btn: "zoomBtn", name: "Лупа" }, hand: { btn: "handBtn", name: "Рука (переміщення шару)" },
  line: { btn: "lineBtn", name: "Лінія" }, curve: { btn: "curveBtn", name: "Крива" },
  rect: { btn: "rectBtn", name: "Прямокутник" }, oval: { btn: "ovalBtn", name: "Овал" },
  triangle: { btn: "triangleBtn", name: "Трикутник" }, rhombus: { btn: "rhombusBtn", name: "Ромб" },
  star: { btn: "starBtn", name: "Зірка" }, heart: { btn: "heartBtn", name: "Серце" },
  arrow: { btn: "arrowBtn", name: "Стрілка" }, airbrush: { btn: "airbrushBtn", name: "Аерограф" },
  watercolor: { btn: "watercolorBtn", name: "Акварель" }, marker: { btn: "markerBtn", name: "Маркер" },
  blender: { btn: "blenderBtn", name: "Блендер" }, stamp: { btn: "stampBtn", name: "Штамп" },
  dynamicEraser: { btn: "dynamicEraserBtn", name: "Динамічна гумка" }, autoShadow: { btn: "autoShadowBtn", name: "Автотінь" },
  smartSym: { btn: "smartSymBtn", name: "Симетрія" }, magneticPen: { btn: "magneticPenBtn", name: "Магнітний олівець" }
};

function setActiveTool(toolId, btnId) {
  currentTool = toolId;
  for (let key in toolsDef) {
    let btn = document.getElementById(toolsDef[key].btn);
    if (btn) btn.classList.remove("active");
  }
  document.getElementById(btnId).classList.add("active");
  document.getElementById("currentToolName").innerText = toolsDef[toolId]?.name || toolId;
  setContext();
  console.log("Інструмент змінено на:", toolId);
}

for (let [id, def] of Object.entries(toolsDef)) {
  const btn = document.getElementById(def.btn);
  if (btn) btn.onclick = () => setActiveTool(id, def.btn);
}

function setContext() {
  ctx.globalCompositeOperation = "source-over";
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.shadowBlur = 0;
  ctx.shadowColor = "rgba(0,0,0,0)";
  if (currentTool === "eraser" || currentTool === "dynamicEraser") {
    ctx.globalCompositeOperation = "destination-out";
  } else if (currentTool === "airbrush") {
    ctx.globalAlpha = 0.15;
  } else if (currentTool === "watercolor") {
    ctx.globalAlpha = 0.4;
  } else if (currentTool === "blender") {
    ctx.globalCompositeOperation = "lighter";
    ctx.globalAlpha = 0.3;
  } else if (currentTool === "marker") {
    ctx.globalAlpha = 0.6;
  } else {
    ctx.globalAlpha = 1;
  }
  colorPick.style.borderColor = color;
}

function drawDot(x, y) {
  if (currentTool === "airbrush") {
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.arc(x + (Math.random() - 0.5) * size * 2, y + (Math.random() - 0.5) * size * 2, size / 4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (currentTool === "watercolor") {
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(x + (Math.random() - 0.5) * size * 0.8, y + (Math.random() - 0.5) * size * 0.8, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (currentTool === "stamp") {
    ctx.font = `${size * 2}px sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText("★", x - size, y - size / 2);
  } else if (currentTool === "pencil") {
    ctx.beginPath();
    ctx.arc(x, y, size / 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, size / 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLine(x1, y1, x2, y2) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  if (currentTool === "eraser" || currentTool === "dynamicEraser") {
    for (let s = 0; s <= dist; s += Math.max(1, size / 2)) {
      let t = s / dist;
      let ix = x1 + (x2 - x1) * t, iy = y1 + (y2 - y1) * t;
      ctx.beginPath();
      ctx.arc(ix, iy, size / 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (currentTool === "blender") {
    for (let s = 0; s <= dist; s += 4) {
      let t = s / dist;
      let ix = x1 + (x2 - x1) * t, iy = y1 + (y2 - y1) * t;
      ctx.beginPath();
      ctx.arc(ix, iy, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,180,180,0.2)`;
      ctx.fill();
    }
    setContext();
  } else if (currentTool === "autoShadow") {
    ctx.shadowBlur = 12;
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.shadowColor = "rgba(0,0,0,0)";
  } else {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

function drawShape(type, x, y, w, h) {
  ctx.beginPath();
  if (type === "rect") ctx.rect(x, y, w, h);
  else if (type === "oval") ctx.ellipse(x + w/2, y + h/2, Math.abs(w/2), Math.abs(h/2), 0, 0, Math.PI * 2);
  else if (type === "triangle") {
    ctx.moveTo(x + w/2, y);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
  } else if (type === "rhombus") {
    ctx.moveTo(x + w/2, y);
    ctx.lineTo(x + w, y + h/2);
    ctx.lineTo(x + w/2,
