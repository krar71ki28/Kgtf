import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createTerrain(scene, world) {
    const width = 100, depth = 100, segments = 32;
    
    // الرسم
    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    geometry.rotateX(-Math.PI / 2);
    const pos = geometry.attributes.position.array;
    
    for (let i = 0; i < pos.length; i += 3) {
        const x = pos[i], z = pos[i+2];
        pos[i+1] = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2.0; // تلال
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({ color: 0x3e6b48, roughness: 0.9 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);

    // الفيزياء (Trimesh)
    if (world) {
        // تحويل البيانات لمصفوفات عادية
        const vertices = Array.from(pos);
        const indices = Array.from(geometry.index.array);
        
        const shape = new CANNON.Trimesh(vertices, indices);
        const body = new CANNON.Body({ mass: 0 });
        body.addShape(shape);
        // إزاحة الفيزياء للأسفل قليلاً لضمان أن المجسم يقف فوقها وليس بداخلها
        body.position.set(0, -0.1, 0); 
        
        world.addBody(body);
    }
    return mesh;
}
