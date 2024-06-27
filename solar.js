import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import axios from "axios";

let scene, camera, renderer, controls;
let cameraGroup, cameraTarget;
let isUserInteracting = false;

function init() {
  // Initialize Three.js components
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000000
  );
  camera.position.set(0, 0, 10000000); // Adjust camera position as needed

  renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0x000000); // Set background to black
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Add ambient light
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5); // Soft white ambient light
  scene.add(ambientLight);

  // Initialize camera group and camera target
  cameraGroup = new THREE.Group();
  cameraGroup.add(camera);
  cameraTarget = new THREE.Object3D();
  cameraGroup.add(cameraTarget);
  scene.add(cameraGroup);

  // Fetch celestial bodies data from API
  fetchCelestialBodies();

  // Orbit controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; // Smooth camera movement
  controls.dampingFactor = 0.25; // Damping factor
  controls.enableZoom = true; // Enable zoom with mouse wheel
  controls.autoRotate = true; // Enable auto rotation
  controls.autoRotateSpeed = 0.5; // Adjust auto rotation speed
  controls.enablePan = false; // Disable panning

  // Set the limits for the polar angle
  controls.minPolarAngle = 1.6; // Minimum angle (0 radians)
  controls.maxPolarAngle = Math.PI / 0.5; // Maximum angle (90 degrees)

  // Custom Y-axis rotation
  let previousTheta = controls.getAzimuthalAngle();
  controls.addEventListener("change", () => {
    if (!isUserInteracting) {
      const currentTheta = controls.getAzimuthalAngle();
      const deltaTheta = currentTheta - previousTheta;

      // Apply the rotation to the camera group around the Y-axis
      cameraGroup.rotateY(-deltaTheta);

      previousTheta = currentTheta;
    }
  });

  // Stop auto-rotation on user interaction (e.g., clicking on objects)
  window.addEventListener("mousedown", () => {
    isUserInteracting = true;
  });

  window.addEventListener("mouseup", () => {
    isUserInteracting = false;
  });

  // Start the animation loop
  animate();
}

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  controls.update(); // Update orbit controls
}

async function fetchCelestialBodies() {
  const url = `https://solarapp-api.yannick-schwab.de/api/allbodies?isPlanet=true`;
  try {
    const response = await axios.get(url);
    const bodies = response.data; // Assuming data structure is an array of celestial bodies

    // Process fetched data and add bodies to the scene
    bodies.forEach((body) => {
      addBodyToScene(body);
    });
  } catch (error) {
    console.error("Error fetching celestial bodies:", error);
  }
}

function addBodyToScene(body) {
  // Assuming 'body' contains necessary properties like position, size, etc.
  const { x, y, z, radius, color } = body;

  // Create Three.js geometry and material for the body
  const bodyGeometry = new THREE.SphereGeometry(radius, 32, 32);
  const bodyMaterial = new THREE.MeshStandardMaterial({ color });

  // Create mesh for the body
  const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
  bodyMesh.position.set(x, y, z); // Set position based on fetched data

  // Add body to the scene
  scene.add(bodyMesh);
}

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

init();
