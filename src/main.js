import * as THREE from "three";

import { Engine } from "./core/Engine.js";
import { Time } from "./core/Time.js";
import { Renderer } from "./rendering/Renderer.js";
import { SceneManager } from "./scene/SceneManager.js";
import { CameraSystem } from "./scene/CameraSystem.js";
import { EditorGridSystem } from "./editor/EditorGridSystem.js";

async function startEngine() {
    const viewport = document.getElementById("viewport-container");
    const loading = document.getElementById("loading-message");
    const status = document.getElementById("engine-status");
    const fpsDisplay = document.getElementById("fps-counter");
    const addCubeButton = document.getElementById("add-cube");
    const playButton = document.getElementById("play-button");

    if (!viewport || !loading || !status || !fpsDisplay) {
        throw new Error("Required editor elements are missing");
    }

    const engine = new Engine();
    const time = new Time();
    const sceneManager = new SceneManager();

    const renderer = new Renderer(viewport);
    const cameraSystem = new CameraSystem(viewport);

    const scene = sceneManager.create("Main", {
        background: 0x91c5ed
    });

    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(200, 200),
        new THREE.MeshStandardMaterial({
            color: 0x858b92,
            roughness: 1,
            metalness: 0
        })
    );

    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.025;
    ground.name = "Ground";
    scene.add(ground);

    const gridSystem = new EditorGridSystem({
        size: 100,
        divisions: 100,
        majorEvery: 10,
        minorColor: 0x7b858f,
        majorColor: 0x535e69
    });

    scene.add(gridSystem.mesh);

    const hemisphereLight = new THREE.HemisphereLight(
        0xffffff,
        0x777d84,
        2
    );

    scene.add(hemisphereLight);

    const sunlight = new THREE.DirectionalLight(
        0xffffff,
        2.2
    );

    sunlight.position.set(8, 14, 10);
    scene.add(sunlight);

    function addCube() {
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({
                color: 0x438ee8,
                roughness: 0.55,
                metalness: 0.05
            })
        );

        cube.position.set(0, 0.5, 0);
        cube.name = "Cube";
        scene.add(cube);

        return cube;
    }

    addCube();

    engine.registerSystem({
        update() {
            cameraSystem.update();
        }
    });

    await engine.initialize();
    engine.start();

    time.start();

    const cameraResizeObserver = new ResizeObserver(() => {
        cameraSystem.resize();
    });

    cameraResizeObserver.observe(viewport);

    addCubeButton?.addEventListener("click", addCube);

    if (playButton) {
        playButton.disabled = true;
        playButton.textContent = "قريباً";
    }

    loading.remove();
    status.textContent = "ENGINE: RUNNING";

    let animationFrame = 0;
    let lastStatsUpdate = 0;
    let disposed = false;

    function animate(timestamp) {
        if (disposed) return;

        const deltaTime = time.update(timestamp);

        engine.update(deltaTime);

        renderer.render(
            sceneManager.activeScene,
            cameraSystem.camera
        );

        if (timestamp - lastStatsUpdate >= 500) {
            fpsDisplay.textContent = `FPS: ${time.fps}`;
            lastStatsUpdate = timestamp;
        }

        animationFrame = requestAnimationFrame(animate);
    }

    animationFrame = requestAnimationFrame(animate);

    window.addEventListener("pagehide", async () => {
        if (disposed) return;

        disposed = true;
        cancelAnimationFrame(animationFrame);
        cameraResizeObserver.disconnect();

        await engine.stop();

        gridSystem.dispose();
        cameraSystem.dispose();
        sceneManager.dispose();
        renderer.dispose();
    }, { once: true });
}

startEngine().catch((error) => {
    console.error("KGTF ENGINE startup failed:", error);

    const loading = document.getElementById("loading-message");
    const status = document.getElementById("engine-status");

    if (loading) {
        loading.textContent = "ENGINE ERROR — تحقق من Console";
    }

    if (status) {
        status.textContent = "ENGINE: ERROR";
    }
});
