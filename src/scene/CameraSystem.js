import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export class CameraSystem {
    constructor(container, options = {}) {
        if (!container) {
            throw new Error("CameraSystem requires a viewport container");
        }

        this.container = container;

        const width = Math.max(container.clientWidth, 1);
        const height = Math.max(container.clientHeight, 1);

        this.camera = new THREE.PerspectiveCamera(
            options.fov ?? 50,
            width / height,
            options.near ?? 0.1,
            options.far ?? 2000
        );

        this.camera.position.set(
            options.x ?? 8,
            options.y ?? 7,
            options.z ?? 10
        );

        this.controls = new OrbitControls(
            this.camera,
            container
        );

        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.enablePan = true;
        this.controls.enableZoom = true;

        this.controls.minDistance = 2;
        this.controls.maxDistance = 100;

        this.controls.target.set(0, 1, 0);
        this.controls.update();
    }

    update() {
        this.controls.update();
    }

    resize() {
        const width = Math.max(this.container.clientWidth, 1);
        const height = Math.max(this.container.clientHeight, 1);

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }

    setPosition(x, y, z) {
        this.camera.position.set(x, y, z);
        this.controls.update();
    }

    focus(target) {
        if (!target || !target.isVector3) {
            throw new TypeError("Focus target must be a THREE.Vector3");
        }

        this.controls.target.copy(target);
        this.controls.update();
    }

    dispose() {
        this.controls.dispose();
    }
}
