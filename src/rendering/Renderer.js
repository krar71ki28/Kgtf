import * as THREE from "three";

export class Renderer {
    constructor(container) {
        if (!container) {
            throw new Error("Renderer requires a viewport container");
        }

        this.container = container;

        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
            powerPreference: "high-performance"
        });

        this.renderer.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, 1.75)
        );

        this.renderer.setSize(
            container.clientWidth || 1,
            container.clientHeight || 1
        );

        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1;

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.container.appendChild(this.renderer.domElement);

        this.resizeObserver = new ResizeObserver(() => {
            this.resize();
        });

        this.resizeObserver.observe(this.container);
    }

    resize() {
        const width = Math.max(1, this.container.clientWidth);
        const height = Math.max(1, this.container.clientHeight);

        this.renderer.setSize(width, height, false);
        this.renderer.setPixelRatio(
            Math.min(window.devicePixelRatio || 1, 1.75)
        );
    }

    render(scene, camera) {
        this.renderer.render(scene, camera);
    }

    dispose() {
        this.resizeObserver?.disconnect();
        this.renderer.dispose();
        this.renderer.domElement.remove();
    }
}
