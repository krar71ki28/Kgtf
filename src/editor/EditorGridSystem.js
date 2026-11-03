import * as THREE from 'three';

export class EditorGridSystem {
    constructor(renderer, options = {}) {
        this.renderer = renderer;

        this.options = {
            size: 2000,
            divisions: 2000,
            majorDivisions: 200,
            background: 0x55585e,
            ...options
        };

        this.ground = null;
        this.minorGrid = null;
        this.majorGrid = null;
        this.axes = null;
    }

    init() {
        if (this.ground) return;

        const scene = this.renderer.scene;

        this.ground = new THREE.Mesh(
            new THREE.PlaneGeometry(
                this.options.size,
                this.options.size
            ),
            new THREE.MeshBasicMaterial({
                color: this.options.background
            })
        );

        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -0.03;
        this.ground.name = 'Editor Ground';
        scene.add(this.ground);

        this.minorGrid = new THREE.GridHelper(
            this.options.size,
            this.options.divisions,
            0x777b82,
            0x686c73
        );

        this.minorGrid.position.y = 0.001;
        this.minorGrid.name = 'Editor Minor Grid';
        this.minorGrid.material.transparent = true;
        this.minorGrid.material.opacity = 0.65;
        scene.add(this.minorGrid);

        this.majorGrid = new THREE.GridHelper(
            this.options.size,
            this.options.majorDivisions,
            0x9a9da3,
            0x858990
        );

        this.majorGrid.position.y = 0.002;
        this.majorGrid.name = 'Editor Major Grid';
        this.majorGrid.material.transparent = true;
        this.majorGrid.material.opacity = 0.9;
        scene.add(this.majorGrid);

        this.axes = new THREE.AxesHelper(10);
        this.axes.position.y = 0.01;
        this.axes.name = 'Editor World Axes';
        scene.add(this.axes);
    }

    dispose() {
        const scene = this.renderer.scene;

        for (const object of [
            this.ground,
            this.minorGrid,
            this.majorGrid,
            this.axes
        ]) {
            if (!object) continue;

            scene.remove(object);

            if (object.geometry) {
                object.geometry.dispose();
            }

            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        }

        this.ground = null;
        this.minorGrid = null;
        this.majorGrid = null;
        this.axes = null;
    }
}
