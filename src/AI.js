import * as THREE from 'three';

export class AIManager {
    constructor(engine) {
        this.engine = engine;
        this.enemies = [];
        this.spawnInterval = 5; 
        this.timeSinceLastSpawn = 0;
        this.isSpawning = false;
    }

    toggleSpawning(enabled) {
        this.isSpawning = enabled;
    }

    spawnEnemy() {
        if (!this.engine.playerModel) return;

        const enemy = this.engine.createObject('cube');
        if (!enemy) return;
        
        enemy.material.color.setHex(0xff3333); // أحمر
        enemy.userData.type = 'enemy';
        enemy.userData.health = 100; // ✅ إضافة الصحة
        enemy.userData.isEnemy = true;
        
        const angle = Math.random() * Math.PI * 2;
        const distance = 8 + Math.random() * 4;
        enemy.position.set(
            this.engine.playerModel.position.x + Math.cos(angle) * distance,
            0.5,
            this.engine.playerModel.position.z + Math.sin(angle) * distance
        );

        this.enemies.push(enemy);
    }

    takeDamage(enemy, amount) {
        if (enemy.userData.health !== undefined) {
            enemy.userData.health -= amount;
            // تأثير وميض عند الإصابة
            enemy.material.emissive.setHex(0xffffff);
            setTimeout(() => { if(enemy.material) enemy.material.emissive.setHex(0x000000); }, 100);

            if (enemy.userData.health <= 0) {
                this.killEnemy(enemy);
            }
        }
    }

    killEnemy(enemy) {
        this.engine.vfx.spawnExplosion(enemy.position);
        this.engine.logic.score += 50; // مكافأة القتل
        this.engine.ui.updateScore(this.engine.logic.score);
        
        this.engine.removeObject(enemy);
        this.enemies = this.enemies.filter(e => e !== enemy);
    }

    update(dt) {
        if (this.isSpawning) {
            this.timeSinceLastSpawn += dt;
            if (this.timeSinceLastSpawn >= this.spawnInterval) {
                this.spawnEnemy();
                this.timeSinceLastSpawn = 0;
            }
        }

        this.enemies.forEach(enemy => {
            if (!this.engine.playerModel || !enemy.parent) return; // التأكد من أن العدو موجود

            const direction = new THREE.Vector3().subVectors(this.engine.playerModel.position, enemy.position);
            direction.y = 0;

            const distance = direction.length();
            if (distance > 1.5) { 
                direction.normalize();
                const speed = 2 * dt;
                
                const raycaster = new THREE.Raycaster(enemy.position.clone().add(new THREE.Vector3(0, 0.5, 0)), direction, 0, 1.5);
                const obstacles = this.engine.objects.filter(o => o !== enemy && o.userData.type !== 'enemy' && o.userData.type !== 'vfx' && o.userData.type !== 'light' && o.userData.type !== 'character');
                const hits = raycaster.intersectObjects(obstacles, true);

                if (hits.length === 0) {
                    enemy.position.x += direction.x * speed;
                    enemy.position.z += direction.z * speed;
                } else {
                    const perpDir = new THREE.Vector3(-direction.z, 0, direction.x);
                    enemy.position.x += perpDir.x * speed;
                    enemy.position.z += perpDir.z * speed;
                }

                const angle = Math.atan2(direction.x, direction.z);
                enemy.rotation.y = angle;
            }
        });
    }
}
