import { Engine } from './Engine.js?v=999';
import { Player } from './Player.js?v=999';

const canvas = document.getElementById('viewport');
const engine = new Engine(canvas);
const player = new Player(engine);

// ربط أزرار الإضافة
document.getElementById('btn-add-cube').onclick = () => {
    const cube = engine.createObject('cube');
    if (cube) {
        cube.position.x = (Math.random() - 0.5) * 10;
        cube.position.z = (Math.random() - 0.5) * 10;
    }
};

document.getElementById('btn-add-character').onclick = () => {
    engine.createObject('character');
};

document.getElementById('btn-clear-scene').onclick = () => {
    engine.clearScene();
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
