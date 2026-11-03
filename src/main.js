import * as THREE from "three";

import { Engine } from "./core/Engine.js";
import { Time } from "./core/Time.js";
import { Renderer } from "./rendering/Renderer.js";
import { SceneManager } from "./scene/SceneManager.js";
import { CameraSystem } from "./scene/CameraSystem.js";
import { WorldSystem } from "./world/WorldSystem.js";
import { TerrainSystem } from "./terrain/TerrainSystem.js";
import { LightingSystem } from "./lighting/LightingSystem.js";
import { ObjectManager } from "./objects/ObjectManager.js";
import { TransformSystem } from "./editor/TransformSystem.js";
import { Serializer } from "./Serializer.js";

async function startEngine() {
    const $ = (id) => document.getElementById(id);

    const viewport = $("viewport-container");
    const loading = $("loading-message");
    const status = $("engine-status");
    const fpsDisplay = $("fps-counter");

    const addCubeButton = $("add-cube");
    const playButton = $("play-button");
    const saveSceneButton = $("save-scene");
    const loadSceneButton = $("load-scene");

    const moveButton = $("tool-move");
    const rotateButton = $("tool-rotate");
    const scaleButton = $("tool-scale");

    const settingsButton = $("world-settings-button");
    const settingsPanel = $("world-settings");
    const closeSettingsButton = $("close-world-settings");

    const worldSizeSelect = $("world-size");
    const groundVisibleInput = $("ground-visible");
    const gridVisibleInput = $("grid-visible");
    const axesVisibleInput = $("axes-visible");
    const worldSizeInfo = $("world-size-info");

    const lightingToggle = $("lighting-toggle");
    const lightingPanel = $("lighting-panel");
    const closeLighting = $("close-lighting");
    const sunElevationInput = $("sun-elevation");
    const sunAzimuthInput = $("sun-azimuth");
    const sunIntensityInput = $("sun-intensity");
    const ambientIntensityInput = $("ambient-intensity");
    const skyColorInput = $("sky-color");
    const fogEnabledInput = $("fog-enabled");
    const fogNearInput = $("fog-near");
    const fogFarInput = $("fog-far");

    const terrainToggle = $("terrain-toggle");
    const terrainPanel = $("terrain-panel");
    const closeTerrain = $("close-terrain");
    const terrainTool = $("terrain-tool");
    const terrainBrushSize = $("terrain-brush-size");
    const terrainBrushStrength = $("terrain-brush-strength");
    const terrainReset = $("terrain-reset");

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
        uniforms: {
            uSkyTint: { value: new THREE.Color(0xffffff) }
        },
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
            uniform vec3 uSkyTint;
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

                color *= uSkyTint;
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

    // Lighting System
    const lightingSystem = new LightingSystem(scene, skyMaterial);

    // Terrain System
    const terrainSystem = new TerrainSystem(scene, {
        size: 20,
        segments: 100
    });

    // Object and transform systems
    const objectManager = new ObjectManager(scene);

    const transformSystem = new TransformSystem(
        scene,
        cameraSystem.camera,
        renderer.renderer.domElement,
        cameraSystem.controls
    );

    const serializer = new Serializer(objectManager);

    let terrainMode = false;

    window.KGTF_EDITOR = {
        engine,
        objectManager,
        transformSystem,
        serializer,
        terrainSystem
    };

    function setTerrainMode(enabled) {
        terrainMode = enabled;

        if (terrainMode) {
            transformSystem.controls.detach();
        } else {
            transformSystem.syncSelection(objectManager.getSelected());
        }

        status.textContent = terrainMode
            ? "TERRAIN: SCULPT MODE"
            : "ENGINE: EDITOR MODE";
    }

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

        transformSystem.syncSelection(selected);

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

    // Transform toolbar
    function activateTool(mode, activeButton) {
        setTerrainMode(false);
        terrainPanel.hidden = true;

        transformSystem.setMode(mode);

        for (const button of [moveButton, rotateButton, scaleButton]) {
            button?.classList.toggle("active", button === activeButton);
        }
    }

    moveButton?.addEventListener("click", () => {
        activateTool("translate", moveButton);
    });

    rotateButton?.addEventListener("click", () => {
        activateTool("rotate", rotateButton);
    });

    scaleButton?.addEventListener("click", () => {
        activateTool("scale", scaleButton);
    });

    moveButton?.classList.add("active");

    // World settings
    settingsButton?.addEventListener("click", () => {
        settingsPanel.hidden = !settingsPanel.hidden;

        if (!settingsPanel.hidden) {
            outlinerPanel.hidden = true;
            lightingPanel.hidden = true;
            terrainPanel.hidden = true;
            setTerrainMode(false);
        }
    });

    closeSettingsButton?.addEventListener("click", () => {
        settingsPanel.hidden = true;
    });

    // Lighting panel
    lightingToggle?.addEventListener("click", () => {
        lightingPanel.hidden = !lightingPanel.hidden;

        if (!lightingPanel.hidden) {
            settingsPanel.hidden = true;
            outlinerPanel.hidden = true;
            terrainPanel.hidden = true;
            setTerrainMode(false);
        }
    });

    closeLighting?.addEventListener("click", () => {
        lightingPanel.hidden = true;
    });

    sunElevationInput?.addEventListener("input", () => {
        lightingSystem.setSunElevation(sunElevationInput.value);
        $("sun-elevation-value").textContent = sunElevationInput.value + "°";
    });

    sunAzimuthInput?.addEventListener("input", () => {
        lightingSystem.setSunAzimuth(sunAzimuthInput.value);
        $("sun-azimuth-value").textContent = sunAzimuthInput.value + "°";
    });

    sunIntensityInput?.addEventListener("input", () => {
        lightingSystem.setSunIntensity(sunIntensityInput.value);
        $("sun-intensity-value").textContent = sunIntensityInput.value;
    });

    ambientIntensityInput?.addEventListener("input", () => {
        lightingSystem.setAmbientIntensity(ambientIntensityInput.value);
        $("ambient-intensity-value").textContent = ambientIntensityInput.value;
    });

    skyColorInput?.addEventListener("input", () => {
        lightingSystem.setSkyColor(skyColorInput.value);
    });

    fogEnabledInput?.addEventListener("change", () => {
        lightingSystem.setFogEnabled(fogEnabledInput.checked);
    });

    function updateFogRange() {
        let near = Number(fogNearInput.value);
        let far = Number(fogFarInput.value);

        if (far <= near) {
            far = Math.min(500, near + 1);
            fogFarInput.value = String(far);
        }

        lightingSystem.setFogRange(near, far);
    }

    fogNearInput?.addEventListener("input", updateFogRange);
    fogFarInput?.addEventListener("input", updateFogRange);

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

    // Terrain tools
    terrainToggle?.addEventListener("click", () => {
        terrainPanel.hidden = !terrainPanel.hidden;

        if (!terrainPanel.hidden) {
            settingsPanel.hidden = true;
            lightingPanel.hidden = true;
            outlinerPanel.hidden = true;
            setTerrainMode(true);
        } else {
            setTerrainMode(false);
        }
    });

    closeTerrain?.addEventListener("click", () => {
        terrainPanel.hidden = true;
        setTerrainMode(false);
    });

    terrainBrushSize?.addEventListener("input", () => {
        $("terrain-brush-size-value").textContent =
            terrainBrushSize.value;
    });

    terrainBrushStrength?.addEventListener("input", () => {
        $("terrain-brush-strength-value").textContent =
            terrainBrushStrength.value;
    });

    terrainReset?.addEventListener("click", () => {
        terrainSystem.reset();
        status.textContent = "TERRAIN: RESET";
    });

    // Outliner
    outlinerToggle?.addEventListener("click", () => {
        outlinerPanel.hidden = !outlinerPanel.hidden;

        if (!outlinerPanel.hidden) {
            settingsPanel.hidden = true;
            lightingPanel.hidden = true;
            terrainPanel.hidden = true;
            setTerrainMode(false);
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

    // Viewport raycasting
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    let pointerStart = null;

    const selectionCanvas = renderer.renderer.domElement;

    function handlePointerDown(event) {
        if (event.target !== selectionCanvas) return;
        if (event.button !== undefined && event.button !== 0) return;

        if (transformSystem.isDragging || transformSystem.controls.axis !== null) {
            pointerStart = null;
            return;
        }

        pointerStart = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY
        };
    }

    function handlePointerUp(event) {
        if (!pointerStart) return;
        if (event.pointerId !== pointerStart.id) return;

        const start = pointerStart;
        pointerStart = null;

        if (transformSystem.isDragging) return;

        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;

        if (Math.hypot(dx, dy) > 7) return;

        const rect = selectionCanvas.getBoundingClientRect();

        if (!rect.width || !rect.height) return;

        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        cameraSystem.camera.updateMatrixWorld();
        raycaster.setFromCamera(pointer, cameraSystem.camera);

        // Terrain sculpting
        if (terrainMode) {
            const terrainHits = raycaster.intersectObject(
                terrainSystem.mesh,
                false
            );

            if (terrainHits.length === 0) return;

            const point = terrainHits[0].point;
            const radius = Number(terrainBrushSize?.value ?? 2);
            const strength = Number(terrainBrushStrength?.value ?? 0.5);
            const tool = terrainTool?.value ?? "raise";

            if (tool === "smooth") {
                terrainSystem.smoothAt(
                    point.x,
                    point.z,
                    radius,
                    strength
                );
            } else {
                const direction = tool === "lower" ? -1 : 1;

                terrainSystem.sculptAt(
                    point.x,
                    point.z,
                    radius,
                    strength * direction
                );
            }

            status.textContent = `TERRAIN: ${tool.toUpperCase()}`;
            return;
        }

        // Object selection
        const objects = objectManager
            .getAll()
            .map((item) => item.object);

        const intersections = raycaster.intersectObjects(objects, true);

        if (intersections.length === 0) {
            objectManager.clearSelection();
            return;
        }

        let target = intersections[0].object;

        while (target && !target.userData.editorObjectId) {
            target = target.parent;
        }

        if (target) {
            objectManager.select(target.userData.editorObjectId);
        }
    }

    function handlePointerCancel() {
        pointerStart = null;
    }

    viewport.addEventListener("pointerdown", handlePointerDown);
    viewport.addEventListener("pointerup", handlePointerUp);
    viewport.addEventListener("pointercancel", handlePointerCancel);

    engine.registerSystem({
        update() {
            cameraSystem.update();
        }
    });

    const { AnimationSystem } = await import("./animation/AnimationSystem.js");
    const animationSystem = new AnimationSystem(objectManager);
    const { AnimationStateMachine } = await import("./animation/AnimationStateMachine.js");
    const animationStateMachine = new AnimationStateMachine(animationSystem, objectManager);
    engine.registerSystem(animationStateMachine);
    engine.registerSystem(animationSystem);
    window.KGTF_EDITOR.animationSystem = animationSystem;
    window.KGTF_EDITOR.animationStateMachine = animationStateMachine;

    await engine.initialize();
    engine.start();

    time.start();

    const cameraResizeObserver = new ResizeObserver(() => {
        cameraSystem.resize();
    });

    cameraResizeObserver.observe(viewport);

    addCubeButton?.addEventListener("click", addCube);

    // Save scene
    saveSceneButton?.addEventListener("click", () => {
        try {
            serializer.download();
            status.textContent = "SCENE: EXPORTED";
        } catch (error) {
            console.error("Scene save failed:", error);
            status.textContent = "SCENE: SAVE ERROR";
        }
    });

    // Load scene
    const sceneFileInput = document.createElement("input");
    sceneFileInput.type = "file";
    sceneFileInput.accept = ".json,application/json";
    sceneFileInput.hidden = true;
    document.body.appendChild(sceneFileInput);

    loadSceneButton?.addEventListener("click", () => {
        sceneFileInput.value = "";
        sceneFileInput.click();
    });

    sceneFileInput.addEventListener("change", async () => {
        const file = sceneFileInput.files?.[0];
        if (!file) return;

        try {
            const count = await serializer.loadFile(file);
            status.textContent = `SCENE: LOADED (${count} OBJECTS)`;
        } catch (error) {
            console.error("Scene load failed:", error);
            status.textContent = "SCENE: LOAD ERROR";
            window.alert("تعذر تحميل المشهد. تأكد من صحة ملف JSON.");
        }
    });

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

        viewport.removeEventListener("pointerdown", handlePointerDown);
        viewport.removeEventListener("pointerup", handlePointerUp);
        viewport.removeEventListener("pointercancel", handlePointerCancel);

        await engine.stop();

        transformSystem.dispose();
        objectManager.dispose();
        worldSystem.dispose();
        terrainSystem.dispose();
        lightingSystem.dispose();
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
