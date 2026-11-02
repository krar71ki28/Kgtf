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

        // الأرضية الفيزيائية
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
    }

    addObject(mesh) {
        if (this.bodies.has(mesh)) return;

        let shape;
        let mass = 1;

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

    update(dt) {
        // اكتشاف المجسمات الجديدة
        for (const mesh of this.engine.objects) {
            this.addObject(mesh);
        }

        // إزالة الأجسام التي حُذفت من المشهد
        for (const [mesh, body] of this.bodies) {
            if (!this.engine.objects.includes(mesh)) {
                this.world.removeBody(body);
                this.bodies.delete(mesh);
            }
        }

        // تحديث الفيزياء
        this.world.step(1 / 60, Math.min(dt, 0.1), 5);

        // مزامنة مواقع المجسمات مع أجسام الفيزياء
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
        for (const body of this.bodies.values()) {
            this.world.removeBody(body);
        }

        this.bodies.clear();
    }
}
