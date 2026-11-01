import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export class Environment {
    constructor(engine) {
        this.engine = engine;
        this.scene = engine.scene;
        this.renderer = engine.renderer;
        this.rainSystem = null;

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // 1. السماء
        this.sky = new Sky();
        this.sky.scale.setScalar(450000);
        this.scene.add(this.sky);

        const sunPos = new THREE.Vector3();
        const phi = THREE.MathUtils.degToRad(90 - 45);
        const theta = THREE.MathUtils.degToRad(180);
        sunPos.setFromSphericalCoords(1, phi, theta);

        this.sky.material.uniforms['turbidity'].value = 8;
        this.sky.material.uniforms['rayleigh'].value = 4;
        this.sky.material.uniforms['mieCoefficient'].value = 0.005;
        this.sky.material.uniforms['mieDirectionalG'].value = 0.7;
        this.sky.material.uniforms['sunPosition'].value.copy(sunPos);

        // 2. الشمس
        this.sun = new THREE.DirectionalLight(0xfff5e6, 2.0);
        this.sun.position.copy(sunPos).multiplyScalar(100);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.width = 2048;
        this.sun.shadow.mapSize.height = 2048;
        this.sun.shadow.camera.near = 0.5;
        this.sun.shadow.camera.far = 500;
        this.sun.shadow.camera.left = -50;
        this.sun.shadow.camera.right = 50;
        this.sun.shadow.camera.top = 50;
        this.sun.shadow.camera.bottom = -50;
        this.sun.shadow.bias = -0.0005;
        this.scene.add(this.sun);

        // 3. إضاءة محيطة
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        this.scene.add(this.hemiLight);

        // 4. ✅ إعداد مجس الانعكاس (Reflection Probe)
        this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
            generateMipmaps: true,
            minFilter: THREE.LinearMipmapLinearFilter,
        });
        this.cubeCamera = new THREE.CubeCamera(0.1, 1000, this.cubeRenderTarget);
        this.cubeCamera.position.set(0, 2, 0); // نضعه في مركز المشهد
        this.scene.add(this.cubeCamera);

        // تحديث البيئة باستخدام مجس الانعكاس
        this.updateEnvironmentMap();
    }

    updateEnvironmentMap() {
        // إخفاء الكاميرا الرئيسية مؤقتاً أثناء التقاط البيئة
        const currentCamera = this.engine.camera;
        this.cubeCamera.update(this.renderer, this.scene);
        this.scene.environment = this.cubeRenderTarget.texture;
    }

    toggleRain(enabled) {
        if (enabled && !this.rainSystem) {
            const count = 2000;
            const geo = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 60;
                positions[i * 3 + 1] = Math.random() * 40;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
            }
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const mat = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.15, transparent: true, opacity: 0.7 });
            this.rainSystem = new THREE.Points(geo, mat);
            this.scene.add(this.rainSystem);
        } else if (!enabled && this.rainSystem) {
            this.scene.remove(this.rainSystem);
            this.rainSystem.geometry.dispose();
            this.rainSystem.material.dispose();
            this.rainSystem = null;
        }
    }

    update(dt) {
        if (this.rainSystem) {
            const pos = this.rainSystem.geometry.attributes.position.array;
            for (let i = 0; i < pos.length; i += 3) {
                pos[i + 1] -= 30 * dt;
                if (pos[i + 1] < 0) pos[i + 1] = 40;
            }
            this.rainSystem.geometry.attributes.position.needsUpdate = true;
        }
    }
}
