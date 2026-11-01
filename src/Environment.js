import * as THREE from 'three';

export class Environment {
    constructor(scene) {
        this.scene = scene;
        this.rainSystem = null;

        // إضاءة محيطة
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
        this.scene.add(this.hemiLight);

        // ضوء الشمس
        this.sun = new THREE.DirectionalLight(0xffffff, 1.5);
        this.sun.position.set(10, 20, 10);
        this.scene.add(this.sun);
    }

    toggleRain(enabled) {
        if (enabled && !this.rainSystem) {
            const count = 1500;
            const geo = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 50;
                positions[i * 3 + 1] = Math.random() * 30;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 50;
            }
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const mat = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.15, transparent: true, opacity: 0.6 });
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
                pos[i + 1] -= 25 * dt;
                if (pos[i + 1] < 0) pos[i + 1] = 30;
            }
            this.rainSystem.geometry.attributes.position.needsUpdate = true;
        }
    }
}
