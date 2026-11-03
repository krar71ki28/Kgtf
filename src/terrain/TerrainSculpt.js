import * as THREE from 'three';

export class TerrainSculpt {
    constructor(terrain) {
        this.terrain = terrain;

        this.brush = {
            radius: 5,
            strength: 2,
            mode: 'raise',
            targetHeight: 0
        };
    }

    setBrush(options = {}) {
        const next = {
            ...this.brush,
            ...options
        };

        if (!Number.isFinite(next.radius) ||
            next.radius <= 0) {
            throw new Error('Brush radius must be positive.');
        }

        if (!Number.isFinite(next.strength) ||
            next.strength < 0) {
            throw new Error('Brush strength must be non-negative.');
        }

        if (![
            'raise',
            'lower',
            'smooth',
            'flatten'
        ].includes(next.mode)) {
            throw new Error('Invalid sculpt mode.');
        }

        if (!Number.isFinite(next.targetHeight)) {
            throw new Error('Invalid target height.');
        }

        this.brush = next;
    }

    apply(x, z, deltaTime = 1 / 60) {
        const terrain = this.terrain;

        if (!terrain?.mesh || !terrain.data) {
            throw new Error('Terrain is not initialized.');
        }

        if (
            !Number.isFinite(x) ||
            !Number.isFinite(z) ||
            !Number.isFinite(deltaTime) ||
            deltaTime < 0
        ) {
            throw new Error('Invalid sculpt position or time.');
        }

        const geometry = terrain.mesh.geometry;
        const positions = geometry.attributes.position;
        const heights = terrain.data.heights;

        const segments = terrain.data.segments;
        const size = terrain.data.size;
        const spacing = size / segments;

        const centerX = Math.floor(
            (x + size / 2) / spacing
        );

        const centerZ = Math.floor(
            (z + size / 2) / spacing
        );

        const range = Math.ceil(
            this.brush.radius / spacing
        );

        const original = heights.slice();
        const strength = this.brush.strength *
            Math.min(deltaTime * 60, 2);

        const flattenTarget = this.brush.targetHeight;

        for (
            let row = Math.max(0, centerZ - range);
            row <= Math.min(segments, centerZ + range);
            row++
        ) {
            for (
                let col = Math.max(0, centerX - range);
                col <= Math.min(segments, centerX + range);
                col++
            ) {
                const index = row * (segments + 1) + col;

                const worldX = col * spacing - size / 2;
                const worldZ = row * spacing - size / 2;

                const distance = Math.hypot(
                    worldX - x,
                    worldZ - z
                );

                if (distance > this.brush.radius) continue;

                const falloff = 1 - smoothstep(
                    0,
                    this.brush.radius,
                    distance
                );

                const influence = falloff * falloff;

                if (this.brush.mode === 'raise') {
                    heights[index] += strength * influence;
                }

                if (this.brush.mode === 'lower') {
                    heights[index] -= strength * influence;
                }

                if (this.brush.mode === 'flatten') {
                    heights[index] +=
                        (flattenTarget - heights[index]) *
                        Math.min(1, strength * influence);
                }

                if (this.brush.mode === 'smooth') {
                    let total = 0;
                    let count = 0;

                    for (let dz = -1; dz <= 1; dz++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            const nx = col + dx;
                            const nz = row + dz;

                            if (
                                nx < 0 || nx > segments ||
                                nz < 0 || nz > segments
                            ) continue;

                            total += original[
                                nz * (segments + 1) + nx
                            ];

                            count++;
                        }
                    }

                    const average = total / count;

                    heights[index] +=
                        (average - heights[index]) *
                        Math.min(1, strength * influence);
                }
            }
        }

        for (let i = 0; i < positions.count; i++) {
            positions.setZ(i, heights[i]);
        }

        positions.needsUpdate = true;

        geometry.computeVertexNormals();

        this.terrain.updateColors();
        geometry.attributes.color.needsUpdate = true;
        geometry.computeBoundingSphere();

        return true;
    }
}

function smoothstep(a, b, value) {
    const t = THREE.MathUtils.clamp(
        (value - a) / (b - a),
        0,
        1
    );

    return t * t * (3 - 2 * t);
}
