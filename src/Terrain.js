import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createTerrain(scene, world) {
    const width = 100;
    const depth = 100;
    const segments = 40; // زيادة التفاصيل
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
            // تلال ناعمة وواقعية
            const y = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 3.0 + Math.sin(x * 0.3) * 0.5;
            vertices[index + 1] = y;
            matrix[i].push(y);
            index += 3;
        }
    }
    geometry.computeVertexNormals();

    // مادة الأرضية (PBR Matte)
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x556B2F, 
        roughness: 0.9,
        metalness: 0.1,
        flatShading: true 
    });

    const terrainMesh = new THREE.Mesh(geometry, material);
    // خفض الرسم قليلاً حتى لا يطغى على الفيزياء
    terrainMesh.position.y = -0.2; 
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    scene.add(terrainMesh);

    if (world) {
        const heightfieldShape = new CANNON.Heightfield(matrix, { elementSize });
        const heightfieldBody = new CANNON.Body({ mass: 0 });
        heightfieldBody.addShape(heightfieldShape);
        
        // رفع الفيزياء قليلاً عن الرسم لضمان وقوف المجسم فوقها
        heightfieldBody.position.set(-width / 2, 0.2, depth / 2); 
        heightfieldBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        
        world.addBody(heightfieldBody);
        console.log('⛰️ Terrain Physics & Visuals Synced');
    }

    return terrainMesh;
}
