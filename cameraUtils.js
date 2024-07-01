import * as THREE from "three";

export function focusCameraOnObject(camera, controls, target, duration = 1000) {
  const startPosition = camera.position.clone();
  const targetPosition = new THREE.Vector3()
    .copy(target.position)
    .add(new THREE.Vector3(0, 0, target.geometry.parameters.radius * 5));
  const startQuaternion = camera.quaternion.clone();
  const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(targetPosition, target.position, camera.up)
  );

  const startTime = performance.now();

  function animateFocus() {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);

    camera.position.lerpVectors(startPosition, targetPosition, t);
    THREE.Quaternion.slerp(
      startQuaternion,
      targetQuaternion,
      camera.quaternion,
      t
    );

    controls.target.copy(target.position);

    if (t < 1) {
      requestAnimationFrame(animateFocus);
    } else {
      controls.update();
    }
  }

  animateFocus();
}
