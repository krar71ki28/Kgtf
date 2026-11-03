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
        this.jumpForce = 5.5;
        this.moveSpeed = 5;
        this.startPosition = null;
        this.startQuaternion = null;
        this.joyDir = { x: 0, y: 0 };

        this.forward = new THREE.Vector3();
        this.right = new THREE.Vector3();
        this.moveDirection = new THREE.Vector3();
        this.up = new THREE.Vector3(0, 1, 0);

        this.setupControls();
    }

    setupControls() {
        document.getElementById('btn-play').onclick = () => this.startPlay();
        document.getElementById('exit-play').onclick = () => this.stopPlay();

        const joyZone = document.getElementById('joystick-zone');
        const joyKnob = document.getElementById('joystick-knob');
        let pointerId = null;

        joyZone.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            pointerId = e.pointerId;
            joyZone.setPointerCapture(pointerId);
            this.updateJoystick(e, joyZone, joyKnob);
        });

        joyZone.addEventListener('pointermove', (e) => {
            if (e.pointerId !== pointerId) return;
            e.preventDefault();
            this.updateJoystick(e, joyZone, joyKnob);
        });

        const resetJoystick = (e) => {
            if (e.pointerId !== pointerId) return;
            pointerId = null;
            joyKnob.style.transform = 'translate(-50%, -50%)';
            this.joyDir = { x: 0, y: 0 };
        };

        joyZone.addEventListener('pointerup', resetJoystick);
        joyZone.addEventListener('pointercancel', resetJoystick);
        joyZone.addEventListener('lostpointercapture', () => {
            pointerId = null;
            joyKnob.style.transform = 'translate(-50%, -50%)';
            this.joyDir = { x: 0, y: 0 };
        });

        document.getElementById('btn-jump').addEventListener('pointerdown', (e) => {
            e.preventDefault();
            if (this.isPlaying && this.isGrounded) {
                this.jumpQueued = true;
            }
        });
    }

    updateJoystick(e, zone, knob) {
        const rect = zone.getBoundingClientRect();
        let dx = e.clientX - (rect.left + rect.width / 2);
        let dy = e.clientY - (rect.top + rect.height / 2);
        const distance = Math.hypot(dx, dy);

        if (distance > 40) {
            dx = dx / distance * 40;
            dy = dy / distance * 40;
        }

        knob.style.transform =
            `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

        this.joyDir.x = dx / 40;
        this.joyDir.y = dy / 40;
    }

    startPlay() {
        if (this.isPlaying) return;

        this.playerModel = this.engine.objects.find(
            o => o.userData.isCharacter
        );

        if (!this.playerModel) {
            alert('أضف شخصية أولاً!');
            return;
        }

        this.startPosition = this.playerModel.position.clone();
        this.startQuaternion = this.playerModel.quaternion.clone();

        this.playerBody = this.physics.addCharacter(this.playerModel);

        if (!this.playerBody) {
            this.playerModel = null;
            alert('تعذر إنشاء جسم الشخصية الفيزيائي');
            return;
        }

        this.playerBody.velocity.set(0, 0, 0);
        this.playerBody.angularVelocity.set(0, 0, 0);
        this.playerBody.wakeUp();

        this.isGrounded = false;
        this.jumpQueued = false;
        this.joyDir = { x: 0, y: 0 };
        this.isPlaying = true;

        document.body.classList.add('play-mode');
        document.getElementById('play-ui').style.display = 'block';
        this.engine.orbit.enabled = false;
        this.engine.camera.position.set(0, 5, 8);
    }

    stopPlay() {
        this.isPlaying = false;
        this.jumpQueued = false;
        this.isGrounded = false;
        this.joyDir = { x: 0, y: 0 };

        if (this.playerBody) {
            this.physics.removeObject(this.playerModel);
            this.playerBody = null;
        }

        if (this.playerModel && this.startPosition) {
            this.playerModel.position.copy(this.startPosition);
            this.playerModel.quaternion.copy(this.startQuaternion);
        }

        this.playerModel = null;
        this.startPosition = null;
        this.startQuaternion = null;

        document.body.classList.remove('play-mode');
        document.getElementById('play-ui').style.display = 'none';
        this.engine.orbit.enabled = true;
        this.engine.camera.position.set(6, 6, 8);
    }

    update(dt) {
        if (!this.isPlaying || !this.playerBody) return;

        if (!this.engine.objects.includes(this.playerModel)) {
            this.stopPlay();
            return;
        }

        const body = this.playerBody;

        this.engine.camera.getWorldDirection(this.forward);
        this.forward.y = 0;

        if (this.forward.lengthSq() < 0.0001) {
            this.forward.set(0, 0, -1);
        } else {
            this.forward.normalize();
        }

        this.right.crossVectors(this.forward, this.up).normalize();

        const moveX = this.joyDir.x;
        const moveForward = -this.joyDir.y;

        this.moveDirection.set(0, 0, 0);
        this.moveDirection.addScaledVector(this.right, moveX);
        this.moveDirection.addScaledVector(this.forward, moveForward);

        if (this.moveDirection.lengthSq() > 1) {
            this.moveDirection.normalize();
        }

        body.velocity.x = this.moveDirection.x * this.moveSpeed;
        body.velocity.z = this.moveDirection.z * this.moveSpeed;

        if (this.moveDirection.lengthSq() > 0.001) {
            const angle = Math.atan2(
                this.moveDirection.x,
                this.moveDirection.z
            );
            this.physics.setCharacterYaw(body, angle);
            body.wakeUp();
        }

        if (this.jumpQueued && this.isGrounded) {
            body.velocity.y = this.jumpForce;
            body.wakeUp();
            this.isGrounded = false;
        }

        const debugMove = document.getElementById('debug-move');
        if (debugMove) {
            debugMove.textContent =
                `Input: ${moveX.toFixed(2)}, ${moveForward.toFixed(2)} | ` +
                `Velocity: ${body.velocity.x.toFixed(2)}, ${body.velocity.z.toFixed(2)}`;
        }

        this.jumpQueued = false;
    }

    updateCamera(dt) {
        if (!this.isPlaying || !this.playerModel || !this.playerBody) return;

        this.isGrounded = this.physics.isGrounded(this.playerBody);

        const targetCamPos = this.playerModel.position.clone().add(
            new THREE.Vector3(0, 3, 6)
        );

        this.engine.camera.position.lerp(
            targetCamPos,
            Math.min(1, 5 * dt)
        );

        this.engine.camera.lookAt(
            this.playerModel.position.clone().add(
                new THREE.Vector3(0, 0.9, 0)
            )
        );
    }
}
