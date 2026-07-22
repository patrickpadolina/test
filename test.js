import * as THREE from 'https://esm.sh/three@0.160.0';
import { OrbitControls } from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';

// --- 1. SCENE & RENDERER SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0e14);
scene.fog = new THREE.FogExp2(0x0b0e14, 0.015);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 25, 60);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

document.body.style.margin = '0';
document.body.style.overflow = 'hidden';

// Orbit Controls (Desktop / Touch drag fallback)
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- 2. LIGHTING & AMUSEMENT PARK ENVIRONMENT ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffaa44, 1.8);
dirLight.position.set(40, 60, 20);
dirLight.castShadow = true;
scene.add(dirLight);

// Park Ground
const groundGeo = new THREE.PlaneGeometry(300, 300);
const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a2332, roughness: 0.9 });
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.y = 0;
scene.add(ground);

// Decorative Amusement Park Lights / Pillars
for (let i = 0; i < 40; i++) {
  const pGeo = new THREE.CylinderGeometry(0.2, 0.2, 8 + Math.random() * 12);
  const pMat = new THREE.MeshStandardMaterial({ color: Math.random() > 0.5 ? 0xff0055 : 0x00ccff });
  const pillar = new THREE.Mesh(pGeo, pMat);
  const angle = (i / 40) * Math.PI * 2;
  const radius = 60 + Math.random() * 20;
  pillar.position.set(Math.cos(angle) * radius, pillar.geometry.parameters.height / 2, Math.sin(angle) * radius);
  scene.add(pillar);
}

// --- 3. ROLLER COASTER TRACK GEOMETRY ---
// Define track control points (Hills, Dips, Loops)
const trackPoints = [
  new THREE.Vector3(0, 35, -40),   // High starting peak (Max Height)
  new THREE.Vector3(30, 5, -20),   // Low valley
  new THREE.Vector3(40, 22, 10),   // Second medium hill
  new THREE.Vector3(20, 8, 35),    // Sharp turn dip
  new THREE.Vector3(-20, 18, 30),  // Mid-altitude hill
  new THREE.Vector3(-40, 4, 0),    // Lowest valley
  new THREE.Vector3(-25, 28, -30)  // Return climb hill
];

const trackCurve = new THREE.CatmullRomCurve3(trackPoints, true, 'centripetal');
const trackLength = trackCurve.getLength();

// Draw Coaster Rails
const tubeGeo = new THREE.TubeGeometry(trackCurve, 300, 0.6, 8, true);
const tubeMat = new THREE.MeshStandardMaterial({ color: 0xff3366, metalness: 0.8, roughness: 0.2 });
const trackMesh = new THREE.Mesh(tubeGeo, tubeMat);
scene.add(trackMesh);

// Support Pillars along track
const points = trackCurve.getSpacedPoints(40);
points.forEach(pt => {
  if (pt.y > 0) {
    const suppGeo = new THREE.CylinderGeometry(0.15, 0.15, pt.y);
    const suppMat = new THREE.MeshBasicMaterial({ color: 0x445566 });
    const supp = new THREE.Mesh(suppGeo, suppMat);
    supp.position.set(pt.x, pt.y / 2, pt.z);
    scene.add(supp);
  }
});

// --- 4. COASTER CART ---
const cartGroup = new THREE.Group();
const cartGeo = new THREE.BoxGeometry(2, 1.2, 3.5);
const cartMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, metalness: 0.5, roughness: 0.3 });
const cartMesh = new THREE.Mesh(cartGeo, cartMat);
cartMesh.position.y = 0.8;
cartGroup.add(cartMesh);
scene.add(cartGroup);

// --- 5. PHYSICS & ENERGY CONSERVATION PARAMETERS ---
const g = 9.81;                       // Gravity acceleration (m/s^2)
const mass = 500;                     // Cart Mass (kg)
const hMax = 38;                      // Max Reference Height (m)
const totalEnergy = mass * g * hMax;  // Mechanical Energy E = PE_max (Joules)

let progress = 0;                     // Track progress (0.0 to 1.0)

// --- 6. HUD ENERGY OVERLAY & GYROSCOPE BUTTON ---
const hud = document.createElement('div');
hud.style.position = 'absolute';
hud.style.top = '15px';
hud.style.left = '15px';
hud.style.color = '#fff';
hud.style.fontFamily = 'monospace';
hud.style.fontSize = '13px';
hud.style.background = 'rgba(10, 15, 25, 0.85)';
hud.style.padding = '14px 18px';
hud.style.borderRadius = '10px';
hud.style.border = '1px solid rgba(0, 255, 204, 0.3)';
hud.style.pointerEvents = 'auto';

