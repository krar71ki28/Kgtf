import * as THREE from 'three';

export function setupLighting(scene, renderer) {
    // 1. إعدادات الريندر السينمائية (مثل Unreal/Godot)
    if (renderer) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.9; // تقليل شدة الإضاءة
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    // 2. شمس (Directional Light) بإضاءة واقعية
    const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2); // تخفيف شدة الضوء
    sunLight.position.set(50, 100, -50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.left = -100;
    sunLight.shadow.camera.right = 100;
    sunLight.shadow.camera.top = 100;
    sunLight.shadow.camera.bottom = -100;
    sunLight.shadow.camera.far = 300;
    scene.add(sunLight);

    // 3. إضاءة محيطة خافتة (Ambient Light) بدلاً من القوية
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3); 
    scene.add(ambientLight);

    // 4. إضافة قرص الشمس (Sun Disk) مع توهج
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');     // أبيض
    gradient.addColorStop(0.2, 'rgba(255, 255, 200, 0.8)'); // أصفر فاتح
    gradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.3)'); // برتقالي
    gradient.addColorStop(1, 'rgba(255, 150, 0, 0)');       // شفاف
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    const sunTexture = new THREE.CanvasTexture(canvas);
    const sunMaterial = new THREE.SpriteMaterial({
        map: sunTexture,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true
    });
    const sunSprite = new THREE.Sprite(sunMaterial);
    sunSprite.scale.set(200, 200, 1);
    sunSprite.position.copy(sunLight.position).normalize().multiplyScalar(400); // بعيد في السماء
    scene.add(sunSprite);

    console.log('🌅 Cinematic Lighting & Sun Disk Loaded');
}
