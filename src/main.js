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
        background: 0x9dbbd3
    });

    scene.fog = new THREE.Fog(
        0xb7ccdc,
        100,
        320
    );

    // Sky dome
    const skyGeometry = new THREE.SphereGeometry(
        900,
        32,
        16
    );

    const skyMaterial = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        vertexShader: `
            varying vec3 vWorldDirection;

            void main() {
                vec4 worldPosition =
                    modelMatrix * vec4(position, 1.0);

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

    const sky = new THREE.Mesh(
        skyGeometry,
        skyMaterial
    );

    sky.name = "EditorSky";
    sky.renderOrder = -10;
    scene.add(sky);

    // Ground
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(1000, 1000),
        new THREE.MeshStandardMaterial({
            color: 0x777f87,
            roughness: 1,
            metalness: 0
        })
    );

    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.035;
    ground.name = "EditorGround";
    ground.receiveShadow = true;
    scene.add(ground);

    // Editor grid
    const gridSystem = new EditorGridSystem({
        size: 200,
        divisions: 100,
        majorEvery: 10,
        minorColor: 0x687582,
        majorColor: 0x465563
    });

    scene.add(gridSystem.mesh);

    // World axes
    const axes = new THREE.Group();
    axes.name = "WorldAxes";

    const xAxis = new THREE.Mesh(
        new THREE.BoxGeometry(14, 0.012, 0.035),
        new THREE.MeshBasicMaterial({
            color: 0xd65c5c
        })
    );

    xAxis.position.set(7, 0.025, 0);

    const zAxis = new THREE.Mesh(
        new THREE.BoxGeometry(0.035, 0.012, 14),
        new THREE.MeshBasicMaterial({
            color: 0x4d91d8
        })
    );

    zAxis.position.set(0, 0.025, 7);

    axes.add(xAxis, zAxis);
    scene.add(axes);

    // Lighting
    const hemisphereLight = new THREE.HemisphereLight(
        0xe5f1ff,
        0x60666d,
        1.7
    );

    scene.add(hemisphereLight);

    const sunlight = new THREE.DirectionalLight(
        0xfff3df,
        2.5
    );

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

    // Object creation
    function addCube() {
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({
                color: 0x438ee8,
                roughness: 0.48,
                metalness: 0.04
            })
        );

        cube.position.set(0, 0.5, 0);
        cube.name = "Cube";
        cube.castShadow = true;
        cube.receiveShadow = true;

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

        skyGeometry.dispose();
        skyMaterial.dispose();
        ground.geometry.dispose();
        ground.material.dispose();

        axes.traverse((object) => {
            if (object.isMesh) {
                object.geometry.dispose();
                object.material.dispose();
            }
        });
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
