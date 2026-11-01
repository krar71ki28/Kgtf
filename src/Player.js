import * as THREE from 'three';

export class Player {
    constructor(engine) {
        this.engine = engine;
        this.isPlaying = false;
        this.velocityY = 0;
        this.isGrounded = true;
        this.keys = {};
        
        this.cameraYaw = 0; 
        this.cameraPitch = 0.3; 
        this.targetDist = 4.5; 
        this.currentDist = 4.5; 
        
        this.setupControls();
    }

    setupControls() {
        document.getElementById('btn-play').onclick = () => this.startPlay();
        document.getElementById('exit-play').onclick = () => this.stopPlay();

        window.addEventListener('keydown', (e) => { 
            this.keys[e.code] = true; 
            if (e.code === 'Space' && this.isPlaying && this.isGrounded) { this.velocityY = 8; this.isGrounded = false; } 
        });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        // ✅ الجويستيك (باستخدام Pointer Events لضمان العمل على كل الأجهزة)
        let joyActive = false, joyDir = {x:0, y:0};
        const joyZone = document.getElementById('joystick-zone'), joyKnob = document.getElementById('joystick-knob');
        
        if(joyZone && joyKnob) {
            joyZone.addEventListener('pointerdown', (e) => { 
                e.preventDefault(); e.stopPropagation(); 
                joyActive = true; 
                joyZone.setPointerCapture(e.pointerId);
            });

            joyZone.addEventListener('pointermove', (e) => {
                e.preventDefault(); e.stopPropagation(); 
                if(!joyActive) return;
                const rect = joyZone.getBoundingClientRect();
                let dx = e.clientX - (rect.left + rect.width/2);
                let dy = e.clientY - (rect.top + rect.height/2);
                const dist = Math.sqrt(dx*dx + dy*dy); 
                if(dist > 40) { dx = (dx/dist)*40; dy = (dy/dist)*40; }
                joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                joyDir.x = dx/40; joyDir.y = dy/40;
            });

            const endJoy = (e) => {
                if(!joyActive) return;
                e.preventDefault(); e.stopPropagation(); 
                joyActive = false; 
                joyKnob.style.transform = `translate(-50%, -50%)`; 
                joyDir = {x:0, y:0}; 
            };

            joyZone.addEventListener('pointerup', endJoy);
            joyZone.addEventListener('pointercancel', endJoy);
            joyZone.addEventListener('pointerleave', endJoy);
        }
        
        // ✅ زر القفز
        const btnJump = document.getElementById('btn-jump');
        if(btnJump) btnJump.addEventListener('pointerdown', (e) => { 
            e.preventDefault(); e.stopPropagation(); 
            if(this.isPlaying && this.isGrounded) { this.velocityY = 8; this.isGrounded = false; } 
        });

        // ✅ التحكم بالكاميرا (Pointer Events)
        const canvas = this.engine.renderer.domElement;
        let isDraggingCam = false;
        let lastCamPos = { x: 0, y: 0 };

        canvas.addEventListener('pointerdown', (e) => {
            if (!this.isPlaying) return;
            // تجاهل النقر إذا كان على زر
            if (e.target !== canvas) return; 
            isDraggingCam = true;
            lastCamPos = { x: e.clientX, y: e.clientY };
        });
        
        canvas.addEventListener('pointermove', (e) => {
            if (!isDraggingCam || !this.isPlaying) return;
            this.cameraYaw -= (e.clientX - lastCamPos.x) * 0.005;
            this.cameraPitch = Math.max(-0.5, Math.min(1.2, this.cameraPitch + (e.clientY - lastCamPos.y) * 0.005));
            lastCamPos = { x: e.clientX, y: e.clientY };
        });
        
        window.addEventListener('pointerup', () => { isDraggingCam = false; });

        this.getJoyDir = () => joyActive ? joyDir : {x:0, y:0};
    }

    startPlay() {
        this.playerModel = this.engine.objects.find(o => o.userData.isCharacter);
        if (!this.playerModel) { alert('أضف شخصية أولاً!'); return; }
        
        this.isPlaying = true;
        this.playerModel.position.set(0, 0, 0);
        this.velocityY = 0;
        this.isGrounded = true;
        
        document.body.classList.add('play-mode');
        document.getElementById('play-ui').style.display = 'block';
        
        this.engine.selectObject(null); 
        this.engine.orbit.enabled = false;
        this.cameraYaw = Math.PI; 
    }

    stopPlay() {
        this.isPlaying = false; 
        document.body.classList.remove('play-mode');
        document.getElementById('play-ui').style.display = 'none';
        this.engine.orbit.enabled = true; 
        this.engine.camera.position.set(6, 6, 8); 
        this.engine.orbit.target.set(0, 1, 0);
    }

    update(dt) {
        // ✅ تحديث شاشة التشخيص قبل أي شرط
        const debug = document.getElementById('debug-info');
        if (debug) {
            debug.innerHTML = `isPlaying: ${this.isPlaying}<br>` +
                              `Joy: ${this.getJoyDir().x.toFixed(2)}, ${this.getJoyDir().y.toFixed(2)}`;
        }

        if (!this.isPlaying || !this.playerModel) return;
        
        const speed = 5;
        const forward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw)).normalize();
        const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw)).normalize();

        let moveVector = new THREE.Vector3();

        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveVector.add(forward);
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveVector.sub(forward);
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveVector.sub(right); 
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveVector.add(right); 

        const joy = this.getJoyDir();
        if (joy.x !== 0 || joy.y !== 0) {
            moveVector.add(right.clone().multiplyScalar(joy.x));
            moveVector.add(forward.clone().multiplyScalar(-joy.y)); 
        }

        const isMoving = moveVector.lengthSq() > 0;

        if (isMoving) {
            moveVector.normalize(); 
            // ✅ تحريك مباشر بدون أي فحص
            this.playerModel.position.x += moveVector.x * speed * dt;
            this.playerModel.position.z += moveVector.z * speed * dt;
            
            const targetRot = Math.atan2(moveVector.x, moveVector.z); 
            let diff = targetRot - this.playerModel.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            this.playerModel.rotation.y += diff * 10 * dt;
        }

        this.velocityY -= 24 * dt; 
        this.playerModel.position.y += this.velocityY * dt;
        if (this.playerModel.position.y <= 0) { 
            this.playerModel.position.y = 0; this.velocityY = 0; this.isGrounded = true; 
        }

        // الكاميرا
        const anchorPos = this.playerModel.position.clone().add(new THREE.Vector3(0, 1.5, 0));
        const offsetX = Math.sin(this.cameraYaw) * this.currentDist * Math.cos(this.cameraPitch);
        const offsetZ = Math.cos(this.cameraYaw) * this.currentDist * Math.cos(this.cameraPitch);
        const offsetY = Math.sin(this.cameraPitch) * this.currentDist;
        
        const targetCamPos = anchorPos.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ));
        this.engine.camera.position.lerp(targetCamPos, 10 * dt);
        this.engine.camera.lookAt(anchorPos);

        // الأنميشن
        if (this.playerModel.userData.animator) {
            this.playerModel.userData.animator.play(isMoving ? 'walk' : 'idle', 0.2);
        }
    }
}
