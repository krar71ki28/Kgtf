import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Physics {
    constructor(engine) {
        this.engine = engine;
        
        // 1. إنشاء العالم الفيزيائي
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0) // الجاذبية الأرضية
        });
        
        // تحسين الأداء: استخدام Broadphase سريع
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.allowSleep = true; // إيقاف الحسابات للمجسمات الساكنة (توفير للمعالج)

        // 2. إنشاء أرضية فيزيائية
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 }); // Mass = 0 يعني جسم ساكن لا يتحرك
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.world.addBody(groundBody);
    }

    // ربط مجسم KGTFNode بالعالم الفيزيائي
    addNode(node) {
        let shape;
        let mass = 0; // افتراضياً ساكن

        // تحديد شكل الاصطدام بناءً على نوع المجسم
        if (node.userData.type === 'cube') {
            shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        } else if (node.userData.type === 'sphere') {
            shape = new CANNON.Sphere(0.5);
        } else if (node.userData.type === 'tree') {
            // الشجرة نعتبرها أسطوانة (تقريباً)
            shape = new CANNON.Cylinder(0.2, 0.2, 1.5, 8);
        } else {
            // للمجسمات غير المعروفة (مثل GLB)، نستخدم صندوق افتراضي
            shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        }

        // إذا كانت الجاذبية مفعلة في المحرر، نعطيه كتلة (يتحرك)
        if (node.userData.physics && node.userData.physics.enabled) {
            mass = 1; 
        }

        const body = new CANNON.Body({
            mass: mass,
            shape: shape,
            position: new CANNON.Vec3(node.position.x, node.position.y, node.position.z)
        });

        this.world.addBody(body);
        node.userData.physicsBody = body; // ربط الجسم الفيزيائي بالمجسم
    }

    removeNode(node) {
        if (node.userData.physicsBody) {
            this.world.removeBody(node.userData.physicsBody);
            delete node.userData.physicsBody;
        }
    }

    // تحديث العالم الفيزيائي ومزامنة المواقع
    update(dt) {
        // خطوة المحاكاة (نستخدم 1/60 كخطوة ثابتة لضمان الاستقرار)
        this.world.step(1 / 60, dt, 3);

        // مزامنة مواقع المجسمات من الفيزياء إلى Three.js
        this.engine.objects.forEach(node => {
            if (node.userData.physicsBody) {
                node.position.copy(node.userData.physicsBody.position);
                node.quaternion.copy(node.userData.physicsBody.quaternion);
            }
        });
    }

    // فحص اصطدام اللاعب (شعاع من موقع اللاعب الحالي إلى الموقع الجديد)
    checkPlayerCollision(nextPos, playerBoxSize) {
        const from = new CANNON.Vec3(this.engine.objects.find(o => o.userData.isCharacter)?.position.x || 0, 0.75, this.engine.objects.find(o => o.userData.isCharacter)?.position.z || 0);
        const to = new CANNON.Vec3(nextPos.x, nextPos.y + 0.75, nextPos.z);
        
        const result = new CANNON.RaycastResult();
        this.world.raycastClosest(from, to, { skipBackfaces: true }, result);
        
        return result.hasHit;
    }
}
