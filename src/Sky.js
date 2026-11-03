import * as THREE from 'three';

// سماء متدرجة بأسلوب Unreal: أزرق بالأعلى، أفق فاتح، وتتبع الكاميرا
export const SKY_HORIZON = 0xc9dcf0;

export function createSky(scene) {
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x2f6fc4) },
      horizonColor: { value: new THREE.Color(SKY_HORIZON) },
      bottomColor: { value: new THREE.Color(0x9aa7b5) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 col = h >= 0.0
          ? mix(horizonColor, topColor, pow(h, 0.55))
          : mix(horizonColor, bottomColor, pow(-h, 0.7));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const dome = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), material);
  dome.frustumCulled = false;
  dome.renderOrder = -1;
  scene.add(dome);

  scene.fog = new THREE.Fog(SKY_HORIZON, 80, 380);

  return {
    update(camera) {
      dome.position.copy(camera.position);
    },
  };
}
