import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

function getRandomColor() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return new THREE.Color(`rgb(${r},${g},${b})`);
}

const scene = new THREE.Scene();
const rgbeLoader = new RGBELoader();

// Fungsi untuk memuat latar belakang HDR
function loadHDRBackground(isDay) {
  const hdrFile = isDay ? "/lilienstein_4k.hdr" : "/nightback.hdr";
  rgbeLoader.load(hdrFile, function (texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    scene.background = texture;
    scene.environment = texture;
  });
}

// Muat latar belakang siang secara default
loadHDRBackground(true);

const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.01,
  10000,
);
camera.position.set(-1.36, 5.67, 49.65);
camera.lookAt(0, 0, 0);
camera.updateProjectionMatrix();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById("root").appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.maxDistance = 40;
controls.target.set(0, 0, 0);
controls.maxPolarAngle = 1.5;
controls.dampingFactor = 0.05;

// Tambahkan pencahayaan
let light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(60, 100, 20);
light.castShadow = true;
light.shadow.mapSize.width = 2048;
light.shadow.mapSize.height = 2048;
light.shadow.bias = -0.001;
light.shadow.camera.near = 0.001;
light.shadow.camera.far = 200;
scene.add(light);

let isDay = true; // Status default: siang
let ambientIntensity = isDay ? 0.5 : 0.1; // Intensitas awal
let ambientLight = new THREE.AmbientLight(0xd5d6a9, ambientIntensity);
scene.add(ambientLight);

let currentModel = null;
let pointLight = new THREE.PointLight(0xffffff, 10, 10, 2);
pointLight.position.set(0, 0.5, 0);
pointLight.castShadow = true;
scene.add(pointLight);

const loader = new GLTFLoader();

// Fungsi untuk memuat model dengan penyesuaian bayangan
function load(color, isNight) {
  if (currentModel) {
    scene.remove(currentModel);
  }
  loader.load(
    `../../models/mandailing.glb`,
    function (gltf) {
      const model = gltf.scene;
      model.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = !isNight; // Nonaktifkan bayangan saat mode malam
          node.receiveShadow = !isNight;
          node.material.polygonOffset = true;
          node.material.polygonOffsetFactor = 1;
          node.material.polygonOffsetUnits = 1;
          if (color) {
            node.material.color = color;
          }
        }
      });

      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const targetCenter = new THREE.Vector3(-1, 27, -30);
      model.position.sub(center).add(targetCenter);
      model.position.sub(center);
      model.scale.set(1, 1, 1);
      currentModel = model;
      scene.add(model);
      document.getElementById("progress-container").style.display = "none";
    },
    function (xhr) {
      console.log((xhr.loaded / xhr.total) * 100 + "% loaded");
      document.getElementById("progress").innerHTML =
        `LOADING ${Math.max(xhr.loaded / xhr.total, 1) * 100}/100`;
    },
    function (error) {
      console.error("An error happened", error);
    },
  );
}

load(null, !isDay); 

function animate() {
  const direction = new THREE.Vector3(); // Vektor arah pergerakan
  const upVector = new THREE.Vector3(0, 1, 0); // Arah ke atas

  // Pergerakan maju dan mundur
  if (movement.forward) {
    direction.z -= speed;
  }
  if (movement.backward) {
    direction.z += speed;
  }

  // Pergerakan kiri dan kanan
  if (movement.left) {
    direction.x -= speed;
  }
  if (movement.right) {
    direction.x += speed;
  }

  // Pergerakan naik dan turun
  if (movement.up) {
    camera.position.addScaledVector(upVector, speed);
  }
  if (movement.down) {
    camera.position.addScaledVector(upVector, -speed);
  }

  // Transformasi vektor berdasarkan rotasi kamera
  const cameraDirection = camera.getWorldDirection(new THREE.Vector3());
  const cameraSide = new THREE.Vector3().crossVectors(cameraDirection, upVector).normalize();

  // Hitung pergerakan kamera di bidang horizontal
  camera.position.addScaledVector(cameraDirection, direction.z);
  camera.position.addScaledVector(cameraSide, direction.x);

  renderer.render(scene, camera);
  controls.update(); // Tetap gunakan OrbitControls jika diinginkan
}
renderer.setAnimationLoop(animate);


// Event handler untuk elemen UI
const slider = document.getElementById("ambient-slider");
const inside = document.getElementById("go-inside");
const outside = document.getElementById("go-outside");
const lightInside = document.getElementById("inside-light");
const random_color = document.getElementById("random-color");
const reset_color = document.getElementById("reset-color");
const toggleDayNight = document.getElementById("toggle-day-night");
const movement = { forward: false, backward: false, left: false, right: false, up: false, down: false };
const speed = 0.5; // Kecepatan pergerakan

window.addEventListener("keydown", (event) => {
  switch (event.code) {
    case "KeyW": // Tombol W
      movement.forward = true;
      break;
    case "KeyS": // Tombol S
      movement.backward = true;
      break;
    case "KeyA": // Tombol A
      movement.left = true;
      break;
    case "KeyD": // Tombol D
      movement.right = true;
      break;
    case "Space": // Tombol Spasi
      movement.up = true;
      break;
    case "ShiftLeft": // Tombol Shift
      movement.down = true;
      break;
  }
});

window.addEventListener("keyup", (event) => {
  switch (event.code) {
    case "KeyW": // Tombol W
      movement.forward = false;
      break;
    case "KeyS": // Tombol S
      movement.backward = false;
      break;
    case "KeyA": // Tombol A
      movement.left = false;
      break;
    case "KeyD": // Tombol D
      movement.right = false;
      break;
    case "Space": // Tombol Spasi
      movement.up = false;
      break;
    case "ShiftLeft": // Tombol Shift
      movement.down = false;
      break;
  }
});


slider.addEventListener("input", function () {
  scene.remove(ambientLight);
  ambientIntensity = isDay ? slider.value * 0.5 : slider.value * 0.1;
  ambientLight = new THREE.AmbientLight(0xd5d6a9, ambientIntensity);
  scene.add(ambientLight);
});

inside.addEventListener("click", function () {
  camera.position.set(
    1.5345146106596603,
    0.904951123641441,
    -1.989140053380429,
  );
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
});

outside.addEventListener("click", function () {
  camera.position.set(
    26.70689641763228,
    8.442637907607171,
    -0.26672457390479615,
  );
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
});

lightInside.addEventListener("input", function () {
  console.log(lightInside.value);
  indor_light(lightInside.value);
});

function indor_light(adjust) {
  scene.remove(pointLight);
  pointLight = new THREE.PointLight(0xffffff, 10 * adjust, 10, 2);
  pointLight.position.set(0, 0.5, 0);
  // pointLight.castShadow = true;
  scene.add(pointLight);
}

random_color.addEventListener("click", function () {
  load(getRandomColor(), !isDay);
});

reset_color.addEventListener("click", function () {
  load(null, !isDay);
});

toggleDayNight.addEventListener("click", function () {
  isDay = !isDay; // Ganti mode
  loadHDRBackground(isDay);

  // Sesuaikan intensitas ambient light
  scene.remove(ambientLight);
  ambientIntensity = isDay ? 0.5 : -0.1;
  ambientLight = new THREE.AmbientLight(0xd5d6a9, ambientIntensity);
  scene.add(ambientLight);

  // Muat ulang model dengan pengaturan bayangan sesuai mode
  load(null, !isDay);
});
