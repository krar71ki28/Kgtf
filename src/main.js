import { Engine } from './core/Engine.js';
import { Renderer } from './rendering/Renderer.js';
import { SceneManager } from './scene/SceneManager.js';
import { ObjectFactory } from './objects/ObjectFactory.js';
import { InputManager } from './input/InputManager.js';
import { CameraController } from './editor/CameraController.js';
import { EditorGridSystem } from './editor/EditorGridSystem.js';
import { TerrainSystem } from './terrain/TerrainSystem.js';
import { TerrainSculpt } from './terrain/TerrainSculpt.js';
import { SkySystem } from './environment/SkySystem.js';

const engine = new Engine();

const renderer = new Renderer({
    container: '#viewport-container',
    canvas: '#viewport',
    background: 0x383838
});

const sceneManager = new SceneManager(renderer);
const objectFactory = new ObjectFactory(sceneManager);

let input = null;

const cameraController = new CameraController(renderer);
const editorGrid = new EditorGridSystem(renderer);
const terrain = new TerrainSystem(sceneManager);
const sculpt = new TerrainSculpt(terrain);
const sky = new SkySystem(renderer);

const worldSystem = {
    init() {
        renderer.init();
        sceneManager.init();

        input = new InputManager(renderer.canvas);
        input.init();

        renderer.camera.position.set(12, 10, 12);
        renderer.camera.lookAt(0, 0, 0);

        cameraController.init();
        editorGrid.init();

        objectFactory.create('cube', {
            name: 'First Cube',
            position: { x: 0, y: 0.5, z: 0 },
            color: 0x4f9cff
        });
    },

    update() {
        cameraController.update();
        renderer.update();
    },

    dispose() {
        cameraController.dispose();

        if (input) {
            input.dispose();
            input = null;
        }

        editorGrid.dispose();
        terrain.dispose();
        sky.dispose();
        sceneManager.dispose();
        renderer.dispose();
    }
};

engine.registerSystem(worldSystem);

engine.start().catch(error => {
    console.error('KGTF ENGINE startup failed:', error);
});

window.KGTF = {
    engine,
    renderer,
    sceneManager,
    objectFactory,
    cameraController,
    editorGrid,
    terrain,
    sculpt,
    sky,
    get input() {
        return input;
    }
};

window.addEventListener('beforeunload', () => {
    engine.stop().catch(console.error);
}, { once: true });
