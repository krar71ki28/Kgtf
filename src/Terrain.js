import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createTerrain(scene, world) {
    const width = 100;
    const depth = 100;
    const segments = 50; 
    const elementSize = width / segments;

    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const vertices = geometry.attributes.position.array;
    const matrix = [];

    let index = 0;
    for (let i = 0; i <= segments; i++) {
        matrix.push([]);
        for (let j = 0; j <= segments; j++) {
            const x = vertices[index];
            const z = vertices[index + 2];
            // تضاريس ناعمة ومتموجة
            const y = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 3.0; 
            vertices[index + 1] = y;
            matrix[i].push(y);
            index += 3;
        }
    }
    geometry.computeVertexNormals(); // ضروري لجعل الإضاءة ناعمة

    // المادة: إزالة flatShading ليصبح الرسم مطابقاً للفيزياء
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x3e6b48, // لون عشبي واقعي
        roughness: 0.8,
        metalness: 0.1,
        flatShading: false // <--- هذا هو سر حل مشكلة الطمس
    });

    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    scene.add(terrainMesh);

    if (world) {
        const heightfieldShape = new CANNON.Heightfield(matrix, { elementSize });
        const heightfieldBody = new CANNON.Body({ mass: 0 });
        heightfieldBody.addShape(heightfieldShape);
        
        // رفع الفيزياء قليلاً لضمان أن المجسمات تقف فوقها وليس بداخلها
        heightfieldBody.position.set(-width / 2, 0.1, depth / 2); 
        heightfieldBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        
        world.addBody(heightfieldBody);
    }
    return terrainMesh;
}
