import * as THREE from "three";

let mouse, raycaster, scene, camera, planetTranslations;
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
}

export function updateHitboxSizes(newSunSize, newPlanetSize) {
  // No hitboxes to update or remove
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
    // Handle other interactions as needed
  }
}

export function toggleHighlight() {
  highlightEnabled = !highlightEnabled;

  highlightSpheres.forEach((sphere) => {
    sphere.visible = highlightEnabled;
  });
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