import * as CANNON from 'cannon-es';

export class Physics {
    constructor(engine) {
        this.engine = engine;
        this.world = new CANNON.World();
        this.world.gravity.set(0, -9.82, 0);
        this.world.allowSleep = false;

        this.bodies = new Map();
        this.characterBody = null;

        this.groundBody = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Plane()
        });

        this.groundBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.world.addBody(this.groundBody);

        this.removeListener = engine.onObjectRemoved(
            mesh => this.removeObject(mesh)
        );
    }

    addObject(mesh) {
        if (this.bodies.has(mesh) || mesh.userData.isCharacter) return;

        let shape;

        if (mesh.userData.type === 'cube') {
            shape = new CANNON.Box(new CANNON.Vec3(
                Math.abs(mesh.scale.x) * 0.5,
                Math.abs(mesh.scale.y) * 0.5,
                Math.abs(mesh.scale.z) * 0.5
            ));
        } else if (mesh.userData.type === 'sphere') {
            shape = new CANNON.Sphere(0.5);
        } else {
            return;
        }

        const body = new CANNON.Body({
            mass: 1,
            shape,
            position: new CANNON.Vec3(
                mesh.position.x,
                mesh.position.y,
                mesh.position.z
            )
        });

        body.linearDamping = 0.01;
        this.world.addBody(body);
        this.bodies.set(mesh, body);
    }

    addCharacter(mesh) {
        if (!mesh || !mesh.userData.isCharacter) return null;
        if (this.characterBody) return this.characterBody;

        const body = new CANNON.Body({
            mass: 1,
            position: new CANNON.Vec3(
                mesh.position.x,
                mesh.position.y + 0.915,
                mesh.position.z
            ),
            shape: new CANNON.Sphere(0.3)
        });

        body.addShape(
            new CANNON.Cylinder(0.3, 0.3, 1.23, 16),
            new CANNON.Vec3(0, 0, 0)
        );

        body.fixedRotation = true;
        body.updateMassProperties();
        body.linearDamping = 0;
        body.allowSleep = false;

        this.world.addBody(body);
        this.characterBody = body;
        this.bodies.set(mesh, body);

        return body;
    }

    isGrounded(body) {
        if (!body) return false;

        for (const contact of this.world.contacts) {
            if (contact.bi === body && contact.ni.y < -0.5) return true;
            if (contact.bj === body && contact.ni.y > 0.5) return true;
        }

        return false;
    }

    removeObject(mesh) {
        const body = this.bodies.get(mesh);
        if (!body) return false;

        this.world.removeBody(body);
        this.bodies.delete(mesh);

        if (body === this.characterBody) this.characterBody = null;
        return true;
    }

    update(dt) {
        for (const mesh of this.engine.objects) this.addObject(mesh);

        for (const mesh of [...this.bodies.keys()]) {
            if (!this.engine.objects.includes(mesh)) this.removeObject(mesh);
        }

        this.world.step(1 / 60, Math.min(Math.max(dt, 0), 0.1), 5);

        for (const [mesh, body] of this.bodies) {
            if (mesh.userData.isCharacter) {
                mesh.position.set(
                    body.position.x,
                    body.position.y - 0.915,
                    body.position.z
                );
            } else {
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
    }

    dispose() {
        for (const mesh of [...this.bodies.keys()]) this.removeObject(mesh);
        this.world.removeBody(this.groundBody);
        this.removeListener?.();
    }
}
