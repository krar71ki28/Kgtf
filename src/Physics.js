import * as THREE from 'three';

export class Physics {
    constructor(engine) {
        this.engine = engine;
    }

    // فحص الاصطدام للاعب (قبل ما يتحرك)
    checkPlayerCollision(nextPos, playerBoxSize) {
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            nextPos.clone().add(new THREE.Vector3(0, 0.75, 0)), // مركز اللاعب
            playerBoxSize
        );

        // فحص كل المجسمات ما عدا الأرضية واللاعب نفسه والإضاءة والمؤثرات
        for (let i = 0; i < this.engine.objects.length; i++) {
            const obj = this.engine.objects[i];
            if (obj.userData.type === 'character' || obj.userData.type === 'light' || obj.userData.type === 'vfx') continue;
            
            const objBox = new THREE.Box3().setFromObject(obj);
            if (playerBox.intersectsBox(objBox)) {
                return true; // يوجد اصطدام
            }
        }
        return false;
    }

    // تطبيق الجاذبية على المجسمات
    updateGravity(dt) {
        this.engine.objects.forEach(o => {
            if (o !== this.engine.selectedObj && o.userData.type !== 'light' && o.userData.type !== 'vfx' && !o.userData.isCharacter) {
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
