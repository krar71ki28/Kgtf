import * as THREE from 'three';

export class EditorGridSystem {
    constructor(renderer) {
        this.renderer = renderer;
        this.group = new THREE.Group();
        this.group.name = 'KGTF Infinite Editor Grid';

        this.gridMaterial = null;
        this.gridMesh = null;
    }

    init() {
        if (this.gridMesh) return;

        const geometry = new THREE.PlaneGeometry(2000, 2000);

        this.gridMaterial = new THREE.ShaderMaterial({
            transparent: true,
            depthWrite: false,
            depthTest: true,
            side: THREE.DoubleSide,
            toneMapped: false,

            uniforms: {
                uMinorColor: {
                    value: new THREE.Color(0x777f89)
                },
                uMajorColor: {
                    value: new THREE.Color(0x505965)
                },
                uAxisXColor: {
                    value: new THREE.Color(0xb75c5c)
                },
                uAxisZColor: {
                    value: new THREE.Color(0x5689bd)
                },
                uCameraPosition: {
                    value: new THREE.Vector3()
                },
                uGridSize: { value: 1.0 },
                uMajorEvery: { value: 10.0 },
                uFadeStart: { value: 30.0 },
                uFadeEnd: { value: 150.0 }
            },

            vertexShader: `
                varying vec3 vWorldPosition;

                void main() {
                    vec4 worldPosition =
                        modelMatrix * vec4(position, 1.0);

                    vWorldPosition = worldPosition.xyz;

                    gl_Position =
                        projectionMatrix *
                        viewMatrix *
                        worldPosition;
                }
            `,

            fragmentShader: `
                varying vec3 vWorldPosition;

                uniform vec3 uMinorColor;
                uniform vec3 uMajorColor;
                uniform vec3 uAxisXColor;
                uniform vec3 uAxisZColor;
                uniform vec3 uCameraPosition;

                uniform float uGridSize;
                uniform float uMajorEvery;
                uniform float uFadeStart;
                uniform float uFadeEnd;

                float gridLine(vec2 coord, float width) {
                    vec2 derivative = fwidth(coord);

                    vec2 distanceToLine =
                        abs(fract(coord - 0.5) - 0.5);

                    vec2 line =
                        1.0 - smoothstep(
                            derivative * (width - 0.5),
                            derivative * (width + 0.5),
                            distanceToLine
                        );

                    return max(line.x, line.y);
                }

                void main() {
                    vec2 worldXZ = vWorldPosition.xz;

                    float minor = gridLine(
                        worldXZ / uGridSize,
                        1.0
                    );

                    float major = gridLine(
                        worldXZ / (uGridSize * uMajorEvery),
                        1.2
                    );

                    vec3 color = uMinorColor;

                    color = mix(
                        color,
                        uMajorColor,
                        major * 0.9
                    );

                    float axisX = 1.0 - smoothstep(
                        0.025,
                        0.055,
                        abs(worldXZ.y)
                    );

                    float axisZ = 1.0 - smoothstep(
                        0.025,
                        0.055,
                        abs(worldXZ.x)
                    );

                    color = mix(color, uAxisXColor, axisX);
                    color = mix(color, uAxisZColor, axisZ);

                    float distanceFromCamera = distance(
                        vWorldPosition.xz,
                        uCameraPosition.xz
                    );

                    float fade = 1.0 - smoothstep(
                        uFadeStart,
                        uFadeEnd,
                        distanceFromCamera
                    );

                    float visibility = max(minor, major);
                    float alpha = visibility * fade * 0.9;

                    if (alpha < 0.01) discard;

                    gl_FragColor = vec4(color, alpha);

                    #include <colorspace_fragment>
                }
            `
        });

        this.gridMesh = new THREE.Mesh(
            geometry,
            this.gridMaterial
        );

        this.gridMesh.rotation.x = -Math.PI / 2;
        this.gridMesh.position.y = 0;
        this.gridMesh.frustumCulled = false;

        this.group.add(this.gridMesh);
        this.renderer.scene.add(this.group);
    }

    update() {
        if (!this.gridMaterial || !this.renderer.camera) {
            return;
        }

        this.gridMaterial.uniforms.uCameraPosition.value.copy(
            this.renderer.camera.position
        );
    }

    dispose() {
        if (this.gridMesh) {
            this.gridMesh.geometry.dispose();
        }

        if (this.gridMaterial) {
            this.gridMaterial.dispose();
        }

        this.renderer.scene.remove(this.group);
        this.group.clear();

        this.gridMesh = null;
        this.gridMaterial = null;
    }
}
