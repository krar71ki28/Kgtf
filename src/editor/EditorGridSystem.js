import * as THREE from "three";

export class EditorGridSystem {
    constructor(options = {}) {
        this.size = options.size ?? 100;
        this.divisions = options.divisions ?? 100;
        this.majorEvery = options.majorEvery ?? 10;
        this.visible = options.visible ?? true;

        if (this.size <= 0 || this.divisions <= 0 || this.majorEvery <= 0) {
            throw new RangeError("Grid dimensions must be positive");
        }

        this.uniforms = {
            uSize: { value: this.size },
            uCellSize: { value: this.size / this.divisions },
            uMajorEvery: { value: this.majorEvery },
            uMinorColor: {
                value: new THREE.Color(options.minorColor ?? 0x7b858f)
            },
            uMajorColor: {
                value: new THREE.Color(options.majorColor ?? 0x535e69)
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
                uniform float uSize;
                uniform float uCellSize;
                uniform float uMajorEvery;

                uniform vec3 uMinorColor;
                uniform vec3 uMajorColor;

                varying vec2 vGridPosition;

                float gridLine(vec2 position, float spacing, float width) {
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
                        uCellSize * 0.018
                    );

                    float major = gridLine(
                        vGridPosition,
                        uCellSize * uMajorEvery,
                        uCellSize * 0.035
                    );

                    float edgeDistance =
                        length(vGridPosition) / (uSize * 0.5);

                    float edgeFade =
                        1.0 - smoothstep(0.70, 1.0, edgeDistance);

                    vec3 color = mix(
                        uMinorColor,
                        uMajorColor,
                        major
                    );

                    float alpha = max(
                        minor * 0.42,
                        major * 0.72
                    ) * edgeFade;

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
        this.mesh.position.y = 0.015;
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
