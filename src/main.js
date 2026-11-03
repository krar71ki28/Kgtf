import * as THREE from 'three';

import { Engine } from './core/Engine.js';
import { Renderer } from './rendering/Renderer.js';
import { SceneManager } from './scene/SceneManager.js';
import { ObjectFactory } from './objects/ObjectFactory.js';
import { InputManager } from './input/InputManager.js';
import { CameraController } from './editor/CameraController.js';
import { TerrainSystem } from './terrain/TerrainSystem.js';
import { SkySystem } from './environment/SkySystem.js';

const viewport = document.querySelector('#viewport-container');

if (!viewport) {
    throw new Error('Viewport container not found.');
}

const engine = new Engine();

const renderer = new Renderer({
    container: '#viewport-container',
    canvas: '#viewport'
});

const sceneManager = new SceneManager(renderer);
const objectFactory = new ObjectFactory(sceneManager);

let input = null;

const cameraController = new CameraController(renderer);
const terrain = new TerrainSystem(sceneManager);
const sky = new SkySystem(renderer);

const worldSystem = {
    init() {
        renderer.init();
        sceneManager.init();

        input = new InputManager(renderer.canvas);
        input.init();

        renderer.camera.position.set(110, 85, 110);
        renderer.camera.lookAt(0, 0, 0);

        cameraController.init();

        sky.init();
        terrain.init();

        const cube = objectFactory.create('cube', {
            name: 'First Cube',
            position: { x: 0, y: 2, z: 0 },
            color: 0x4f9cff
        });

        cube.castShadow = true;
    },

    update() {
        cameraController.update();
        sky.update();
        renderer.update();
    },

    dispose() {
        cameraController.dispose();

        if (input) {
            input.dispose();
            input = null;
        }

        terrain.dispose();
        sky.dispose();

        sceneManager.dispose();
        renderer.dispose();
    }
};

engine.registerSystem(worldSystem);

async function startEngine() {
    try {
        await engine.start();
        console.log('KGTF ENGINE started successfully.');
    } catch (error) {
        console.error('KGTF ENGINE startup failed:', error);
    }
}

startEngine();

window.KGTF = {
    engine,
    renderer,
    sceneManager,
    objectFactory,
    get input() {
        return input;
    },
    cameraController,
    terrain,
    sky
};

window.addEventListener('beforeunload', () => {
    engine.stop().catch(console.error);
}, { once: true });
