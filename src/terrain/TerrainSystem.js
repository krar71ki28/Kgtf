import * as THREE from "three";

export class TerrainSystem {
    constructor(scene, options = {}) {
        if (!scene?.isScene) {
            throw new TypeError("TerrainSystem requires a THREE.Scene");
        }

        this.scene = scene;
        this.size = this.validateSize(options.size ?? 20);
        this.segments = this.validateSegments(options.segments ?? 100);
        this.maxHeight = 30;

        this.geometry = null;
        this.material = null;
        this.mesh = null;

        this.create();
    }

    validateSize(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return 20;
        return THREE.MathUtils.clamp(number, 10, 200);
    }

    validateSegments(value) {
        const number = Math.round(Number(value));
        if (!Number.isFinite(number)) return 100;
        return THREE.MathUtils.clamp(number, 16, 256);
    }

    create() {
        this.geometry = new THREE.PlaneGeometry(
            this.size,
            this.size,
            this.segments,
            this.segments
        );

        this.geometry.rotateX(-Math.PI / 2);

        this.material = new THREE.MeshStandardMaterial({
            color: 0x718b55,
            roughness: 0.95,
            metalness: 0,
            side: THREE.FrontSide
        });

        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.name = "KGTF_Terrain";
        this.mesh.receiveShadow = true;
        this.mesh.castShadow = true;

        this.scene.add(this.mesh);
        this.geometry.computeVertexNormals();
        this.geometry.computeBoundingSphere();
    }

    getVertexIndex(x, z) {
        const half = this.size / 2;

        const ix = Math.round(
            ((x + half) / this.size) * this.segments
        );

        const iz = Math.round(
            ((z + half) / this.size) * this.segments
        );

        if (
            ix < 0 || ix > this.segments ||
            iz < 0 || iz > this.segments
        ) {
            return -1;
        }

        return iz * (this.segments + 1) + ix;
    }

    setHeightAt(x, z, height) {
        if (![x, z, height].every(Number.isFinite)) return false;

        const index = this.getVertexIndex(x, z);
        if (index < 0) return false;

        const positions = this.geometry.attributes.position;
        positions.setY(
            index,
            THREE.MathUtils.clamp(height, -this.maxHeight, this.maxHeight)
        );

        positions.needsUpdate = true;
        this.geometry.computeVertexNormals();
        this.geometry.computeBoundingSphere();

        return true;
    }

    sculptAt(x, z, radius, strength) {
        if (![x, z, radius, strength].every(Number.isFinite)) return 0;
        if (radius <= 0 || strength === 0) return 0;

        const positions = this.geometry.attributes.position;
        const half = this.size / 2;
        const step = this.size / this.segments;

        const minX = Math.max(0, Math.floor((x - radius + half) / step));
        const maxX = Math.min(this.segments, Math.ceil((x + radius + half) / step));
        const minZ = Math.max(0, Math.floor((z - radius + half) / step));
        const maxZ = Math.min(this.segments, Math.ceil((z + radius + half) / step));

        let changed = 0;

        for (let iz = minZ; iz <= maxZ; iz++) {
            for (let ix = minX; ix <= maxX; ix++) {
                const index = iz * (this.segments + 1) + ix;
                const vertexX = positions.getX(index);
                const vertexZ = positions.getZ(index);

                const distance = Math.hypot(vertexX - x, vertexZ - z);
                if (distance > radius) continue;

                const falloff = 1 - distance / radius;
                const height = positions.getY(index) + strength * falloff;

                positions.setY(
                    index,
                    THREE.MathUtils.clamp(height, -this.maxHeight, this.maxHeight)
                );

                changed++;
            }
        }

        if (changed > 0) this.updateGeometry();
        return changed;
    }

    smoothAt(x, z, radius, strength = 0.5) {
        if (![x, z, radius, strength].every(Number.isFinite)) return 0;
        if (radius <= 0) return 0;

        const positions = this.geometry.attributes.position;
        const original = positions.array.slice();
        const half = this.size / 2;
        const step = this.size / this.segments;

        const minX = Math.max(1, Math.floor((x - radius + half) / step));
        const maxX = Math.min(this.segments - 1, Math.ceil((x + radius + half) / step));
        const minZ = Math.max(1, Math.floor((z - radius + half) / step));
        const maxZ = Math.min(this.segments - 1, Math.ceil((z + radius + half) / step));

        let changed = 0;
        const amount = THREE.MathUtils.clamp(strength, 0, 1);

        for (let iz = minZ; iz <= maxZ; iz++) {
            for (let ix = minX; ix <= maxX; ix++) {
                const index = iz * (this.segments + 1) + ix;
                const vertexX = original[index * 3];
                const vertexZ = original[index * 3 + 2];

                if (Math.hypot(vertexX - x, vertexZ - z) > radius) continue;

                const average = (
                    original[(index - 1) * 3 + 1] +
                    original[(index + 1) * 3 + 1] +
                    original[(index - this.segments - 1) * 3 + 1] +
                    original[(index + this.segments + 1) * 3 + 1]
                ) / 4;

                const current = original[index * 3 + 1];
                positions.setY(index, THREE.MathUtils.lerp(current, average, amount));
                changed++;
            }
        }

        if (changed > 0) this.updateGeometry();
        return changed;
    }

    reset() {
        const positions = this.geometry.attributes.position;

        for (let i = 0; i < positions.count; i++) {
            positions.setY(i, 0);
        }

        this.updateGeometry();
    }

    updateGeometry() {
        this.geometry.attributes.position.needsUpdate = true;
        this.geometry.computeVertexNormals();
        this.geometry.computeBoundingSphere();
    }

    getData() {
        return {
            size: this.size,
            segments: this.segments,
            heights: Array.from(
                this.geometry.attributes.position.array
            ).filter((value, index) => index % 3 === 1)
        };
    }

    dispose() {
        if (this.mesh) this.scene.remove(this.mesh);
        this.geometry?.dispose();
        this.material?.dispose();

        this.mesh = null;
        this.geometry = null;
        this.material = null;
    }
}
