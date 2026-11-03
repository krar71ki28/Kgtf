import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class CameraController {
    constructor(renderer, inputManager = null) {
        this.renderer = renderer;
        this.inputManager = inputManager;
        this.controls = null;
        this.isInitialized = false;
    }

    init() {
        if (this.isInitialized) return;

        if (!this.renderer?.camera || !this.renderer?.renderer) {
            throw new Error(
                'CameraController requires an initialized Renderer.'
            );
        }

        this.controls = new OrbitControls(
            this.renderer.camera,
            this.renderer.renderer.domElement
        );

        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.06;

        this.controls.enablePan = true;
        this.controls.enableZoom = true;
        this.controls.enableRotate = true;

        this.controls.minDistance = 1;
        this.controls.maxDistance = 500;

        this.controls.target.set(0, 0, 0);
        this.controls.update();

        this.isInitialized = true;
    }

    update() {
        if (!this.controls) return;

        this.controls.update();
    }

    setTarget(x, y, z) {
        if (!this.controls) return;

        this.controls.target.set(x, y, z);
        this.controls.update();
    }

    setEnabled(enabled) {
        if (!this.controls) return;

        this.controls.enabled = Boolean(enabled);
    }

    dispose() {
        if (!this.controls) return;

        this.controls.dispose();
        this.controls = null;
        this.isInitialized = false;
    }
}
