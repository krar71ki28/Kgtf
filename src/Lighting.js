import * as THREE from 'three';

export function setupLighting(scene, renderer) {
    // إعدادات الريندر (Unreal Style)
    if (renderer) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2; // تعريض متوازن
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // ضباب خفيف جداً لإعطاء عمق (بدون طمس الألوان)
    scene.fog = new THREE.FogExp2(0xa4c2db, 0.005);
    scene.background = new THREE.Color(0xa4c2db); // لون سماء صافي

    // 1. الشمس (Directional Light) - قوية وواضحة
    const sunLight = new THREE.DirectionalLight(0xfff0d4, 2.5); 
    sunLight.position.set(60, 100, -40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    sunLight.shadow.camera.far = 300;
    sunLight.shadow.bias = -0.0005; 
    scene.add(sunLight);

    // 2. إضاءة السماء (Hemisphere) - تحاكي انعكاس ضوء السماء على الأرض
    const hemiLight = new THREE.HemisphereLight(0xbfe3ff, 0x4a3b2c, 1.2);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // 3. إضاءة محيطة ضعيفة جداً (إزالة السواد)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.15); 
    scene.add(ambientLight);

    // 4. قرص الشمس (Sun Disk) بشكل واقعي
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');     
    gradient.addColorStop(0.1, 'rgba(255, 245, 220, 0.9)'); 
    gradient.addColorStop(0.4, 'rgba(255, 210, 150, 0.3)'); 
    gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');       
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256);

    const sunMaterial = new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true
    });
    const sunSprite = new THREE.Sprite(sunMaterial);
    sunSprite.scale.set(80, 80, 1); // حجم الشمس
    sunSprite.position.copy(sunLight.position).normalize().multiplyScalar(350);
    scene.add(sunSprite);

    console.log('🌅 Unreal Engine 5 Daylight Preset Loaded');
}
