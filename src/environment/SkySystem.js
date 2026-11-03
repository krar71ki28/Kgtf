import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export class SkySystem {
    constructor(renderer) {
        this.renderer = renderer;
        this.sky = null;
        this.sunLight = null;
        this.hemisphereLight = null;

        this.sunDirection = new THREE.Vector3(
            0.3, 0.8, -0.5
        ).normalize();
    }

    init() {
        if (this.sky) return;

        const scene = this.renderer.scene;

        this.sky = new Sky();
        this.sky.scale.setScalar(100000);

        const uniforms = this.sky.material.uniforms;

        uniforms['turbidity'].value = 10;
        uniforms['rayleigh'].value = 2;
        uniforms['mieCoefficient'].value = 0.005;
        uniforms['mieDirectionalG'].value = 0.8;
        uniforms['sunPosition'].value.copy(this.sunDirection);

        scene.add(this.sky);

        this.hemisphereLight = new THREE.HemisphereLight(
            0xb8d9ff,
            0x625747,
            1.5
        );

        scene.add(this.hemisphereLight);

        this.sunLight = new THREE.DirectionalLight(
            0xfff1d5,
            2.5
        );

        this.sunLight.position.copy(
            this.sunDirection.clone().multiplyScalar(100)
        );

        scene.add(this.sunLight);

        this.renderer.camera.far = 200000;
        this.renderer.camera.updateProjectionMatrix();

        this.renderer.renderer.toneMapping =
            THREE.ACESFilmicToneMapping;

        this.renderer.renderer.toneMappingExposure = 0.8;
    }

    setSunDirection(x, y, z) {
        this.sunDirection.set(x, y, z).normalize();

        if (!this.sky) return;

        this.sky.material.uniforms['sunPosition']
            .value.copy(this.sunDirection);

        this.sunLight.position.copy(
            this.sunDirection.clone().multiplyScalar(100)
        );
    }

    update() {}

    dispose() {
        if (!this.sky) return;

        const scene = this.renderer.scene;

        scene.remove(this.sky);
        scene.remove(this.sunLight);
        scene.remove(this.hemisphereLight);

        this.sky.geometry.dispose();
        this.sky.material.dispose();

        this.sky = null;
        this.sunLight = null;
        this.hemisphereLight = null;
    }
}
