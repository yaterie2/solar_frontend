import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import axios from "axios";
import { setupInteraction, onClick, toggleHighlight } from "./interaction";

let scene, camera, renderer, controls, raycaster, mouse;
let speedMultiplier = 600; // Increased speed multiplier
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

const textureLoader = new THREE.TextureLoader();

const textures = {
  Mercury: textureLoader.load("./images/mercury2k.jpg"),
  Venus: textureLoader.load("./images/2k_venus_surface.jpg"),
  Earth: textureLoader.load("./images/2k_earth_daymap.jpg"),
  Mars: textureLoader.load("./images/2k_mars.jpg"),
  Jupiter: textureLoader.load("./images/2k_jupiter.jpg"),
  Saturn: textureLoader.load("./images/2k_saturn.jpg"),
  Uranus: textureLoader.load("./images/2k_uranus.jpg"),
  Neptune: textureLoader.load("./images/2k_neptune.jpg"),
  Pluto: textureLoader.load("./images/plutomap2k.jpg"),
};

let spheresVisible = true; // Track the visibility state of spheres

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

  setupInteraction(mouse, raycaster, scene, camera, planetTranslations);

  window.addEventListener("click", onClick);

  const speedSlider = document.getElementById("speedSlider");
  speedSlider.addEventListener("input", (event) => {
    const value = parseFloat(event.target.value);
    speedMultiplier = (10 / value) ** 2;
  });

  const toggleSphereVisibilityButton = document.getElementById(
    "toggleSphereVisibilityButton"
  );
  if (toggleSphereVisibilityButton) {
    toggleSphereVisibilityButton.addEventListener(
      "click",
      toggleSphereVisibility
    );
  } else {
    console.error("Element with id 'toggleSphereVisibilityButton' not found.");
  }

  fetchDataAndRender();
  addRandomStars();
}

// function addRandomStars() {
//   const starGeometry = new THREE.SphereGeometry(500000, 16, 16);
//   const starMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

//   for (let i = 0; i < 1000; i++) {
//     const star = new THREE.Mesh(starGeometry, starMaterial);
//     star.position.set(
//       (Math.random() - 0.5) * 200000000,
//       (Math.random() - 0.5) * 200000000,
//       (Math.random() - 0.5) * 200000000
//     );
//     scene.add(star);
//   }
// }

async function fetchDataAndRender() {
  const API_URL = "https://solarapp-api.yannick-schwab.de/api";
  const planetsUrl = `${API_URL}/planets`;
  const sunUrl = `${API_URL}/sun`;
  const plutoUrl = `${API_URL}/pluto`;
  const dwarfPlanetsUrl = `${API_URL}/dwarf-planets`;
  const cometsUrl = `${API_URL}/comets`;
  const asteroidsUrl = `${API_URL}/asteroids`;

  try {
    const [
      planetsResponse,
      sunResponse,
      plutoResponse,
      dwarfPlanetsResponse,
      cometsResponse,
      asteroidsResponse,
    ] = await Promise.all([
      axios.get(planetsUrl),
      axios.get(sunUrl),
      axios.get(plutoUrl),
      axios.get(dwarfPlanetsUrl),
      axios.get(cometsUrl),
      axios.get(asteroidsUrl),
    ]);

    const planetsData = planetsResponse.data.planets;
    const sunData = sunResponse.data.sun;
    const plutoData = plutoResponse.data.pluto;
    const dwarfPlanetsData = dwarfPlanetsResponse.data.dwarfPlanets;
    const cometsData = cometsResponse.data.comets;
    const asteroidsData = asteroidsResponse.data.asteroids;

    renderPlanets(planetsData, sunData, plutoData);
    renderCelestialBodies(dwarfPlanetsData, "Dwarf Planet");
    renderCelestialBodies(cometsData, "Comet");
    renderCelestialBodies(asteroidsData, "Asteroid");
  } catch (error) {
    console.error("Error fetching data:", error);
  }
}

let planetMeshes = [];
let sphereMeshes = []; // To keep track of sphere meshes

