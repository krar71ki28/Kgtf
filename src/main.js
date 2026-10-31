import { Engine } from './Engine.js';
import { Editor } from './Editor.js';
import { Player } from './Player.js';

const canvas = document.getElementById('viewport');
const engine = new Engine(canvas);
const editor = new Editor(engine);
const player = new Player(engine);

function animate() {
    requestAnimationFrame(animate);
    engine.update();
    player.update();
    engine.render();
}
animate();
