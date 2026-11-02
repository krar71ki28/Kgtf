import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export class Environment {
    constructor(engine) {
        this.engine = engine;
        this.scene = engine.scene;
        this.renderer = engine.renderer;
        this.rainSystem = null;

        // 1. Physical Sky
        this.sky = new Sky();
        this.sky.scale.setScalar(450000);
        this.scene.add(this.sky);

        const sunPos = new THREE.Vector3();
        const phi = THREE.MathUtils.degToRad(90 - 45);
        const theta = THREE.MathUtils.degToRad(180);
        sunPos.setFromSphericalCoords(1, phi, theta);

        this.sky.material.uniforms['turbidity'].value = 10;
        this.sky.material.uniforms['rayleigh'].value = 3;
        this.sky.material.uniforms['mieCoefficient'].value = 0.005;
        this.sky.material.uniforms['mieDirectionalG'].value = 0.7;
        this.sky.material.uniforms['sunPosition'].value.copy(sunPos);

        // 2. Directional Sun
        this.sun = new THREE.DirectionalLight(0xfff5e6, 3.0);
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
        this.sun.shadow.bias = -0.0001;
        this.sun.shadow.normalBias = 0.05;

        this.scene.add(this.sun);
        this.scene.add(this.sun.target);

        // 3. Hemisphere Lighting
        this.hemiLight = new THREE.HemisphereLight(
            0xffffff,
            0x444444,
            1.2
        );
        this.scene.add(this.hemiLight);

        // 4. Realistic Sun Halo
        this.createSunHalo();

        // 5. Atmospheric Fog
        this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.01);

        // 6. Reflection Probe
        this.cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
            generateMipmaps: true,
            minFilter: THREE.LinearMipmapLinearFilter,
        });

        this.cubeCamera = new THREE.CubeCamera(
            0.1,
            1000,
            this.cubeRenderTarget
        );

        this.cubeCamera.position.set(0, 2, 0);
        this.scene.add(this.cubeCamera);

        this.updateEnvironmentMap();
        this.updateSun(12);
    }

    // Create a soft atmospheric halo.
    // The actual solar disk remains the native Sky shader disk.
    createSunHalo() {
        const size = 256;

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');

        const gradient = ctx.createRadialGradient(
            128, 128, 0,
            128, 128, 128
        );

        gradient.addColorStop(0.0, 'rgba(255,245,220,0.20)');
        gradient.addColorStop(0.15, 'rgba(255,235,195,0.14)');
        gradient.addColorStop(0.35, 'rgba(255,220,170,0.07)');
        gradient.addColorStop(0.65, 'rgba(255,210,160,0.025)');
        gradient.addColorStop(1.0, 'rgba(255,200,140,0.0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, size, size);

        this.sunHaloTexture = new THREE.CanvasTexture(canvas);
        this.sunHaloTexture.colorSpace = THREE.SRGBColorSpace;

        const material = new THREE.SpriteMaterial({
            map: this.sunHaloTexture,
            color: new THREE.Color().setRGB(1.8, 1.55, 1.2),
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            depthTest: true,
            toneMapped: false
        });

        this.sunHalo = new THREE.Sprite(material);
        this.sunHalo.scale.set(8, 8, 1);
        this.sunHalo.position.copy(this.sun.position)
            .normalize()
            .multiplyScalar(90);

        this.scene.add(this.sunHalo);
    }

    // 7. Dynamic Day / Night Cycle
    updateSun(timeOfDay) {
        const elevation = Math.sin(
            (timeOfDay - 6) / 12 * Math.PI
        ) * 90;

        const phi = THREE.MathUtils.degToRad(90 - elevation);
        const theta = THREE.MathUtils.degToRad(180);

        const sunPos = new THREE.Vector3()
            .setFromSphericalCoords(1, phi, theta);

        this.sky.material.uniforms['sunPosition'].value.copy(sunPos);

        this.sun.position.copy(sunPos).multiplyScalar(100);

        // Update the halo with the same solar direction.
        this.sunHalo.position.copy(sunPos).multiplyScalar(90);

        this.sunHalo.visible = elevation > 0;

        if (elevation < 0) {
            // Night
            this.sun.intensity = 0.1;
            this.sun.color.setHex(0x445588);
            this.hemiLight.intensity = 0.2;
            this.scene.fog.color.setHex(0x050510);

        } else if (elevation < 20) {
            // Sunrise / Sunset
            this.sun.intensity = 2.0;
            this.sun.color.setHex(0xff6600);
            this.hemiLight.intensity = 0.5;
            this.scene.fog.color.setHex(0xffaa00);

            this.sunHalo.material.opacity = 0.35;

        } else {
            // Day
            this.sun.intensity = 3.0;
            this.sun.color.setHex(0xfff5e6);
            this.hemiLight.intensity = 1.2;
            this.scene.fog.color.setHex(0x87CEEB);

            this.sunHalo.material.opacity = 0.5;
        }

        this.updateEnvironmentMap();
    }

    updateEnvironmentMap() {
        this.cubeCamera.update(this.renderer, this.scene);
        this.scene.environment = this.cubeRenderTarget.texture;
    }

    // 8. Rain System
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

            geo.setAttribute(
                'position',
                new THREE.BufferAttribute(positions, 3)
            );

            const mat = new THREE.PointsMaterial({
                color: 0xaaaaaa,
                size: 0.15,
                transparent: true,
                opacity: 0.7
            });

            this.rainSystem = new THREE.Points(geo, mat);
            this.scene.add(this.rainSystem);
            this.scene.fog.density = 0.03;

        } else if (!enabled && this.rainSystem) {
            this.scene.remove(this.rainSystem);
            this.rainSystem.geometry.dispose();
            this.rainSystem.material.dispose();
            this.rainSystem = null;
            this.scene.fog.density = 0.01;
        }
    }

    // 9. Environment Update
    update(dt) {
        if (this.rainSystem) {
            const pos = this.rainSystem.geometry.attributes.position.array;

            for (let i = 0; i < pos.length; i += 3) {
                pos[i + 1] -= 30 * dt;

                if (pos[i + 1] < 0) {
                    pos[i + 1] = 40;
                }
            }

            this.rainSystem.geometry.attributes.position.needsUpdate = true;
        }
    }
}
