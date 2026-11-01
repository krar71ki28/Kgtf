import { Engine } from './Engine.js?v=1000';
import { Editor } from './Editor.js?v=1000';
import { Player } from './Player.js?v=1000';

const canvas = document.getElementById('viewport');
const engine = new Engine(canvas);
const editor = new Editor(engine);
const player = new Player(engine);

let lastTime = performance.now();
let fpsAcc = 0, frames = 0;
const fpsEl = document.getElementById('fps');

function animate() {
    requestAnimationFrame(animate);
    const now = performance.now(); 
    const dt = Math.min((now - lastTime) / 1000, 0.1); 
    lastTime = now;

    try {
        engine.update(dt);
        player.update(dt);
        engine.render();
    } catch (e) {
        console.error(e);
    }

    fpsAcc += dt; frames++; 
    if (fpsAcc >= 0.5) { fpsEl.innerText = Math.round(frames / fpsAcc); fpsAcc = 0; frames = 0; }
}

// إخفاء رسالة التحميل إن وجدت
setTimeout(() => { 
    const tag = document.getElementById('version-tag'); 
    if(tag) tag.style.display = 'none'; 
}, 1000);

animate();
