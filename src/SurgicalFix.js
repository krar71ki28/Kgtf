import * as THREE from 'three';

console.log("🔪 Surgical Fix Loaded - Waiting for Scene...");

// ننتظر حتى يتم تحميل المحرك بالكامل (ثانيتين)
setTimeout(() => {
    const scene = window.scene || (window.engine && window.engine.scene);
    if (!scene) {
        console.warn("⚠️ Scene not found for Surgical Fix");
        return;
    }

    // 1. البحث عن الأرضيات الخضراء القديمة وحذفها
    const objectsToDelete = [];
    scene.traverse((child) => {
        if (child.isMesh || child.isLineSegments) {
            // إذا كان المجسم لونه أخضر (الأرضية القديمة)
            if (child.material && child.material.color) {
                const color = child.material.color;
                if (color.g > 0.3 && color.r < 0.4 && color.b < 0.4) { 
                    objectsToDelete.push(child);
                }
            }
            // إذا كان شبكة قديمة (Grid)
            if (child.type === 'GridHelper') {
                objectsToDelete.push(child);
            }
        }
    });

    objectsToDelete.forEach(obj => {
        scene.remove(obj);
        console.log("🗑️ Deleted old terrain/grid piece");
    });

    // 2. إنشاء الأرضية الرمادية الجديدة (Unreal Style)
    const size = 500;
    
    // رسم الشبكة على صورة واحدة
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d');
    
    // لون رمادي فاتح
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(0, 0, 512, 512);
    
    // خطوط الشبكة
    ctx.strokeStyle = '#888888';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(100, 100);

    const geometry = new THREE.PlaneGeometry(size, size);
    geometry.rotateX(-Math.PI / 2);
    
    const material = new THREE.MeshStandardMaterial({ 
        map: texture,
        roughness: 0.9,
        metalness: 0.0
    });

    const newGround = new THREE.Mesh(geometry, material);
    newGround.position.y = 0; // مستوى الصفر تماماً
    newGround.receiveShadow = true;
    newGround.name = 'Unreal_Ground';
    scene.add(newGround);

    // 3. تعديل الكاميرا لتكون مثل Unreal (عالية قليلاً)
    const camera = scene.getObjectByProperty('isCamera', true);
    if (camera) {
        camera.position.set(0, 10, 20);
        camera.lookAt(0, 0, 0);
    }

    console.log("✅ Surgical Fix Complete! Flat Unreal Ground Added.");
}, 2000); // 2 ثانية تأخير لضمان تحميل كل شيء
