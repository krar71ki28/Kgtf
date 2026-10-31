import { Engine } from './Engine.js';
import { Editor } from './Editor.js';
import { Player } from './Player.js';

const canvas = document.getElementById('viewport');
const engine = new Engine(canvas);
window.engine = engine;
const editor = new Editor(engine);
const player = new Player(engine);
window.editor = editor;
window.player = player;

let lastTime = performance.now();
let fpsAcc = 0, frames = 0;

function animate(now) {
    requestAnimationFrame(animate);
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    engine.update(dt);
    player.update(dt);
    engine.render();
    const fps = document.getElementById('fps');
    if (fps) {
        fpsAcc += dt; frames++;
        if (fpsAcc >= 0.5) {
            fps.innerText = Math.round(frames / fpsAcc);
            fpsAcc = 0; frames = 0;
        }
    }
}
requestAnimationFrame(animate);
