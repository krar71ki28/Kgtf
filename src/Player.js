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
        this.raycaster = new THREE.Raycaster();

        this.bgm = document.getElementById('bgm');
        this.jumpSfx = document.getElementById('jump-sfx');
        if (this.bgm) this.bgm.volume = 0.3;
        if (this.jumpSfx) this.jumpSfx.volume = 0.5;

        window.playerInstance = this;
        this.setupControls();
    }

    setupControls() {
        // لوحة المفاتيح + مسافة للقفز
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space' && this.isPlaying && this.isGrounded) {
                this.velocityY = 8;
                this.isGrounded = false;
                this.playJumpSound();
                e.preventDefault();
            }
        });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        const btnPlay = document.getElementById('btn-play');
        if (btnPlay) btnPlay.onclick = () => this.startPlay();
        const btnExit = document.getElementById('exit-play');
        if (btnExit) btnExit.onclick = () => this.stopPlay();

        // الأزرار العائمة
        const btnPlayFab = document.getElementById('btn-play-fab');
        if (btnPlayFab) btnPlayFab.onclick = () => this.startPlay();
        const btnSaveFab = document.getElementById('btn-save-fab');
        if (btnSaveFab) btnSaveFab.onclick = () => {
            this.engine.saveScene();
            const old = btnSaveFab.innerHTML;
            btnSaveFab.innerHTML = '✓ تم';
            setTimeout(() => btnSaveFab.innerHTML = old, 800);
        };

        // Joystick
        const zone = document.getElementById('joystick-zone');
        const knob = document.getElementById('joystick-knob');
        const base = document.getElementById('joystick-base');
        let touchStart = null;
        const maxDist = 40;

        if (zone && knob && base) {
            zone.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                const rect = base.getBoundingClientRect();
                touchStart = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                this.joystickActive = true;
            });
            zone.addEventListener('touchmove', (e) => {
                e.stopPropagation();
                if (!this.joystickActive) return;
                const touch = e.touches[0];
                let dx = touch.clientX - touchStart.x;
                let dy = touch.clientY - touchStart.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
                knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                this.joystickDir.x = dx / maxDist;
                this.joystickDir.y = dy / maxDist;
            });
            zone.addEventListener('touchend', () => {
                this.joystickActive = false;
                knob.style.transform = `translate(-50%, -50%)`;
                this.joystickDir = { x: 0, y: 0 };
            });
        }

        // زر القفز (يعمل باللمس والماوس)
        const jumpBtn = document.getElementById('btn-jump');
        if (jumpBtn) {
            jumpBtn.addEventListener('pointerdown', (e) => {
                e.preventDefault(); e.stopPropagation();
                if (this.isPlaying && this.isGrounded) {
                    this.velocityY = 8;
                    this.isGrounded = false;
                    this.playJumpSound();
                }
            });
        }

        // تحريك الكاميرا باللمس على الشاشة
        const canvas = document.getElementById('viewport');
        canvas.addEventListener('touchstart', (e) => {
            if (!this.isPlaying) return;
            this.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        });
        canvas.addEventListener('touchmove', (e) => {
            if (!this.isPlaying) return;
            if (this.engine.activeCamera !== this.engine.editorCamera) return;
            const touch = e.touches[0];
            const dx = touch.clientX - this.lastTouch.x;
            const dy = touch.clientY - this.lastTouch.y;
            this.cameraYaw -= dx * 0.01;
            this.cameraPitch = Math.max(0.1, Math.min(1.5, this.cameraPitch + dy * 0.01));
            this.lastTouch = { x: touch.clientX, y: touch.clientY };
        });
    }

    playJumpSound() {
        if (this.jumpSfx) {
            this.jumpSfx.currentTime = 0;
            this.jumpSfx.play().catch(() => {});
        }
    }

    startPlay() {
        const playerObj = this.engine.objects.find(o => o.userData.type === 'character');
        if (!playerObj) { alert('أضف شخصية أولاً!'); return; }
        this.isPlaying = true;
        this.playerModel = playerObj;
        document.body.classList.add('play-mode');
        const playUI = document.getElementById('play-ui');
        if (playUI) playUI.style.display = 'block';
        this.engine.selectObject(null);
        this.engine.controls.enabled = false;
        this.cameraYaw = this.playerModel.rotation.y;
        this.cameraPitch = 0.4;
        if (this.bgm) this.bgm.play().catch(() => {});
        this.updateCamera(1);
        this.engine.resize();
    }

    stopPlay() {
        this.isPlaying = false;
        document.body.classList.remove('play-mode');
        const playUI = document.getElementById('play-ui');
        if (playUI) playUI.style.display = 'none';
        this.engine.controls.enabled = true;
        this.engine.editorCamera.position.set(8, 6, 10);
        this.engine.controls.target.set(0, 2, 0);
        this.engine.resize();
        if (this.bgm) this.bgm.pause();
    }

    updateCamera(dt) {
        if (this.engine.activeCamera !== this.engine.editorCamera) return;

        const dist = 4.5;
        const h = 2.0;
        const offsetX = Math.sin(this.cameraYaw) * dist * Math.cos(this.cameraPitch);
        const offsetZ = Math.cos(this.cameraYaw) * dist * Math.cos(this.cameraPitch);
        const offsetY = h + Math.sin(this.cameraPitch) * dist;

        const anchor = this.playerModel.position.clone().add(new THREE.Vector3(0, 1, 0));
        const desiredCamPos = this.playerModel.position.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ));
        const dirToCam = desiredCamPos.clone().sub(anchor).normalize();
        const distToCam = desiredCamPos.distanceTo(anchor);

        this.raycaster.set(anchor, dirToCam);
        this.raycaster.far = distToCam;

        // استبعاد اللاعب و VFX من الفحص
        const obstacles = this.engine.objects.filter(o =>
            o !== this.playerModel && o.userData.type !== 'vfx' && o.userData.type !== 'light'
        );
        const intersects = this.raycaster.intersectObjects(obstacles, true);

        let finalCamPos = desiredCamPos;
        if (intersects.length > 0 && intersects[0].distance > 0.3) {
            const safeDist = Math.max(0.3, intersects[0].distance - 0.2);
            finalCamPos = anchor.clone().add(dirToCam.clone().multiplyScalar(safeDist));
        }

        if (this.engine.editorCamera.position.distanceTo(finalCamPos) > 0.05) {
            this.engine.editorCamera.position.lerp(finalCamPos, Math.min(8 * dt, 1));
        }
        if (this.engine.editorCamera.position.y < 0.5) this.engine.editorCamera.position.y = 0.5;
        this.engine.editorCamera.lookAt(
            this.playerModel.position.x,
            this.playerModel.position.y + 1.5,
            this.playerModel.position.z
        );
    }

    update(dt) {
        if (!this.isPlaying || !this.playerModel) return;

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
            joystickMagnitude = Math.min(Math.sqrt(this.joystickDir.x ** 2 + this.joystickDir.y ** 2), 1);
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

        // الأنميشن
        const isMoving = this.currentVelocity.lengthSq() > 0.1;
        const actions = this.playerModel.userData.actions;
        if (actions && Object.keys(actions).length > 0) {
            const actionKeys = Object.keys(actions);
            const switchTo = (key, fade) => {
                if (!key || this.playerModel.userData.currentAction === key) return;
                const prev = this.playerModel.userData.currentAction;
                if (prev && actions[prev]) actions[prev].fadeOut(fade);
                actions[key].reset().fadeIn(fade).play();
                this.playerModel.userData.currentAction = key;
            };
            if (!this.isGrounded) switchTo(actionKeys.find(k => /jump|fall/i.test(k)), 0.1);
            else if (isMoving) switchTo(actionKeys.find(k => /walk|run/i.test(k)), 0.2);
            else switchTo(actionKeys.find(k => /idle/i.test(k)), 0.2);
        }

        // حركة وفيزياء
        this.playerModel.position.x += this.currentVelocity.x * dt;
        this.playerModel.position.z += this.currentVelocity.z * dt;
        this.velocityY -= 24 * dt;
        this.playerModel.position.y += this.velocityY * dt;
        if (this.playerModel.position.y <= 0) {
            this.playerModel.position.y = 0;
            this.velocityY = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }

        this.updateCamera(dt);
    }
}
