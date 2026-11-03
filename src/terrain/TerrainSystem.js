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
        const size = Number(options.size);
        const segments = Number(options.segments);
        const heightScale = Number(options.heightScale);

        if (!Number.isFinite(size) || size <= 0) {
            throw new Error('Terrain size must be positive.');
        }

        if (
            !Number.isInteger(segments) ||
            segments < 16 ||
            segments > 512
        ) {
            throw new Error('Terrain segments must be between 16 and 512.');
        }

        if (
            !Number.isFinite(heightScale) ||
            heightScale < 0 ||
            heightScale > 20
        ) {
            throw new Error('Invalid terrain height scale.');
        }
    }

    getHeightAt(x, z) {
        if (!this.data) return null;

        const halfSize = this.options.size / 2;

        if (
            Math.abs(x) > halfSize ||
            Math.abs(z) > halfSize
        ) {
            return null;
        }

        return this.calculateHeight(x, -z);
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

    init() {
        if (this.mesh) return;

        this.rebuild();
    }

    setOptions(changes = {}) {
        const nextOptions = {
            ...this.options,
            ...changes
        };

        this.validateOptions(nextOptions);

        this.options = nextOptions;

        if (this.mesh) {
            this.rebuild();
        }
    }

    rebuild() {
        this.validateOptions(this.options);

        if (this.mesh) {
            this.sceneManager.remove(this.mesh);
            this.mesh.geometry.dispose();
            this.mesh.material.dispose();
            this.mesh = null;
        }

        const size = this.options.size;
        const segments = this.options.segments;

        const geometry = new THREE.PlaneGeometry(
            size,
            size,
            segments,
            segments
        );

        const positions = geometry.attributes.position;
        const heights = new Float32Array(positions.count);

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getY(i);

            const height = this.calculateHeight(x, z);

            positions.setZ(i, height);
            heights[i] = height;
        }

        geometry.computeVertexNormals();

        const normals = geometry.attributes.normal;

        const grass = new THREE.Color(0x527b3d);
        const dirt = new THREE.Color(0x806044);
        const rock = new THREE.Color(0x777b80);

        const colors = [];

        const smoothstep = (a, b, value) => {
            const t = THREE.MathUtils.clamp(
                (value - a) / (b - a),
                0,
                1
            );

            return t * t * (3 - 2 * t);
        };

        const color = new THREE.Color();

        for (let i = 0; i < positions.count; i++) {
            const height = heights[i];
            const slope = 1 - normals.getZ(i);

            color.copy(grass);

            color.lerp(
                dirt,
                smoothstep(1.5, 3.5, height)
            );

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

        geometry.rotateX(-Math.PI / 2);

        const material = new THREE.MeshStandardMaterial({
            vertexColors: true,
            roughness: 0.95,
            metalness: 0
        });

        this.mesh = new THREE.Mesh(geometry, material);

        this.mesh.name = 'KGTF_Landscape';
        this.mesh.receiveShadow = true;
        this.mesh.userData.engineObject = true;
        this.mesh.userData.objectType = 'terrain';

        this.sceneManager.add(this.mesh);

        this.data = {
            size,
            segments,
            heights
        };
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
