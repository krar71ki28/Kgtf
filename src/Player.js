import * as THREE from 'three';

export class Player {
    constructor(engine) {
        this.engine = engine;
        this.isPlaying = false;
        this.velocityY = 0;
        this.isGrounded = true;
        this.keys = {};
        this.playerBoxSize = new THREE.Vector3(0.6, 1.5, 0.6);
        
        // متغيرات الكاميرا
        this.isFirstPerson = false;
        this.cameraYaw = 0; // زاوية دوران الكاميرا الأفقي
        this.cameraPitch = 0.2; // زاوية دوران الكاميرا العمودي
        
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

        // أزرار اللمس (الجويستيك)
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

        // زر تبديل الكاميرا
        const btnCamToggle = document.getElementById('btn-camera-toggle');
        if(btnCamToggle) {
            btnCamToggle.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                this.isFirstPerson = !this.isFirstPerson;
                if (this.playerModel) this.playerModel.visible = !this.isFirstPerson; 
                btnCamToggle.style.color = this.isFirstPerson ? '#4ade80' : '#478cbf';
            });
        }

        // ✅ إضافة سحب الكاميرا (Camera Drag Zone)
        const dragZone = document.getElementById('camera-drag-zone');
        let isDraggingCam = false;
        let lastCamTouch = { x: 0, y: 0 };

        if(dragZone) {
            dragZone.addEventListener('touchstart', (e) => {
                if (!this.isPlaying) return;
                e.stopPropagation();
                isDraggingCam = true;
                lastCamTouch = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            });

            dragZone.addEventListener('touchmove', (e) => {
                if (!isDraggingCam || !this.isPlaying) return;
                e.stopPropagation();
                
                const touch = e.touches[0];
                const dx = touch.clientX - lastCamTouch.x;
                const dy = touch.clientY - lastCamTouch.y;
                
                // تحديث زوايا الكاميرا
                this.cameraYaw -= dx * 0.01; 
                this.cameraPitch = Math.max(0.05, Math.min(1.0, this.cameraPitch + dy * 0.01));
                
                lastCamTouch = { x: touch.clientX, y: touch.clientY };
            });

            dragZone.addEventListener('touchend', (e) => {
                isDraggingCam = false;
            });
        }

        this.getJoyDir = () => joyActive ? joyDir : {x:0, y:0};
    }

    startPlay() {
        this.playerModel = this.engine.objects.find(o => o.userData.isCharacter);
        if (!this.playerModel) { alert('أضف شخصية أولاً!'); return; }
        this.isPlaying = true;
        this.isFirstPerson = false;
        this.playerModel.visible = true;
        
        document.body.classList.add('play-mode');
        document.getElementById('play-ui').style.display = 'block';
        this.engine.selectObject(null); 
        this.engine.orbit.enabled = false;
        
        // إعداد الكاميرا الأولي
        this.cameraYaw = this.playerModel.rotation.y + Math.PI; // الكاميرا ورى الشخصية
        this.cameraPitch = 0.3;
        
        this.engine.startGameLogic();
    }

    stopPlay() {
        this.isPlaying = false; 
        document.body.classList.remove('play-mode');
        document.getElementById('play-ui').style.display = 'none';
        this.engine.orbit.enabled = true; 
        this.engine.camera.position.set(6, 6, 8); 
        this.engine.orbit.target.set(0, 1, 0);
        
        if (this.playerModel) this.playerModel.visible = true;

        if (this.playerModel && this.playerModel.userData.mixer) {
            this.playerModel.userData.mixer.stopAllAction();
            const idleKey = Object.keys(this.playerModel.userData.actions).find(k => k.toLowerCase().includes('idle'));
            if (idleKey) this.playerModel.userData.actions[idleKey].play();
        }
    }

    update(dt) {
        if (!this.isPlaying || !this.playerModel) return;
        
        const speed = 5;
        
        // حساب اتجاهات الحركة بناءً على زاوية الكاميرا (Camera-Relative)
        const forward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw)).normalize();
        const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw)).normalize();

        let moveVector = new THREE.Vector3();

        // الكيبورد
        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveVector.add(forward);
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveVector.sub(forward);
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveVector.sub(right); 
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveVector.add(right); 

        // الجويستيك
        const joy = this.getJoyDir();
        if (joy.x !== 0 || joy.y !== 0) {
            moveVector.add(right.clone().multiplyScalar(joy.x));
            moveVector.add(forward.clone().multiplyScalar(-joy.y)); 
        }

        const isMoving = moveVector.lengthSq() > 0;

        if (isMoving) {
            moveVector.normalize(); 
            
            const nextPos = this.playerModel.position.clone();
            nextPos.addScaledVector(moveVector, speed * dt);

            if (!this.engine.physics.checkPlayerCollision(nextPos, this.playerBoxSize)) {
                this.playerModel.position.copy(nextPos);
                
                // تدوير الشخصية بسلاسة نحو اتجاه الحركة
                const targetRot = Math.atan2(moveVector.x, moveVector.z); 
                let diff = targetRot - this.playerModel.rotation.y;
                
                // اختيار أقصر مسار للدوران
                while (diff < -Math.PI) diff += Math.PI * 2;
                while (diff > Math.PI) diff -= Math.PI * 2;
                
                // سرعة الدوران (10 تعني دوران سريع وسلس)
                this.playerModel.rotation.y += diff * 10 * dt;
            }
        }

        // الجاذبية
        this.velocityY -= 24 * dt; 
        this.playerModel.position.y += this.velocityY * dt;
        if (this.playerModel.position.y <= 0) { 
            this.playerModel.position.y = 0; 
            this.velocityY = 0; 
            this.isGrounded = true; 
        }

        // ==========================================
        // تحديث الكاميرا (Orbit & Follow)
        // ==========================================
        const camDist = 5;
        const camHeight = 2;
        
        // حساب موقع الكاميرا المستهدف بناءً على زوايا Yaw و Pitch
        const offsetX = Math.sin(this.cameraYaw) * camDist * Math.cos(this.cameraPitch);
        const offsetZ = Math.cos(this.cameraYaw) * camDist * Math.cos(this.cameraPitch);
        const offsetY = camHeight + Math.sin(this.cameraPitch) * camDist;
        
        const targetCamPos = this.playerModel.position.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ));

        // في وضع الشخص الأول
        if (this.isFirstPerson) {
            const headHeight = 1.5;
            const cameraOffset = new THREE.Vector3(0, headHeight, 0);
            const forwardOffset = new THREE.Vector3(Math.sin(this.playerModel.rotation.y), 0, Math.cos(this.playerModel.rotation.y)).multiplyScalar(0.2);
            
            const firstPersonPos = this.playerModel.position.clone().add(cameraOffset).add(forwardOffset);
            this.engine.camera.position.lerp(firstPersonPos, 20 * dt); 
            
            // النظر للأمام من عيون الشخصية
            const lookAtPos = firstPersonPos.clone().add(new THREE.Vector3(Math.sin(this.cameraYaw), 0, Math.cos(this.cameraYaw)));
            this.engine.camera.lookAt(lookAtPos);
        } else {
            // وضع الشخص الثالث: الكاميرا تتبع بسلاسة
            this.engine.camera.position.lerp(targetCamPos, 10 * dt);
            this.engine.camera.lookAt(this.playerModel.position.x, this.playerModel.position.y + 1, this.playerModel.position.z);
        }

        // ==========================================
        // فحص الاصطدام بالمجسمات (Logic Events)
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
        // إدارة الأنميشن
        // ==========================================
        if (this.playerModel.userData.actions && !this.isFirstPerson) {
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
