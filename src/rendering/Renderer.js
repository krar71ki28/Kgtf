import * as THREE from 'three';

export class Renderer {
    constructor(options = {}) {
        this.options = options;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.container = null;

        this.onResize = this.onResize.bind(this);
    }

    init() {
        this.container = this.options.container
            ? document.querySelector(this.options.container)
            : document.body;

        if (!this.container) {
            throw new Error('Renderer container not found.');
        }

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(
            this.options.background ?? 0x20242c
        );

        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );

        this.camera.position.set(8, 6, 8);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: 'high-performance'
        });

        this.renderer.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, 1.5)
        );

        this.renderer.setSize(
            window.innerWidth,
            window.innerHeight
        );

        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.renderer.domElement.style.display = 'block';
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';

        this.container.appendChild(this.renderer.domElement);

        window.addEventListener('resize', this.onResize);
    }

    onResize() {
        if (!this.camera || !this.renderer) return;

        const width = this.container.clientWidth || window.innerWidth;
        const height = this.container.clientHeight || window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    update() {
        if (!this.renderer || !this.scene || !this.camera) return;

        this.renderer.render(this.scene, this.camera);
    }

    dispose() {
        window.removeEventListener('resize', this.onResize);

        if (this.renderer) {
            this.renderer.dispose();
            this.renderer.domElement.remove();
        }

        this.renderer = null;
        this.scene = null;
        this.camera = null;
        this.container = null;
    }
}
