import { Engine } from './Engine.js?v=999';
import { Player } from './Player.js?v=999';
import { Serializer } from './Serializer.js?v=1000';
import { Physics } from './Physics.js?v=1000';

const canvas = document.getElementById('viewport');
const engine = new Engine(canvas);
const player = new Player(engine);
const physics = new Physics(engine);

// إضافة المكعبات
document.getElementById('btn-add-cube').onclick = () => {
    const cube = engine.createObject('cube');

    if (cube) {
        cube.position.x = (Math.random() - 0.5) * 10;
        cube.position.z = (Math.random() - 0.5) * 10;
    }
};

// إضافة شخصية
document.getElementById('btn-add-character').onclick = () => {
    engine.createObject('character');
};

// مسح المشهد
document.getElementById('btn-clear-scene').onclick = () => {
    engine.clearScene();
};

// حفظ المشهد
document.getElementById('btn-save-scene').onclick = () => {
    try {
        Serializer.downloadScene(engine);
        alert('تم تجهيز ملف المشهد للحفظ');
    } catch (error) {
        console.error(error);
        alert('حدث خطأ أثناء الحفظ');
    }
};

// اختيار ملف التحميل
const fileInput = document.getElementById('scene-file-input');

document.getElementById('btn-load-scene').onclick = () => {
    fileInput.click();
};

// تحميل المشهد
fileInput.onchange = async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    const jsonData = await file.text();
    const success = Serializer.loadScene(engine, jsonData);

    if (success) {
        alert('تم تحميل المشهد بنجاح');
    } else {
        alert('تعذر تحميل المشهد');
    }

    fileInput.value = '';
};

// مشهد جديد
document.getElementById('btn-new-scene').onclick = () => {
    if (confirm('إنشاء مشهد جديد؟ سيتم حذف المجسمات الحالية.')) {
        engine.clearScene();
    }
};

let lastTime = performance.now();

function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    physics.update(dt);
    engine.update(dt);
    player.update(dt);
    engine.render();
}

animate();
