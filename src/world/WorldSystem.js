import * as THREE from "three";

export class WorldSystem {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.size = this.validateSize(options.size ?? 20);

        this.groundVisible = true;
        this.gridVisible = true;
        this.axesVisible = true;

        this.ground = null;
        this.grid = null;
        this.axes = null;

        this.createGround();
        this.createGrid();
        this.createAxes();
    }

    validateSize(size) {
        const value = Number(size);

        if (!Number.isFinite(value)) {
            return 20;
        }

        return THREE.MathUtils.clamp(
            Math.round(value),
            10,
            200
        );
    }

    createGround() {
        const geometry = new THREE.PlaneGeometry(
            this.size,
            this.size
        );

        const material = new THREE.MeshStandardMaterial({
            color: 0x858b92,
            roughness: 1,
            metalness: 0
        });

        this.ground = new THREE.Mesh(geometry, material);
        this.ground.name = "WorldGround";
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.position.y = -0.035;
        this.ground.receiveShadow = true;
        this.ground.visible = this.groundVisible;

        this.scene.add(this.ground);
    }

    createGrid() {
        this.grid = new THREE.GridHelper(
            this.size,
            this.size,
            0x526477,
            0x71808e
        );

        this.grid.name = "WorldGrid";
        this.grid.position.y = -0.015;
        this.grid.renderOrder = 1;

        this.grid.material.transparent = true;
        this.grid.material.opacity = 0.75;
        this.grid.material.depthWrite = false;

        this.grid.visible = this.gridVisible;

        this.scene.add(this.grid);
    }

    createAxes() {
        this.axes = new THREE.Group();
        this.axes.name = "WorldAxes";

        const half = this.size / 2;

        const xAxis = new THREE.Mesh(
            new THREE.BoxGeometry(this.size, 0.014, 0.035),
            new THREE.MeshBasicMaterial({
                color: 0xd65c5c,
                depthWrite: false
            })
        );

        xAxis.name = "XAxis";
        xAxis.position.set(0, 0.006, 0);

        const zAxis = new THREE.Mesh(
            new THREE.BoxGeometry(0.035, 0.014, this.size),
            new THREE.MeshBasicMaterial({
                color: 0x4d91d8,
                depthWrite: false
            })
        );

        zAxis.name = "ZAxis";
        zAxis.position.set(0, 0.006, 0);

        this.axes.add(xAxis, zAxis);
        this.axes.visible = this.axesVisible;

        this.scene.add(this.axes);
    }

    setSize(size) {
        const nextSize = this.validateSize(size);

        if (nextSize === this.size) {
            return this.size;
        }

        this.size = nextSize;

        this.removeGround();
        this.removeGrid();
        this.removeAxes();

        this.createGround();
        this.createGrid();
        this.createAxes();

        return this.size;
    }

    setGroundVisible(visible) {
        this.groundVisible = Boolean(visible);

        if (this.ground) {
            this.ground.visible = this.groundVisible;
        }
    }

    setGridVisible(visible) {
        this.gridVisible = Boolean(visible);

        if (this.grid) {
            this.grid.visible = this.gridVisible;
        }
    }

    setAxesVisible(visible) {
        this.axesVisible = Boolean(visible);

        if (this.axes) {
            this.axes.visible = this.axesVisible;
        }
    }

    removeGround() {
        if (!this.ground) return;

        this.scene.remove(this.ground);
        this.ground.geometry.dispose();
        this.ground.material.dispose();
        this.ground = null;
    }

    removeGrid() {
        if (!this.grid) return;

        this.scene.remove(this.grid);
        this.grid.geometry.dispose();
        this.grid.material.dispose();
        this.grid = null;
    }

    removeAxes() {
        if (!this.axes) return;

        this.scene.remove(this.axes);

        this.axes.traverse((object) => {
            if (!object.isMesh) return;

            object.geometry.dispose();
            object.material.dispose();
        });

        this.axes = null;
    }

    dispose() {
        this.removeGround();
        this.removeGrid();
        this.removeAxes();
    }
}
