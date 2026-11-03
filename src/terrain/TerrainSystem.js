import * as THREE from 'three';

export class TerrainSystem {
    constructor(sceneManager, options = {}) {
        this.sceneManager = sceneManager;

        this.options = {
            size: 200,
            segments: 128,
            heightScale: 1,
            ...options
        };

        this.mesh = null;
        this.data = null;
    }

    validateOptions(options) {
        const { size, segments, heightScale } = options;

        if (!Number.isFinite(size) || size <= 0) {
            throw new Error('Invalid terrain size.');
        }

        if (
            !Number.isInteger(segments) ||
            segments < 16 ||
            segments > 512
        ) {
            throw new Error('Invalid terrain segments.');
        }

        if (
            !Number.isFinite(heightScale) ||
            heightScale < 0 ||
            heightScale > 20
        ) {
            throw new Error('Invalid terrain height scale.');
        }
    }

    calculateHeight(x, z) {
        const hills =
            Math.sin(x * 0.035) *
            Math.cos(z * 0.028) * 2.4;

        const ridges =
            Math.sin((x + z) * 0.06) * 0.6;

        const peaks = Math.pow(
            Math.max(
                0,
                Math.sin(x * 0.017) *
                Math.cos(z * 0.021)
            ),
            2
        ) * 5;

        return (hills + ridges + peaks) *
            this.options.heightScale;
    }

    getHeightAt(x, z) {
        if (!this.data) return null;

        const half = this.data.size / 2;

        if (
            Math.abs(x) > half ||
            Math.abs(z) > half
        ) return null;

        const { size, segments, heights } = this.data;
        const spacing = size / segments;

        const gx = (x + half) / spacing;
        const gz = (z + half) / spacing;

        const col = Math.min(segments - 1, Math.floor(gx));
        const row = Math.min(segments - 1, Math.floor(gz));

        const tx = gx - col;
        const tz = gz - row;

        const stride = segments + 1;

        const a = heights[row * stride + col];
        const b = heights[row * stride + col + 1];
        const c = heights[(row + 1) * stride + col];
        const d = heights[(row + 1) * stride + col + 1];

        const top = THREE.MathUtils.lerp(a, b, tx);
        const bottom = THREE.MathUtils.lerp(c, d, tx);

        return THREE.MathUtils.lerp(top, bottom, tz);
    }

    init() {
        if (!this.mesh) this.rebuild();
    }

    setOptions(changes = {}) {
        const next = { ...this.options, ...changes };

        this.validateOptions(next);
        this.options = next;

        if (this.mesh) this.rebuild();
    }

    rebuild() {
        this.validateOptions(this.options);

        if (this.mesh) {
            this.sceneManager.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
        }

        const { size, segments } = this.options;

        const geometry = new THREE.PlaneGeometry(
            size, size, segments, segments
        );

        const positions = geometry.attributes.position;
        const heights = new Float32Array(positions.count);

        for (let i = 0; i < positions.count; i++) {
            const height = this.calculateHeight(
                positions.getX(i),
                positions.getY(i)
            );

            positions.setZ(i, height);
            heights[i] = height;
        }

        geometry.computeVertexNormals();

        this.mesh = new THREE.Mesh(
            geometry,
            new THREE.MeshStandardMaterial({
                vertexColors: true,
                roughness: 0.95
            })
        );

        this.mesh.name = 'KGTF_Landscape';
        this.mesh.receiveShadow = true;
        this.mesh.userData.engineObject = true;
        this.mesh.userData.objectType = 'terrain';

        this.mesh.rotation.x = -Math.PI / 2;

        this.data = { size, segments, heights };

        this.updateColors();

        this.sceneManager.add(this.mesh);
    }

    updateColors() {
        if (!this.mesh || !this.data) return;

        const geometry = this.mesh.geometry;
        const positions = geometry.attributes.position;
        const normals = geometry.attributes.normal;

        const grass = new THREE.Color(0x527b3d);
        const dirt = new THREE.Color(0x806044);
        const rock = new THREE.Color(0x777b80);

        const colors = [];
        const color = new THREE.Color();

        for (let i = 0; i < positions.count; i++) {
            const height = this.data.heights[i];
            const slope = 1 - normals.getZ(i);

            color.copy(grass);
            color.lerp(dirt, smoothstep(1.5, 3.5, height));
            color.lerp(
                rock,
                Math.max(
                    smoothstep(4, 7, height),
                    smoothstep(0.18, 0.55, slope)
                )
            );

            colors.push(color.r, color.g, color.b);
        }

        geometry.setAttribute(
            'color',
            new THREE.Float32BufferAttribute(colors, 3)
        );
    }

    dispose() {
        if (!this.mesh) return;

        this.sceneManager.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();

        this.mesh = null;
        this.data = null;
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
