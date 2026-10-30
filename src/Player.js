import * as THREE from 'three';

export class Player {
    constructor(engine) {
        this.engine = engine;
        this.isPlaying = false;
        this.keys = {};
        this.direction = new THREE.Vector3();
        this.targetVelocity = new THREE.Vector3();
        this.currentVelocity = new THREE.Vector3();
        this.joystickActive = false;
        this.joystickDir = { x: 0, y: 0 };
        this.velocityY = 0;
        this.isGrounded = true;

        this.cameraYaw = 0; 
        this.cameraPitch = 0.4; 
        this.lastTouch = { x: 0, y: 0 };

        this.playerBoxSize = new THREE.Vector3(0.6, 1.5, 0.6);

        this.setupControls();
    }

    setupControls() {
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        document.getElementById('btn-play').onclick = () => this.startPlay();
        document.getElementById('exit-play').onclick = () => this.stopPlay();

        const zone = document.getElementById('joystick-zone');
        const knob = document.getElementById('joystick-knob');
        const base = document.getElementById('joystick-base');

        let touchStart = null;
        const maxDist = 40;

        zone.addEventListener('touchstart', (e) => { e.stopPropagation(); const touch = e.touches[0]; const rect = base.getBoundingClientRect(); touchStart = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 }; this.joystickActive = true; });
        zone.addEventListener('touchmove', (e) => {
            e.stopPropagation();
            if (!this.joystickActive) return;
            const touch = e.touches[0];
            let dx = touch.clientX - touchStart.x;
            let dy = touch.clientY - touchStart.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
            knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            this.joystickDir.x = dx / maxDist;
            this.joystickDir.y = dy / maxDist;
        });
        zone.addEventListener('touchend', () => { this.joystickActive = false; knob.style.transform = `translate(-50%, -50%)`; this.joystickDir = { x: 0, y: 0 }; });

        document.getElementById('btn-jump').addEventListener('touchstart', (e) => {
            e.preventDefault(); e.stopPropagation();
            if (this.isGrounded) { this.velocityY = 8; this.isGrounded = false; }
        });

