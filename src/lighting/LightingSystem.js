import * as THREE from "three";

export class LightingSystem {
    constructor(scene, skyMaterial = null) {
        if (!scene?.isScene) {
            throw new TypeError("LightingSystem requires a THREE.Scene");
        }

        this.scene = scene;
        this.skyMaterial = skyMaterial;

        this.settings = {
            sunElevation: 45,
            sunAzimuth: 35,
            sunIntensity: 2.5,
            ambientIntensity: 1.7,
            fogEnabled: true,
            fogNear: 100,
            fogFar: 320,
            skyColor: "#9dbbd3"
        };

        this.hemisphereLight = new THREE.HemisphereLight(
            0xe5f1ff, 0x60666d, this.settings.ambientIntensity
        );

        this.sunlight = new THREE.DirectionalLight(
            0xfff3df, this.settings.sunIntensity
        );

        this.sunlight.castShadow = true;
        this.sunlight.shadow.mapSize.set(1024, 1024);
        this.sunlight.shadow.camera.left = -25;
        this.sunlight.shadow.camera.right = 25;
        this.sunlight.shadow.camera.top = 25;
        this.sunlight.shadow.camera.bottom = -25;
        this.sunlight.shadow.camera.near = 0.5;
        this.sunlight.shadow.camera.far = 70;
        this.sunlight.shadow.bias = -0.0002;
        this.sunlight.shadow.normalBias = 0.025;

        this.scene.add(this.hemisphereLight);
        this.scene.add(this.sunlight);
        this.scene.add(this.sunlight.target);

        this.updateSunPosition();
    }

    updateSunPosition() {
        const elevation = THREE.MathUtils.degToRad(this.settings.sunElevation);
        const azimuth = THREE.MathUtils.degToRad(this.settings.sunAzimuth);
        const distance = 30;

        this.sunlight.position.set(
            distance * Math.cos(elevation) * Math.cos(azimuth),
            distance * Math.sin(elevation),
            distance * Math.cos(elevation) * Math.sin(azimuth)
        );

        this.sunlight.target.position.set(0, 0, 0);
    }

    setSunElevation(value) {
        this.settings.sunElevation = THREE.MathUtils.clamp(Number(value) || 0, 5, 90);
        this.updateSunPosition();
        return this.settings.sunElevation;
    }

    setSunAzimuth(value) {
        this.settings.sunAzimuth = THREE.MathUtils.euclideanModulo(Number(value) || 0, 360);
        this.updateSunPosition();
        return this.settings.sunAzimuth;
    }

    setSunIntensity(value) {
        this.settings.sunIntensity = THREE.MathUtils.clamp(Number(value) || 0, 0, 5);
        this.sunlight.intensity = this.settings.sunIntensity;
        return this.settings.sunIntensity;
    }

    setAmbientIntensity(value) {
        this.settings.ambientIntensity = THREE.MathUtils.clamp(Number(value) || 0, 0, 4);
        this.hemisphereLight.intensity = this.settings.ambientIntensity;
        return this.settings.ambientIntensity;
    }

    setSkyColor(value) {
        const color = new THREE.Color(value);
        this.settings.skyColor = color.getHexString();

        if (this.skyMaterial?.uniforms?.uSkyTint) {
            this.skyMaterial.uniforms.uSkyTint.value.copy(color);
        }

        return color;
    }

    setFogEnabled(enabled) {
        this.settings.fogEnabled = Boolean(enabled);
        this.updateFog();
    }

    setFogRange(near, far) {
        const safeNear = Math.max(0, Number(near) || 0);
        const safeFar = Math.max(safeNear + 1, Number(far) || 1);

        this.settings.fogNear = safeNear;
        this.settings.fogFar = safeFar;
        this.updateFog();
    }

    updateFog() {
        this.scene.fog = this.settings.fogEnabled
            ? new THREE.Fog(0xb7ccdc, this.settings.fogNear, this.settings.fogFar)
            : null;
    }

    getSettings() {
        return { ...this.settings };
    }

    dispose() {
        this.scene.remove(this.hemisphereLight);
        this.scene.remove(this.sunlight);
        this.scene.remove(this.sunlight.target);
    }
}
