import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class AIManager {
    constructor(engine) {
        this.engine = engine;
        this.enemies = [];
        this.spawnInterval = 5; // كل 5 ثواني
        this.timeSinceLastSpawn = 0;
        this.isSpawning = false;
    }

    toggleSpawning(enabled) {
        this.isSpawning = enabled;
    }

    spawnEnemy() {
        if (!this.engine.playerModel) return;

        // إنشاء عدو (مكعب أحمر)
        const enemy = this.engine.createObject('cube');
        if (!enemy) return;
        
        enemy.material.color.setHex(0xff0000); // لون أحمر
        enemy.userData.type = 'enemy';
        
        // إعطاؤه سرعة وموقعاً عشوائياً بعيداً عن اللاعب
        const angle = Math.random() * Math.PI * 2;
        const distance = 8 + Math.random() * 4;
        enemy.position.set(
            this.engine.playerModel.position.x + Math.cos(angle) * distance,
            0.5,
            this.engine.playerModel.position.z + Math.sin(angle) * distance
        );

        this.enemies.push(enemy);
        console.log('Enemy spawned at:', enemy.position);
    }

    update(dt) {
        // توليد الأعداء تلقائياً
        if (this.isSpawning) {
            this.timeSinceLastSpawn += dt;
            if (this.timeSinceLastSpawn >= this.spawnInterval) {
                this.spawnEnemy();
                this.timeSinceLastSpawn = 0;
            }
        }

        // تحريك الأعداء نحو اللاعب
        this.enemies.forEach(enemy => {
            if (!this.engine.playerModel) return;

            const direction = new THREE.Vector3().subVectors(this.engine.playerModel.position, enemy.position);
            direction.y = 0; // الحركة على المستوى الأفقي فقط

            const distance = direction.length();
            if (distance > 1.5) { // التوقف عند مسافة قريبة
                direction.normalize();
                const speed = 2 * dt;
                
                // ✅ تجنب العوائق باستخدام Raycaster (مستوحى من Three.js AI)
                const raycaster = new THREE.Raycaster(enemy.position.clone().add(new THREE.Vector3(0, 0.5, 0)), direction, 0, 1.5);
                const obstacles = this.engine.objects.filter(o => o !== enemy && o.userData.type !== 'enemy' && o.userData.type !== 'vfx' && o.userData.type !== 'light' && o.userData.type !== 'character');
                const hits = raycaster.intersectObjects(obstacles, true);

                if (hits.length === 0) {
                    enemy.position.x += direction.x * speed;
                    enemy.position.z += direction.z * speed;
                } else {
                    // إذا كان هناك عائق، يحاول الالتفاف حوله
                    const perpDir = new THREE.Vector3(-direction.z, 0, direction.x);
                    enemy.position.x += perpDir.x * speed;
                    enemy.position.z += perpDir.z * speed;
                }

                // تدوير العدو نحو الحركة
                const angle = Math.atan2(direction.x, direction.z);
                enemy.rotation.y = angle;
            }
        });
    }
}
