import * as THREE from 'three';

// نستخدم دالة تتكرر لضمان بقاء الكاميرا فوق الأرض
setInterval(() => {
    const scene = window.scene || (window.engine && window.engine.scene);
    if (scene) {
        // البحث عن الكاميرا
        let camera = scene.getObjectByProperty('isCamera', true);
        
        // البحث عن اللاعب أو الكيوب
        const player = scene.getObjectByName('cube') || scene.getObjectByName('character') || scene.getObjectByName('Player');

        if (camera && player) {
            // إذا كانت الكاميرا منخفضة جداً، نرفعها قليلاً
            // (هذا يمنع الكاميرا من الدخول في التلة عندما يصعد اللاعب)
            if (camera.position.y < player.position.y + 1.5) {
                camera.position.y = player.position.y + 1.5;
            }
        }
    }
}, 100); // يفحص 10 مرات في الثانية
