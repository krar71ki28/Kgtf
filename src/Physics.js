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
        this.characterOffsets = new Map();

        this.characterHeight = 1.83;
        this.characterRadius = 0.30;

        this.groundBody = new CANNON.Body({
            mass: 0,
            shape: new CANNON.Plane()
        });

        this.groundBody.quaternion.setFromEuler(
            -Math.PI / 2,
            0,
            0
        );

        this.world.addBody(this.groundBody);

        this.removeListener = this.engine.onObjectRemoved(
            (mesh) => this.removeObject(mesh)
        );
    }

    addObject(mesh) {
        if (this.bodies.has(mesh)) return;
        if (mesh.userData.isCharacter) return;

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

    addCharacter(mesh) {
        if (!mesh || !mesh.userData.isCharacter) {
            return null;
        }

        if (this.bodies.has(mesh)) {
            return this.bodies.get(mesh);
        }

        const height = this.characterHeight;
        const radius = this.characterRadius;
        const cylinderHeight = height - (radius * 2);
        const halfCylinder = cylinderHeight * 0.5;
        const centerY = height * 0.5;

        const body = new CANNON.Body({
            mass: 1,
            position: new CANNON.Vec3(
                mesh.position.x,
                mesh.position.y + centerY,
                mesh.position.z
            )
        });

        body.addShape(
            new CANNON.Cylinder(
                radius,
                radius,
                cylinderHeight,
                12
            )
        );

        body.addShape(
            new CANNON.Sphere(radius),
            new CANNON.Vec3(0, halfCylinder, 0)
        );

        body.addShape(
            new CANNON.Sphere(radius),
            new CANNON.Vec3(0, -halfCylinder, 0)
        );

        body.quaternion.set(
            mesh.quaternion.x,
            mesh.quaternion.y,
            mesh.quaternion.z,
            mesh.quaternion.w
        );

        body.fixedRotation = true;
        body.updateMassProperties();

        body.linearDamping = 0;
        body.angularDamping = 1;
        body.allowSleep = false;

        this.world.addBody(body);

        this.bodies.set(mesh, body);
        this.characterOffsets.set(mesh, centerY);

        return body;
    }

    setCharacterYaw(body, angle) {
        if (!body) return;

        body.quaternion.setFromAxisAngle(
            new CANNON.Vec3(0, 1, 0),
            angle
        );

        body.aabbNeedsUpdate = true;
        body.wakeUp();
    }

    isGrounded(body) {
        if (!body) return false;

        for (const contact of this.world.contacts) {
            if (
                contact.bi === body &&
                contact.ni.y < -0.5
            ) {
                return true;
            }

            if (
                contact.bj === body &&
                contact.ni.y > 0.5
            ) {
                return true;
            }
        }

        return false;
    }

    removeObject(mesh) {
        const body = this.bodies.get(mesh);

        if (!body) return false;

        this.world.removeBody(body);
        this.bodies.delete(mesh);
        this.characterOffsets.delete(mesh);

        return true;
    }

    update(dt) {
        for (const mesh of this.engine.objects) {
            this.addObject(mesh);
        }

        const activeObjects = new Set(this.engine.objects);

        for (const mesh of this.bodies.keys()) {
            if (!activeObjects.has(mesh)) {
                this.removeObject(mesh);
            }
        }

        this.world.step(
            1 / 60,
            Math.min(Math.max(dt, 0), 0.1),
            5
        );

        for (const [mesh, body] of this.bodies) {
            const offsetY = this.characterOffsets.get(mesh) || 0;

            mesh.position.set(
                body.position.x,
                body.position.y - offsetY,
                body.position.z
            );

            mesh.quaternion.set(
                body.quaternion.x,
                body.quaternion.y,
                body.quaternion.z,
                body.quaternion.w
            );
        }

        const debug = document.getElementById('physics-debug');
        if (debug) {
            const player = [...this.bodies.entries()].find(
                ([mesh]) => mesh.userData.isCharacter
            );
            const body = player ? player[1] : null;

            debug.style.display = body ? 'block' : 'none';
            document.getElementById('debug-world').textContent =
                `World Bodies: ${this.world.bodies.length}`;
            document.getElementById('debug-body').textContent =
                `Player Body: ${body && body.world === this.world ? 'ACTIVE' : 'MISSING'}`;
            document.getElementById('debug-y').textContent =
                `Player Y: ${body ? body.position.y.toFixed(3) : '--'}`;
            document.getElementById('debug-vy').textContent =
                `Velocity Y: ${body ? body.velocity.y.toFixed(3) : '--'}`;
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

        this.world.removeBody(this.groundBody);
    }
}
