// main script
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import axios from "axios";
import { focusCameraOnObject } from "./cameraUtils"; // Import the function

let scene, camera, renderer, controls, raycaster, mouse;

raycaster = new THREE.Raycaster();
mouse = new THREE.Vector2();

function animate() {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  controls.update();
}

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

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // Add event listener for clicks
  window.addEventListener("click", onClick);

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

  fetchPlanetsData().then(({ planets, sun, pluto }) => {
    if (planets.length > 0) {
      planets.forEach((planet) => {
        const planetColor = colors[planet.englishName] || 0xffffff;
        const planetSize = planet.meanRadius * sizeScale;

        const planetGeometry = new THREE.SphereGeometry(planetSize, 32, 32);
        const planetMaterial = new THREE.MeshStandardMaterial({
          color: planetColor,
          emissive: 0x111111,
          emissiveIntensity: 0.1,
        });

        const planetMesh = new THREE.Mesh(planetGeometry, planetMaterial);

        const orbitPath = createOrbitPath(
          planet.semimajorAxis / distanceScale,
          planet.eccentricity,
          planet.inclination,
          planet.longAscNode,
          planet.argPeriapsis
        );

        orbitPath.name = "orbitHitbox"; // Name the orbit path for identification
        orbitPath.add(planetMesh); // Add the planet as a child of the orbit

        scene.add(orbitPath);

        const position = calculatePositionOnOrbit(
          planet,
          distanceScale,
          sizeScale
        );
        planetMesh.position.copy(position);

        if (planet.moons) {
          planet.moons.forEach((moon, index) => {
            const moonSize = planet.meanRadius * 0.1 * sizeScale;
            const moonDistance =
              planet.meanRadius * 2 * (index + 1) * sizeScale;

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
    } else {
      console.error("No planets data fetched or empty array.");
    }

    if (sun) {
      const sunRadius = sun.meanRadius * sizeScale;
      const sunGeometry = new THREE.SphereGeometry(sunRadius, 32, 32);
      const sunMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
      });
      const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);

      sunMesh.position.set(0, 0, 0);
      scene.add(sunMesh);

      const sunlight = new THREE.DirectionalLight(0xffffff, 100);
      sunlight.position.copy(sunMesh.position);
      scene.add(sunlight);
    } else {
      console.error("No Sun data fetched.");
    }

    // Create Pluto and its orbit
    if (pluto) {
      const plutoColor = colors.Pluto || 0xffffff;
      const plutoSize = pluto.meanRadius * sizeScale;

      const plutoGeometry = new THREE.SphereGeometry(plutoSize, 32, 32);
      const plutoMaterial = new THREE.MeshStandardMaterial({
        color: plutoColor,
        emissive: 0x111111,
        emissiveIntensity: 0.1,
      });

      const plutoMesh = new THREE.Mesh(plutoGeometry, plutoMaterial);

      const plutoOrbitPath = createOrbitPath(
        pluto.semimajorAxis / distanceScale,
        pluto.eccentricity,
        pluto.inclination,
        pluto.longAscNode,
        pluto.argPeriapsis,
        0xff0000 // Red color for Pluto's orbit
      );
      plutoOrbitPath.name = "orbitHitbox"; // Name the orbit path for identification
      plutoOrbitPath.add(plutoMesh); // Add Pluto as a child of the orbit

      scene.add(plutoOrbitPath);

      const plutoPosition = calculatePositionOnOrbit(
        pluto,
        distanceScale,
        sizeScale
      );
      plutoMesh.position.copy(plutoPosition);
    } else {
      console.error("No Pluto data fetched.");
    }

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = true;
    controls.autoRotate = false;
    controls.enablePan = false;

    controls.minPolarAngle = 1.6;
    controls.maxPolarAngle = Math.PI / 1;

    animate();
  });
}

const API_URL =
  "https://solarapp-api.yannick-schwab.de" || "http://localhost:3001";

async function fetchPlanetsData() {
  const planetsUrl = `${API_URL}/planets`;
  const sunUrl = `${API_URL}/sun`;
  const plutoUrl = `${API_URL}/body/Pluto`;

  try {
    console.log("Fetching planets...");
    const planetsResponse = await axios.get(planetsUrl);

    console.log("Fetching Sun...");
    const sunResponse = await axios.get(sunUrl);

    console.log("Fetching Pluto...");
    const plutoResponse = await axios.get(plutoUrl);

    const planetsData = planetsResponse.data.planets.map((planet) => ({
      id: planet.id,
      name: planet.name,
      englishName: planet.englishName,
      moons: planet.moons,
      semimajorAxis: planet.semimajorAxis,
      perihelion: planet.perihelion,
      aphelion: planet.aphelion,
      eccentricity: planet.eccentricity,
      inclination: planet.inclination,
      mass: planet.mass,
      vol: planet.vol,
      density: planet.density,
      gravity: planet.gravity,
      escape: planet.escape,
      meanRadius: planet.meanRadius,
      equaRadius: planet.equaRadius,
      polarRadius: planet.polarRadius,
      flattening: planet.flattening,
      dimension: planet.dimension,
      sideralOrbit: planet.sideralOrbit,
      sideralRotation: planet.sideralRotation,
      aroundPlanet: planet.aroundPlanet,
      discoveredBy: planet.discoveredBy,
      discoveryDate: planet.discoveryDate,
      alternativeName: planet.alternativeName,
      axialTilt: planet.axialTilt,
      avgTemp: planet.avgTemp,
      mainAnomaly: planet.mainAnomaly,
      argPeriapsis: planet.argPeriapsis,
      longAscNode: planet.longAscNode,
      bodyType: planet.bodyType,
      rel: planet.rel,
    }));

    const sunData = sunResponse.data.sun;

    const plutoData = plutoResponse.data.body;

    console.log("Planets fetched:", planetsData);
    console.log("Sun fetched:", sunData);
    console.log("Pluto fetched:", plutoData);

    return { planets: planetsData, sun: sunData, pluto: plutoData };
  } catch (error) {
    console.error("Error fetching celestial bodies data:", error);
    return { planets: [], sun: null, pluto: null };
  }
}

function createOrbitPath(
  semimajorAxis,
  eccentricity,
  inclination = 0,
  longitudeAscendingNode = 0,
  argumentOfPeriapsis = 0
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

  // Define the original color
  const originalColor = new THREE.Color(0xffffff); // Example color, replace with your desired color

  // Calculate a mixed color closer to white
  const mixedColor = originalColor.clone().lerp(new THREE.Color(0xffffff), 0.1); // Adjust the mix ratio (0.5 here) to blend more or less with white

  const orbitMaterial = new THREE.LineBasicMaterial({
    color: mixedColor,
    transparent: true,
    opacity: 0.5,
  });

  const orbitPath = new THREE.Line(orbitGeometry, orbitMaterial);
  return orbitPath;
}

function calculatePositionOnOrbit(planet, distanceScale, sizeScale) {
  const trueAnomaly = 0; // Starting point of the orbit
  const radius =
    (planet.semimajorAxis * (1 - planet.eccentricity ** 2)) /
    (1 + planet.eccentricity * Math.cos(trueAnomaly));

  // Convert angles from degrees to radians
  const inclination = THREE.MathUtils.degToRad(planet.inclination);
  const longitudeAscendingNode = THREE.MathUtils.degToRad(planet.longAscNode);
  const argumentOfPeriapsis = THREE.MathUtils.degToRad(planet.argPeriapsis);

  const x = radius * Math.cos(trueAnomaly + argumentOfPeriapsis);
  const y = radius * Math.sin(trueAnomaly + argumentOfPeriapsis);
  const z = 0;

  // Apply the longitude of ascending node rotation
  const xRotatedLongAscNode =
    x * Math.cos(longitudeAscendingNode) - y * Math.sin(longitudeAscendingNode);
  const yRotatedLongAscNode =
    x * Math.sin(longitudeAscendingNode) + y * Math.cos(longitudeAscendingNode);
  const zRotatedLongAscNode = z;

  // Apply the inclination rotation
  const xFinal = xRotatedLongAscNode;
  const yFinal =
    yRotatedLongAscNode * Math.cos(inclination) -
    zRotatedLongAscNode * Math.sin(inclination);
  const zFinal =
    yRotatedLongAscNode * Math.sin(inclination) +
    zRotatedLongAscNode * Math.cos(inclination);

  return new THREE.Vector3(
    xFinal / distanceScale,
    yFinal / distanceScale,
    zFinal / distanceScale
  );
}

function onClick(event) {
  event.preventDefault();

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const targetObjects = []; // Array to hold specific objects to check against

  // Add all planet meshes and Pluto's orbit path to targetObjects
  scene.traverse((object) => {
    if (
      object.type === "Mesh" &&
      object.parent &&
      object.parent.name === "orbitHitbox"
    ) {
      targetObjects.push(object);
    }
  });

  const intersects = raycaster.intersectObjects(targetObjects, true);

  if (intersects.length > 0) {
    const clickedObject = intersects[0].object;
    console.log("Clicked object:", clickedObject);

    if (clickedObject.parent.name === "orbitHitbox") {
      console.log("Orbit clicked:", clickedObject.parent);
      focusCameraOnObject(camera, controls, clickedObject.parent);
    } else {
      console.log("Planet or Moon clicked:", clickedObject);
      focusCameraOnObject(camera, controls, clickedObject);
    }
  } else {
    console.log("Nothing clicked");
  }
}

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

init();
