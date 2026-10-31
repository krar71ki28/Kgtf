import * as THREE from 'three';

export class Player {
    constructor(engine) {
        this.engine = engine;
        this.isPlaying = false;
        this.velocityY = 0;
        this.isGrounded = true;
        this.keys = {};
        this.playerBoxSize = new THREE.Vector3(0.6, 1.5, 0.6);
        
        // ✅ متغيرات الكاميرا الموحدة (Spring Arm)
        this.cameraYaw = 0; 
        this.cameraPitch = 0.3; 
        this.targetDist = 4.5; // المسافة المستهدفة (التي يتحكم بها المستخدم)
        this.currentDist = 4.5; // المسافة الحالية (تتحرك بسلاسة)
        
        this.setupControls();
    }

    setupControls() {
        document.getElementById('btn-play').addEventListener('click', () => this.startPlay());
        document.getElementById('exit-play').addEventListener('click', () => this.stopPlay());

        // --- دعم الكيبورد (للـ PC) ---
        window.addEventListener('keydown', (e) => { 
            this.keys[e.code] = true; 
            if (e.code === 'Space' && this.isPlaying && this.isGrounded) { this.velocityY = 8; this.isGrounded = false; } 
        });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        // --- دعم الجويستيك (للموبايل) ---
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
                joyDir.x = dx/40; joyDir.y = dy/40;
            });
            joyZone.addEventListener('touchend', (e) => { 
                e.stopPropagation(); joyActive = false; joyKnob.style.transform = `translate(-50%, -50%)`; joyDir = {x:0, y:0}; 
            });
        }
        
        // --- زر القفز ---
        const btnJump = document.getElementById('btn-jump');
        if(btnJump) btnJump.addEventListener('pointerdown', (e) => { 
            e.preventDefault(); e.stopPropagation(); 
            if(this.isPlaying && this.isGrounded) { this.velocityY = 8; this.isGrounded = false; } 
        });

        // --- التحكم بالكاميرا والزوم (ماوس للكمبيوتر + لمس للموبايل) ---
        const dragZone = document.getElementById('camera-drag-zone');
        let isDraggingCam = false;
        let lastCamPos = { x: 0, y: 0 };
        let initialPinchDist = 0;

        if (dragZone) {
            // لمس (للموبايل)
            dragZone.addEventListener('touchstart', (e) => {
                if (!this.isPlaying) return;
                e.stopPropagation();
                
                if (e.touches.length === 2) {
                    // إصبعين = زوم
                    initialPinchDist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                } else if (e.touches.length === 1) {
                    // إصبع واحد = تدوير
                    isDraggingCam = true;
                    lastCamPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
                }
            });
            
            dragZone.addEventListener('touchmove', (e) => {
                if (!this.isPlaying) return;
                e.stopPropagation();
                
                if (e.touches.length === 2 && initialPinchDist > 0) {
                    // حساب الزوم
                    const currentPinchDist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    const delta = initialPinchDist - currentPinchDist;
                    this.targetDist = Math.max(0, Math.min(10, this.targetDist + delta * 0.05));
                    initialPinchDist = currentPinchDist;
                } else if (e.touches.length === 1 && isDraggingCam) {
                    // تدوير الكاميرا
                    const touch = e.touches[0];
                    this.updateCameraRotation(touch.clientX - lastCamPos.x, touch.clientY - lastCamPos.y);
                    lastCamPos = { x: touch.clientX, y: touch.clientY };
                }
            });
            
            dragZone.addEventListener('touchend', () => { isDraggingCam = false; initialPinchDist = 0; });

            // ماوس (للكمبيوتر)
            dragZone.addEventListener('mousedown', (e) => {
                if (!this.isPlaying) return;
                e.preventDefault();
                isDraggingCam = true;
                lastCamPos = { x: e.clientX, y: e.clientY };
            });
            dragZone.addEventListener('mousemove', (e) => {
                if (!isDraggingCam || !this.isPlaying) return;
                this.updateCameraRotation(e.clientX - lastCamPos.x, e.clientY - lastCamPos.y);
                lastCamPos = { x: e.clientX, y: e.clientY };
            });
            window.addEventListener('mouseup', () => isDraggingCam = false);

            // عجلة الماوس للزوم (للكمبيوتر)
            dragZone.addEventListener('wheel', (e) => {
                if (!this.isPlaying) return;
                e.preventDefault();
                this.targetDist = Math.max(0, Math.min(10, this.targetDist + e.deltaY * 0.01));
            }, { passive: false });
        }

        this.getJoyDir = () => joyActive ? joyDir : {x:0, y:0};
    }

    updateCameraRotation(dx, dy) {
        this.cameraYaw -= dx * 0.01; 
        this.cameraPitch = Math.max(0.05, Math.min(1.2, this.cameraPitch + dy * 0.01));
    }

    startPlay() {
        this.playerModel = this.engine.objects.find(o => o.userData.isCharacter);
        if (!this.playerModel) { alert('أضف شخصية أولاً!'); return; }
        this.isPlaying = true;
        this.playerModel.visible = true;
        
        document.body.classList.add('play-mode');
        document.getElementById('play-ui').style.display = 'block';
        this.engine.selectObject(null); 
        this.engine.orbit.enabled = false;
        
        this.cameraYaw = this.playerModel.rotation.y + Math.PI; 
        this.cameraPitch = 0.3;
        this.targetDist = 4.5; // إعادة المسافة للوضع الافتراضي عند البدء
        
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
        
        // حساب اتجاهات الحركة بناءً على زاوية الكاميرا
        const forward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw)).normalize();
        const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw)).normalize();

        let moveVector = new THREE.Vector3();

        // كيبورد
        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveVector.add(forward);
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveVector.sub(forward);
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveVector.sub(right); 
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveVector.add(right); 

        // جويستيك
        const joy = this.getJoyDir();
        if (joy.x !== 0 || joy.y !== 0) {
            moveVector.add(right.clone().multiplyScalar(joy.x));
            moveVector.add(forward.clone().multiplyScalar(-joy.y)); 
        }

        const isMoving = moveVector.lengthSq() > 0;

        // تحديث المسافة بسلاسة (Lerp)
        this.currentDist += (this.targetDist - this.currentDist) * 15 * dt;

        // إخفاء الشخصية إذا كانت الكاميرا قريبة جداً (أقل من 0.8) لتصبح كاميرا شخص أول
        const isFirstPerson = this.currentDist < 0.8;
        this.playerModel.visible = !isFirstPerson;

        if (isMoving) {
            moveVector.normalize(); 
            const nextPos = this.playerModel.position.clone();
            nextPos.addScaledVector(moveVector, speed * dt);

            if (!this.engine.physics.checkPlayerCollision(nextPos, this.playerBoxSize)) {
                this.playerModel.position.copy(nextPos);
                
                // تدوير الشخصية
                if (!isFirstPerson) {
                    // في وضع الشخص الثالث: تلتفت بسلاسة نحو الحركة
                    const targetRot = Math.atan2(moveVector.x, moveVector.z); 
                    let diff = targetRot - this.playerModel.rotation.y;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    this.playerModel.rotation.y += diff * 10 * dt;
                }
            }
        }

        // في وضع الشخص الأول، جسم الشخصية يلتفت مع الكاميرا (عشان الحركة تظل صحيحة)
        if (isFirstPerson) {
            this.playerModel.rotation.y = this.cameraYaw;
        }

        // الجاذبية
        this.velocityY -= 24 * dt; 
        this.playerModel.position.y += this.velocityY * dt;
        if (this.playerModel.position.y <= 0) { 
            this.playerModel.position.y = 0; this.velocityY = 0; this.isGrounded = true; 
        }

        // ==========================================
        // تحديث الكاميرا الموحدة (Spring Arm)
        // ==========================================
        const camHeight = 1.5; // ارتفاع نقطة النظر (الرأس)
        const anchorPos = this.playerModel.position.clone().add(new THREE.Vector3(0, camHeight, 0));
        
        // حساب موقع الكاميرا بناءً على الزوايا والمسافة
        const offsetX = Math.sin(this.cameraYaw) * this.currentDist * Math.cos(this.cameraPitch);
        const offsetZ = Math.cos(this.cameraYaw) * this.currentDist * Math.cos(this.cameraPitch);
        const offsetY = Math.sin(this.cameraPitch) * this.currentDist;
        
        let targetCamPos;
        
        if (isFirstPerson) {
            // في الشخص الأول، الكاميرا تكون في الرأس بالضبط وتنظر للأمام
            targetCamPos = anchorPos;
            this.engine.camera.position.lerp(targetCamPos, 20 * dt);
            
            const lookDir = new THREE.Vector3(
                -Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch),
                -Math.sin(this.cameraPitch),
                -Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch)
            );
            this.engine.camera.lookAt(anchorPos.clone().add(lookDir));
            
        } else {
            // في الشخص الثالث، الكاميرا تبعد بناءً على المسافة
            targetCamPos = anchorPos.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ));
            this.engine.camera.position.lerp(targetCamPos, 10 * dt);
            this.engine.camera.lookAt(anchorPos);
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
        if (this.playerModel.userData.actions && !isFirstPerson) {
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
