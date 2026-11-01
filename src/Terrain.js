import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createTerrain(scene, world) {
    const width = 100, depth = 100, segments = 64;
    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position.array;

    for (let i = 0; i < pos.length; i += 3) {
        const x = pos[i], z = pos[i+2];
        pos[i+1] = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 3.0; // تلال
    }
    geometry.computeVertexNormals();

    // 🚨 السر 2: مادة الأرضية
    // نستخدم لون أخضر غامق وطبيعي، ونعطيها خشونة عالية (Roughness) لكي لا تعكس الضوء كالمعدن
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x2d5a27, // أخضر غامق طبيعي
        roughness: 0.9,  // يمنع اللمعان الرصاصي
        metalness: 0.0   // الأرض ليست معدن
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true; 
    mesh.castShadow = true;
    scene.add(mesh);

    // الفيزياء
    if (world) {
        const shape = new CANNON.Trimesh(Array.from(pos), Array.from(geometry.index.array));
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        body.position.set(0, 0, 0);
        world.addBody(body);
    }
    return mesh;
}
