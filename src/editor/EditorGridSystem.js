import * as THREE from "three";

export class EditorGridSystem {
    constructor(options = {}) {
        this.size = options.size ?? 200;
        this.divisions = options.divisions ?? 100;
        this.majorEvery = options.majorEvery ?? 10;
        this.visible = options.visible ?? true;

        if (
            this.size <= 0 ||
            this.divisions <= 0 ||
            this.majorEvery <= 0
        ) {
            throw new RangeError("Grid dimensions must be positive");
        }

        this.uniforms = {
            uCellSize: {
                value: this.size / this.divisions
            },
            uMajorEvery: {
                value: this.majorEvery
            },
            uMinorColor: {
                value: new THREE.Color(options.minorColor ?? 0x687582)
            },
            uMajorColor: {
                value: new THREE.Color(options.majorColor ?? 0x465563)
            }
        };

        this.geometry = new THREE.PlaneGeometry(
            this.size,
            this.size
        );

        this.material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,

            vertexShader: `
                varying vec2 vGridPosition;

                void main() {
                    vGridPosition = position.xy;

                    gl_Position =
                        projectionMatrix *
                        modelViewMatrix *
                        vec4(position, 1.0);
                }
            `,

            fragmentShader: `
                uniform float uCellSize;
                uniform float uMajorEvery;

                uniform vec3 uMinorColor;
                uniform vec3 uMajorColor;

                varying vec2 vGridPosition;

                float gridLine(
                    vec2 position,
                    float spacing,
                    float width
                ) {
                    vec2 cell = abs(
                        fract(position / spacing + 0.5) - 0.5
                    );

                    float distanceToLine =
                        min(cell.x, cell.y) * spacing;

                    return 1.0 - smoothstep(
                        width,
                        width + 0.012,
                        distanceToLine
                    );
                }

                void main() {
                    float minor = gridLine(
                        vGridPosition,
                        uCellSize,
                        uCellSize * 0.025
                    );

                    float major = gridLine(
                        vGridPosition,
                        uCellSize * uMajorEvery,
                        uCellSize * 0.025
                    );

                    float edgeDistance =
                        length(vGridPosition) / 141.42;

                    float fade =
                        1.0 - smoothstep(0.68, 1.0, edgeDistance);

                    vec3 color = mix(
                        uMinorColor,
                        uMajorColor,
                        major
                    );

                    float alpha = max(
                        minor * 0.48,
                        major * 0.78
                    ) * fade;

                    gl_FragColor = vec4(color, alpha);
                }
            `,

            transparent: true,
            depthWrite: false,
            side: THREE.DoubleSide,
            toneMapped: false
        });

        this.mesh = new THREE.Mesh(
            this.geometry,
            this.material
        );

        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.y = 0.012;
        this.mesh.name = "EditorGrid";
        this.mesh.visible = this.visible;
        this.mesh.renderOrder = 1;
    }

    setVisible(visible) {
        this.visible = Boolean(visible);
        this.mesh.visible = this.visible;
    }

    dispose() {
        this.geometry.dispose();
        this.material.dispose();
        this.mesh.removeFromParent();
    }
}
