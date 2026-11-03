import * as THREE from "three";

import { Engine } from "./core/Engine.js";
import { Time } from "./core/Time.js";
import { Renderer } from "./rendering/Renderer.js";
import { SceneManager } from "./scene/SceneManager.js";
import { CameraSystem } from "./scene/CameraSystem.js";
import { WorldSystem } from "./world/WorldSystem.js";
import { ObjectManager } from "./objects/ObjectManager.js";

async function startEngine() {
    const $ = (id) => document.getElementById(id);

    const viewport = $("viewport-container");
    const loading = $("loading-message");
    const status = $("engine-status");
    const fpsDisplay = $("fps-counter");

    const addCubeButton = $("add-cube");
    const playButton = $("play-button");

    const settingsButton = $("world-settings-button");
    const settingsPanel = $("world-settings");
    const closeSettingsButton = $("close-world-settings");

    const worldSizeSelect = $("world-size");
    const groundVisibleInput = $("ground-visible");
    const gridVisibleInput = $("grid-visible");
    const axesVisibleInput = $("axes-visible");
    const worldSizeInfo = $("world-size-info");

    const outlinerToggle = $("outliner-toggle");
    const outlinerPanel = $("outliner-panel");
    const closeOutliner = $("close-outliner");
    const objectList = $("object-list");
    const objectNameInput = $("object-name");
    const renameObjectButton = $("rename-object");
    const deleteObjectButton = $("delete-object");
    const objectCount = $("object-count");

    if (!viewport || !loading || !status || !fpsDisplay) {
        throw new Error("Required editor elements are missing");
    }

    const engine = new Engine();
    const time = new Time();
    const sceneManager = new SceneManager();

    const renderer = new Renderer(viewport);
    const cameraSystem = new CameraSystem(viewport);

    const scene = sceneManager.create("Main", {
        background: 0x9dbbd3
    });

    scene.fog = new THREE.Fog(0xb7ccdc, 100, 320);

    // Editor sky
    const skyGeometry = new THREE.SphereGeometry(900, 32, 16);

    const skyMaterial = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: `
            varying vec3 vWorldDirection;

            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldDirection = normalize(worldPosition.xyz);

                gl_Position =
                    projectionMatrix *
                    modelViewMatrix *
                    vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            varying vec3 vWorldDirection;

            void main() {
                float height = normalize(vWorldDirection).y;

                vec3 horizon = vec3(0.78, 0.86, 0.92);
                vec3 middle = vec3(0.43, 0.65, 0.83);
                vec3 zenith = vec3(0.20, 0.39, 0.62);

                vec3 color = mix(
                    horizon,
                    middle,
                    smoothstep(-0.12, 0.28, height)
                );

                color = mix(
                    color,
                    zenith,
                    smoothstep(0.28, 0.95, height)
                );

                gl_FragColor = vec4(color, 1.0);
            }
        `
    });

    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    sky.name = "EditorSky";
    sky.renderOrder = -10;
    scene.add(sky);

    // World
    const worldSystem = new WorldSystem(scene, {
        size: 20
    });

    // Lighting
    const hemisphereLight = new THREE.HemisphereLight(
        0xe5f1ff,
        0x60666d,
        1.7
    );
    scene.add(hemisphereLight);

    const sunlight = new THREE.DirectionalLight(0xfff3df, 2.5);
    sunlight.position.set(12, 20, 10);
    sunlight.castShadow = true;

    sunlight.shadow.mapSize.set(1024, 1024);
    sunlight.shadow.camera.left = -25;
    sunlight.shadow.camera.right = 25;
    sunlight.shadow.camera.top = 25;
    sunlight.shadow.camera.bottom = -25;
    sunlight.shadow.camera.near = 0.5;
    sunlight.shadow.camera.far = 70;
    sunlight.shadow.bias = -0.0002;
    sunlight.shadow.normalBias = 0.025;

    scene.add(sunlight);

    // Object management
    const objectManager = new ObjectManager(scene);

    function renderOutliner() {
        if (!objectList) return;

        const items = objectManager.getAll();
        const selected = objectManager.getSelected();

        objectList.replaceChildren();

        for (const item of items) {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "object-row";

            if (item.object === selected) {
                button.classList.add("selected");
            }

            const icon = document.createElement("span");
            icon.className = "object-type";
            icon.textContent = "◆";

            const name = document.createElement("span");
            name.textContent = item.name;

            button.append(icon, name);

            button.addEventListener("click", () => {
                objectManager.select(item.id);
            });

            objectList.append(button);
        }

        if (objectCount) {
            objectCount.textContent = `OBJECTS: ${items.length}`;
        }

        if (objectNameInput) {
            objectNameInput.value = selected?.name ?? "";
            objectNameInput.disabled = !selected;
        }

        if (renameObjectButton) {
            renameObjectButton.disabled = !selected;
        }

        if (deleteObjectButton) {
            deleteObjectButton.disabled = !selected;
        }
    }

    objectManager.onChange = renderOutliner;

    function addCube() {
        return objectManager.createCube();
    }

    // Initial object
    addCube();

    // World settings
    settingsButton?.addEventListener("click", () => {
        settingsPanel.hidden = !settingsPanel.hidden;
        if (!settingsPanel.hidden && outlinerPanel) {
            outlinerPanel.hidden = true;
        }
    });

    closeSettingsButton?.addEventListener("click", () => {
        settingsPanel.hidden = true;
    });

    worldSizeSelect?.addEventListener("change", () => {
        const size = worldSystem.setSize(worldSizeSelect.value);

        if (worldSizeInfo) {
            worldSizeInfo.textContent = `WORLD SIZE: ${size} × ${size}`;
        }
    });

    groundVisibleInput?.addEventListener("change", () => {
        worldSystem.setGroundVisible(groundVisibleInput.checked);
    });

    gridVisibleInput?.addEventListener("change", () => {
        worldSystem.setGridVisible(gridVisibleInput.checked);
    });

    axesVisibleInput?.addEventListener("change", () => {
        worldSystem.setAxesVisible(axesVisibleInput.checked);
    });

    // Outliner
    outlinerToggle?.addEventListener("click", () => {
        outlinerPanel.hidden = !outlinerPanel.hidden;

        if (!outlinerPanel.hidden && settingsPanel) {
            settingsPanel.hidden = true;
        }
    });

    closeOutliner?.addEventListener("click", () => {
        outlinerPanel.hidden = true;
    });

    renameObjectButton?.addEventListener("click", () => {
        const selected = objectManager.getSelected();

        if (!selected || !objectNameInput) return;

        const id = selected.userData.editorObjectId;
        objectManager.rename(id, objectNameInput.value);
    });

    objectNameInput?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            renameObjectButton?.click();
            objectNameInput.blur();
        }
    });

    deleteObjectButton?.addEventListener("click", () => {
        objectManager.removeSelected();
    });

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

        objectManager.dispose();
        worldSystem.dispose();
        cameraSystem.dispose();
        sceneManager.dispose();
        renderer.dispose();

        skyGeometry.dispose();
        skyMaterial.dispose();
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
