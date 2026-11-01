import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createTerrain(scene, world) {
    const width = 100, depth = 100, segments = 32;
    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position.array;

    for (let i = 0; i < pos.length; i += 3) {
        pos[i+1] = Math.sin(pos[i] * 0.1) * Math.cos(pos[i+2] * 0.1) * 2.0;
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({ color: 0x3e6b48, roughness: 0.9 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true; mesh.castShadow = true;
    scene.add(mesh);

    if (world) {
        const shape = new CANNON.Trimesh(Array.from(pos), Array.from(geometry.index.array));
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        
        // 🚨 السحر هنا: رفع الفيزياء مترين فوق الرسم
        // هذا سيجعل المكعب يطفو بوضوح ولن يغوص أبداً
        body.position.set(0, 2.0, 0); 
        
        world.addBody(body);
    }
    return mesh;
}
