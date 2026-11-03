import * as CANNON from 'cannon-es';

export class Physics {
    constructor(engine) {
        this.engine = engine;

        this.world = new CANNON.World({
            gravity: new CANNON.Vec3(0, -9.82, 0)
        });

        this.world.allowSleep = true;

        this.world.defaultContactMaterial.friction = 0.4;
        this.world.defaultContactMaterial.restitution = 0.1;

        this.bodies = new Map();

        const groundBody = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Plane()
        });

        groundBody.quaternion.setFromEuler(
            -Math.PI / 2,
            0,
            0
        );

        this.world.addBody(groundBody);

        this.removeListener = this.engine.onObjectRemoved(
            (mesh) => {
                this.removeObject(mesh);
            }
        );
    }

    addObject(mesh) {
        if (this.bodies.has(mesh)) return;

        let shape;
        const mass = 1;

        if (mesh.userData.type === 'cube') {
            shape = new CANNON.Box(
                new CANNON.Vec3(
                    0.5 * Math.abs(mesh.scale.x),
                    0.5 * Math.abs(mesh.scale.y),
                    0.5 * Math.abs(mesh.scale.z)
                )
            );

        } else if (mesh.userData.type === 'sphere') {
            const scale = Math.max(
                Math.abs(mesh.scale.x),
                Math.abs(mesh.scale.y),
                Math.abs(mesh.scale.z)
            );

            shape = new CANNON.Sphere(0.5 * scale);

        } else {
            return;
        }

        const body = new CANNON.Body({
            mass,
            shape,
            position: new CANNON.Vec3(
                mesh.position.x,
                mesh.position.y,
                mesh.position.z
            )
        });

        body.quaternion.set(
            mesh.quaternion.x,
            mesh.quaternion.y,
            mesh.quaternion.z,
            mesh.quaternion.w
        );

        body.linearDamping = 0.01;
        body.angularDamping = 0.05;
        body.allowSleep = true;

        this.world.addBody(body);
        this.bodies.set(mesh, body);
    }

    removeObject(mesh) {
        const body = this.bodies.get(mesh);

        if (!body) return false;

        this.world.removeBody(body);
        this.bodies.delete(mesh);

        return true;
    }

    update(dt) {
        for (const mesh of this.engine.objects) {
            this.addObject(mesh);
        }

        const activeObjects = new Set(
            this.engine.objects
        );

        for (const mesh of this.bodies.keys()) {
            if (!activeObjects.has(mesh)) {
                this.removeObject(mesh);
            }
        }

        this.world.step(
            1 / 60,
            Math.min(dt, 0.1),
            5
        );

        for (const [mesh, body] of this.bodies) {
            mesh.position.set(
                body.position.x,
                body.position.y,
                body.position.z
            );

            mesh.quaternion.set(
                body.quaternion.x,
                body.quaternion.y,
                body.quaternion.z,
                body.quaternion.w
            );
        }
    }

    clear() {
        for (const mesh of [...this.bodies.keys()]) {
            this.removeObject(mesh);
        }
    }

    dispose() {
        this.clear();

        if (this.removeListener) {
            this.removeListener();
            this.removeListener = null;
        }
    }
}