        const canvas = document.getElementById('viewport');
        canvas.addEventListener('touchstart', (e) => {
            if (!this.isPlaying) return;
            this.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        });
        canvas.addEventListener('touchmove', (e) => {
            if (!this.isPlaying) return;
            const touch = e.touches[0];
            const dx = touch.clientX - this.lastTouch.x;
            const dy = touch.clientY - this.lastTouch.y;
            this.cameraYaw -= dx * 0.01;
            this.cameraPitch = Math.max(0.1, Math.min(1.5, this.cameraPitch + dy * 0.01));
            this.lastTouch = { x: touch.clientX, y: touch.clientY };
        });
    }

    startPlay() {
        const playerObj = this.engine.objects.find(o => o.userData.type === 'character');
        if (!playerObj) { alert('أضف شخصية أولاً لتتمكن من اللعب!'); return; }
        
        this.isPlaying = true;
        this.playerModel = playerObj;
        document.body.classList.add('play-mode');
        this.engine.selectObject(null);
        this.engine.controls.enabled = false;
        
        this.cameraYaw = this.playerModel.rotation.y;
        this.cameraPitch = 0.4;
        
        this.updateCamera(1); 
        this.engine.resize();
    }

    stopPlay() {
        this.isPlaying = false;
        document.body.classList.remove('play-mode');
        this.engine.controls.enabled = true;
        this.engine.camera.position.set(8, 6, 10);
        this.engine.controls.target.set(0, 2, 0);
        this.engine.resize();
    }

    updateCamera(dt) {
        const dist = 8;
        const h = 4;
        const offsetX = Math.sin(this.cameraYaw) * dist * Math.cos(this.cameraPitch);
        const offsetZ = Math.cos(this.cameraYaw) * dist * Math.cos(this.cameraPitch);
        const offsetY = h + Math.sin(this.cameraPitch) * dist;

        const desiredCamPos = this.playerModel.position.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ));
        this.engine.camera.position.lerp(desiredCamPos, 10 * dt);
        if (this.engine.camera.position.y < 0.5) this.engine.camera.position.y = 0.5;
        this.engine.camera.lookAt(this.playerModel.position.x, this.playerModel.position.y + 1.5, this.playerModel.position.z);
    }

    update(dt) {
        if (!this.isPlaying || !this.playerModel) return;

        const maxSpeed = 6;
        this.direction.set(0, 0, 0);

        const camForward = new THREE.Vector3();
        this.engine.camera.getWorldDirection(camForward);
        camForward.y = 0; camForward.normalize();
        const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

        if (this.keys['KeyW'] || this.keys['ArrowUp']) this.direction.add(camForward);
        if (this.keys['KeyS'] || this.keys['ArrowDown']) this.direction.sub(camForward);
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.direction.sub(camRight);
        if (this.keys['KeyD'] || this.keys['ArrowRight']) this.direction.add(camRight);

        let joystickMagnitude = 0;
        if (this.joystickActive) {
            joystickMagnitude = Math.min(Math.sqrt(this.joystickDir.x**2 + this.joystickDir.y**2), 1);
            if (joystickMagnitude > 0.1) {
                this.direction.add(camForward.clone().multiplyScalar(-this.joystickDir.y));
                this.direction.add(camRight.clone().multiplyScalar(this.joystickDir.x));
            }
        }

        const targetSpeed = maxSpeed * (this.joystickActive ? joystickMagnitude : 1);
        this.targetVelocity.set(0, 0, 0);
        if (this.direction.lengthSq() > 0) {
            this.direction.normalize();
            this.targetVelocity.copy(this.direction).multiplyScalar(targetSpeed);
        }

        this.currentVelocity.lerp(this.targetVelocity, 10 * dt);

        if (this.currentVelocity.lengthSq() > 0.1) {
            const targetAngle = Math.atan2(this.currentVelocity.x, this.currentVelocity.z);
            let diff = targetAngle - this.playerModel.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.playerModel.rotation.y += diff * 10 * dt;
        }

        const deltaX = this.currentVelocity.x * dt;
        const deltaZ = this.currentVelocity.z * dt;

        if (Math.abs(deltaX) > 0.001) {
            const nextPos = this.playerModel.position.clone().add(new THREE.Vector3(deltaX, 0, 0));
            const centerPos = nextPos.clone().add(new THREE.Vector3(0, this.playerBoxSize.y / 2, 0));
            const playerBox = new THREE.Box3().setFromCenterAndSize(centerPos, this.playerBoxSize);
            if (!this.engine.checkCollision(playerBox, this.playerModel)) this.playerModel.position.x += deltaX;
            else this.currentVelocity.x = 0;
        }

        if (Math.abs(deltaZ) > 0.001) {
            const nextPos = this.playerModel.position.clone().add(new THREE.Vector3(0, 0, deltaZ));
            const centerPos = nextPos.clone().add(new THREE.Vector3(0, this.playerBoxSize.y / 2, 0));
            const playerBox = new THREE.Box3().setFromCenterAndSize(centerPos, this.playerBoxSize);
            if (!this.engine.checkCollision(playerBox, this.playerModel)) this.playerModel.position.z += deltaZ;
            else this.currentVelocity.z = 0;
        }

        const isMoving = this.currentVelocity.lengthSq() > 1;
        const actions = this.playerModel.userData.actions;
        if (actions && actions['Walking'] && actions['Idle']) {
            if (isMoving && this.playerModel.userData.currentAction !== 'Walking') {
                actions['Idle'].fadeOut(0.2); actions['Walking'].reset().fadeIn(0.2).play(); this.playerModel.userData.currentAction = 'Walking';
            } else if (!isMoving && this.playerModel.userData.currentAction !== 'Idle') {
                actions['Walking'].fadeOut(0.2); actions['Idle'].reset().fadeIn(0.2).play(); this.playerModel.userData.currentAction = 'Idle';
            }
        }

        // --- فيزياء الهبوط فوق المجسمات (كود Argon) ---
        this.velocityY -= 24 * dt;
        const prevY = this.playerModel.position.y;
        let nextY = prevY + this.velocityY * dt;
        let supportY = 0;
        let hitJumpPad = false;

        // نجمع كل المجسمات اللي ممكن نقف فوقها (نستثني الشخصية والضوء)
        const colliders = this.engine.objects.filter(o => o !== this.playerModel && o.userData.type !== 'character' && o.userData.type !== 'light');

        for (const obj of colliders) {
            const box = new THREE.Box3().setFromObject(obj);
            const inXZ = 
                this.playerModel.position.x + 0.25 > box.min.x &&
                this.playerModel.position.x - 0.25 < box.max.x &&
                this.playerModel.position.z + 0.25 > box.min.z &&
                this.playerModel.position.z - 0.25 < box.max.z;

            if (inXZ && prevY >= box.max.y - 0.22 && nextY <= box.max.y) {
                supportY = Math.max(supportY, box.max.y);
                if (obj.userData.type === 'jumppad') hitJumpPad = true;
            }
        }

        if (nextY <= supportY) {
            nextY = supportY;
            this.velocityY = hitJumpPad ? 15.5 : 0;
            this.isGrounded = !hitJumpPad;
        } else {
            this.isGrounded = false;
        }
        this.playerModel.position.y = nextY;
        // ---------------------------------------------

        this.updateCamera(dt);
    }
}
