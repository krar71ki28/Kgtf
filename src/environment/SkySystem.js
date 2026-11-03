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
        const camera = this.renderer.camera;

        // لون احتياطي أزرق خلف السماء
        scene.background = new THREE.Color(0x87bce8);

        // السماء الإجرائية
        this.sky = new Sky();
        this.sky.scale.setScalar(100000);
        this.sky.position.copy(camera.position);
        this.sky.renderOrder = -1000;

        this.sky.material.depthWrite = false;
        this.sky.material.depthTest = false;
        this.sky.material.toneMapped = false;

        const uniforms = this.sky.material.uniforms;

        uniforms['turbidity'].value = 2.5;
        uniforms['rayleigh'].value = 3;
        uniforms['mieCoefficient'].value = 0.004;
        uniforms['mieDirectionalG'].value = 0.82;
        uniforms['sunPosition'].value.copy(this.sunDirection);

        this.sky.visible = true;
        scene.add(this.sky);

        // الإضاءة البيئية
        this.hemisphereLight = new THREE.HemisphereLight(
            0xc5e3ff,
            0x77716a,
            1.5
        );

        scene.add(this.hemisphereLight);

        // ضوء الشمس
        this.sunLight = new THREE.DirectionalLight(
            0xfff1d6,
            2.5
        );

        this.sunLight.position.copy(
            this.sunDirection.clone().multiplyScalar(100)
        );

        scene.add(this.sunLight);

        // مسافة الرؤية
        camera.far = 200000;
        camera.updateProjectionMatrix();
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

    setSkyVisible(visible) {
        if (this.sky) {
            this.sky.visible = Boolean(visible);
        }
    }

    update() {
        if (!this.sky || !this.renderer.camera) return;

        // إبقاء السماء حول الكاميرا أثناء الحركة
        this.sky.position.copy(this.renderer.camera.position);
    }

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
