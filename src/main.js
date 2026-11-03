import { Engine } from './Engine.js';
import { addDemoCubes } from './Objects.js';

const engine = new Engine(document.getElementById('game'));
engine.objects = addDemoCubes(engine.scene);

function loop() {
  requestAnimationFrame(loop);
  engine.render();
}
loop();
