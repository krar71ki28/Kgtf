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

        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.world.addBody(groundBody);
    }

    addNode(node) {
        // نتجاهل اللاعب تماماً في الفيزياء لضمان حركته بحرية
        if (node.userData.type === 'character') return;

        let shape;
        let mass = 0; 

        if (node.userData.type === 'cube') shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        else if (node.userData.type === 'sphere') shape = new CANNON.Sphere(0.5);
        else if (node.userData.type === 'tree') shape = new CANNON.Cylinder(0.2, 0.2, 1.5, 8);
        else shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));

        if (node.userData.physics && node.userData.physics.enabled) mass = 1; 

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
            // نحدث مواقع المجسمات فقط (وليس اللاعب)
            if (node.userData.physicsBody && node.userData.type !== 'character') {
                node.position.copy(node.userData.physicsBody.position);
                node.quaternion.copy(node.userData.physicsBody.quaternion);
            }
        });
    }
}
