import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export class Environment {
    constructor(engine) {
        this.engine = engine;
        this.scene = engine.scene;
        this.renderer = engine.renderer;
        this.rainSystem = null;

        // 1. إعداد السماء الفيزيائية (محاكاة Godot PhysicalSkyMaterial)
        this.sky = new Sky();
        this.sky.scale.setScalar(450000);
        this.scene.add(this.sky);

        const sunPos = new THREE.Vector3();
        const phi = THREE.MathUtils.degToRad(90 - 45);
        const theta = THREE.MathUtils.degToRad(180);
        sunPos.setFromSphericalCoords(1, phi, theta);

        // ✅ معاملات محسنة لمحاكاة سماء واقعية (مستوحاة من Unreal Sky Atmosphere)
        this.sky.material.uniforms['turbidity'].value = 10; // غيوم خفيفة
        this.sky.material.uniforms['rayleigh'].value = 3;   // زرقة السماء
        this.sky.material.uniforms['mieCoefficient'].value = 0.005;
        this.sky.material.uniforms['mieDirectionalG'].value = 0.7;
        this.sky.material.uniforms['sunPosition'].value.copy(sunPos);

        // 2. الشمس مع ظلال ناعمة عالية الدقة
        this.sun = new THREE.DirectionalLight(0xfff5e6, 2.5);
        this.sun.position.copy(sunPos).multiplyScalar(100);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.width = 2048; // دقة عالية
        this.sun.shadow.mapSize.height = 2048;
        this.sun.shadow.camera.near = 0.5;
        this.sun.shadow.camera.far = 500;
        this.sun.shadow.camera.left = -50;
        this.sun.shadow.camera.right = 50;
        this.sun.shadow.camera.top = 50;
        this.sun.shadow.camera.bottom = -50;
        this.sun.shadow.bias = -0.0001; // تقليل التشوهات
        this.sun.shadow.normalBias = 0.02; // تحسين الظلال على الأسطح المنحنية
        this.scene.add(this.sun);
        this.scene.add(this.sun.target);

        // 3. إضاءة محيطة (HemisphereLight) لمحاكاة ضوء السماء المنتشر
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        this.scene.add(this.hemiLight);

        // 4. الضباب الجوي
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.015);

        // 5. مجس الانعكاس (Reflection Probe)
        this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
            generateMipmaps: true,
            minFilter: THREE.LinearMipmapLinearFilter,
        });
        this.cubeCamera = new THREE.CubeCamera(0.1, 1000, this.cubeRenderTarget);
        this.cubeCamera.position.set(0, 2, 0);
        this.scene.add(this.cubeCamera);

        this.updateEnvironmentMap();
        this.updateSun(12); // الوقت الافتراضي 12:00
    }

    updateSun(timeOfDay) {
        const elevation = Math.sin((timeOfDay - 6) / 12 * Math.PI) * 90;
        const phi = THREE.MathUtils.degToRad(90 - elevation);
        const theta = THREE.MathUtils.degToRad(180);
        const sunPos = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

        this.sky.material.uniforms['sunPosition'].value.copy(sunPos);
        this.sun.position.copy(sunPos).multiplyScalar(100);

        if (elevation < 0) {
            this.sun.intensity = 0.1;
            this.sun.color.setHex(0x445588);
            this.hemiLight.intensity = 0.2;
            this.scene.fog.color.setHex(0x050510);
        } else if (elevation < 20) {
            this.sun.intensity = 1.5;
            this.sun.color.setHex(0xff6600);
            this.hemiLight.intensity = 0.5;
            this.scene.fog.color.setHex(0xffaa00);
        } else {
            this.sun.intensity = 2.5;
            this.sun.color.setHex(0xfff5e6);
            this.hemiLight.intensity = 0.8;
            this.scene.fog.color.setHex(0x87CEEB);
        }

        this.updateEnvironmentMap();
    }

    updateEnvironmentMap() {
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
            this.scene.fog.density = 0.03; 
        } else if (!enabled && this.rainSystem) {
            this.scene.remove(this.rainSystem);
            this.rainSystem.geometry.dispose();
            this.rainSystem.material.dispose();
            this.rainSystem = null;
            this.scene.fog.density = 0.015;
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
