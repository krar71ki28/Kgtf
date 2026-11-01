import * as THREE from 'three';

export function applyFix(scene, world) {
    // 1. إضافة واجهة ديباج (HTML) فوق الشاشة
    if (!document.getElementById('debug-ui')) {
        const div = document.createElement('div');
        div.id = 'debug-ui';
        div.style.cssText = 'position:absolute; top:10px; left:10px; color:lime; background:black; padding:10px; font-size:20px; z-index:9999; font-family:monospace;';
        div.innerHTML = 'جاري تحميل الفيزياء...';
        document.body.appendChild(div);
    }

    // 2. البحث عن المجسم (Cube)
    const cube = scene.getObjectByName('cube') || scene.getObjectByName('character');
    
    if (cube) {
        // إجبار الحجم الصحيح
        cube.scale.set(1, 1, 1);
        
        // إذا كان يسقط، لا نتدخل. إذا توقف، نصلحه.
        if (cube.position.y < -5) {
            // إذا سقط في الهاوية، نعيده للأعلى
            cube.position.set(0, 10, 0);
            if (cube.body) {
                cube.body.position.set(0, 10, 0);
                cube.body.velocity.set(0, 0, 0);
            }
        }

        // إضافة الخطوط الحمراء (Wireframe) لرؤية الأبعاد الحقيقية
        if (!cube.userData.debugBox) {
            const box = new THREE.BoxHelper(cube, 0xff0000);
            scene.add(box);
            cube.userData.debugBox = box;
        }
        cube.userData.debugBox.update();

        // تحديث الشاشة
        const ui = document.getElementById('debug-ui');
        if (ui) {
            ui.innerHTML = `Y-Position: ${cube.position.y.toFixed(2)}<br>Scale: ${cube.scale.x}x${cube.scale.y}x${cube.scale.z}`;
        }
    }
}
