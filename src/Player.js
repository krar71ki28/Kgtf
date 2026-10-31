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
        
        if(joyZone && joyKnob) {
            joyZone.addEventListener('touchstart', (e) => { e.stopPropagation(); joyActive = true; });
            joyZone.addEventListener('touchmove', (e) => {
                e.stopPropagation(); if(!joyActive) return;
                const rect = joyZone.getBoundingClientRect();
                let dx = e.touches[0].clientX - (rect.left + rect.width/2);
                let dy = e.touches[0].clientY - (rect.top + rect.height/2);
                const dist = Math.sqrt(dx*dx + dy*dy); 
                if(dist > 40) { dx = (dx/dist)*40; dy = (dy/dist)*40; }
                
                joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                joyDir.x = dx/40; 
                joyDir.y = dy/40;
            });
            joyZone.addEventListener('touchend', (e) => { 
                e.stopPropagation(); 
                joyActive = false; 
                joyKnob.style.transform = `translate(-50%, -50%)`; 
                joyDir = {x:0, y:0}; 
            });
        }
        
        const btnJump = document.getElementById('btn-jump');
        if(btnJump) btnJump.addEventListener('pointerdown', (e) => { 
            e.preventDefault(); 
            if(this.isPlaying && this.isGrounded) { this.velocityY = 8; this.isGrounded = false; } 
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
        
        // إعادة تعيين موقع الكاميرا عند اللاعب
        this.engine.camera.position.set(this.playerModel.position.x, this.playerModel.position.y + 3, this.playerModel.position.z - 5);
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
        
        const speed = 5;
        
        // ==========================================
        // 1. حساب اتجاهات الكاميرا (Camera-Relative)
        // ==========================================
        const camForward = new THREE.Vector3();
        this.engine.camera.getWorldDirection(camForward);
        camForward.y = 0; 
        camForward.normalize();

        const camRight = new THREE.Vector3();
        // حساب اتجاه اليمين بناءً على اتجاه الكاميرا (Cross Product)
        camRight.crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

        let moveVector = new THREE.Vector3();

        // ==========================================
        // 2. إدخالات الكيبورد (W A S D)
        // ==========================================
        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveVector.add(camForward);
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveVector.sub(camForward);
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveVector.sub(camRight); // اليسار
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveVector.add(camRight); // اليمين

        // ==========================================
        // 3. إدخالات الجويستيك (Joystick)
        // ==========================================
        const joy = this.getJoyDir();
        if (joy.x !== 0 || joy.y !== 0) {
            // joy.x الموجب يعني دفع اليمين، فنضيف camRight
            moveVector.add(camRight.clone().multiplyScalar(joy.x));
            // joy.y السالب يعني دفع الأعلى (للأمام)، فنضيف camForward
            moveVector.add(camForward.clone().multiplyScalar(-joy.y)); 
        }

        // ==========================================
        // 4. تطبيق الحركة والفيزياء
        // ==========================================
        const isMoving = moveVector.lengthSq() > 0;

        if (isMoving) {
            moveVector.normalize(); // توحيد السرعة في كل الاتجاهات
            
            const nextPos = this.playerModel.position.clone();
            nextPos.addScaledVector(moveVector, speed * dt);

            // فحص الاصطدام قبل الحركة
            if (!this.engine.physics.checkPlayerCollision(nextPos, this.playerBoxSize)) {
                this.playerModel.position.copy(nextPos);
                
                // تدوير الشخصية بسلاسة نحو اتجاه الحركة
                const targetRot = Math.atan2(moveVector.x, moveVector.z); 
                let diff = targetRot - this.playerModel.rotation.y;
                // تصحيح زاوية التدوير لتدور بأقصر مسار
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                this.playerModel.rotation.y += diff * 10 * dt;
            }
        }

        // الجاذبية والقفز
        this.velocityY -= 24 * dt; 
        this.playerModel.position.y += this.velocityY * dt;
        if (this.playerModel.position.y <= 0) { 
            this.playerModel.position.y = 0; 
            this.velocityY = 0; 
            this.isGrounded = true; 
        }

        // ==========================================
        // 5. متابعة الكاميرا (Camera Follow)
        // ==========================================
        const camTarget = this.playerModel.position.clone().add(new THREE.Vector3(0, 3, -5));
        this.engine.camera.position.lerp(camTarget, 5 * dt);
        this.engine.camera.lookAt(this.playerModel.position.x, this.playerModel.position.y + 1, this.playerModel.position.z);

        // ==========================================
        // 6. فحص الاصطدام بالمجسمات (Logic Events)
        // ==========================================
        const pBox = new THREE.Box3().setFromCenterAndSize(
            this.playerModel.position.clone().add(new THREE.Vector3(0, 0.75, 0)), 
            this.playerBoxSize
        );
        
        const objectsCopy = [...this.engine.objects]; 
        objectsCopy.forEach(obj => {
            if (obj === this.playerModel || !obj.userData.logic || obj.userData.logic.length === 0) return;
            const oBox = new THREE.Box3().setFromObject(obj);
            if (pBox.intersectsBox(oBox)) {
                this.engine.logic.triggerEvent(obj, 'onCollide');
            }
        });

        // ==========================================
        // 7. إدارة الأنميشن (Idle, Walk, Jump)
        // ==========================================
        if (this.playerModel.userData.actions) {
            const actions = this.playerModel.userData.actions; 
            let targetActionName = null;
            
            if (!this.isGrounded) {
                targetActionName = Object.keys(actions).find(k => k.toLowerCase().includes('jump') || k.toLowerCase().includes('fall'));
            } else if (isMoving) {
                targetActionName = Object.keys(actions).find(k => k.toLowerCase().includes('walk') || k.toLowerCase().includes('run'));
            } else {
                targetActionName = Object.keys(actions).find(k => k.toLowerCase().includes('idle'));
            }

            if (targetActionName && targetActionName !== this.playerModel.userData.currentAction) {
                const current = this.playerModel.userData.currentAction;
                if (current && actions[current]) actions[current].fadeOut(0.2);
                actions[targetActionName].reset().fadeIn(0.2).play();
                this.playerModel.userData.currentAction = targetActionName;
            }
        }
    }
}
