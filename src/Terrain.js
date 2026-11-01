import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createTerrain(scene, world) {
    const size = 200;

    // 1. رسم الأرضية والشبكة كصورة واحدة (Canvas Texture) لمنع تداخل الخطوط
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#cccccc'; // رمادي Unreal
    ctx.fillRect(0, 0, 512, 512);
    
    ctx.strokeStyle = '#888888'; // لون الخطوط
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(100, 100); // تكرار الشبكة

    // 2. سطح مستوٍ تماماً
    const geometry = new THREE.PlaneGeometry(size, size);
    geometry.rotateX(-Math.PI / 2);
    
    const material = new THREE.MeshStandardMaterial({ 
        map: texture,
        roughness: 0.9,
        metalness: 0.0
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.receiveShadow = true;
    scene.add(mesh);

    // 3. فيزياء المستوى المسطح (CANNON.Plane)
    if (world) {
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(new CANNON.Plane());
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        world.addBody(groundBody);
    }
    
    return mesh;
}