hud.innerHTML = `
  <div style="font-weight:bold; color:#00ffcc; margin-bottom:8px; font-size:14px;">ROLLER COASTER ENERGY CONSERVATION</div>
  <div>Height (h): <span id="hVal">0</span> m | Speed (v): <span id="vVal">0</span> m/s</div>
  <div style="margin-top:8px; color:#00e5ff;">Potential Energy (PE = mgh): <span id="peVal">0</span> kJ</div>
  <div style="background:#111; width:200px; height:8px; margin-bottom:6px; border-radius:4px;"><div id="peBar" style="background:#00e5ff; width:0%; height:100%;"></div></div>
  <div style="color:#ff0055;">Kinetic Energy (KE = ½mv²): <span id="keVal">0</span> kJ</div>
  <div style="background:#111; width:200px; height:8px; margin-bottom:6px; border-radius:4px;"><div id="keBar" style="background:#ff0055; width:0%; height:100%;"></div></div>
  <div style="color:#76ff03;">Total Energy (E = PE + KE): <span id="teVal">${(totalEnergy / 1000).toFixed(1)}</span> kJ</div>
  <div style="background:#111; width:200px; height:8px; margin-bottom:10px; border-radius:4px;"><div style="background:#76ff03; width:100%; height:100%;"></div></div>
  <button id="gyroBtn" style="background:#00ffcc; border:none; padding:6px 12px; border-radius:5px; color:#000; font-weight:bold; cursor:pointer;">Enable Mobile Gyroscope 📱</button>
`;
document.body.appendChild(hud);

const hVal = document.getElementById('hVal');
const vVal = document.getElementById('vVal');
const peVal = document.getElementById('peVal');
const keVal = document.getElementById('keVal');
const peBar = document.getElementById('peBar');
const keBar = document.getElementById('keBar');

// --- 7. GYROSCOPE / DEVICE ORIENTATION HANDLER ---
let gyroActive = false;
let alpha = 0, beta = 0, gamma = 0;

document.getElementById('gyroBtn').addEventListener('click', () => {
  if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
    // iOS 13+ Gyroscope permission request
    DeviceOrientationEvent.requestPermission()
      .then(response => {
        if (response === 'granted') enableGyro();
        else alert('Gyroscope permission denied.');
      });
  } else {
    // Standard Android / Web Gyroscope
    enableGyro();
  }
});

function enableGyro() {
  window.addEventListener('deviceorientation', (e) => {
    gyroActive = true;
    alpha = e.alpha ? THREE.MathUtils.degToRad(e.alpha) : 0;
    beta = e.beta ? THREE.MathUtils.degToRad(e.beta) : 0;
    gamma = e.gamma ? THREE.MathUtils.degToRad(e.gamma) : 0;
  });
  document.getElementById('gyroBtn').innerText = 'Gyroscope Active ✓';
  document.getElementById('gyroBtn').style.background = '#76ff03';
}

// --- 8. ANIMATION & PHYSICS LOOP ---
let lastTime = performance.now();

function animate(currentTime) {
  requestAnimationFrame(animate);

  const dt = Math.min((currentTime - lastTime) / 1000, 0.03);
  lastTime = currentTime;

  // 1. Get current position along track
  const currentPos = trackCurve.getPointAt(progress);
  const height = Math.max(0.1, currentPos.y); // Height above ground

  // 2. Physics Equations (Conservation of Energy)
  // PE = m * g * h
  const PE = mass * g * height;
  
  // KE = Total Energy - PE
  const KE = Math.max(0, totalEnergy - PE);
  
  // v = sqrt(2 * KE / m) + baseline small speed to prevent stopping
  const velocity = Math.sqrt((2 * KE) / mass) + 3.0;

  // 3. Advance progress along the track
  const distanceTravelled = velocity * dt;
  progress = (progress + distanceTravelled / trackLength) % 1.0;

  // 4. Update Cart Position and Orientation
  const newPos = trackCurve.getPointAt(progress);
  const tangent = trackCurve.getTangentAt(progress);
  
  cartGroup.position.copy(newPos);
  
  // Align cart with track direction
  const lookAtPos = newPos.clone().add(tangent);
  cartGroup.lookAt(lookAtPos);

  // 5. Gyroscope Camera Control vs OrbitControls
  if (gyroActive) {
    controls.enabled = false;
    // Apply gyroscope angles to camera rotation
    camera.rotation.set(beta, alpha, -gamma, 'YXZ');
  } else {
    controls.update();
  }

  // 6. Update Real-Time HUD Display
  hVal.innerText = height.toFixed(1);
  vVal.innerText = velocity.toFixed(1);
  peVal.innerText = (PE / 1000).toFixed(1);
  keVal.innerText = (KE / 1000).toFixed(1);

  const pePct = Math.min(100, Math.max(0, (PE / totalEnergy) * 100));
  const kePct = Math.min(100, Math.max(0, (KE / totalEnergy) * 100));

  peBar.style.width = `${pePct}%`;
  keBar.style.width = `${kePct}%`;

  renderer.render(scene, camera);
}

animate(performance.now());

// Handle window resizing
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
