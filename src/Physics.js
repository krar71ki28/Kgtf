import * as CANNON from 'cannon-es';

export class Physics {
    constructor(engine) {
        this.engine = engine;
        this.world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.allowSleep = true;

        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 });
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.world.addBody(groundBody);
    }

    addNode(mesh) {
        if (mesh.userData.type === 'character') return;

        let shape;
        if (mesh.userData.type === 'cube') shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));
        else if (mesh.userData.type === 'sphere') shape = new CANNON.Sphere(0.5);
        else shape = new CANNON.Box(new CANNON.Vec3(0.5, 0.5, 0.5));

        let mass = mesh.userData.physicsEnabled ? 1 : 0;

        const body = new CANNON.Body({
            mass: mass,
            shape: shape,
            position: new CANNON.Vec3(mesh.position.x, mesh.position.y, mesh.position.z)
        });

        this.world.addBody(body);
        mesh.userData.body = body;
    }

    removeNode(mesh) {
        if (mesh.userData.body) {
            this.world.removeBody(mesh.userData.body);
            delete mesh.userData.body;
        }
    }

    update(dt) {
        this.world.step(1 / 60, dt, 3);
        this.engine.objects.forEach(mesh => {
            if (mesh.userData.body && mesh.userData.type !== 'character') {
                mesh.position.copy(mesh.userData.body.position);
                mesh.quaternion.copy(mesh.userData.body.quaternion);
            }
        });
    }
}
