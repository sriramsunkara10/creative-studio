// ===== ELEMENTS =====
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const modeSelect = document.getElementById("mode");
const canvasContainer = document.getElementById("canvas-container");

const drawingControls = document.getElementById("drawing-controls");
const modelingControls = document.getElementById("modeling-controls");

const colorPicker = document.getElementById("colorPicker");
const brushSizeInput = document.getElementById("brushSize");
const clearBtn = document.getElementById("clearBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const eraserBtn = document.getElementById("eraserBtn");
const saveBtn = document.getElementById("saveBtn");

const modelColorPicker = document.getElementById("modelColorPicker");
const scaleInput = document.getElementById("scale");
const shapeSelect = document.getElementById("shape");

// ===== CANVAS SETUP =====
canvas.width = 800;
canvas.height = 600;
ctx.lineCap = "round";
ctx.lineJoin = "round";

let drawing = false;
let eraserMode = false;
let brushColor = colorPicker.value;
let history = [];
let historyIndex = -1;

let scene, camera, renderer, controls;
let mesh = null;
let animationId = null;

function getMousePos(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

function updateCursor(size) {
  const radius = size / 2;
  const cursorCanvas = document.createElement("canvas");
  cursorCanvas.width = size;
  cursorCanvas.height = size;
  const cursorCtx = cursorCanvas.getContext("2d");
  cursorCtx.clearRect(0, 0, size, size);
  cursorCtx.beginPath();
  cursorCtx.arc(radius, radius, radius, 0, 2 * Math.PI);
  cursorCtx.fillStyle = "rgba(0, 0, 0, 0.35)";
  cursorCtx.fill();
  const dataURL = cursorCanvas.toDataURL();
  canvas.style.cursor = `url(${dataURL}) ${radius} ${radius}, crosshair`;
}

function setBrush() {
  ctx.lineWidth = Number(brushSizeInput.value);
  ctx.globalCompositeOperation = eraserMode ? "destination-out" : "source-over";
  ctx.strokeStyle = eraserMode ? "rgba(0,0,0,1)" : brushColor;
}

function saveState() {
  if (historyIndex < history.length - 1) {
    history = history.slice(0, historyIndex + 1);
  }
  history.push(canvas.toDataURL());
  if (history.length > 30) {
    history.shift();
  }
  historyIndex = history.length - 1;
  updateHistoryButtons();
}

function updateHistoryButtons() {
  undoBtn.disabled = historyIndex <= 0;
  redoBtn.disabled = historyIndex >= history.length - 1;
}

function restoreState(index) {
  if (index < 0 || index >= history.length) return;
  const img = new Image();
  img.onload = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
  };
  img.src = history[index];
  historyIndex = index;
  updateHistoryButtons();
}

function undo() {
  if (historyIndex > 0) restoreState(historyIndex - 1);
}

function redo() {
  if (historyIndex < history.length - 1) restoreState(historyIndex + 1);
}

function downloadCanvas() {
  const anchor = document.createElement("a");
  anchor.href = canvas.toDataURL("image/png");
  anchor.download = "creative-studio.png";
  anchor.click();
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  saveState();
}

canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  const pos = getMousePos(e);
  ctx.beginPath();
  ctx.moveTo(pos.x, pos.y);
});

canvas.addEventListener("mousemove", (e) => {
  if (!drawing) return;
  const pos = getMousePos(e);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
});

canvas.addEventListener("mouseup", () => {
  if (drawing) {
    drawing = false;
    saveState();
  }
});

canvas.addEventListener("mouseout", () => {
  if (drawing) {
    drawing = false;
    saveState();
  }
});

colorPicker.addEventListener("input", (e) => {
  brushColor = e.target.value;
  if (!eraserMode) setBrush();
});

brushSizeInput.addEventListener("input", (e) => {
  updateCursor(e.target.value);
  setBrush();
});

clearBtn.addEventListener("click", clearCanvas);
undoBtn.addEventListener("click", undo);
redoBtn.addEventListener("click", redo);
eraserBtn.addEventListener("click", () => {
  eraserMode = !eraserMode;
  eraserBtn.textContent = eraserMode ? "Brush" : "Eraser";
  setBrush();
});
saveBtn.addEventListener("click", downloadCanvas);

function dispose3D() {
  if (animationId) cancelAnimationFrame(animationId);
  if (controls) {
    controls.dispose();
    controls = null;
  }
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  canvasContainer.innerHTML = "";
  scene = null;
  camera = null;
  mesh = null;
}

function getSelectedModelColor() {
  return modelColorPicker.value;
}

function createModel() {
  const type = shapeSelect.value;
  let geometry;
  if (type === "box") geometry = new THREE.BoxGeometry();
  if (type === "sphere") geometry = new THREE.SphereGeometry();
  if (type === "torus") geometry = new THREE.TorusGeometry();

  const material = new THREE.MeshStandardMaterial({
    color: getSelectedModelColor()
  });

  if (mesh) scene.remove(mesh);
  mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(0, 0, 0);
  mesh.scale.set(scaleInput.value, scaleInput.value, scaleInput.value);
  scene.add(mesh);
}

function updateModelScale(value) {
  if (mesh) {
    mesh.scale.set(value, value, value);
  }
}

function updateModelColor(value) {
  if (mesh) {
    mesh.material.color.set(value);
  }
}

function init3D() {
  dispose3D();
  canvas.style.display = "none";
  canvasContainer.style.display = "block";

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(55, 800 / 600, 0.1, 1000);
  camera.position.set(4, 3, 8);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(800, 600);
  renderer.setPixelRatio(window.devicePixelRatio || 1);
  canvasContainer.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0x888888);
  scene.add(ambient);
  const directional = new THREE.DirectionalLight(0xffffff, 1.2);
  directional.position.set(5, 10, 7);
  scene.add(directional);

  const grid = new THREE.GridHelper(12, 12, 0x3f72af, 0x1f2b45);
  scene.add(grid);

  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;

  createModel();
  animate3D();
}

function animate3D() {
  animationId = requestAnimationFrame(animate3D);
  if (mesh) {
    mesh.rotation.y += 0.003;
  }
  controls.update();
  renderer.render(scene, camera);
}

modelColorPicker.addEventListener("input", (e) => {
  updateModelColor(e.target.value);
});

scaleInput.addEventListener("input", (e) => {
  updateModelScale(e.target.value);
});

shapeSelect.addEventListener("change", () => {
  if (mesh) {
    const oldScale = mesh.scale.clone();
    const material = mesh.material;
    const position = mesh.position.clone();
    scene.remove(mesh);
    const geometry = shapeSelect.value === "box"
      ? new THREE.BoxGeometry()
      : shapeSelect.value === "sphere"
        ? new THREE.SphereGeometry()
        : new THREE.TorusGeometry();
    mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);
    mesh.scale.copy(oldScale);
    scene.add(mesh);
  }
});

modeSelect.addEventListener("change", (e) => {
  if (e.target.value === "2d") {
    dispose3D();
    canvas.style.display = "block";
    canvasContainer.style.display = "none";
    drawingControls.style.display = "block";
    modelingControls.style.display = "none";
  } else {
    drawingControls.style.display = "none";
    modelingControls.style.display = "block";
    init3D();
  }
});

const paletteButtons = document.querySelectorAll(".palette-swatch");
paletteButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const color = button.dataset.color;
    colorPicker.value = color;
    brushColor = color;
    if (!eraserMode) setBrush();
  });
});

canvasContainer.style.display = "none";
setBrush();
saveState();
updateCursor(brushSizeInput.value);
