import * as THREE from 'three';

export class Renderer {
    constructor(options = {}) {
        this.options = options;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.container = null;
        this.canvas = null;

        this.onResize = this.onResize.bind(this);
    }

    init() {
        this.container = document.querySelector(
            this.options.container ?? '#viewport-container'
        );

        this.canvas = document.querySelector(
            this.options.canvas ?? '#viewport'
        );

        if (!this.container || !this.canvas) {
            throw new Error('Renderer container or canvas not found.');
        }

        this.scene = new THREE.Scene();

        this.scene.background = new THREE.Color(
            this.options.background ?? 0x20242c
        );

        this.camera = new THREE.PerspectiveCamera(
            60,
            1,
            0.1,
            1000
        );

        this.camera.position.set(8, 6, 8);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });

        this.renderer.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, 1.5)
        );

        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.onResize();

        window.addEventListener('resize', this.onResize);
    }

    onResize() {
        if (!this.camera || !this.renderer || !this.container) {
            return;
        }

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        if (width <= 0 || height <= 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height, false);
    }

    update() {
        if (!this.renderer || !this.scene || !this.camera) {
            return;
        }

        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        window.removeEventListener('resize', this.onResize);

        if (this.renderer) {
            this.renderer.dispose();
        }

        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.container = null;
        this.canvas = null;
    }
}
