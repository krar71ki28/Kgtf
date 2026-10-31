const debugBox = document.getElementById('debug-overlay');
function showError(msg) {
    if (debugBox) {
        debugBox.style.display = 'block';
        debugBox.innerHTML += `<div>⚠️ ${msg}</div>`;
    }
}

window.addEventListener('error', (e) => {
    showError(e.message || 'Error loading modules');
});

import { Engine } from './Engine.js?v=888';
import { Editor } from './Editor.js?v=888';
import { Player } from './Player.js?v=888';

try {
    const canvas = document.getElementById('viewport');
    if (!canvas) throw new Error('Canvas element not found!');

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
        } catch (err) {
            console.error('Loop Error:', err);
            // نطبع الخطأ مرة وحدة بس عشان ما يعلق المتصفح
            if(!window._loopErrorShown) {
                showError('Loop Error: ' + err.message);
                window._loopErrorShown = true;
            }
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

} catch (err) {
    console.error(err);
    showError('Init Error: ' + err.message);
}
