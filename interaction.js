import * as THREE from "three";

let mouse, raycaster, scene, camera, planetTranslations;
let lastClickedObject = null;
let lastClickTime = 0;
let highlightSpheres = [];
let highlightEnabled = false;

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

    // Check for clicks on orbitHitbox or transparent spheres
    const orbitHitbox = intersects.find(
      (intersect) =>
        intersect.object.name === "orbitHitbox" ||
        intersect.object.name === "highlightSphere"
    );

    if (orbitHitbox) {
      let objectClicked = orbitHitbox.object.children[0];
      const currentTime = Date.now();

      if (objectClicked && objectClicked.name) {
        if (
          lastClickedObject === orbitHitbox &&
          currentTime - lastClickTime < 500
        ) {
          // Double-click detected on the same orbit
          highlightOrbit(orbitHitbox);
        } else {
          lastClickedObject = orbitHitbox;
          lastClickTime = currentTime;

          if (objectClicked.name === "sun") {
            // Clicked on the Sun
            const translatedName = planetTranslations["Sun"] || "Sonne";
            updateInfoDisplay(translatedName);
          } else {
            // Clicked on a planet
            const translatedName =
              planetTranslations[objectClicked.name] || objectClicked.name;
            updateInfoDisplay(`Clicked planet: ${translatedName}`);
          }
        }
      }
    }
  } else {
    // Calculate distance to (0, 0, 0) representing the Sun
    const distanceToSun = Math.sqrt(
      Math.pow(camera.position.x, 2) +
        Math.pow(camera.position.y, 2) +
        Math.pow(camera.position.z, 2)
    );

    // Define the radius of the Sun's hitbox (adjust this value as needed)
    const sunHitboxRadius = 10; // Adjust this value based on your scene scale

    // Check if the click is within the Sun's hitbox
    if (distanceToSun < sunHitboxRadius) {
      const translatedName = planetTranslations["Sun"] || "Sonne";
      updateInfoDisplay(translatedName);
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
