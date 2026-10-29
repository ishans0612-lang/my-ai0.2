import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/controls/OrbitControls.js';
import { PLYLoader } from 'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/loaders/PLYLoader.js';

const canvas = document.getElementById('viewer-canvas');
const modelInput = document.getElementById('model-file-input');
const loadModelBtn = document.getElementById('load-model-btn');
const resetViewBtn = document.getElementById('reset-view-btn');
const modelStatus = document.getElementById('model-status');
const modelTypeBadge = document.getElementById('model-type-badge');
const supportsVisionBadge = document.getElementById('supports-vision-badge');
const apiBaseInput = document.getElementById('api-base-url');
const saveConfigBtn = document.getElementById('save-config-btn');
const backendStatus = document.getElementById('backend-status');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const voiceBtn = document.getElementById('voice-btn');
const imageBtn = document.getElementById('image-btn');
const imageInput = document.getElementById('image-input');
const chatMessages = document.getElementById('chat-messages');
const clearChatBtn = document.getElementById('clear-chat-btn');
const voiceEnabledChk = document.getElementById('voice-enabled');
const ttsEnabledChk = document.getElementById('tts-enabled');
const ambientAnimateChk = document.getElementById('ambient-animate');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x071523);
scene.fog = new THREE.Fog(0x071523, 7, 22);

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000);
camera.position.set(0, 1.4, 5.5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.enablePan = false;
controls.rotateSpeed = 0.8;
controls.zoomSpeed = 0.9;
controls.minDistance = 0.5;
controls.maxDistance = 60;
controls.target.set(0, 0.7, 0);

const ambientLight = new THREE.AmbientLight(0xdfeaff, 1.7);
scene.add(ambientLight);

const keyLight = new THREE.DirectionalLight(0xaad8ff, 1.6);
keyLight.position.set(4, 6, 6);
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight(0x7c9fff, 0.8);
rimLight.position.set(-5, 3, -4);
scene.add(rimLight);

const floor = new THREE.Mesh(
  new THREE.CircleGeometry(6, 64),
  new THREE.MeshStandardMaterial({
    color: 0x102441,
    transparent: true,
    opacity: 0.8,
    metalness: 0.15,
    roughness: 0.8,
  })
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -1.5;
scene.add(floor);

const rootModel = new THREE.Group();
scene.add(rootModel);

let loadedModel = null;
let activeImageDataUrl = null;
let backendConfig = { supportsVision: false, provider: 'not-configured' };
let recognition = null;
let chatHistory = [];

function resizeRenderer() {
  const { clientWidth, clientHeight } = canvas;
  if (!clientWidth || !clientHeight) {
    return;
  }
  renderer.setSize(clientWidth, clientHeight, false);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', resizeRenderer);
resizeRenderer();

function animate() {
  requestAnimationFrame(animate);
  if (ambientAnimateChk.checked) {
    const s = 0.5 + Math.sin(performance.now() * 0.0013) * 0.15;
    ambientLight.intensity = 1.4 + s;
  }
  controls.update();
  renderer.render(scene, camera);
}
animate();

function setModelStatus(message, variant = 'neutral') {
  modelStatus.className = `status-card ${variant}`;
  modelStatus.textContent = message;
}

function setBadge(type) {
  modelTypeBadge.textContent = type;
}

function setVisionBadge(status) {
  supportsVisionBadge.textContent = status;
}

function resetView() {
  camera.position.set(0, 1.4, 5.5);
  controls.target.set(0, 0.7, 0);
  controls.update();
}

resetViewBtn.addEventListener('click', resetView);

function clearModel() {
  if (loadedModel) {
    rootModel.remove(loadedModel);
    loadedModel.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
    loadedModel = null;
  }
}

function centerAndScaleModel(modelObject) {
  const box = new THREE.Box3().setFromObject(modelObject);
  const center = box.getCenter(new THREE.Vector3());
  modelObject.position.sub(center);
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z) || 1;
  const scale = 4 / maxDim;
  modelObject.scale.setScalar(scale);
  modelObject.position.y += 0.2;
  modelObject.rotation.y = Math.PI * 0.2;
  resetView();
}

function parseAsciiPly(fileText) {
  const text = fileText.toLowerCase();
  if (text.includes('gaussian') || text.includes('splat') || text.includes('scale_0') || text.includes('opacity')) {
    return 'gaussian';
  }

  const lines = fileText.split(/\r?\n/);
  const propertyNames = new Set();
  let vertexCount = 0;
  let inElementVertex = false;
  let parsingProperties = false;
  let currentPropNames = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('element vertex')) {
      vertexCount = Number(trimmed.split(/\s+/)[2]) || 0;
      inElementVertex = true;
      parsingProperties = true;
      currentPropNames = [];
      continue;
    }
    if (inElementVertex && trimmed.startsWith('property')) {
      const parts = trimmed.split(/\s+/);
      const name = parts[parts.length - 1];
      currentPropNames.push(name);
      propertyNames.add(name);
      continue;
    }
    if (trimmed === 'end_header') {
      inElementVertex = false;
      parsingProperties = false;
      break;
    }
  }

  if (vertexCount > 0 && (propertyNames.has('x') || propertyNames.has('nx'))) {
    return 'mesh-point-cloud';
  }

  return 'mesh';
}

