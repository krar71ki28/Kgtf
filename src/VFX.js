import * as THREE from 'three';

export class VFXManager {
    constructor(scene) {
        this.scene = scene;
        this.effects = [];
    }

    createFire(position) {
        const group = new THREE.Group();
        const count = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];
        
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 0.4;
            positions[i * 3 + 1] = Math.random() * 0.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
            velocities.push({ x: (Math.random() - 0.5) * 0.2, y: Math.random() * 1.5 + 0.5, z: (Math.random() - 0.5) * 0.2 });
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ color: 0xff6600, size: 0.3, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false });
        const points = new THREE.Points(geometry, material);
        
        const light = new THREE.PointLight(0xff6600, 5, 10);
        light.position.y = 0.5;
        
        group.add(points);
        group.add(light);
        group.position.copy(position);
        
        this.scene.add(group);
        this.effects.push({ type: 'fire', group, geometry, count, velocities, light });
    }

    createSmoke(position) {
        const group = new THREE.Group();
        const count = 40;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];
        
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 0.5;
            positions[i * 3 + 1] = Math.random() * 0.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5;
            velocities.push({ x: (Math.random() - 0.5) * 0.2, y: Math.random() * 0.8 + 0.2, z: (Math.random() - 0.5) * 0.2 });
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ color: 0x888888, size: 0.6, transparent: true, opacity: 0.5, depthWrite: false });
        const points = new THREE.Points(geometry, material);
        
        group.add(points);
        group.position.copy(position);
        
        this.scene.add(group);
        this.effects.push({ type: 'smoke', group, geometry, count, velocities });
    }

    update(dt) {
        this.effects.forEach(eff => {
            const positions = eff.geometry.attributes.position.array;
            for (let i = 0; i < eff.count; i++) {
                positions[i * 3] += eff.velocities[i].x * dt;
                positions[i * 3 + 1] += eff.velocities[i].y * dt;
                positions[i * 3 + 2] += eff.velocities[i].z * dt;
                
                if (positions[i * 3 + 1] > 1.5) {
                    positions[i * 3] = (Math.random() - 0.5) * 0.4;
                    positions[i * 3 + 1] = 0;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
                }
            }
            eff.geometry.attributes.position.needsUpdate = true;
            if (eff.light) eff.light.intensity = 4 + Math.random() * 2;
        });
    }
}
