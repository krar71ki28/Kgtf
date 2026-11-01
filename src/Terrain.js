import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export function createTerrain(scene, world) {
    // 1. إعداد أبعاد التضاريس
    const width = 100;
    const depth = 100;
    const segments = 50;

    // 2. إنشاء Geometry للتضاريس مع رفع النقاط عشوائياً (Heightmap)
    const geometry = new THREE.PlaneGeometry(width, depth, segments, segments);
    geometry.rotateX(-Math.PI / 2); // جعلها أفقية

    const vertices = geometry.attributes.position.array;
    const heightData = [];

    for (let i = 0; i < vertices.length; i += 3) {
        // إنشاء تلال باستخدام دالة رياضية (Sine Wave)
        const x = vertices[i];
        const z = vertices[i + 2];
        const y = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 5; // ارتفاع التلال
        
        vertices[i + 1] = y; // تغيير الارتفاع
        heightData.push(y);
    }
    
    geometry.computeVertexNormals(); // تحديث الإضاءة

    // 3. إضافة المادة (Material) للتضاريس
    const material = new THREE.MeshStandardMaterial({ 
        color: 0x3b7a57, // لون أخضر
        roughness: 0.8,
        metalness: 0.2,
        flatShading: true // إعطاء طابع Low-Poly
    });

    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.receiveShadow = true;
    terrainMesh.castShadow = true;
    scene.add(terrainMesh);

    // 4. فيزياء التضاريس (Cannon-es Heightfield)
    // (سيتم إضافتها في الخطوة القادمة لضمان عدم الانهيار)
    
    console.log('⛰️ Terrain System Loaded Successfully');
    return terrainMesh;
}
