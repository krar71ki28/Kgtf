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
            side: THREE.DoubleSide,

            uniforms: {
                uMinorColor: {
                    value: new THREE.Color(0x777777)
                },
                uMajorColor: {
                    value: new THREE.Color(0xa5a5a5)
                },
                uAxisXColor: {
                    value: new THREE.Color(0xd65c5c)
                },
                uAxisZColor: {
                    value: new THREE.Color(0x5c91d6)
                },
                uCameraPosition: {
                    value: new THREE.Vector3()
                },
                uGridSize: {
                    value: 1.0
                },
                uMajorEvery: {
                    value: 10.0
                },
                uFadeStart: {
                    value: 35.0
                },
                uFadeEnd: {
                    value: 180.0
                }
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

                    vec2 minorCoord = worldXZ / uGridSize;

                    vec2 majorCoord =
                        worldXZ / (uGridSize * uMajorEvery);

                    float minor = gridLine(minorCoord, 1.0);
                    float major = gridLine(majorCoord, 1.2);

                    vec3 color = uMinorColor;

                    color = mix(
                        color,
                        uMajorColor,
                        major * 0.85
                    );

                    float axisWidth = 0.025;

                    float axisX =
                        1.0 - smoothstep(
                            axisWidth,
                            axisWidth * 2.0,
                            abs(worldXZ.y)
                        );

                    float axisZ =
                        1.0 - smoothstep(
                            axisWidth,
                            axisWidth * 2.0,
                            abs(worldXZ.x)
                        );

                    color = mix(
                        color,
                        uAxisXColor,
                        axisX
                    );

                    color = mix(
                        color,
                        uAxisZColor,
                        axisZ
                    );

                    float distanceFromCamera =
                        distance(
                            vWorldPosition.xz,
                            uCameraPosition.xz
                        );

                    float fade = 1.0 - smoothstep(
                        uFadeStart,
                        uFadeEnd,
                        distanceFromCamera
                    );

                    float lineVisibility =
                        max(minor, major);

                    float alpha = lineVisibility * fade;

                    gl_FragColor = vec4(color, alpha);

                    #include <tonemapping_fragment>
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
