import * as THREE from 'three';

console.log("🔪 Unreal Terrain Fix Loading...");

setTimeout(() => {
    // الوصول للمشهد من خلال المحرك الخاص بك (غالباً main.js يضعه في window)
    const scene = window.scene || (window.engine && window.engine.scene);
    if (!scene) {
        console.warn("⚠️ لم يتم العثور على المشهد. تأكد من أن الكود يعمل.");
        return;
    }

    // 1. إخفاء الأرضية الخضراء القديمة (بدون حذفها لكي لا تنهار الفيزياء)
    scene.traverse((child) => {
        if (child.isMesh && child.geometry && child.geometry.type === 'PlaneGeometry') {
            // إذا كانت الأرضية كبيرة، نخفيها
            if (child.scale.x > 10 || child.geometry.parameters.width > 50) {
                child.visible = false;
                console.log("👁️ تم إخفاء الأرضية القديمة بنجاح.");
            }
        }
    });

    // 2. حذف أي شبكة قديمة (GridHelper)
    const grids = [];
    scene.traverse((child) => {
        if (child.type === 'GridHelper') grids.push(child);
    });
    grids.forEach(g => scene.remove(g));

    // 3. إنشاء أرضية Unreal (رمادية + شبكة كصورة واحدة)
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
    texture.repeat.set(100, 100);

    const geometry = new THREE.PlaneGeometry(500, 500);
    geometry.rotateX(-Math.PI / 2);
    
    const material = new THREE.MeshStandardMaterial({ 
        map: texture,
        roughness: 0.9,
        metalness: 0.0
    });

    const newGround = new THREE.Mesh(geometry, material);
    newGround.position.y = 0; 
    newGround.receiveShadow = true;
    newGround.name = 'Unreal_Ground';
    scene.add(newGround);

    // 4. القنبلة النووية للإضاءة (حذف القديم ووضع هادئ)
    const renderer = window.renderer || (window.engine && window.engine.renderer);
    if (renderer) {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 0.5; // تعريض هادئ جداً
    }

    const lightsToKill = [];
    scene.traverse((child) => {
        if (child.isLight) lightsToKill.push(child);
    });
    lightsToKill.forEach(l => scene.remove(l));

    // إضاءة جديدة هادئة
    scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.4));
    
    const sun = new THREE.DirectionalLight(0xfff5e6, 1.0);
    sun.position.set(50, 80, 50);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    scene.add(sun);

    console.log("✅ Unreal Flat Terrain & Soft Lighting Loaded Successfully!");
}, 1500); // ننتظر ثانية ونصف لضمان تحميل المحرك
