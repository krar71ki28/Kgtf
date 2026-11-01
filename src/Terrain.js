import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createTerrain(scene, world) {
    const width = 100;
    const depth = 100;
    const segments = 30;
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
            const y = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2.5;
            vertices[index + 1] = y;
            matrix[i].push(y);
            index += 3;
        }
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({ 
        color: 0x3b7a57, 
        roughness: 0.8,
        flatShading: true 
    });

    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    scene.add(terrainMesh);

    if (world) {
        const heightfieldShape = new CANNON.Heightfield(matrix, { elementSize });
        const heightfieldBody = new CANNON.Body({ mass: 0 });
        heightfieldBody.addShape(heightfieldShape);
        heightfieldBody.position.set(-width / 2, 0, depth / 2);
        heightfieldBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        world.addBody(heightfieldBody);
        console.log('⛰️ Terrain Physics Added');
    } else {
        console.warn('⚠️ Physics World not found. Terrain added visually only.');
    }

    console.log('⛰️ Terrain System Loaded Successfully');
    return terrainMesh;
}