function renderPlanets(planetsData, sunData, plutoData) {
  const distanceScale = 1000;
  const sizeScale = 0.0001;

  planetsData.forEach((planet) => {
    const planetTexture = textures[planet.englishName];
    const planetSize = planet.meanRadius * sizeScale;

    const planetGeometry = new THREE.SphereGeometry(planetSize, 32, 32);
    const planetMaterial = new THREE.MeshStandardMaterial({
      map: planetTexture,
    });
    const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);
    planetMesh.name = planet.englishName;

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
    orbitPath.name = "orbitHitbox";
    orbitPath.add(planetMesh);

    scene.add(orbitPath);

    planetMeshes.push({ mesh: planetMesh, data: planet });

    const position = calculatePositionOnOrbit(
      planet,
      distanceScale,
      sizeScale,
      0
    );
    planetMesh.position.copy(position);

    if (planet.moons) {
      planet.moons.forEach((moon, index) => {
        const moonSize = planet.meanRadius * 0.1 * sizeScale;
        const moonDistance = planet.meanRadius * 2 * (index + 1) * sizeScale;

        const moonGeometry = new THREE.SphereGeometry(moonSize, 16, 16);
        const moonMaterial = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
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

  if (sunData) {
    const sunRadius = sunData.meanRadius * sizeScale;
    const sunGeometry = new THREE.SphereGeometry(sunRadius, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      map: textureLoader.load("./images/2k_sun.jpg"),
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

  if (plutoData) {
    const plutoTexture = textures.Pluto;
    const plutoSize = plutoData.meanRadius * sizeScale;

    const plutoGeometry = new THREE.SphereGeometry(plutoSize, 32, 32);
    const plutoMaterial = new THREE.MeshStandardMaterial({
      map: plutoTexture,
      emissive: 0x111111,
      emissiveIntensity: 0.1,
    });
    const plutoMesh = new THREE.Mesh(plutoGeometry, plutoMaterial);
    plutoMesh.name = "Pluto";

    const plutoOrbitPath = createOrbitPath(
      plutoData.semimajorAxis / distanceScale,
      plutoData.eccentricity,
      plutoData.inclination,
      plutoData.longAscNode,
      plutoData.argPeriapsis,
      0xff0000
    );
    plutoOrbitPath.name = "orbitHitbox";

    plutoOrbitPath.add(plutoMesh);

    scene.add(plutoOrbitPath);

    planetMeshes.push({ mesh: plutoMesh, data: plutoData });

    const plutoPosition = calculatePositionOnOrbit(
      plutoData,
      distanceScale,
      sizeScale,
      0
    );
    plutoMesh.position.copy(plutoPosition);
  }

  animate();
}

function renderCelestialBodies(data, type) {
  const sizeScale = 0.0001;

  data.forEach((body) => {
    const bodySize = body.meanRadius * sizeScale;

    const bodyGeometry = new THREE.SphereGeometry(bodySize, 32, 32);
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: colors.Default,
    });
    const bodyMesh = new THREE.Mesh(bodyGeometry, bodyMaterial);
    bodyMesh.name = `${type} - ${body.name}`;

    scene.add(bodyMesh);
  });
}

function createOrbitPath(
  semimajorAxis,
  eccentricity,
  inclination = 0,
  longitudeAscendingNode = 0,
  argumentOfPeriapsis = 0,
  color = 0xffffff
) {
  const vertices = [];
  const numPoints = 500;

  inclination = THREE.MathUtils.degToRad(inclination);
  longitudeAscendingNode = THREE.MathUtils.degToRad(longitudeAscendingNode);
  argumentOfPeriapsis = THREE.MathUtils.degToRad(argumentOfPeriapsis);

  for (let i = 0; i <= numPoints; i++) {
    const anomaly = (i / numPoints) * 2 * Math.PI;
    const radius =
      (semimajorAxis * (1 - eccentricity ** 2)) /
      (1 + eccentricity * Math.cos(anomaly));

    const x = radius * Math.cos(anomaly + argumentOfPeriapsis);
    const y = radius * Math.sin(anomaly + argumentOfPeriapsis);
    const z = 0;

    const xRotatedLongAscNode =
      x * Math.cos(longitudeAscendingNode) -
      y * Math.sin(longitudeAscendingNode);
    const yRotatedLongAscNode =
      x * Math.sin(longitudeAscendingNode) +
      y * Math.cos(longitudeAscendingNode);
    const zRotatedLongAscNode = z;

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

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  controls.update();

  updatePlanetPositions();
}

function calculatePositionOnOrbit(planet, distanceScale, sizeScale, time) {
  const meanAnomaly =
    ((2 * Math.PI) / planet.sideralOrbit) * time * speedMultiplier;
  const eccentricAnomaly = solveKepler(meanAnomaly, planet.eccentricity);
  const trueAnomaly =
    2 *
    Math.atan2(
      Math.sqrt(1 + planet.eccentricity) * Math.sin(eccentricAnomaly / 2),
      Math.sqrt(1 - planet.eccentricity) * Math.cos(eccentricAnomaly / 2)
    );

  const radius =
    (planet.semimajorAxis * (1 - planet.eccentricity ** 2)) /
    (1 + planet.eccentricity * Math.cos(trueAnomaly));

  const x = radius * Math.cos(trueAnomaly);
  const y = radius * Math.sin(trueAnomaly);
  const z = 0;

  return new THREE.Vector3(
    x / distanceScale,
    y / distanceScale,
    z / distanceScale
  );
}

function solveKepler(M, e, tolerance = 1e-6) {
  let E = M;
  let delta = 1;
  while (Math.abs(delta) > tolerance) {
    delta = E - e * Math.sin(E) - M;
    E -= delta / (1 - e * Math.cos(E));
  }
  return E;
}

function updatePlanetPositions() {
  const elapsedTime = Date.now() * 0.0001;
  const distanceScale = 1000;
  const sizeScale = 0.0001;

  planetMeshes.forEach(({ mesh, data }) => {
    const position = calculatePositionOnOrbit(
      data,
      distanceScale,
      sizeScale,
      elapsedTime
    );

    // Update planet mesh position
    mesh.position.copy(position);

    // Remove existing sphere if it exists
    const existingSphereMesh = scene.getObjectByName(mesh.name + "Sphere");
    if (existingSphereMesh) {
      scene.remove(existingSphereMesh);
      sphereMeshes = sphereMeshes.filter(
        (sphere) => sphere !== existingSphereMesh
      );
    }

    // Create new sphere mesh
    const planetTexture = textures[data.englishName] || 0xffffff;
    const planetSize = data.meanRadius * 0.0001;
    const sphereSizeMultiplier = data.englishName === "Pluto" ? 875000 : 50000;
    const sphereGeometry = new THREE.SphereGeometry(
      planetSize * sphereSizeMultiplier,
      32,
      32
    );
    const sphereMaterial = new THREE.MeshBasicMaterial({
      map: planetTexture,
      side: THREE.DoubleSide,
    });
    const sphereMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphereMesh.name = mesh.name + "Sphere";
    sphereMesh.position.copy(position);

    // Set initial visibility based on a global variable or toggle state
    const isVisible = true; // Adjust visibility logic here
    sphereMesh.visible = isVisible;

    scene.add(sphereMesh);

    // Add sphere mesh to array for removal tracking
    sphereMeshes.push(sphereMesh);

    console.log(
      `Planet: ${data.englishName}, Position: ${position.x}, ${position.y}, ${position.z}`
    );
  });
}

function toggleSphereVisibility() {
  // Toggle the visibility state
  spheresVisible = !spheresVisible;

  // Set opacity based on visibility state
  sphereMeshes.forEach((sphere) => {
    if (spheresVisible) {
      sphere.material.opacity = 1;
      sphere.material.transparent = true; // Ensure transparency is enabled
    } else {
      sphere.material.opacity = 0;
      sphere.material.transparent = true; // Ensure transparency is enabled
    }
  });
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

init();
