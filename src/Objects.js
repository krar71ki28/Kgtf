import * as THREE from 'three';

// إنشاء مكعب واحد يلقي ويستقبل الظلال
export function createCube(scene, { size = 1, position = [0, null, 0], color = 0xcccccc } = {}) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(size, size, size),
    new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0 })
  );
  const y = position[1] === null ? size / 2 : position[1];
  mesh.position.set(position[0], y, position[2]);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.type = 'cube';
  scene.add(mesh);
  return mesh;
}

// مكعبات تجريبية لاختبار الظلال والإضاءة
export function addDemoCubes(scene) {
  return [
    createCube(scene, { size: 2, position: [0, null, 0], color: 0xd9534f }),
    createCube(scene, { size: 1, position: [3, null, 1], color: 0x4a90d9 }),
    createCube(scene, { size: 1.5, position: [-3, null, -2], color: 0xf0ad4e }),
    createCube(scene, { size: 1, position: [0, null, 4], color: 0x5cb85c }),
  ];
}
