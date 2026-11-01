import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createTerrain(scene, world) {
    const width = 100;
    const depth = 100;
    const segments = 50; 

    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const vertices = geometry.attributes.position.array;
    const indices = geometry.index.array; // نحتاج الفهارس للـ Trimesh

    // تعديل ارتفاع التضاريس (التلال)
    for (let i = 0; i < vertices.length; i += 3) {
        const x = vertices[i];
        const z = vertices[i + 2];
        // دالة رياضية للتلال
        const y = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 3.0; 
        vertices[i + 1] = y;
    }
    geometry.computeVertexNormals();

    // الرسم (Visual)
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x3e6b48, 
        roughness: 0.8,
        metalness: 0.1,
        flatShading: false
    });
    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    scene.add(terrainMesh);

    // الفيزياء (Physics)
    if (world) {
        // استخدام Trimesh بدلاً من Heightfield لنسخ الرسم حرفياً
        const trimeshShape = new CANNON.Trimesh(vertices, indices);
        const trimeshBody = new CANNON.Body({ mass: 0 });
        trimeshBody.addShape(trimeshShape);
        
        // إزاحة طفيفة جداً للأعلى (0.2) لمنع الكيوب من الغوص
        trimeshBody.position.set(0, 0.2, 0); 
        
        world.addBody(trimeshBody);
        console.log('⛰️ Terrain Physics (Trimesh) Added - Perfect Match');
    }
    return terrainMesh;
}
