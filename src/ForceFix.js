import * as THREE from 'three';

// دالة تعمل كل 100 مللي ثانية لإجبار المكعب على البقاء فوق الأرض
setInterval(() => {
    // نبحث عن المكعب في المشهد (بأي اسم)
    const scene = window.engine?.scene || window.scene;
    if (!scene) return;

    const cube = scene.getObjectByName('cube') || scene.getObjectByName('character');

    if (cube) {
        // 1. إجبار الحجم
        cube.scale.set(1, 1, 1);

        // 2. إجبار الارتفاع (Y = 1.0) لكي يطفو فوق الأرض بوضوح
        // إذا كان المكعب يغوص، هذا السطر سيمنعه
        cube.position.y = 1.0; 

        // 3. إضافة/تحديث الإطار الأحمر
        if (!cube.userData.forceBox) {
            const box = new THREE.BoxHelper(cube, 0xff0000);
            scene.add(box);
            cube.userData.forceBox = box;
        }
        cube.userData.forceBox.update();

        // 4. طباعة النتيجة في الكونسول
        console.log(`🔴 [FORCE FIX ACTIVE] Cube Y: ${cube.position.y.toFixed(2)}`);
    }
}, 100); // كل 100 مللي ثانية
