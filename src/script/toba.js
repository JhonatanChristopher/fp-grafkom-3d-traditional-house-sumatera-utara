import * as THREE from "three";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js"; // Tambahkan RGBELoader

function getRandomColor() {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return new THREE.Color(`rgb(${r},${g},${b})`);
}

let scene, camera, renderer, controls;

scene = new THREE.Scene();
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

camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  20000,
);
camera.position.set(47.60987150341295, 1582.745841062592, 4496.372250151129);
camera.lookAt(0, 0, 0);
camera.updateProjectionMatrix();

let light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(50000, 10000, 0);
light.castShadow = true;
light.shadow.camera.near = 1;
light.shadow.camera.far = 500;
light.shadow.camera.left = -500;
light.shadow.camera.right = 500;
light.shadow.camera.top = 500;
light.shadow.camera.bottom = -500;
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
scene.add(light);

// const ligtHelper = new THREE.DirectionalLightHelper(light);
// scene.add(ligtHelper);

let hemisphereLight = new THREE.HemisphereLight(0x4d4717, 0x051301, 1);
scene.add(hemisphereLight);

let isDay = true; // Status default: siang
let ambientIntensity = isDay ? 2 : 0.5; // Intensitas awal
let ambientLight = new THREE.AmbientLight(0xd5d6a9, ambientIntensity);
scene.add(ambientLight);

let pointLight = new THREE.PointLight(0xffffff, 500000 * 5, 1000, 2);
pointLight.position.set(0, 0, 0);
pointLight.castShadow = true;
scene.add(pointLight);

// const pointHelper = new THREE.PointLightHelper(pointLight);
// scene.add(pointHelper);

renderer = new THREE.WebGLRenderer();
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById("root").appendChild(renderer.domElement);

controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = true;
controls.minDistance = 50;
controls.maxDistance = 3500;
controls.maxPolarAngle = Math.PI / 2;

const fbxLoader = new FBXLoader();
let currentModel = null;

// Fungsi untuk memuat model dengan penyesuaian bayangan
function load(color, isNight) {
  if (currentModel) {
    scene.remove(currentModel);
  }

  fbxLoader.load(
    "../../models/toba.fbx",
    (object) => {
      object.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = !isNight; // Nonaktifkan bayangan saat mode malam
          child.receiveShadow = !isNight;
          const material = child.material;
          if (Array.isArray(material)) {
            material.forEach((mat) => {
              mat.transparent = false;
              mat.opacity = 1;
              mat.side = THREE.DoubleSide; // Render kedua sisi
              if (color) {
                mat.color = color;
              }
            });
          } else {
            material.castShadow = !isNight;
            material.receiveShadow = !isNight;
            material.transparent = false;
            material.opacity = 1;
            material.side = THREE.DoubleSide; // Render kedua sisi
            if (color) {
              material.color = color;
            }
          }
        }
      });
      const box = new THREE.Box3().setFromObject(object);
      const center = box.getCenter(new THREE.Vector3());
      const targetCenter = new THREE.Vector3(1350, 850, 100);
      object.position.sub(center).add(targetCenter);
      scene.add(object);
      currentModel = object;
      document.getElementById("progress-container").style.display = "none";
    },
    (xhr) => {
      if (xhr.lengthComputable) {
        document.getElementById("progress").innerHTML =
          `LOADING ${Math.max(xhr.loaded / xhr.total, 1) * 100}/100`;
      }
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

const slider = document.getElementById("ambient-slider");
const inside = document.getElementById("go-inside");
const outside = document.getElementById("go-outside");
const lightInside = document.getElementById("inside-light");
const random_color = document.getElementById("random-color");
const reset_color = document.getElementById("reset-color");
const toggleDayNight = document.getElementById("toggle-day-night");
const movement = { forward: false, backward: false, left: false, right: false, up: false, down: false };
const speed = 50; // Kecepatan pergerakan

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
  scene.remove(hemisphereLight);

  hemisphereLight = new THREE.HemisphereLight(0x4d4717, 0x051301, slider.value);
  scene.add(hemisphereLight);

  scene.add(hemisphereLight);
});

inside.addEventListener("click", function () {
  camera.position.set(
    8.861090596889092,
    9.899959131102839e-15,
    161.435595420714,
  );
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
});

outside.addEventListener("click", function () {
  camera.position.set(47.60987150341295, 1582.745841062592, 4496.372250151129);
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
});

lightInside.addEventListener("input", function () {
  console.log(lightInside.value);
  indor_light(lightInside.value);
});

function indor_light(adjust) {
  scene.remove(pointLight);
  pointLight = new THREE.PointLight(0xffffff, 500000 * adjust, 1000, 2);
  pointLight.position.set(0, 0, 0);
  pointLight.castShadow = true;
  scene.add(pointLight);
}

random_color.addEventListener("click", function () {
  load(getRandomColor(), isDay);
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
  scene.remove(light)
   light = new THREE.DirectionalLight(0xffffff, 0);
light.position.set(50000, 10000, 0);
light.castShadow = true;
light.shadow.camera.near = 1;
light.shadow.camera.far = 500;
light.shadow.camera.left = -500;
light.shadow.camera.right = 500;
light.shadow.camera.top = 500;
light.shadow.camera.bottom = -500;
light.shadow.mapSize.width = 1024;
light.shadow.mapSize.height = 1024;
scene.add(light);

  // Muat ulang model dengan pengaturan bayangan sesuai mode
  load(null, !isDay);
});

