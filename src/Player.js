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
        this.jumpRequested = false;

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

        zone.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const rect = base.getBoundingClientRect();
            touchStart = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
            this.joystickActive = true;
        });

        zone.addEventListener('touchmove', (e) => {
            if (!this.joystickActive) return;
            const touch = e.touches[0];
            let dx = touch.clientX - touchStart.x;
            let dy = touch.clientY - touchStart.y;
            
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > maxDist) {
                dx = (dx / dist) * maxDist;
                dy = (dy / dist) * maxDist;
            }
            
            knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            // قيمة من 0 إلى 1 حسب بعد الجويستيك
            this.joystickDir.x = dx / maxDist;
            this.joystickDir.y = dy / maxDist;
        });

        zone.addEventListener('touchend', () => {
            this.joystickActive = false;
            knob.style.transform = `translate(-50%, -50%)`;
            this.joystickDir = { x: 0, y: 0 };
        });

        // زر القفز
        document.getElementById('btn-jump').addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (this.isGrounded) {
                this.velocityY = 8; // قوة القفز
                this.isGrounded = false;
            }
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
        
        const camOffset = new THREE.Vector3(0, 4.5, -8);
        camOffset.applyAxisAngle(new THREE.Vector3(0,1,0), this.playerModel.rotation.y);
        this.engine.camera.position.copy(this.playerModel.position).add(camOffset);
        this.engine.camera.lookAt(this.playerModel.position.x, this.playerModel.position.y + 1.5, this.playerModel.position.z);
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

    update(dt) {
        if (!this.isPlaying || !this.playerModel) return;

        const maxSpeed = 6;
        this.direction.set(0, 0, 0);

        const camForward = new THREE.Vector3();
        this.engine.camera.getWorldDirection(camForward);
        camForward.y = 0; camForward.normalize();
        const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

        // الكيبورد
        if (this.keys['KeyW'] || this.keys['ArrowUp']) this.direction.add(camForward);
        if (this.keys['KeyS'] || this.keys['ArrowDown']) this.direction.sub(camForward);
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.direction.sub(camRight);
        if (this.keys['KeyD'] || this.keys['ArrowRight']) this.direction.add(camRight);

        // الجويستيك (نحسب قوة الدفع بناءً على بعد الجويستيك)
        let joystickMagnitude = 0;
        if (this.joystickActive) {
            joystickMagnitude = Math.min(Math.sqrt(this.joystickDir.x**2 + this.joystickDir.y**2), 1);
            if (joystickMagnitude > 0.1) {
                this.direction.add(camForward.clone().multiplyScalar(-this.joystickDir.y));
                this.direction.add(camRight.clone().multiplyScalar(this.joystickDir.x));
            }
        }

        // حساب السرعة المستهدفة (تعتمد على قوة دفع الجويستيك)
        const targetSpeed = maxSpeed * (this.joystickActive ? joystickMagnitude : 1);
        this.targetVelocity.set(0, 0, 0);
        if (this.direction.lengthSq() > 0) {
            this.direction.normalize();
            this.targetVelocity.copy(this.direction).multiplyScalar(targetSpeed);
        }

        // تنعيم الحركة (التسارع والتباطؤ)
        const lerpFactor = 10 * dt;
        this.currentVelocity.lerp(this.targetVelocity, lerpFactor);

        // تطبيق الحركة
        if (this.currentVelocity.lengthSq() > 0.1) {
            this.playerModel.position.x += this.currentVelocity.x * dt;
            this.playerModel.position.z += this.currentVelocity.z * dt;
            
            // تدوير اللاعب بسلاسة
            const targetAngle = Math.atan2(this.currentVelocity.x, this.currentVelocity.z);
            let diff = targetAngle - this.playerModel.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.playerModel.rotation.y += diff * 10 * dt; // دوران سلس
        }

        // إدارة الأنيميشن بناءً على السرعة الفعلية
        const isMoving = this.currentVelocity.lengthSq() > 1;
        const actions = this.playerModel.userData.actions;
        if (actions && actions['Walking'] && actions['Idle']) {
            if (isMoving && this.playerModel.userData.currentAction !== 'Walking') {
                actions['Idle'].fadeOut(0.2);
                actions['Walking'].reset().fadeIn(0.2).play();
                this.playerModel.userData.currentAction = 'Walking';
            } else if (!isMoving && this.playerModel.userData.currentAction !== 'Idle') {
                actions['Walking'].fadeOut(0.2);
                actions['Idle'].reset().fadeIn(0.2).play();
                this.playerModel.userData.currentAction = 'Idle';
            }
        }

        // فيزياء القفز
        if (!this.isGrounded) {
            this.velocityY -= 25 * dt; // الجاذبية
            this.playerModel.position.y += this.velocityY * dt;
            if (this.playerModel.position.y <= 0) {
                this.playerModel.position.y = 0;
                this.velocityY = 0;
                this.isGrounded = true;
            }
        }

        // الكاميرا
        const camOffset = new THREE.Vector3(0, 4.5, -8);
        camOffset.applyAxisAngle(new THREE.Vector3(0,1,0), this.playerModel.rotation.y);
        const desiredCamPos = this.playerModel.position.clone().add(camOffset);
        
        // تحريك الكاميرا بسلاسة أكثر
        this.engine.camera.position.lerp(desiredCamPos, 5 * dt);
        if (this.engine.camera.position.y < 0.5) this.engine.camera.position.y = 0.5;

        this.engine.camera.lookAt(this.playerModel.position.x, this.playerModel.position.y + 1.5, this.playerModel.position.z);
    }
}
