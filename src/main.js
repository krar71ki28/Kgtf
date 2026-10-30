import { Engine } from './Engine.js';
import { Editor } from './Editor.js';
import { Player } from './Player.js';

if (window.location.search.includes('reset')) {
    localStorage.removeItem('kgtf_scene_final');
    localStorage.removeItem('kgtf_assets');
    localStorage.removeItem('kgtf_all_scenes');
    alert('تم مسح البيانات بنجاح!');
    window.location.href = window.location.pathname; 
}

const canvas = document.getElementById('viewport');
const engine = new Engine(canvas);
window.engine = engine;

const editor = new Editor(engine);
const player = new Player(engine);

let lastTime = performance.now();
function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    engine.update(dt);
    player.update(dt);
    engine.render();

    const fps = document.getElementById('fps');
    if (!window._fpsAcc) window._fpsAcc = 0;
    if (!window._frames) window._frames = 0;
    window._fpsAcc += dt; window._frames++;
    if (window._fpsAcc >= 0.5) {
        fps.innerText = Math.round(window._frames / window._fpsAcc);
        window._fpsAcc = 0; window._frames = 0;
    }
}
requestAnimationFrame(animate);
