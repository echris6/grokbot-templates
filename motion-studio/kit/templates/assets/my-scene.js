// Example lab scene (replace with your component). Contract: createScene(canvas) -> Promise<{render(t), anchors(t)}>.
// Every transform is a pure function of t: no clocks, no requestAnimationFrame, no unseeded randomness.
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.181.2/+esm";

export async function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.setSize(1920, 1080, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1920 / 1080, 0.1, 100);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(-3, 4, 5); scene.add(key);
  // Three stacked "UI layers" that separate along their normal (the exploded-layers pattern).
  const colors = [0x0a211d, 0x51703a, 0xd9ef71];
  const layers = colors.map((c, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.0, 0.04),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.55, metalness: 0.05 }));
    m.position.z = -i * 0.05; scene.add(m); return m;
  });
  const smoother = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * x * (x * (x * 6 - 15) + 10); };
  function pose(t) {
    const lift = smoother((t - 0.6) / 1.4);
    layers.forEach((m, i) => { m.position.z = -i * (0.05 + 0.55 * lift) + 0.04 * Math.sin(t * 1.3 + i) * lift; });
    const yaw = -0.55 + 0.25 * smoother(t / 3.6), pitch = 0.42;            // pitch stays in 35-55 deg territory
    camera.position.set(7.5 * Math.sin(yaw) * Math.cos(pitch), 7.5 * Math.sin(pitch), 7.5 * Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(-1.3, 0.3, -0.5); camera.updateMatrixWorld();   // object sits right of the title
  }
  const project = (v) => { const p = v.clone().project(camera); return { x: (p.x + 1) * 960, y: (1 - p.y) * 540 }; };
  function render(t) { pose(t); renderer.render(scene, camera); }
  function anchors(t) { pose(t); return layers.slice(0, 2).map((m, i) => ({ id: ["a", "b"][i], ...project(new THREE.Vector3(1.4, 0.8, m.position.z)) })); }
  await renderer.compileAsync(scene, camera); render(0);
  return { render, anchors };
}
