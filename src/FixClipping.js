import * as THREE from 'three';

export function applyFix(scene) {
    // 1. إضافة شبكة توضيحية لمستوى الأرض (Y = 0)
    if (!scene.userData.gridAdded) {
        const gridHelper = new THREE.GridHelper(100, 50, 0xff0000, 0x555555);
        gridHelper.position.y = 0.05; // أعلى قليلاً من الأرض
        scene.add(gridHelper);
        scene.userData.gridAdded = true;
    }

    // 2. البحث عن الكيوب أو الشخصية وإصلاح الطمس
    scene.traverse((child) => {
        if (child.isMesh && (child.name === 'cube' || child.name === 'character' || child.name === 'Player')) {
            
            // إضافة إطار أحمر يوضح الحجم الحقيقي للفيزياء
            if (!child.userData.helperAdded) {
                const boxHelper = new THREE.BoxHelper(child, 0xff0000);
                scene.add(boxHelper);
                child.userData.helperAdded = true;
                child.userData.helper = boxHelper;
            }

            // الحل الجذري: رفع الرسم (Visual) بمقدار 0.5 
            // لأن الفيزياء تضعه في المركز، لكننا نريد أن يقف على قاعدته
            if (!child.userData.offsetApplied) {
                child.position.y += 0.5; // رفع بمقدار نصف متر
                child.userData.offsetApplied = true;
                console.log('🔧 Clipping Fixed: Visual Mesh Offset Applied');
            }

            // تحديث الإطار الأحمر ليلاحق المجسم
            if (child.userData.helper) {
                child.userData.helper.update();
            }
        }
    });
}
