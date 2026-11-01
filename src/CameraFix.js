import * as THREE from 'three';

// ننتظر تحميل المشهد ثم نجبر الكاميرا على الارتفاع
setInterval(() => {
    const scene = window.scene || (window.engine && window.engine.scene);
    if (scene) {
        const camera = scene.getObjectByProperty('isCamera', true);
        if (camera && !camera.userData.fixed) {
            camera.position.set(0, 15, 15); // ارتفاع 15 متر
            camera.lookAt(0, 0, 0);         // النظر للمركز
            camera.userData.fixed = true;
            console.log("📷 Camera Forced to Bird's Eye View");
        }
    }
}, 1000);
