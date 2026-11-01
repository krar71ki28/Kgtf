import * as THREE from 'three';

export function applyFix(scene, camera) {
    // 1. إضافة شبكة توضيحية لمستوى الأرض (Y = 0)
    if (!scene.userData.gridAdded) {
        const gridHelper = new THREE.GridHelper(100, 50, 0xff0000, 0x555555);
        gridHelper.position.y = 0.05; 
        scene.add(gridHelper);
        scene.userData.gridAdded = true;
    }

    // 2. البحث عن الكيوب وإصلاحه جذرياً
    scene.traverse((child) => {
        if (child.isMesh && (child.name === 'cube' || child.name === 'character')) {
            
            // أ. فرض حجم صحيح (1x1x1) في حال كان مسطحاً
            if (child.scale.y < 0.5) {
                child.scale.set(1, 1, 1);
                console.log('🔧 Scale forced to 1x1x1');
            }

            // ب. فرض الارتفاع (رفع الكيوب عن الأرض بمقدار 0.5)
            // هذا سيجعله يطفو فوق الأرض بوضوح
            child.position.y = 1.0; 

            // ج. إضافة إطار أحمر
            if (!child.userData.helperAdded) {
                const boxHelper = new THREE.BoxHelper(child, 0xff0000);
                scene.add(boxHelper);
                child.userData.helperAdded = true;
                child.userData.helper = boxHelper;
            }
            if (child.userData.helper) {
                child.userData.helper.update();
            }
        }
    });

    // 3. إصلاح الكاميرا لترى المشهد من الأعلى
    if (camera) {
        camera.position.set(5, 5, 5);
        camera.lookAt(0, 0, 0);
    }
}