function createPointTexture() {
  const size = 64;
  const canvas2D = document.createElement('canvas');
  canvas2D.width = size;
  canvas2D.height = size;
  const ctx = canvas2D.getContext('2d');
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.2, 'rgba(148,200,255,1)');
  gradient.addColorStop(0.6, 'rgba(116,160,255,0.8)');
  gradient.addColorStop(1, 'rgba(116,160,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas2D);
  return texture;
}

function parsePointCloudPly(fileText) {
  const lines = fileText.split(/\r?\n/);
  const props = [];
  let vertexCount = 0;
  let readingVertices = false;
  let startIndex = 0;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    if (line.startsWith('element vertex')) {
      vertexCount = Number(line.split(/\s+/)[2]) || 0;
      continue;
    }
    if (line.startsWith('property')) {
      const parts = line.split(/\s+/);
      props.push(parts[parts.length - 1]);
      continue;
    }
    if (line === 'end_header') {
      startIndex = i + 1;
      readingVertices = true;
      break;
    }
  }

  if (!readingVertices || vertexCount === 0) {
    throw new Error('Point cloud data could not be parsed.');
  }

  const positions = [];
  const colors = [];

  for (let i = startIndex; i < lines.length && positions.length / 3 < vertexCount; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(/\s+/).filter(Boolean).map(Number);
    if (values.length < 3) continue;

    const x = values[0];
    const y = values[1];
    const z = values[2];
    positions.push(x, y, z);

    const redIndex = props.indexOf('red');
    const greenIndex = props.indexOf('green');
    const blueIndex = props.indexOf('blue');
    const r = redIndex >= 0 ? values[redIndex] : 220;
    const g = greenIndex >= 0 ? values[greenIndex] : 180;
    const b = blueIndex >= 0 ? values[blueIndex] : 255;
    colors.push(r / 255, g / 255, b / 255);
  }

  if (positions.length === 0) {
    throw new Error('No vertex data found in the .ply file.');
  }

  return { positions, colors };
}

