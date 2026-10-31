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

        this.bgm = document.getElementById('bgm');
        this.jumpSfx = document.getElementById('jump-sfx');
        this.bgm.volume = 0.3;
        this.jumpSfx.volume = 0.5;

        window.playerInstance = this;
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
            if (this.isGrounded) { this.velocityY = 8; this.isGrounded = false; this.playJumpSound(); }
        });

        const canvas = document.getElementById('viewport');
        canvas.addEventListener('touchstart', (e) => { if (!this.isPlaying) return; this.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; });
        canvas.addEventListener('touchmove', (e) => {
            if (!this.isPlaying) return;
            if (this.engine.activeCamera !== this.engine.editorCamera) return; // لا نتحكم بالكاميرا المخصصة
            const touch = e.touches[0];
            const dx = touch.clientX - this.lastTouch.x;
            const dy = touch.clientY - this.lastTouch.y;
            this.cameraYaw -= dx * 0.01;
            this.cameraPitch = Math.max(0.1, Math.min(1.5, this.cameraPitch + dy * 0.01));
            this.lastTouch = { x: touch.clientX, y: touch.clientY };
        });
    }

    playJumpSound() { this.jumpSfx.currentTime = 0; this.jumpSfx.play().catch(e => {}); }

    startPlay() {
        const playerObj = this.engine.objects.find(o => o.userData.type === 'character');
        if (!playerObj) { alert('أضف شخصية أولاً لتتمكن من اللعب!'); return; }
        this.isPlaying = true;
        this.playerModel = playerObj;
        document.body.classList.add('play-mode');
        document.getElementById('play-ui').style.display = 'block';
        this.engine.selectObject(null);
        this.engine.controls.enabled = false;
        
        this.cameraYaw = this.playerModel.rotation.y;
        this.cameraPitch = 0.4;
        
        this.bgm.play().catch(e => {});
        this.updateCamera(1); 
        this.engine.resize();
    }

    stopPlay() {
        this.isPlaying = false;
        document.body.classList.remove('play-mode');
        document.getElementById('play-ui').style.display = 'none';
        this.engine.controls.enabled = true;
        this.engine.editorCamera.position.set(8, 6, 10);
        this.engine.controls.target.set(0, 2, 0);
        this.engine.resize();
        this.bgm.pause();
    }

    updateCamera(dt) {
        if (this.engine.activeCamera !== this.engine.editorCamera) return; // إذا كانت الكاميرا مخصصة، نتركها
        
        const dist = 3.5; 
        const h = 1.8;  
        const offsetX = Math.sin(this.cameraYaw) * dist * Math.cos(this.cameraPitch);
        const offsetZ = Math.cos(this.cameraYaw) * dist * Math.cos(this.cameraPitch);
        const offsetY = h + Math.sin(this.cameraPitch) * dist;

        const desiredCamPos = this.playerModel.position.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ));
        if (this.engine.editorCamera.position.distanceTo(desiredCamPos) > 0.05) {
             this.engine.editorCamera.position.lerp(desiredCamPos, 8 * dt);
        }
        if (this.engine.editorCamera.position.y < 0.5) this.engine.editorCamera.position.y = 0.5;
        this.engine.editorCamera.lookAt(this.playerModel.position.x, this.playerModel.position.y + 1.2, this.playerModel.position.z);
    }

    update(dt) {
        if (!this.isPlaying || !this.playerModel) return;

        // نفس منطق الحركة السابق
        const maxSpeed = 5;
        this.direction.set(0, 0, 0);
        const camForward = new THREE.Vector3();
        this.engine.activeCamera.getWorldDirection(camForward);
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

        if (this.direction.lengthSq() === 0) {
            this.currentVelocity.set(0, 0, 0);
            this.targetVelocity.set(0, 0, 0);
        } else {
            const targetSpeed = maxSpeed * (this.joystickActive ? joystickMagnitude : 1);
            this.targetVelocity.copy(this.direction.normalize()).multiplyScalar(targetSpeed);
            this.currentVelocity.lerp(this.targetVelocity, 15 * dt); 
        }

        if (this.currentVelocity.lengthSq() > 0.1) {
            const targetAngle = Math.atan2(this.currentVelocity.x, this.currentVelocity.z);
            let diff = targetAngle - this.playerModel.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.playerModel.rotation.y += diff * 10 * dt;
        }

        const isMoving = this.currentVelocity.lengthSq() > 0.1;
        const actions = this.playerModel.userData.actions;
        if (actions && Object.keys(actions).length > 0) {
            const actionKeys = Object.keys(actions);
            if (isMoving) {
                const walkKey = actionKeys.find(k => k.toLowerCase().includes('walk') || k.toLowerCase().includes('run'));
                if (walkKey && this.playerModel.userData.currentAction !== walkKey) {
                    if (this.playerModel.userData.currentAction && actions[this.playerModel.userData.currentAction]) actions[this.playerModel.userData.currentAction].fadeOut(0.2);
                    actions[walkKey].reset().fadeIn(0.2).play();
                    this.playerModel.userData.currentAction = walkKey;
                }
            } else {
                const idleKey = actionKeys.find(k => k.toLowerCase().includes('idle'));
                if (idleKey && this.playerModel.userData.currentAction !== idleKey) {
                    if (this.playerModel.userData.currentAction && actions[this.playerModel.userData.currentAction]) actions[this.playerModel.userData.currentAction].fadeOut(0.2);
                    actions[idleKey].reset().fadeIn(0.2).play();
                    this.playerModel.userData.currentAction = idleKey;
                }
            }
        }

        // فيزياء أرضية واصطدام (نسخة مبسطة)
        const deltaX = this.currentVelocity.x * dt;
        const deltaZ = this.currentVelocity.z * dt;
        this.playerModel.position.x += deltaX;
        this.playerModel.position.z += deltaZ;

        this.updateCamera(dt);
    }
}
