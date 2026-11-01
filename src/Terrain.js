import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createTerrain(scene, world) {
    const size = 200; // مساحة كبيرة

    // 1. الأرضية المسطحة (لون رمادي فاتح)
    const geometry = new THREE.PlaneGeometry(size, size);
    geometry.rotateX(-Math.PI / 2);
    
    const material = new THREE.MeshStandardMaterial({ 
        color: 0xcccccc, // رمادي Unreal
        roughness: 0.9,
        metalness: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    scene.add(mesh);

    // 2. خطوط الشبكة (Grid) مثل محرر Unreal
    const gridHelper = new THREE.GridHelper(size, 100, 0x000000, 0x888888);
    gridHelper.position.y = 0.01; // رفعها قليلاً عن الأرض لتجنب التداخل
    gridHelper.material.opacity = 0.5;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);

    // 3. الفيزياء: مستوى مسطح لا نهائي (CANNON.Plane)
    // هذا يضمن أن المجسمات تقف على مستوى Y=0 بالضبط ولا تغوص
    if (world) {
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(new CANNON.Plane());
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        world.addBody(groundBody);
    }
    
    console.log('✅ Unreal Flat Terrain Loaded');
    return mesh;
}
