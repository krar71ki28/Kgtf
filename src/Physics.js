import * as THREE from 'three';

export class Physics {
    constructor(engine) {
        this.engine = engine;
    }

    checkPlayerCollision(nextPos, playerBoxSize) {
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            nextPos.clone().add(new THREE.Vector3(0, 0.75, 0)),
            playerBoxSize
        );

        for (let i = 0; i < this.engine.objects.length; i++) {
            const obj = this.engine.objects[i];
            if (obj.userData.type === 'character' || obj.userData.type === 'light' || obj.userData.type === 'vfx') continue;
            
            const objBox = new THREE.Box3().setFromObject(obj);
            if (playerBox.intersectsBox(objBox)) {
                return true; 
            }
        }
        return false;
    }

    updateGravity(dt) {
        this.engine.objects.forEach(o => {
            // ✅ التحقق من تفعيل الجاذبية للمجسم
            if (o.userData && o.userData.physics && o.userData.physics.enabled && o.userData.type !== 'light' && o.userData.type !== 'vfx' && !o.userData.isCharacter) {
                
                // إذا كان المستخدم يسحب المجسم حالياً، نوقف الجاذبية مؤقتاً
                if (this.engine.selectedObj === o && this.engine.transform.dragging) return;

                if (o.position.y > 0) {
                    o.userData.physics.vy -= 9.8 * dt;
                    o.position.y += o.userData.physics.vy * dt;
                    if (o.position.y <= 0) { 
                        o.position.y = 0; 
                        o.userData.physics.vy = 0; 
                    }
                }
            }
        });
    }
}
