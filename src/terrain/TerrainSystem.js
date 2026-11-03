import * as THREE from "three";

export class TerrainSystem {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.size = THREE.MathUtils.clamp(options.size ?? 20, 10, 200);
        this.segments = THREE.MathUtils.clamp(options.segments ?? 100, 16, 256);
        this.maxHeight = options.maxHeight ?? 30;

        const geometry = new THREE.PlaneGeometry(
            this.size,
            this.size,
            this.segments,
            this.segments
        );

        geometry.rotateX(-Math.PI / 2);

        this.material = new THREE.MeshStandardMaterial({
            color: 0x777777,
            roughness: 0.95
        });

        this.mesh = new THREE.Mesh(geometry, this.material);
        this.mesh.name = "KGTF_Terrain";
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;
        this.scene.add(this.mesh);

        this.originalHeights = geometry.attributes.position.array.slice();
    }

    getVertexIndex(x, z) {
        const half = this.size / 2;
        const ix = Math.round(((x + half) / this.size) * this.segments);
        const iz = Math.round(((z + half) / this.size) * this.segments);

        if (ix < 0 || ix > this.segments || iz < 0 || iz > this.segments) {
            return -1;
        }

        return iz * (this.segments + 1) + ix;
    }

    setHeightAt(x, z, height) {
        const index = this.getVertexIndex(x, z);
        if (index < 0) return;

        const positions = this.mesh.geometry.attributes.position;
        positions.setY(index, THREE.MathUtils.clamp(height, -this.maxHeight, this.maxHeight));
        this.updateGeometry();
    }

    sculptAt(x, z, radius, strength) {
        const positions = this.mesh.geometry.attributes.position;
        const half = this.size / 2;

        for (let i = 0; i < positions.count; i++) {
            const vx = positions.getX(i);
            const vz = positions.getZ(i);
            const distance = Math.hypot(vx - x, vz - z);

            if (distance > radius) continue;

            const falloff = 1 - distance / radius;
            const height = positions.getY(i) + strength * falloff;
            positions.setY(i, THREE.MathUtils.clamp(height, -this.maxHeight, this.maxHeight));
        }

        this.updateGeometry();
    }

    smoothAt(x, z, radius, strength = 0.5) {
        const positions = this.mesh.geometry.attributes.position;
        const oldHeights = [];

        for (let i = 0; i < positions.count; i++) {
            oldHeights[i] = positions.getY(i);
        }

        const rowSize = this.segments + 1;

        for (let iz = 1; iz < this.segments; iz++) {
            for (let ix = 1; ix < this.segments; ix++) {
                const index = iz * rowSize + ix;
                const vx = positions.getX(index);
                const vz = positions.getZ(index);

                const distance = Math.hypot(vx - x, vz - z);
                if (distance > radius) continue;

                const average = (
                    oldHeights[index - 1] +
                    oldHeights[index + 1] +
                    oldHeights[index - rowSize] +
                    oldHeights[index + rowSize]
                ) / 4;

                const falloff = 1 - distance / radius;
                const amount = THREE.MathUtils.clamp(strength * falloff, 0, 1);
                positions.setY(index, THREE.MathUtils.lerp(oldHeights[index], average, amount));
            }
        }

        this.updateGeometry();
    }

    reset() {
        const positions = this.mesh.geometry.attributes.position;

        for (let i = 0; i < positions.count; i++) {
            positions.setY(i, this.originalHeights[i * 3 + 1]);
        }

        this.updateGeometry();
    }

    updateGeometry() {
        const geometry = this.mesh.geometry;
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        geometry.computeBoundingSphere();
        geometry.computeBoundingBox();
    }

    getData() {
        const positions = this.mesh.geometry.attributes.position;
        const heights = [];

        for (let i = 0; i < positions.count; i++) {
            heights.push(positions.getY(i));
        }

        return {
            size: this.size,
            segments: this.segments,
            heights
        };
    }

    dispose() {
        this.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.material.dispose();
    }
}
