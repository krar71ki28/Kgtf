import * as THREE from 'three';

setTimeout(() => {
    const scene = window.scene || (window.engine && window.engine.scene);
    if (!scene) return;

    // 1. البحث عن الأرضيات القديمة وحذفها (الخضراء التي في الصورة)
    const toRemove = [];
    scene.traverse(child => {
        if (child.isMesh && (child.name.includes('terrain') || child.name.includes('ground') || child.material.color.getHex() === 0x3e6b48 || child.material.color.getHex() === 0x2d5a27)) {
            toRemove.push(child);
        }
        // حذف أي شبكة قديمة (GridHelper)
        if (child.isLineSegments && child.type === 'GridHelper') {
            toRemove.push(child);
        }
    });
    toRemove.forEach(mesh => {
        scene.remove(mesh);
        if (mesh.geometry) mesh.geometry.dispose();
    });

    // 2. رسم أرضية Unreal (رمادية + شبكة) كصورة واحدة (Texture)
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // لون رمادي فاتح مثل Unreal
    ctx.fillStyle = '#cccccc'; 
    ctx.fillRect(0, 0, 512, 512);
    
    // رسم خطوط الشبكة
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(100, 100); // تكرار الشبكة

    const geometry = new THREE.PlaneGeometry(500, 500);
    geometry.rotateX(-Math.PI / 2);
    const material = new THREE.MeshStandardMaterial({ 
        map: texture,
        roughness: 0.9,
        metalness: 0.1
    });

    const newGround = new THREE.Mesh(geometry, material);
    newGround.position.y = 0;
    newGround.name = 'unreal_ground';
    newGround.receiveShadow = true;
    scene.add(newGround);

    console.log("✅ Old terrain destroyed. Clean Unreal Flat Grid loaded.");
}, 1000); // ننتظر ثانية لضمان تحميل المشهد القديم
