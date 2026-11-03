import * as THREE from 'three';

export class Player {
    constructor(engine, physics) {
        this.engine = engine;
        this.physics = physics;

        this.isPlaying = false;
        this.playerModel = null;
        this.playerBody = null;
        this.isGrounded = false;
        this.jumpQueued = false;

        this.moveSpeed = 5;
        this.jumpForce = 5.5;
        this.joyDir = { x: 0, y: 0 };

        this.forward = new THREE.Vector3();
        this.right = new THREE.Vector3();
        this.up = new THREE.Vector3(0, 1, 0);
        this.moveDirection = new THREE.Vector3();

        this.setupControls();
    }

    setupControls() {
        document.getElementById('btn-play').onclick = () => this.startPlay();
        document.getElementById('exit-play').onclick = () => this.stopPlay();

        const zone = document.getElementById('joystick-zone');
        const knob = document.getElementById('joystick-knob');
        let pointer = null;

        zone.addEventListener('pointerdown', e => {
            e.preventDefault();
            pointer = e.pointerId;
            zone.setPointerCapture(pointer);
            this.moveJoystick(e, zone, knob);
        });

        zone.addEventListener('pointermove', e => {
            if (e.pointerId !== pointer) return;
            this.moveJoystick(e, zone, knob);
        });

        const reset = e => {
            if (e.pointerId !== pointer) return;
            pointer = null;
            this.joyDir = { x: 0, y: 0 };
            knob.style.transform = 'translate(-50%, -50%)';
        };

        zone.addEventListener('pointerup', reset);
        zone.addEventListener('pointercancel', reset);

        document.getElementById('btn-jump').addEventListener('pointerdown', e => {
            e.preventDefault();
            if (this.isPlaying) this.jumpQueued = true;
        });
    }

    moveJoystick(e, zone, knob) {
        const rect = zone.getBoundingClientRect();
        let x = e.clientX - rect.left - rect.width / 2;
        let y = e.clientY - rect.top - rect.height / 2;
        const length = Math.hypot(x, y);

        if (length > 40) {
            x = x / length * 40;
            y = y / length * 40;
        }

        this.joyDir.x = x / 40;
        this.joyDir.y = y / 40;

        knob.style.transform =
            `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    }

    startPlay() {
        if (this.isPlaying) return;

        this.playerModel = this.engine.objects.find(
            obj => obj.userData.isCharacter
        );

        if (!this.playerModel) {
            alert('أضف شخصية أولاً!');
            return;
        }

        this.playerBody = this.physics.addCharacter(this.playerModel);
        if (!this.playerBody) return;

        this.playerBody.velocity.set(0, 0, 0);
        this.playerBody.wakeUp();

        this.isPlaying = true;
        this.isGrounded = false;

        document.body.classList.add('play-mode');
        document.getElementById('play-ui').style.display = 'block';
        this.engine.orbit.enabled = false;
    }

    stopPlay() {
        this.isPlaying = false;
        this.jumpQueued = false;
        this.joyDir = { x: 0, y: 0 };

        if (this.playerModel) {
            this.physics.removeObject(this.playerModel);
        }

        this.playerModel = null;
        this.playerBody = null;

        document.body.classList.remove('play-mode');
        document.getElementById('play-ui').style.display = 'none';
        this.engine.orbit.enabled = true;
    }

    update() {
        if (!this.isPlaying || !this.playerBody) return;

        const body = this.playerBody;

        this.engine.camera.getWorldDirection(this.forward);
        this.forward.y = 0;
        this.forward.normalize();

        this.right.crossVectors(this.forward, this.up).normalize();

        this.moveDirection.set(0, 0, 0);
        this.moveDirection.addScaledVector(this.right, this.joyDir.x);
        this.moveDirection.addScaledVector(this.forward, -this.joyDir.y);

        if (this.moveDirection.lengthSq() > 1) {
            this.moveDirection.normalize();
        }

        body.velocity.x = this.moveDirection.x * this.moveSpeed;
        body.velocity.z = this.moveDirection.z * this.moveSpeed;

        if (this.jumpQueued && this.physics.isGrounded(body)) {
            body.velocity.y = this.jumpForce;
            body.wakeUp();
        }

        this.jumpQueued = false;
    }

    updateCamera(dt) {
        if (!this.isPlaying || !this.playerModel) return;

        this.isGrounded = this.physics.isGrounded(this.playerBody);

        const target = this.playerModel.position.clone().add(
            new THREE.Vector3(0, 3, 6)
        );

        this.engine.camera.position.lerp(target, Math.min(1, 5 * dt));
        this.engine.camera.lookAt(
            this.playerModel.position.x,
            this.playerModel.position.y + 0.9,
            this.playerModel.position.z
        );
    }
}
