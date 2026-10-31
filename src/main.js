import { Engine } from './Engine.js?v=999';
import { Editor } from './Editor.js?v=999';
import { Player } from './Player.js?v=999';

// لو صار أي خطأ، راح تطلع رسالة تنبهنا
window.addEventListener('error', (e) => {
    console.error('Global Error:', e.error);
    // alert('حدث خطأ: ' + e.message); // يفضل تشغيلها للتأكد
});

const canvas = document.getElementById('viewport');
if (!canvas) { throw new Error('Canvas not found!'); }

const engine = new Engine(canvas);
window.engine = engine;
const editor = new Editor(engine);
const player = new Player(engine);
window.editor = editor;
window.player = player;

let lastTime = performance.now();
let fpsAcc = 0, frames = 0;
const fpsEl = document.getElementById('fps');

function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    try {
        engine.update(dt);
        player.update(dt);
        engine.render();
    } catch (e) {
        console.error('Frame error:', e);
    }
    if (fpsEl) {
        fpsAcc += dt; frames++;
        if (fpsAcc >= 0.5) {
            fpsEl.innerText = Math.round(frames / fpsAcc);
            fpsAcc = 0; frames = 0;
        }
    }
}
requestAnimationFrame(animate);
