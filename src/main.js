import { Engine } from './Engine.js?v=100';
import { Player } from './Player.js?v=100';

const canvas = document.getElementById('viewport');
const engine = new Engine(canvas);
const player = new Player(engine);

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
