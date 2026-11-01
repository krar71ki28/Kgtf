import * as THREE from 'three';

export function setupLighting(scene, renderer) {
    // 1. إعدادات الريندر السينمائية (Unreal/Godot)
    if (renderer) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.55; // تعريض منخفض جداً للواقعية
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // 2. ضباب جوي (Atmospheric Fog) يخفي الحواف
    scene.fog = new THREE.FogExp2(0x89CFF0, 0.015);
    scene.background = new THREE.Color(0x89CFF0);

    // 3. الشمس (Directional Light) قوية ولكن مع Tone Mapping
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 2.5);
    sunLight.position.set(50, 80, -50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    sunLight.shadow.camera.far = 300;
    sunLight.shadow.bias = -0.001; // إزالة تشوهات الظل
    scene.add(sunLight);

    // 4. إضاءة السماء (Hemisphere Light) - سر جمال Unreal
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // 5. إضاءة محيطة منخفضة جداً (Ambient) لمنع السواد المطلق
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.1); 
    scene.add(ambientLight);

    // 6. قرص الشمس مع التوهج (Sun Disk)
    const canvas = document.createElement('canvas');
    canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');     
    gradient.addColorStop(0.1, 'rgba(255, 255, 220, 0.9)'); 
    gradient.addColorStop(0.4, 'rgba(255, 200, 100, 0.4)'); 
    gradient.addColorStop(1, 'rgba(255, 150, 0, 0)');       
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256);

    const sunMaterial = new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(canvas),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true
    });
    const sunSprite = new THREE.Sprite(sunMaterial);
    sunSprite.scale.set(150, 150, 1);
    sunSprite.position.copy(sunLight.position).normalize().multiplyScalar(400);
    scene.add(sunSprite);

    console.log('🌅 Unreal-Style Lighting & Atmospheric Fog Loaded');
}
