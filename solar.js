import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import planets from "./planets.js";

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

  // Initialize planets and orbits (assuming this function exists)
  initializePlanets();

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

function initializePlanets() {
  // Define realistic colors for planets (if needed)
  const colors = {
    Mercury: 0xbfbfbf, // Gray
    Venus: 0xffcc00, // Yellowish
    Earth: 0x0033ff, // Blue
    Mars: 0xff5733, // Reddish
    Jupiter: 0xd2b48c, // Brownish
    Saturn: 0xffd700, // Golden
    Uranus: 0x00ffff, // Light blue
    Neptune: 0x0000ff, // Blue
    Pluto: 0xa9a9a9, // Dark gray (if you want to include Pluto)
  };

  // Scale factor for visualization
  const distanceScale = 1000;
  const sizeScale = 0.0001;

  // Function to create orbital paths
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
      const x = radius * Math.cos(anomaly + argumentOfPeriapsis); // Apply argument of periapsis rotation here
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
      color: 0xffffff, // White color
      transparent: true,
      opacity: 0.5, // Adjust opacity as needed
    });

    const orbitPath = new THREE.Line(orbitGeometry, orbitMaterial);

    return orbitPath;
  }

  // Inside init function where you create planets
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

    // Calculate and add realistic orbit path
    const orbitPath = createOrbitPath(
      planet.semimajorAxis / distanceScale,
      planet.eccentricity,
      planet.inclination,
      planet.longAscNode,
      planet.argPeriapsis // Ensure argPeriapsis is included
    );
    scene.add(orbitPath);

    // Position the planet along its orbit
    const position = calculatePositionOnOrbit(planet, distanceScale, sizeScale);
    planetMesh.position.copy(position);

    scene.add(planetMesh);

    // Log for debugging
    console.log(
      `Added planet: ${planet.englishName}, Size: ${planetSize}, Position: ${planetMesh.position.x}`
    );

    // Create and add moons (if any)
    if (planet.moons) {
      planet.moons.forEach((moon, index) => {
        // Placeholder values for moon size and distance
        const moonSize = planet.meanRadius * 0.1 * sizeScale; // Arbitrary smaller size
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

        // Log for debugging
        console.log(
          `Added moon: ${moon.moon}, Size: ${moonSize}, Position: (${moonMesh.position.x}, ${moonMesh.position.y})`
        );
      });
    }
  });

  // Add the Sun
  const sunRadius = 695700 * sizeScale; // Size of the Sun in scene units
  const sunGeometry = new THREE.SphereGeometry(sunRadius, 32, 32);
  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 }); // Yellow color for the Sun
  const sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);

  // Position the Sun at the center of the scene (assuming units in meters)
  sunMesh.position.set(0, 0, 0); // Center of the scene
  scene.add(sunMesh);

  // Add sunlight (directional light)
  const sunlight = new THREE.DirectionalLight(0xffffff, 100); // White sunlight with full intensity
  sunlight.position.copy(sunMesh.position); // Position light at the same position as the Sun
  scene.add(sunlight);
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

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

init();
