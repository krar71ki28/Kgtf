import * as THREE from 'three';

export function setupLighting(scene, renderer) {
    if (renderer) {
        // 🚨 تعريض منخفض ومريح جداً (لن يحرق العين)
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.5; 
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // سماء زرقاء صافية
    scene.background = new THREE.Color(0x87CEEB);

    // 1. إضاءة محيطة (خفيفة جداً)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2); 
    scene.add(ambientLight);

    // 2. إضاءة السماء (متوسطة)
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3); 
    scene.add(hemiLight);

    // 3. الشمس (خفيفة وناعمة)
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.0); 
    sunLight.position.set(50, 80, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    sunLight.shadow.bias = -0.001;
    scene.add(sunLight);
}
