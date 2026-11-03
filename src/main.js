import * as THREE from "three";

import { Engine } from "./core/Engine.js";
import { Time } from "./core/Time.js";
import { Renderer } from "./rendering/Renderer.js";
import { SceneManager } from "./scene/SceneManager.js";
import { CameraSystem } from "./scene/CameraSystem.js";

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

    // Ground
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

    // Editor grid
    const grid = new THREE.GridHelper(
        100,
        100,
        0x505963,
        0x68727d
    );

    grid.position.y = 0.015;
    grid.material.transparent = true;
    grid.material.opacity = 0.48;
    grid.material.depthWrite = false;
    scene.add(grid);

    // Lighting
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

    // Initial cube
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

    // Engine update system
    const cameraUpdateSystem = {
        update() {
            cameraSystem.update();
        }
    };

    engine.registerSystem(cameraUpdateSystem);

    await engine.initialize();
    engine.start();

    time.start();

    // Camera resizing
    const cameraResizeObserver = new ResizeObserver(() => {
        cameraSystem.resize();
    });

    cameraResizeObserver.observe(viewport);

    // Add cube button
    addCubeButton?.addEventListener("click", () => {
        addCube();
    });

    // Play mode is not implemented yet
    if (playButton) {
        playButton.disabled = true;
        playButton.textContent = "قريباً";
        playButton.title = "Play Mode is under development";
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

    // Cleanup
    window.addEventListener("pagehide", async () => {
        disposed = true;

        cancelAnimationFrame(animationFrame);
        cameraResizeObserver.disconnect();

        await engine.stop();

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