function loadPlyFromFile(file) {
  return file.arrayBuffer().then((buffer) => {
    const text = new TextDecoder('utf-8').decode(buffer.slice(0, 4000));
    const modelType = parseAsciiPly(text);

    clearModel();

    if (modelType === 'gaussian' || modelType === 'mesh-point-cloud') {
      const parsed = parsePointCloudPly(text);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(parsed.positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(parsed.colors, 3));
      const material = new THREE.PointsMaterial({
        size: 0.025,
        map: createPointTexture(),
        transparent: true,
        opacity: 0.95,
        vertexColors: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const points = new THREE.Points(geometry, material);
      rootModel.add(points);
      loadedModel = points;
      setBadge('Gaussian / point cloud');
      setModelStatus('Gaussian-style .ply detected and rendered as a point-cloud view.', 'success');
      centerAndScaleModel(points);
      return;
    }

    const loader = new PLYLoader();
    const geometry = loader.parse(buffer);
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({
      color: 0x8bbdff,
      metalness: 0.2,
      roughness: 0.62,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    rootModel.add(mesh);
    loadedModel = mesh;
    setBadge('3D mesh');
    setModelStatus('Standard .ply mesh loaded successfully.', 'success');
    centerAndScaleModel(mesh);
  }).catch((error) => {
    console.error(error);
    setModelStatus(`Could not load the .ply file: ${error.message}`, 'error');
  });
}

loadModelBtn.addEventListener('click', () => {
  modelInput.click();
});

modelInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.name.toLowerCase().endsWith('.ply')) {
    setModelStatus('Please choose a valid .ply file.', 'error');
    return;
  }
  await loadPlyFromFile(file);
});

function addMessage(role, text) {
  const messageEl = document.createElement('div');
  messageEl.className = `message ${role}`;
  messageEl.textContent = text;
  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  return messageEl;
}

function setTextareaPlaceholder() {
  const text = backendConfig.supportsVision ? 'Ask about your model or upload a screenshot…' : 'Ask about your model…';
  chatInput.placeholder = text;
}

async function checkBackendStatus() {
  const base = getApiBase();
  try {
    const response = await fetch(`${base}/api/health`);
    if (!response.ok) {
      throw new Error('Backend is not responding.');
    }
    const data = await response.json();
    backendStatus.textContent = `Backend online: ${data.status}`;
    backendStatus.className = 'status-card success';
    return true;
  } catch (error) {
    backendStatus.textContent = 'Backend offline. Start the secure Node server and update the URL.';
    backendStatus.className = 'status-card error';
    return false;
  }
}

function getApiBase() {
  const saved = localStorage.getItem('felix-api-base');
  if (saved) {
    return saved;
  }
  return apiBaseInput.value || 'http://localhost:3001';
}

function saveApiBase() {
  const baseURL = apiBaseInput.value.trim();
  if (!baseURL) {
    return;
  }
  localStorage.setItem('felix-api-base', baseURL);
  checkBackendStatus();
}

saveConfigBtn.addEventListener('click', saveApiBase);

async function fetchConfig() {
  const base = getApiBase();
  try {
    const response = await fetch(`${base}/api/config`);
    if (!response.ok) {
      throw new Error('No config available');
    }
    const config = await response.json();
    backendConfig = config;
    if (config.supportsVision) {
      setVisionBadge('Vision on');
      imageBtn.disabled = false;
    } else {
      setVisionBadge('Vision off');
      imageBtn.disabled = true;
    }
    setTextareaPlaceholder();
  } catch (error) {
    backendConfig = { supportsVision: false, provider: 'not-configured' };
    setVisionBadge('Vision off');
    imageBtn.disabled = true;
    setTextareaPlaceholder();
    console.warn(error);
  }
}

async function sendChatMessage() {
  const text = chatInput.value.trim();
  if (!text && !activeImageDataUrl) {
    return;
  }

  addMessage('user', text || 'Image uploaded');
  chatInput.value = '';

  const payload = {
    messages: chatHistory.concat([{ role: 'user', content: text || 'Please analyze this image.' }]),
    imageDataUrl: activeImageDataUrl,
  };

  if (!activeImageDataUrl) {
    delete payload.imageDataUrl;
  }

  try {
    const response = await fetch(`${getApiBase()}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || 'Chat request failed.');
    }

    const assistantText = data.reply || 'No reply was returned.';
    addMessage('assistant', assistantText);

    if (ttsEnabledChk.checked) {
      speakText(assistantText);
    }

    chatHistory.push({ role: 'user', content: text || 'Please analyze this image.' });
    chatHistory.push({ role: 'assistant', content: assistantText });
  } catch (error) {
    addMessage('assistant', `Error: ${error.message}`);
  } finally {
    activeImageDataUrl = null;
    imageInput.value = '';
  }
}

sendBtn.addEventListener('click', sendChatMessage);
chatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    sendChatMessage();
  }
});

clearChatBtn.addEventListener('click', () => {
  chatMessages.innerHTML = '';
  chatHistory = [];
  addMessage('assistant', 'Chat cleared. Ask me anything about Felix or your model.');
});

function speakText(text) {
  if (!('speechSynthesis' in window)) {
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = 1;
  utterance.pitch = 1;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

async function handleImageUpload(file) {
  if (!backendConfig.supportsVision) {
    addMessage('assistant', 'The configured AI model does not support images. Please use a vision-capable model in the backend settings.');
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    activeImageDataUrl = reader.result;
    addMessage('assistant', `Image ready: ${file.name}. You can now ask a question about it.`);
  };
  reader.readAsDataURL(file);
}

imageBtn.addEventListener('click', () => {
  imageInput.click();
});

imageInput.addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  handleImageUpload(file);
});

function enableVoiceInput() {
  const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionApi) {
    addMessage('assistant', 'Voice input is not supported in this browser.');
    return;
  }

  recognition = new SpeechRecognitionApi();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    chatInput.value = transcript;
  };

  recognition.onerror = () => {
    addMessage('assistant', 'Voice recognition could not start. Please try again.');
  };

  recognition.start();
}

voiceBtn.addEventListener('click', () => {
  if (!voiceEnabledChk.checked) {
    addMessage('assistant', 'Voice input is turned off in settings.');
    return;
  }
  enableVoiceInput();
});

apiBaseInput.value = getApiBase();

const initialSystemMessage = 'You are Felix Argyle, a helpful AI assistant for a 3D model viewer. Keep answers concise, practical, and friendly.';
chatHistory.push({ role: 'assistant', content: initialSystemMessage });
addMessage('assistant', 'Welcome. Load your .ply model and ask about it.');

async function init() {
  apiBaseInput.value = getApiBase();
  await checkBackendStatus();
  await fetchConfig();
}

init();

window.addEventListener('beforeunload', () => {
  if (recognition) {
    recognition.stop();
  }
});
