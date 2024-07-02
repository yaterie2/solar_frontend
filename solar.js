import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import axios from "axios";
import { setupInteraction, onClick, toggleHighlight } from "./interaction";

let scene, camera, renderer, controls, raycaster, mouse;

const planetTranslations = {
  Mercury: "Merkur",
  Venus: "Venus",
  Earth: "Erde",
  Mars: "Mars",
  Jupiter: "Jupiter",
  Saturn: "Saturn",
  Uranus: "Uranus",
  Neptune: "Neptun",
  Pluto: "Pluto",
  Sun: "Sonne",
};

// Initialize Three.js components
function init() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    10000000
  );
  camera.position.set(0, 0, 10000000);

  renderer = new THREE.WebGLRenderer();
  renderer.setClearColor(0x000000);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.enableZoom = true;
  controls.autoRotate = false;
  controls.enablePan = false;

  controls.minPolarAngle = 1.6;
  controls.maxPolarAngle = Math.PI / 1;

  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();

  // Setup interaction after initializing mouse, raycaster, scene, and camera
  setupInteraction(mouse, raycaster, scene, camera, planetTranslations);

  // Add event listener for clicks
  window.addEventListener("click", onClick);

  // Fetch data and render planets
  fetchDataAndRender();
}

// Function to fetch data and render planets
async function fetchDataAndRender() {
  const API_URL = "https://solarapp-api.yannick-schwab.de/api";
  const planetsUrl = `${API_URL}/planets`;
  const sunUrl = `${API_URL}/sun`;
  const plutoUrl = `${API_URL}/pluto`;

  try {
    const [planetsResponse, sunResponse, plutoResponse] = await Promise.all([
      axios.get(planetsUrl),
      axios.get(sunUrl),
      axios.get(plutoUrl),
    ]);

    const planetsData = planetsResponse.data.planets;
    const sunData = sunResponse.data.sun;
    const plutoData = plutoResponse.data.pluto;

    renderPlanets(planetsData, sunData, plutoData);
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

// Function to render planets
function renderPlanets(planetsData, sunData, plutoData) {
  const colors = {
    Mercury: 0xbfbfbf,
    Venus: 0xffcc00,
    Earth: 0x0033ff,
    Mars: 0xff5733,
    Jupiter: 0xd2b48c,
    Saturn: 0xffd700,
    Uranus: 0x00ffff,
    Neptune: 0x0000ff,
    Pluto: 0xa9a9a9,
  };

  const distanceScale = 1000;
  const sizeScale = 0.0001;

  // Function to add planet mesh or sphere to interaction system
  function addPlanetSphere(mesh) {
    // Example: Add event listener for hover
    mesh.addEventListener("mouseover", () => {
      // Highlight the planet or sphere
      mesh.material.color.setHex(0xff0000); // Example: Change color to red
    });

    // Example: Add event listener for click
    mesh.addEventListener("click", () => {
      // Perform action when the planet or sphere is clicked
      console.log(`Clicked on ${mesh.name}`);
    });

    // Add more interaction setup as needed
  }

  // Render planets
  planetsData.forEach((planet) => {
    const planetColor = colors[planet.englishName] || 0xffffff;
    const planetSize = planet.meanRadius * sizeScale;

    // Create planet mesh
    const planetGeometry = new THREE.SphereGeometry(planetSize, 32, 32);
    const planetMaterial = new THREE.MeshStandardMaterial({
      color: planetColor,
      emissive: 0x111111,
      emissiveIntensity: 0.1,
    });
    const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
    planetMesh.name = planet.englishName; // Assign name to the planet mesh

    // Create orbit path
    const orbitPath = createOrbitPath(
      planet.semimajorAxis / distanceScale,
      planet.englishName === "Mercury" ||
        planet.englishName === "Mars" ||
        planet.englishName === "Uranus"
        ? planet.eccentricity
        : 0,
      planet.inclination,
      planet.longAscNode,
      planet.argPeriapsis
    );
    orbitPath.name = "orbitHitbox"; // Name the orbit path for identification
    orbitPath.add(planetMesh); // Add the planet as a child of the orbit

    scene.add(orbitPath);

    // Calculate position on orbit
    const position = calculatePositionOnOrbit(planet, distanceScale, sizeScale);
    planetMesh.position.copy(position);

    // Add transparent sphere around the planet with conditional size adjustment for Pluto
    const sphereSizeMultiplier =
      planet.englishName === "Pluto" ? 875000 : 50000; // Adjust as needed
    const sphereGeometry = new THREE.SphereGeometry(
      planetSize * sphereSizeMultiplier,
      32,
      32
    );
    const sphereMaterial = new THREE.MeshBasicMaterial({
      color: planetColor,
      transparent: true,
      opacity: 0.3, // Adjust the opacity as needed
      side: THREE.DoubleSide,
    });
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereMesh.position.copy(position);
    scene.add(sphereMesh);

    // Add planet and sphere to interaction system
    addPlanetSphere(planetMesh);
    addPlanetSphere(sphereMesh);

    // Render moons if they exist
    if (planet.moons) {
      planet.moons.forEach((moon, index) => {
        const moonSize = planet.meanRadius * 0.1 * sizeScale;
        const moonDistance = planet.meanRadius * 2 * (index + 1) * sizeScale;

        const moonGeometry = new THREE.SphereGeometry(moonSize, 16, 16);
        const moonMaterial = new THREE.MeshBasicMaterial({
          color: 0xaaaaaa,
        });
        const moonMesh = new THREE.Mesh(moonGeometry, moonMaterial);

        const angle = (index / planet.moons.length) * 2 * Math.PI;
        moonMesh.position.set(
          planetMesh.position.x + moonDistance * Math.cos(angle),
          planetMesh.position.y + moonDistance * Math.sin(angle),
          0
        );

        scene.add(moonMesh);
      });
    }
  });

  // Render Sun
  if (sunData) {
    const sunRadius = sunData.meanRadius * sizeScale;
    const sunGeometry = new THREE.SphereGeometry(sunRadius, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffff00,
    });
    const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    sunMesh.position.set(0, 0, 0);
    scene.add(sunMesh);

    const sunlight = new THREE.DirectionalLight(0xffffff, 1);
    sunlight.position.copy(sunMesh.position);
    scene.add(sunlight);
  } else {
    console.error("No Sun data fetched.");
  }

  // Render Pluto
  if (plutoData) {
    const plutoColor = colors.Pluto || 0xfaa0a0;
    const plutoSize = plutoData.meanRadius * sizeScale;

    // Create Pluto mesh
    const plutoGeometry = new THREE.SphereGeometry(plutoSize, 32, 32);
    const plutoMaterial = new THREE.MeshStandardMaterial({
      color: plutoColor,
      emissive: 0x111111,
      emissiveIntensity: 0.1,
    });
    const plutoMesh = new THREE.Mesh(plutoGeometry, plutoMaterial);
    plutoMesh.name = "Pluto"; // Set the name of the Pluto mesh

    // Create orbit path for Pluto
    const plutoOrbitPath = createOrbitPath(
      plutoData.semimajorAxis / distanceScale,
      plutoData.eccentricity,
      plutoData.inclination,
      plutoData.longAscNode,
      plutoData.argPeriapsis,
      0xff0000 // Red color for Pluto's orbit
    );
    plutoOrbitPath.name = "orbitHitbox"; // Name the orbit path for identification

    plutoOrbitPath.add(plutoMesh); // Add Pluto as a child of the orbit

    scene.add(plutoOrbitPath);

    // Calculate position on orbit for Pluto
    const plutoPosition = calculatePositionOnOrbit(
      plutoData,
      distanceScale,
      sizeScale
    );
    plutoMesh.position.copy(plutoPosition);

    // Add Pluto and its sphere to interaction system
    addPlanetSphere(plutoMesh);

    // Add transparent sphere around Pluto
    const plutoSphereSize = plutoSize * 875000; // Adjusted size for Pluto's sphere
    const plutoSphereGeometry = new THREE.SphereGeometry(
      plutoSphereSize,
      32,
      32
    );
    const plutoSphereMaterial = new THREE.MeshBasicMaterial({
      color: plutoColor,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
    });
    const plutoSphereMesh = new THREE.Mesh(
      plutoSphereGeometry,
      plutoSphereMaterial
    );
    plutoSphereMesh.position.copy(plutoPosition);
    scene.add(plutoSphereMesh);

    // Add Pluto's sphere to interaction system
    addPlanetSphere(plutoSphereMesh);
  } else {
    console.error("No Pluto data fetched.");
  }

  animate();
}

// Function to create orbit path
function createOrbitPath(
  semimajorAxis,
  eccentricity,
  inclination = 0,
  longitudeAscendingNode = 0,
  argumentOfPeriapsis = 0,
  color = 0xffffff // Default color
) {
  const vertices = [];
  const numPoints = 500;

  // Convert angles from degrees to radians
  inclination = THREE.MathUtils.degToRad(inclination);
  longitudeAscendingNode = THREE.MathUtils.degToRad(longitudeAscendingNode);
  argumentOfPeriapsis = THREE.MathUtils.degToRad(argumentOfPeriapsis);

  for (let i = 0; i <= numPoints; i++) {
    const anomaly = (i / numPoints) * 2 * Math.PI;

    // Calculate radius based on true anomaly using Kepler's equation
    const radius =
      (semimajorAxis * (1 - eccentricity ** 2)) /
      (1 + eccentricity * Math.cos(anomaly));

    // Position in the orbit plane
    const x = radius * Math.cos(anomaly + argumentOfPeriapsis);
    const y = radius * Math.sin(anomaly + argumentOfPeriapsis);
    const z = 0;

    // Apply the longitude of ascending node rotation
    const xRotatedLongAscNode =
      x * Math.cos(longitudeAscendingNode) -
      y * Math.sin(longitudeAscendingNode);
    const yRotatedLongAscNode =
      x * Math.sin(longitudeAscendingNode) +
      y * Math.cos(longitudeAscendingNode);
    const zRotatedLongAscNode = z;

    // Apply the inclination rotation
    const xFinal = xRotatedLongAscNode;
    const yFinal =
      yRotatedLongAscNode * Math.cos(inclination) -
      zRotatedLongAscNode * Math.sin(inclination);
    const zFinal =
      yRotatedLongAscNode * Math.sin(inclination) +
      zRotatedLongAscNode * Math.cos(inclination);

    vertices.push(xFinal, yFinal, zFinal);
  }

  const orbitGeometry = new THREE.BufferGeometry();
  orbitGeometry.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(vertices, 3)
  );

  const orbitMaterial = new THREE.LineBasicMaterial({
    color: new THREE.Color(color),
    transparent: true,
    opacity: 0.5,
  });

  const orbitPath = new THREE.Line(orbitGeometry, orbitMaterial);
  return orbitPath;
}

// Function to animate the scene
function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  controls.update();
}

// Function to calculate position on orbit
function calculatePositionOnOrbit(planet, distanceScale, sizeScale) {
  const anomaly = Math.random() * 2 * Math.PI;

  const radius =
    (planet.semimajorAxis * (1 - planet.eccentricity ** 2)) /
    (1 + planet.eccentricity * Math.cos(anomaly));

  const x = radius * Math.cos(anomaly);
  const y = radius * Math.sin(anomaly);
  const z = 0;

  return new THREE.Vector3(
    x / distanceScale,
    y / distanceScale,
    z / distanceScale
  );
}

// Event listener for window resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Initialize the scene
init();
