import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Physics {
    constructor(engine) {
        this.engine = engine;
        
        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0)
        });
        
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.allowSleep = true;
        this.world.defaultContactMaterial.friction = 0.4;

        // ✅ إرجاع الأرضية المسطحة للفيزياء
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.world.addBody(groundBody);
    }

    addNode(node) {
        if (node.userData.type === 'character') return;

        let shape;
        let mass = 0; 

        if (node.userData.type === 'cube') shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        else if (node.userData.type === 'sphere') shape = new CANNON.Sphere(0.5);
        else shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));

        if (node.userData.physicsEnabled) mass = 1; 

        const body = new CANNON.Body({
            mass: mass,
            shape: shape,
            position: new CANNON.Vec3(node.position.x, node.position.y, node.position.z)
        });

        this.world.addBody(body);
        node.userData.physicsBody = body; 
    }

    removeNode(node) {
        if (node.userData.physicsBody) {
            this.world.removeBody(node.userData.physicsBody);
            delete node.userData.physicsBody;
        }
    }

    update(dt) {
        this.world.step(1 / 60, dt, 3);

        this.engine.objects.forEach(node => {
            if (node.userData.physicsBody && node.userData.type !== 'character') {
                node.position.copy(node.userData.physicsBody.position);
                node.quaternion.copy(node.userData.physicsBody.quaternion);
            }
        });
    }

    checkPlayerCollision(nextPos, playerBoxSize) {
        const nextBox = new THREE.Box3().setFromCenterAndSize(
            nextPos.clone().add(new THREE.Vector3(0, 1, 0)),
            playerBoxSize
        );

        const playerObj = this.engine.objects.find(o => o.userData.isCharacter);
        if (!playerObj) return false;

        const currentBox = new THREE.Box3().setFromCenterAndSize(
            playerObj.position.clone().add(new THREE.Vector3(0, 1, 0)),
            playerBoxSize
        );

        for (let i = 0; i < this.engine.objects.length; i++) {
            const obj = this.engine.objects[i];
            if (obj.userData.isCharacter || obj.userData.type === 'light' || obj.userData.type === 'vfx') continue;
            
            const objBox = new THREE.Box3().setFromObject(obj);
            
            if (nextBox.intersectsBox(objBox)) {
                if (currentBox.intersectsBox(objBox)) {
                    continue; 
                }
                return true; 
            }
        }
        return false;
    }
}
