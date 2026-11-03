import * as THREE from 'three';

export class TerrainSystem {
    constructor(sceneManager, options = {}) {
        this.sceneManager = sceneManager;
        this.options = options;
        this.mesh = null;
    }

    init() {
        if (this.mesh) return;

        const size = this.options.size ?? 200;
        const segments = this.options.segments ?? 128;
        const geometry = new THREE.PlaneGeometry(
            size,
            size,
            segments,
            segments
        );

        const positions = geometry.attributes.position;
        const heights = [];

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const z = positions.getY(i);

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

            const height = hills + ridges + peaks;

            positions.setZ(i, height);
            heights.push(height);
        }

        geometry.computeVertexNormals();

        const normals = geometry.attributes.normal;
        const colors = [];
        const grass = new THREE.Color(0x527b3d);
        const dirt = new THREE.Color(0x806044);
        const rock = new THREE.Color(0x777b80);
        const color = new THREE.Color();

        const smoothstep = (a, b, value) => {
            const t = THREE.MathUtils.clamp(
                (value - a) / (b - a), 0, 1
            );
            return t * t * (3 - 2 * t);
        };

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
    }

    dispose() {
        if (!this.mesh) return;

        this.sceneManager.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.mesh = null;
    }
}
