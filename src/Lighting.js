import * as THREE from 'three';

export function setupLighting(scene, renderer) {
    if (renderer) {
        // 🚨 السر 1: تعريض منخفض جداً (يمنع سطوع الشمس المزعج)
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.5; 
        
        // ظلال ناعمة
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; 
    }

    // 1. سماء بلون أزرق هادئ (بدون سطوع)
    scene.background = new THREE.Color(0x87CEEB);
    // ضباب خفيف جداً لا يغسل الألوان (يبعد 50 متر ويختفي بعد 200)
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

    // 2. الشمس: قوية ولكن التعريض سيخففها
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.5); 
    sunLight.position.set(50, 80, -50); // موقع الشمس
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 300;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // 3. إضاءة السماء (Hemisphere): خفضنا قوتها إلى النصف لتعطي لوناً طبيعياً بدون غسل الألوان
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.3); 
    scene.add(hemiLight);

    // 4. إضاءة محيطة (Ambient): خفضناها لأدنى حد (0.1) لكي تبدو الظلال داكنة وواقعية
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1); 
    scene.add(ambientLight);
}
