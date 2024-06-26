import GUI from "lil-gui";
import * as THREE from "three";
import { gsap } from "gsap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

/**
 * Base
 */
// Debug
const gui = new GUI({
  width: 400,
});

gui.close();
gui.hide();

if (window.location.hash === "#debug") {
  gui.show();
}

const debugObject = {};

const loadingBarBackground = document.querySelector(".loading-background");
const loadingBarElement = document.querySelector(".loading-bar");
const percentage = document.querySelector(".percentage");

let sceneReady = false;
const loadingManager = new THREE.LoadingManager(
  // Loaded
  () => {
    window.setTimeout(() => {
      loadingBarBackground.classList.add("ended");
      loadingBarBackground.style.transform = "";
      loadingBarElement.classList.add("ended");
      percentage.classList.add("ended");
      loadingBarElement.style.transform = "";
      percentage.style.transform = "";
      window.setTimeout(() => {
        loadingBarBackground.remove();
        loadingBarElement.remove();
        percentage.remove();
      }, 5000);
    }, 500);
    window.setTimeout(() => {
      sceneReady = true;
    }, 3500);
  },
  (itemUrl, itemsLoaded, itemsTotal) => {
    const progressRatio = itemsLoaded / itemsTotal;
    loadingBarElement.style.transform = `scaleX(${progressRatio})`;
    percentage.innerText = (progressRatio * 100).toFixed(0) + " %";
  }
);

// Canvas
const canvas = document.querySelector("canvas.webgl");

// Scene
const scene = new THREE.Scene();

/**
 * Loaders
 */
// Texture loader
const textureLoader = new THREE.TextureLoader(loadingManager);

// Draco loader
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath("draco/");

// GLTF loader
const gltfLoader = new GLTFLoader(loadingManager);
gltfLoader.setDRACOLoader(dracoLoader);

/**
 * Textures
 */
const bakedTexture1 = textureLoader.load("textures/baketTry.png");
bakedTexture1.flipY = false;
bakedTexture1.colorSpace = THREE.SRGBColorSpace;

/**
 * Materials
 */
const material1 = new THREE.MeshBasicMaterial({
  map: bakedTexture1,
});

/**
 * POI
 */
const points = [
  {
    position: new THREE.Vector3(-1, 2, -1),
    element: document.querySelector(".point-0"),
  },
  {
    position: new THREE.Vector3(-4, 4, 4),
    element: document.querySelector(".point-1"),
  },
  {
    position: new THREE.Vector3(0, 2, 2),
    element: document.querySelector(".point-2"),
  },
];

debugObject.poi = true;
gui
  .add(debugObject, "poi")
  .onChange((val) => {
    for (const point of points) {
      if (!val) {
        point.element.classList.remove("visible");
      } else {
        point.element.classList.add("visible");
      }
    }
  })
  .name("Points of Interest");

/**
 * Sizes
 */
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

window.addEventListener("resize", () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;

  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
// Base camera
const camera = new THREE.PerspectiveCamera(
  45,
  sizes.width / sizes.height,
  0.1,
  100
);
camera.position.x = 15;
camera.position.y = 10;
camera.position.z = 15;
scene.add(camera);

// Adding camera controls to the debug panel
const cameraFolder = gui.addFolder("Camera");
cameraFolder.add(camera.position, "x", -50, 50).name("Camera X");
cameraFolder.add(camera.position, "y", -50, 50).name("Camera Y");
cameraFolder.add(camera.position, "z", -50, 50).name("Camera Z");
cameraFolder.open();

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Animate
 */
const raycaster = new THREE.Raycaster();

const clock = new THREE.Clock();
let mixer = null; // Add a variable for the mixer
let actions = {}; // Object to store animation actions
debugObject.playbackSpeed = 1; // Add a variable for playback speed

const tick = () => {
  const elapsedTime = clock.getElapsedTime();

  // Update controls
  controls.update();

  if (sceneReady) {
    for (const point of points) {
      const screenPosition = point.position.clone();
      screenPosition.project(camera);

      raycaster.setFromCamera(screenPosition, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      if (intersects.length === 0 && debugObject.poi) {
        point.element.classList.add("visible");
      } else {
        const intersectionDistance = intersects[0].distance;
        const pointDistance = point.position.distanceTo(camera.position);

        if (intersectionDistance < pointDistance) {
          point.element.classList.remove("visible");
        } else if (intersectionDistance > pointDistance && debugObject.poi) {
          point.element.classList.add("visible");
        }
      }

      const translateX = screenPosition.x * sizes.width * 0.5;
      const translateY = -screenPosition.y * sizes.height * 0.5;
      point.element.style.transform = `translateX(${translateX}px) translateY(${translateY}px)`;
    }
  }

  // Update the mixer for animations
  if (mixer) {
    mixer.update(clock.getDelta() * debugObject.playbackSpeed);
  }

  // Render
  renderer.render(scene, camera);

  // Call tick again on the next frame
  window.requestAnimationFrame(tick);
};

gltfLoader.load("models/isometric_room_examtry.glb", (gltf) => {
  gltf.scene.traverse((child) => {
    if (child.isMesh) {
      child.material = material1;
    }
  });

  scene.add(gltf.scene);

  // Log if animations are found
  if (gltf.animations && gltf.animations.length > 0) {
    console.log(gltf.animations.length);
    console.log("Animations found in the model");

    // Create the mixer and store the animation actions
    mixer = new THREE.AnimationMixer(gltf.scene);
    gltf.animations.forEach((clip) => {
      const action = mixer.clipAction(clip);
      actions[clip.name] = action;
      action.play();
    });

    // Add controls for animations to the debug panel
    const animationFolder = gui.addFolder("Animations");
    animationFolder
      .add(debugObject, "playbackSpeed", 0.1, 2)
      .name("Playback Speed");
    Object.keys(actions).forEach((name) => {
      const action = actions[name];
      console.log(name);
      if (name == "Cylinder.009Action") {
        name = "dartbord";
      } else if (name == "Cylinder.018Action") {
        name = "omer";
      } else if (name == "Cube.003Action") {
        name = "barstoel";
      }
      const actionFolder = animationFolder.addFolder(name);
      actionFolder.add({ play: () => action.play() }, "play").name("Play");
      actionFolder.add({ stop: () => action.stop() }, "stop").name("Stop");
      actionFolder.add({ reset: () => action.reset() }, "reset").name("Reset");
      actionFolder.open();
    });
    animationFolder.open();
  } else {
    console.log("No animations found in the model");
  }
});

tick();
