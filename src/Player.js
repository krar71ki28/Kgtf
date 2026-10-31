import * as THREE from 'three';

export class Player {
    constructor(engine) {
        this.engine = engine;
        this.isPlaying = false;
        this.velocityY = 0;
        this.isGrounded = true;
        this.keys = {};
        this.playerBoxSize = new THREE.Vector3(0.6, 1.5, 0.6);
        this.setupControls();
    }

    setupControls() {
        document.getElementById('btn-play').addEventListener('click', () => this.startPlay());
        document.getElementById('exit-play').addEventListener('click', () => this.stopPlay());

        window.addEventListener('keydown', (e) => { 
            this.keys[e.code] = true; 
            if (e.code === 'Space' && this.isPlaying && this.isGrounded) { this.velocityY = 8; this.isGrounded = false; } 
        });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        let joyActive = false, joyDir = {x:0, y:0};
        const joyZone = document.getElementById('joystick-zone'), joyKnob = document.getElementById('joystick-knob');
        
        joyZone.addEventListener('touchstart', (e) => { e.stopPropagation(); joyActive = true; });
        joyZone.addEventListener('touchmove', (e) => {
            e.stopPropagation(); if(!joyActive) return;
            const rect = joyZone.getBoundingClientRect();
            let dx = e.touches[0].clientX - (rect.left + rect.width/2), dy = e.touches[0].clientY - (rect.top + rect.height/2);
            const dist = Math.sqrt(dx*dx + dy*dy); if(dist > 40) { dx = (dx/dist)*40; dy = (dy/dist)*40; }
            joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            joyDir.x = dx/40; joyDir.y = dy/40;
        });
        joyZone.addEventListener('touchend', (e) => { e.stopPropagation(); joyActive = false; joyKnob.style.transform = `translate(-50%, -50%)`; joyDir = {x:0, y:0}; });
        
        document.getElementById('btn-jump').addEventListener('pointerdown', (e) => { 
            e.preventDefault(); if(this.isPlaying && this.isGrounded) { this.velocityY = 8; this.isGrounded = false; } 
        });

        this.getJoyDir = () => joyActive ? joyDir : {x:0, y:0};
    }

    startPlay() {
        this.playerModel = this.engine.objects.find(o => o.userData.isCharacter);
        if (!this.playerModel) { alert('أضف شخصية أولاً!'); return; }
        this.isPlaying = true;
        document.body.classList.add('play-mode');
        document.getElementById('play-ui').style.display = 'block';
        this.engine.selectObject(null); 
        this.engine.orbit.enabled = false;
        this.engine.camera.position.set(this.playerModel.position.x, this.playerModel.position.y + 3, this.playerModel.position.z - 5);
        
        // ✅ تشغيل منطق البداية
        this.engine.startGameLogic();
    }

    stopPlay() {
        this.isPlaying = false; 
        document.body.classList.remove('play-mode');
        document.getElementById('play-ui').style.display = 'none';
        this.engine.orbit.enabled = true; 
        this.engine.camera.position.set(6, 6, 8); 
        this.engine.orbit.target.set(0, 1, 0);
        
        if (this.playerModel && this.playerModel.userData.mixer) {
            this.playerModel.userData.mixer.stopAllAction();
            const idleKey = Object.keys(this.playerModel.userData.actions).find(k => k.toLowerCase().includes('idle'));
            if (idleKey) this.playerModel.userData.actions[idleKey].play();
        }
    }

    update(dt) {
        if (!this.isPlaying || !this.playerModel) return;
        
        const speed = 5; let moveX = 0, moveZ = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ += 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ -= 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX += 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX -= 1;
        
        const joy = this.getJoyDir();
        if (joy.x !== 0 || joy.y !== 0) { moveX += joy.x; moveZ -= joy.y; }
        
        const isMoving = (moveX !== 0 || moveZ !== 0);

        if (isMoving) {
            const len = Math.sqrt(moveX*moveX + moveZ*moveZ);
            
            const nextPos = this.playerModel.position.clone();
            nextPos.x += (moveX/len) * speed * dt;
            nextPos.z += (moveZ/len) * speed * dt;

            if (!this.engine.physics.checkPlayerCollision(nextPos, this.playerBoxSize)) {
                this.playerModel.position.copy(nextPos);
                const targetRot = Math.atan2(moveX, moveZ); 
                this.playerModel.rotation.y += (targetRot - this.playerModel.rotation.y) * 10 * dt;
            }
        }

        this.velocityY -= 24 * dt; 
        this.playerModel.position.y += this.velocityY * dt;
        if (this.playerModel.position.y <= 0) { this.playerModel.position.y = 0; this.velocityY = 0; this.isGrounded = true; }

        const camTarget = this.playerModel.position.clone().add(new THREE.Vector3(0, 3, -5));
        this.engine.camera.position.lerp(camTarget, 5 * dt);
        this.engine.camera.lookAt(this.playerModel.position.x, this.playerModel.position.y + 1, this.playerModel.position.z);

        // ✅ فحص الاصطدام بالأشياء اللي فيها Logic
        const pBox = new THREE.Box3().setFromCenterAndSize(
            this.playerModel.position.clone().add(new THREE.Vector3(0, 0.75, 0)), 
            this.playerBoxSize
        );
        this.engine.objects.forEach(obj => {
            if (obj === this.playerModel || !obj.userData.logic || obj.userData.logic.length === 0) return;
            const oBox = new THREE.Box3().setFromObject(obj);
            if (pBox.intersectsBox(oBox)) {
                this.engine.logic.triggerEvent(obj, 'onCollide');
            }
        });

        // الأنميشن
        if (this.playerModel.userData.actions) {
            const actions = this.playerModel.userData.actions; let targetActionName = null;
            if (!this.isGrounded) targetActionName = Object.keys(actions).find(k => k.toLowerCase().includes('jump') || k.toLowerCase().includes('fall'));
            else if (isMoving) targetActionName = Object.keys(actions).find(k => k.toLowerCase().includes('walk') || k.toLowerCase().includes('run'));
            else targetActionName = Object.keys(actions).find(k => k.toLowerCase().includes('idle'));

            if (targetActionName && targetActionName !== this.playerModel.userData.currentAction) {
                const current = this.playerModel.userData.currentAction;
                if (current && actions[current]) actions[current].fadeOut(0.2);
                actions[targetActionName].reset().fadeIn(0.2).play();
                this.playerModel.userData.currentAction = targetActionName;
            }
        }
    }
}
