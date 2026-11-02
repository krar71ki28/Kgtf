import { Engine } from './Engine.js?v=999';
import { Player } from './Player.js?v=999';
import { Serializer } from './Serializer.js?v=1000';

const canvas = document.getElementById('viewport');
const engine = new Engine(canvas);
const player = new Player(engine);

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

// مسح المجسمات
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
        alert('حدث خطأ أثناء حفظ المشهد');
    }
};

// فتح نافذة اختيار ملف المشهد
const fileInput = document.getElementById('scene-file-input');

document.getElementById('btn-load-scene').onclick = () => {
    fileInput.click();
};

// تحميل المشهد
fileInput.onchange = async (event) => {
    const file = event.target.files[0];

    if (!file) return;

    try {
        const jsonData = await file.text();
        const success = Serializer.loadScene(engine, jsonData);

        if (success) {
            alert('تم تحميل المشهد بنجاح');
        } else {
            alert('تعذر تحميل المشهد. تحقق من ملف JSON');
        }
    } catch (error) {
        console.error(error);
        alert('ملف المشهد غير صالح');
    }

    fileInput.value = '';
};

// إنشاء مشهد جديد
document.getElementById('btn-new-scene').onclick = () => {
    const confirmed = confirm('هل تريد إنشاء مشهد جديد؟ سيتم حذف المجسمات الحالية.');

    if (confirmed) {
        engine.clearScene();
    }
};

let lastTime = performance.now();

function animate() {
    requestAnimationFrame(animate);

    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    engine.update(dt);
    player.update(dt);
    engine.render();
}

animate();
