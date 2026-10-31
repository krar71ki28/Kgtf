import * as THREE from 'three';

export class Player {
    constructor(engine) {
        this.engine = engine;
        this.isPlaying = false;
        this.velocityY = 0;
        this.isGrounded = true;
        this.keys = {};
        this.playerBoxSize = new THREE.Vector3(0.6, 1.5, 0.6);
        this.raycaster = new THREE.Raycaster();
        
        // إعدادات كاميرا Unreal (Spring Arm)
        this.cameraYaw = 0; 
        this.cameraPitch = 0.3; 
        this.targetDist = 4.5; 
        this.currentDist = 4.5; 
        this.cameraLag = 15; // سرعة استجابة الكاميرا (Lerp)
        
        // وضع الكاميرا (TPS = Unreal Style, RPG = Genshin Style)
        this.cameraMode = 'TPS'; 
        
        this.setupControls();
    }

    setupControls() {
        document.getElementById('btn-play').addEventListener('click', () => this.startPlay());
        document.getElementById('exit-play').addEventListener('click', () => this.stopPlay());

        // --- دعم الكيبورد (للـ PC) ---
        window.addEventListener('keydown', (e) => { 
            this.keys[e.code] = true; 
            if (e.code === 'Space' && this.isPlaying && this.isGrounded) { this.velocityY = 8; this.isGrounded = false; } 
            // تبديل وضع الكاميرا (V)
            if (e.code === 'KeyV' && this.isPlaying) {
                this.cameraMode = this.cameraMode === 'TPS' ? 'RPG' : 'TPS';
                document.getElementById('btn-camera-mode').innerText = this.cameraMode;
            }
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

        // --- زر تبديل وضع الكاميرا (موجود في HTML) ---
        const btnCamMode = document.getElementById('btn-camera-mode');
        if (btnCamMode) {
            btnCamMode.innerText = this.cameraMode;
            btnCamMode.addEventListener('pointerdown', (e) => {
                e.preventDefault(); e.stopPropagation();
                this.cameraMode = this.cameraMode === 'TPS' ? 'RPG' : 'TPS';
                btnCamMode.innerText = this.cameraMode;
            });
        }

        // --- التحكم بالكاميرا من الشاشة (لمس أو ماوس) ---
        const canvas = this.engine.renderer.domElement;
        let isDraggingCam = false;
        let lastCamPos = { x: 0, y: 0 };
        let initialPinchDist = 0;

        canvas.addEventListener('touchstart', (e) => {
            if (!this.isPlaying) return;
            if (e.touches.length === 2) {
                initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            } else if (e.touches.length === 1) {
                isDraggingCam = true;
                lastCamPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        });
        
        canvas.addEventListener('touchmove', (e) => {
            if (!this.isPlaying) return;
            if (e.touches.length === 2 && initialPinchDist > 0) {
                const currentPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                const delta = initialPinchDist - currentPinchDist;
                this.targetDist = Math.max(0.5, Math.min(8, this.targetDist + delta * 0.05));
                initialPinchDist = currentPinchDist;
            } else if (e.touches.length === 1 && isDraggingCam) {
                const touch = e.touches[0];
                this.updateCameraRotation(touch.clientX - lastCamPos.x, touch.clientY - lastCamPos.y);
                lastCamPos = { x: touch.clientX, y: touch.clientY };
            }
        });
        canvas.addEventListener('touchend', () => { isDraggingCam = false; initialPinchDist = 0; });

        // ماوس
        canvas.addEventListener('mousedown', (e) => {
            if (!this.isPlaying) return;
            e.preventDefault();
            isDraggingCam = true;
            lastCamPos = { x: e.clientX, y: e.clientY };
        });
        canvas.addEventListener('mousemove', (e) => {
            if (!isDraggingCam || !this.isPlaying) return;
            this.updateCameraRotation(e.clientX - lastCamPos.x, e.clientY - lastCamPos.y);
            lastCamPos = { x: e.clientX, y: e.clientY };
        });
        window.addEventListener('mouseup', () => isDraggingCam = false);
        canvas.addEventListener('wheel', (e) => {
            if (!this.isPlaying) return;
            e.preventDefault();
            this.targetDist = Math.max(0.5, Math.min(8, this.targetDist + e.deltaY * 0.01));
        }, { passive: false });

                // --- زر تبديل وضع الكاميرا (موجود في HTML) ---
        const btnCamMode = document.getElementById('btn-camera-mode');
        if (btnCamMode) {
            btnCamMode.innerText = this.cameraMode;
            btnCamMode.addEventListener('pointerdown', (e) => {
                e.preventDefault(); e.stopPropagation();
                this.cameraMode = this.cameraMode === 'TPS' ? 'RPG' : 'TPS';
                btnCamMode.innerText = this.cameraMode;
            });
        }

        this.getJoyDir = () => joyActive ? joyDir : {x:0, y:0};
    }

    updateCameraRotation(dx, dy) {
        // سرعة دوران الكاميرا
        this.cameraYaw -= dx * 0.005; 
        // زاوية النظر العمودية (منع الكاميرا من النزول تحت الأرض أو الانقلاب)
        this.cameraPitch = Math.max(-0.5, Math.min(1.2, this.cameraPitch + dy * 0.005));
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
        this.targetDist = 4.5;
        
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
    }

    update(dt) {
        if (!this.isPlaying || !this.playerModel) return;
        
        const speed = 5;
        
        // 1. حساب اتجاه الحركة بناءً على زاوية الكاميرا
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

        // 2. تحديث مسافة الكاميرا بسلاسة
        this.currentDist += (this.targetDist - this.currentDist) * 10 * dt;

        // إخفاء الشخصية في وضع الشخص الأول
        const isFirstPerson = this.currentDist < 0.8;
        this.playerModel.visible = !isFirstPerson;

        // 3. تحريك الشخصية
        if (isMoving) {
            moveVector.normalize(); 
            const nextPos = this.playerModel.position.clone();
            nextPos.addScaledVector(moveVector, speed * dt);

            // فحص الاصطدام باستخدام محرك الفيزياء
            if (!this.engine.physics.checkPlayerCollision(nextPos, this.playerBoxSize)) {
                this.playerModel.position.copy(nextPos);
                
                // --- إدارة دوران الشخصية ---
                if (this.cameraMode === 'RPG') {
                    // وضع Genshin: الشخصية تتجه نحو اتجاه المشي
                    const targetRot = Math.atan2(moveVector.x, moveVector.z); 
                    let diff = targetRot - this.playerModel.rotation.y;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    this.playerModel.rotation.y += diff * 10 * dt;
                } else if (this.cameraMode === 'TPS') {
                    // وضع Unreal: الشخصية تتجه دائماً نحو اتجاه الكاميرا
                    this.playerModel.rotation.y = this.cameraYaw;
                }
            }
        }

        if (isFirstPerson) {
            this.playerModel.rotation.y = this.cameraYaw;
        }

        // 4. الفيزياء (السقوط والقفز)
        this.velocityY -= 24 * dt; 
        this.playerModel.position.y += this.velocityY * dt;
        if (this.playerModel.position.y <= 0) { 
            this.playerModel.position.y = 0; this.velocityY = 0; this.isGrounded = true; 
        }

        // 5. تحديث الكاميرا (Spring Arm الاحترافي)
        const camHeight = 1.5; 
        const anchorPos = this.playerModel.position.clone().add(new THREE.Vector3(0, camHeight, 0));
        
        // حساب موقع الكاميرا المثالي
        const offsetX = Math.sin(this.cameraYaw) * this.currentDist * Math.cos(this.cameraPitch);
        const offsetZ = Math.cos(this.cameraYaw) * this.currentDist * Math.cos(this.cameraPitch);
        const offsetY = Math.sin(this.cameraPitch) * this.currentDist;
        
        let targetCamPos = anchorPos.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ));

        // --- تصادم الكاميرا (Camera Collision) ---
        if (!isFirstPerson) {
            const dirToCam = targetCamPos.clone().sub(anchorPos).normalize();
            this.raycaster.set(anchorPos, dirToCam);
            this.raycaster.far = this.currentDist;
            
            const obstacles = this.engine.objects.filter(o => o !== this.playerModel && o.userData.type !== 'vfx' && o.userData.type !== 'light');
            const hits = this.raycaster.intersectObjects(obstacles, true);
            
            if (hits.length > 0) {
                // إذا كان هناك جدار، تقترب الكاميرا منه
                const safeDist = Math.max(0.5, hits[0].distance - 0.2);
                targetCamPos = anchorPos.clone().add(dirToCam.multiplyScalar(safeDist));
            }
        }

        // --- تطبيق حركة الكاميرا بسلاسة (Lag) ---
        if (isFirstPerson) {
            this.engine.camera.position.lerp(anchorPos, this.cameraLag * dt);
            const lookDir = new THREE.Vector3(
                -Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch),
                -Math.sin(this.cameraPitch),
                -Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch)
            );
            this.engine.camera.lookAt(anchorPos.clone().add(lookDir));
        } else {
            this.engine.camera.position.lerp(targetCamPos, this.cameraLag * dt);
            this.engine.camera.lookAt(anchorPos);
        }

        // 6. إدارة الأنميشن
        if (this.playerModel.userData.animator && !isFirstPerson) {
            let targetState = 'idle';
            if (!this.isGrounded) targetState = 'jump';
            else if (isMoving) targetState = 'walk';
            
            this.playerModel.userData.animator.play(targetState, 0.2);
        }
    }
}
