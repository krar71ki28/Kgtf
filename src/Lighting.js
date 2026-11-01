import * as THREE from 'three';

export function setupLighting(scene, renderer) {
    if (renderer) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.6; // تعريض منخفض جداً لإراحة العين
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    scene.fog = new THREE.FogExp2(0xa4c2db, 0.01);
    scene.background = new THREE.Color(0xa4c2db);

    // شمس خافتة (بدون سطوع مبالغ)
    const sunLight = new THREE.DirectionalLight(0xfff0d4, 1.0); 
    sunLight.position.set(50, 80, -50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    scene.add(sunLight);

    // سماء خافتة
    const hemiLight = new THREE.HemisphereLight(0xbfe3ff, 0x4a3b2c, 0.4);
    scene.add(hemiLight);

    // إضاءة محيطة خافتة جداً
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.05); 
    scene.add(ambientLight);
}
