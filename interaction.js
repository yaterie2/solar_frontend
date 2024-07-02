import * as THREE from "three";

let mouse, raycaster, scene, camera, planetTranslations;
let lastClickedObject = null;
let lastClickTime = 0;
let highlightSpheres = [];
let highlightEnabled = false;

// Hitbox sizes
let sunHitboxSize = 20000; // Initial size for the sun's hitbox
let planetHitboxSize = 20000; // Initial size for planet hitboxes

export function setupInteraction(
  _mouse,
  _raycaster,
  _scene,
  _camera,
  _planetTranslations
) {
  mouse = _mouse;
  raycaster = _raycaster;
  scene = _scene;
  camera = _camera;
  planetTranslations = _planetTranslations;

  const toggleButton = document.getElementById("toggleButton");
  const infoDisplay = document.getElementById("infoDisplay");

  toggleButton.addEventListener("click", function () {
    infoDisplay.classList.toggle("hide");
  });

  // Initially hide the info display
  infoDisplay.classList.add("hide");

  const toggleHighlightButton = document.getElementById(
    "toggleHighlightButton"
  );
  if (toggleHighlightButton) {
    toggleHighlightButton.addEventListener("click", toggleHighlight);
  } else {
    console.error("Element with id 'toggleHighlightButton' not found.");
  }

  // Create hitboxes for sun and planets
  createSunHitbox();
  createPlanetHitboxes();
}

function createSunHitbox() {
  const sunHitboxGeometry = new THREE.BoxGeometry(
    sunHitboxSize,
    sunHitboxSize,
    sunHitboxSize
  );
  const sunHitboxMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 1,
  });
  const sunHitboxMesh = new THREE.Mesh(sunHitboxGeometry, sunHitboxMaterial);
  sunHitboxMesh.name = "sun"; // Set name to identify the sun

  // Position the hitbox at the sun's position
  sunHitboxMesh.position.set(0, 0, 0);

  // Add hitbox to the scene
  scene.add(sunHitboxMesh);
}

function createPlanetHitbox(planetName, position) {
  const planetHitboxGeometry = new THREE.BoxGeometry(
    planetHitboxSize,
    planetHitboxSize,
    planetHitboxSize
  );
  const planetHitboxMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 1,
  });
  const planetHitboxMesh = new THREE.Mesh(
    planetHitboxGeometry,
    planetHitboxMaterial
  );
  planetHitboxMesh.name = planetName; // Set name to identify the planet

  // Position hitbox relative to planet's position
  planetHitboxMesh.position.copy(position);

  // Add hitbox to the scene
  scene.add(planetHitboxMesh);
}

function createPlanetHitboxes() {
  const planets = [
    { name: "mercury", position: new THREE.Vector3(100, 0, 0) },
    { name: "venus", position: new THREE.Vector3(200, 0, 0) },
    { name: "earth", position: new THREE.Vector3(300, 0, 0) },
    { name: "mars", position: new THREE.Vector3(400, 0, 0) },
    { name: "jupiter", position: new THREE.Vector3(500, 0, 0) },
    { name: "saturn", position: new THREE.Vector3(600, 0, 0) },
    { name: "uranus", position: new THREE.Vector3(700, 0, 0) },
    { name: "neptune", position: new THREE.Vector3(800, 0, 0) },
    { name: "pluto", position: new THREE.Vector3(900000, 0, 0) },
  ];

  planets.forEach((planet) => {
    createPlanetHitbox(planet.name, planet.position);
  });
}

export function updateHitboxSizes(newSunSize, newPlanetSize) {
  sunHitboxSize = newSunSize;
  planetHitboxSize = newPlanetSize;

  // Remove existing hitboxes
  const sunHitbox = scene.getObjectByName("sun");
  if (sunHitbox) {
    scene.remove(sunHitbox);
  }
  const planetHitboxes = scene.children.filter((child) =>
    [
      "mercury",
      "venus",
      "earth",
      "mars",
      "jupiter",
      "saturn",
      "uranus",
      "neptune",
      "pluto",
    ].includes(child.name)
  );
  planetHitboxes.forEach((hitbox) => scene.remove(hitbox));

  // Recreate hitboxes with new sizes
  createSunHitbox();
  createPlanetHitboxes();
}

export function onClick(event) {
  event.preventDefault();

  if (!mouse || !camera || !raycaster || !scene) {
    console.error(
      "Mouse, camera, raycaster, or scene not properly initialized."
    );
    return;
  }

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(scene.children, true);

  if (intersects.length > 0) {
    intersects.sort((a, b) => a.distance - b.distance);

    const clickedObject = intersects[0].object;

    if (clickedObject.name) {
      const translatedName =
        planetTranslations[clickedObject.name] || clickedObject.name;
      updateInfoDisplay(translatedName);
      logClick(clickedObject.name);
      redirectToSlugPage(clickedObject.name);
    }
  } else {
    // Calculate distance to (0, 0, 0) representing the Sun
    const distanceToSun = Math.sqrt(
      Math.pow(camera.position.x, 2) +
        Math.pow(camera.position.y, 2) +
        Math.pow(camera.position.z, 2)
    );

    // Check if the click is within the Sun's hitbox
    if (distanceToSun < sunHitboxSize / 2) {
      const translatedName = planetTranslations["Sun"] || "Sonne";
      updateInfoDisplay(translatedName);
      logClick("sun");
      redirectToSlugPage("sun");
    } else {
      // Clicked on empty space, so find the closest planet
      let closestPlanet = null;
      let closestDistance = Infinity;

      scene.children.forEach((child) => {
        if (
          child.name === "orbitHitbox" ||
          child.name === "highlightSphere" // Include spheres in search
        ) {
          const orbitVertices = child.geometry.attributes.position.array;
          for (let i = 0; i < orbitVertices.length; i += 3) {
            const vertex = new THREE.Vector3(
              orbitVertices[i],
              orbitVertices[i + 1],
              orbitVertices[i + 2]
            );

            const vertexProjected = vertex.clone().project(camera);
            const vertexScreen = new THREE.Vector2(
              ((vertexProjected.x + 1) / 2) * window.innerWidth,
              (-(vertexProjected.y - 1) / 2) * window.innerHeight
            );

            const distance = vertexScreen.distanceTo(
              new THREE.Vector2(event.clientX, event.clientY)
            );

            if (distance < 10 && distance < closestDistance) {
              closestDistance = distance;
              closestPlanet = child.children[0];
            }
          }
        }
      });

      // If a closest planet is found, display its name
      if (closestPlanet && closestPlanet.name) {
        const translatedName =
          planetTranslations[closestPlanet.name] || closestPlanet.name;
        updateInfoDisplay(`Umlaufbahn: ${translatedName}`);
      }
    }
  }
}

export function toggleHighlight() {
  highlightEnabled = !highlightEnabled;

  highlightSpheres.forEach((sphere) => {
    sphere.visible = highlightEnabled;
  });
}

function highlightOrbit(orbitHitbox) {
  const selectedColor = 0xff0000; // Example color: red
  orbitHitbox.material.color.set(selectedColor);
  orbitHitbox.material.needsUpdate = true; // Ensure the material update is rendered
}

function updateInfoDisplay(name) {
  const infoText = document.getElementById("infoText");
  if (infoText) {
    infoText.textContent = name;
  } else {
    console.error("Element with id 'infoText' not found.");
  }
}

function logClick(name) {
  console.log(`Clicked on: ${name}`);
}

function redirectToSlugPage(name) {
  window.location.href = `./planet.html?planet=${name}`;
}
