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
        this.cameraYaw = 0; this.cameraPitch = 0.4;
        this.lastTouch = { x: 0, y: 0 };
        this.playerBoxSize = new THREE.Vector3(0.6, 1.5, 0.6);
        this.raycaster = new THREE.Raycaster();

        this.bgm = document.getElementById('bgm');
        this.jumpSfx = document.getElementById('jump-sfx');
        window.playerInstance = this;

        this.setupControls();
    }

    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space' && this.isPlaying && this.isGrounded) {
                this.velocityY = 8; this.isGrounded = false; this.playJumpSound();
            }
        });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        document.getElementById('btn-play').onclick = () => this.startPlay();
        document.getElementById('exit-play').onclick = () => this.stopPlay();

        const zone = document.getElementById('joystick-zone'), knob = document.getElementById('joystick-knob'), base = document.getElementById('joystick-base');
        let touchStart = null;
        zone.addEventListener('touchstart', (e) => { e.stopPropagation(); const r = base.getBoundingClientRect(); touchStart = { x: r.left + r.width/2, y: r.top + r.height/2 }; this.joystickActive = true; });
        zone.addEventListener('touchmove', (e) => {
            e.stopPropagation(); if (!this.joystickActive) return;
            const t = e.touches[0]; let dx = t.clientX - touchStart.x, dy = t.clientY - touchStart.y;
            const dist = Math.sqrt(dx*dx+dy*dy); if(dist>40){ dx=(dx/dist)*40; dy=(dy/dist)*40; }
            knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            this.joystickDir.x = dx/40; this.joystickDir.y = dy/40;
        });
        zone.addEventListener('touchend', () => { this.joystickActive = false; knob.style.transform = `translate(-50%, -50%)`; this.joystickDir = { x: 0, y: 0 }; });

        document.getElementById('btn-jump').addEventListener('touchstart', (e) => { e.preventDefault(); if (this.isGrounded) { this.velocityY = 8; this.isGrounded = false; this.playJumpSound(); } });

        const canvas = document.getElementById('viewport');
        canvas.addEventListener('touchstart', (e) => { if (!this.isPlaying) return; this.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY }; });
        canvas.addEventListener('touchmove', (e) => {
            if (!this.isPlaying) return;
            const dx = e.touches[0].clientX - this.lastTouch.x; const dy = e.touches[0].clientY - this.lastTouch.y;
            this.cameraYaw -= dx * 0.01; this.cameraPitch = Math.max(0.1, Math.min(1.5, this.cameraPitch + dy * 0.01));
            this.lastTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        });
    }

    playJumpSound() { if(this.jumpSfx) { this.jumpSfx.currentTime = 0; this.jumpSfx.play().catch(e=>{}); } }

    startPlay() {
        const p = this.engine.objects.find(o => o.userData.type === 'character');
        if (!p) { alert('أضف شخصية!'); return; }
        this.isPlaying = true; this.playerModel = p;
        document.body.classList.add('play-mode');
        document.getElementById('play-ui').style.display = 'block';
        this.engine.selectObject(null);
        this.engine.controls.enabled = false;
        this.cameraYaw = p.rotation.y; this.cameraPitch = 0.4;
        if(this.bgm) this.bgm.play().catch(e=>{});
        
        // تشغيل أحداث onStart (Visual Scripting)
        this.engine.objects.forEach(obj => {
            if (obj.userData.logic) {
                obj.userData.logic.forEach(l => {
                    if (l.event === 'onStart') this.executeAction(obj, l.action);
                });
            }
        });

        this.updateCamera(1); this.engine.resize();
    }

    stopPlay() {
        this.isPlaying = false; document.body.classList.remove('play-mode');
        document.getElementById('play-ui').style.display = 'none';
        this.engine.controls.enabled = true;
        this.engine.editorCamera.position.set(8, 6, 10); this.engine.controls.target.set(0, 2, 0);
        this.engine.resize(); if(this.bgm) this.bgm.pause();
    }

    executeAction(obj, action) {
        if (action === 'destroySelf') {
            this.engine.removeObject(obj);
        } else if (action === 'addScore') {
            this.engine.score = (this.engine.score || 0) + 10;
            const scoreDisp = document.getElementById('score-display');
            const scoreVal = document.getElementById('score-val');
            if (scoreDisp) scoreDisp.style.display = 'block';
            if (scoreVal) scoreVal.innerText = this.engine.score;
        } else if (action === 'changeColor' && obj.isMesh) {
            obj.material.color.setHex(Math.random() * 0xffffff);
        }
    }

    updateCamera(dt) {
        const dist = 4.5, h = 2.0;
        const offX = Math.sin(this.cameraYaw) * dist * Math.cos(this.cameraPitch);
        const offZ = Math.cos(this.cameraYaw) * dist * Math.cos(this.cameraPitch);
        const offY = h + Math.sin(this.cameraPitch) * dist;
        const desired = this.playerModel.position.clone().add(new THREE.Vector3(offX, offY, offZ));
        
        const dirToCam = desired.clone().sub(this.playerModel.position).normalize();
        const distToCam = desired.distanceTo(this.playerModel.position);
        this.raycaster.set(this.playerModel.position.clone().add(new THREE.Vector3(0, 1, 0)), dirToCam);
        
        const obstacles = this.engine.objects.filter(o => o !== this.playerModel && o.userData.type !== 'vfx');
        const intersects = this.raycaster.intersectObjects(obstacles, true);
        
        let finalCamPos = desired;
        if (intersects.length > 0 && intersects[0].distance < distToCam) {
            finalCamPos = this.playerModel.position.clone().add(new THREE.Vector3(0, 1, 0)).add(dirToCam.multiplyScalar(intersects[0].distance - 0.2));
        }

        this.engine.editorCamera.position.lerp(finalCamPos, 8 * dt);
        this.engine.editorCamera.lookAt(this.playerModel.position.x, this.playerModel.position.y + 1.5, this.playerModel.position.z);
    }

    update(dt) {
        if (!this.isPlaying || !this.playerModel) return;
        const maxSpeed = 5;
        this.direction.set(0, 0, 0);
        const camF = new THREE.Vector3(); this.engine.activeCamera.getWorldDirection(camF); camF.y = 0; camF.normalize();
        const camR = new THREE.Vector3().crossVectors(camF, new THREE.Vector3(0, 1, 0)).normalize();

        if (this.keys['KeyW'] || this.keys['ArrowUp']) this.direction.add(camF);
        if (this.keys['KeyS'] || this.keys['ArrowDown']) this.direction.sub(camF);
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.direction.sub(camR);
        if (this.keys['KeyD'] || this.keys['ArrowRight']) this.direction.add(camR);

        if (this.joystickActive) {
            this.direction.add(camF.clone().multiplyScalar(-this.joystickDir.y));
            this.direction.add(camR.clone().multiplyScalar(this.joystickDir.x));
        }

        if (this.direction.lengthSq() === 0) { this.currentVelocity.set(0, 0, 0); } 
        else { this.targetVelocity.copy(this.direction.normalize()).multiplyScalar(maxSpeed); this.currentVelocity.lerp(this.targetVelocity, 15 * dt); }

        if (this.currentVelocity.lengthSq() > 0.1) {
            const targetAngle = Math.atan2(this.currentVelocity.x, this.currentVelocity.z);
            let diff = targetAngle - this.playerModel.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2; while (diff > Math.PI) diff -= Math.PI * 2;
            this.playerModel.rotation.y += diff * 10 * dt;
        }

        this.playerModel.position.x += this.currentVelocity.x * dt;
        this.playerModel.position.z += this.currentVelocity.z * dt;
        this.velocityY -= 24 * dt;
        this.playerModel.position.y += this.velocityY * dt;
        if (this.playerModel.position.y <= 0) { this.playerModel.position.y = 0; this.velocityY = 0; this.isGrounded = true; }

        // --- Visual Scripting: OnCollide ---
        if (this.playerModel) {
            const playerBox = new THREE.Box3().setFromObject(this.playerModel);
            this.engine.objects.forEach(obj => {
                if (obj === this.playerModel || !obj.userData.logic) return;
                const objBox = new THREE.Box3().setFromObject(obj);
                if (playerBox.intersectsBox(objBox)) {
                    obj.userData.logic.forEach(l => {
                        if (l.event === 'onCollide') this.executeAction(obj, l.action);
                    });
                }
            });
        }
        // -----------------------------------

        this.updateCamera(dt);
    }
}
