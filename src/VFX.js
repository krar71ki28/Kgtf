import * as THREE from 'three';

export class VFXManager {
    constructor(scene) {
        this.scene = scene;
        this.activeEffects = [];
    }

    spawnExplosion(position) {
        const count = 50;
        const geo = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];
        
        for (let i = 0; i < count; i++) {
            positions[i * 3] = position.x;
            positions[i * 3 + 1] = position.y;
            positions[i * 3 + 2] = position.z;
            
            velocities.push(new THREE.Vector3(
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10,
                (Math.random() - 0.5) * 10
            ));
        }
        
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const mat = new THREE.PointsMaterial({ 
            color: 0xffaa00, 
            size: 0.3, 
            transparent: true, 
            opacity: 1.0,
            blending: THREE.AdditiveBlending
        });
        const points = new THREE.Points(geo, mat);
        this.scene.add(points);
        
        this.activeEffects.push({ 
            points, 
            velocities, 
            life: 1.0, 
            material: mat 
        });
    }

    update(dt) {
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];
            effect.life -= dt;
            
            const positions = effect.points.geometry.attributes.position.array;
            
            for (let j = 0; j < effect.velocities.length; j++) {
                positions[j * 3] += effect.velocities[j].x * dt;
                positions[j * 3 + 1] += effect.velocities[j].y * dt;
                positions[j * 3 + 2] += effect.velocities[j].z * dt;
                effect.velocities[j].y -= 9.8 * dt; // الجاذبية
            }
            
            effect.points.geometry.attributes.position.needsUpdate = true;
            effect.material.opacity = Math.max(0, effect.life);
            
            if (effect.life <= 0) {
                this.scene.remove(effect.points);
                effect.points.geometry.dispose();
                effect.material.dispose();
                this.activeEffects.splice(i, 1);
            }
        }
    }
}
