import * as THREE from 'three';
import * as CANNON from 'cannon-es';

export class Player {
    constructor(engine) {
        this.engine = engine;
        this.isPlaying = false;
        this.velocityY = 0;
        this.isGrounded = true;
        this.playerModel = null;
        
        // إعدادات الكاميرا
        this.cameraYaw = 0;
        this.cameraPitch = 0.3;
        this.cameraDist = 5;
        
        this.setupControls();
    }

    setupControls() {
        document.getElementById('btn-play').onclick = () => this.startPlay();
        document.getElementById('exit-play').onclick = () => this.stopPlay();

        // --- الجويستيك ---
        let joyActive = false;
        this.joyDir = { x: 0, y: 0 };
        const joyZone = document.getElementById('joystick-zone');
        const joyKnob = document.getElementById('joystick-knob');
        
        joyZone.addEventListener('touchstart', (e) => { e.preventDefault(); joyActive = true; }, { passive: false });
        joyZone.addEventListener('touchmove', (e) => {
            e.preventDefault(); if(!joyActive) return;
            const rect = joyZone.getBoundingClientRect();
            let dx = e.touches[0].clientX - (rect.left + rect.width/2);
            let dy = e.touches[0].clientY - (rect.top + rect.height/2);
            const dist = Math.sqrt(dx*dx + dy*dy); 
            if(dist > 40) { dx = (dx/dist)*40; dy = (dy/dist)*40; }
            joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            this.joyDir.x = dx/40; this.joyDir.y = dy/40;
        }, { passive: false });
        joyZone.addEventListener('touchend', (e) => { 
            e.preventDefault(); joyActive = false; 
            joyKnob.style.transform = `translate(-50%, -50%)`; 
            this.joyDir = {x:0, y:0}; 
        }, { passive: false });

        // --- زر القفز ---
        document.getElementById('btn-jump').addEventListener('touchstart', (e) => { 
            e.preventDefault(); 
            if(this.isPlaying && this.isGrounded) { this.velocityY = 8; this.isGrounded = false; } 
        }, { passive: false });

        // --- التحكم بالكاميرا (سحب الشاشة) ---
        const canvas = this.engine.renderer.domElement;
        let isDragging = false;
        let lastX = 0, lastY = 0;

        canvas.addEventListener('touchstart', (e) => {
            if (!this.isPlaying) return;
            isDragging = true;
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
        }, { passive: true });

        canvas.addEventListener('touchmove', (e) => {
            if (!isDragging || !this.isPlaying) return;
            const dx = e.touches[0].clientX - lastX;
            const dy = e.touches[0].clientY - lastY;
            
            this.cameraYaw -= dx * 0.005;
            this.cameraPitch = Math.max(-0.5, Math.min(1.2, this.cameraPitch + dy * 0.005));
            
            lastX = e.touches[0].clientX;
            lastY = e.touches[0].clientY;
        }, { passive: true });

        canvas.addEventListener('touchend', () => { isDragging = false; });
    }

    startPlay() {
        this.playerModel = this.engine.objects.find(o => o.userData.isCharacter);
        if (!this.playerModel) { alert('أضف شخصية أولاً!'); return; }
        
        this.isPlaying = true;
        document.body.classList.add('play-mode');
        document.getElementById('play-ui').style.display = 'block';
        this.engine.orbit.enabled = false;
        
        this.velocityY = 0;
        this.isGrounded = true;
        this.cameraYaw = 0; // إعادة ضبط زاوية الكاميرا
        this.engine.selectObject(null);
    }

    stopPlay() {
        this.isPlaying = false; 
        document.body.classList.remove('play-mode');
        document.getElementById('play-ui').style.display = 'none';
        this.engine.orbit.enabled = true; 
        this.engine.camera.position.set(6, 6, 8); 
    }

    update(dt) {
        const debug = document.getElementById('debug-info');
        if (debug) {
            debug.innerHTML = `isPlaying: ${this.isPlaying}<br>Joy: ${this.joyDir.x.toFixed(2)}, ${this.joyDir.y.toFixed(2)}`;
        }

        if (!this.isPlaying || !this.playerModel) return;
        
        const speed = 5;
        const forward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw)).normalize();
        const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw)).normalize();

        let moveVector = new THREE.Vector3();
        if (this.joyDir.x !== 0 || this.joyDir.y !== 0) {
            moveVector.add(right.clone().multiplyScalar(this.joyDir.x));
            moveVector.add(forward.clone().multiplyScalar(-this.joyDir.y)); 
        }

        const isMoving = moveVector.lengthSq() > 0;

        if (isMoving) {
            moveVector.normalize();
            const nextPos = this.playerModel.position.clone().addScaledVector(moveVector, speed * dt);
            
            // ✅ فحص تصادم ذكي (Raycaster) لا يسبب تجميد
            const dir = moveVector.clone();
            const ray = new CANNON.RaycastResult();
            const from = new CANNON.Vec3(this.playerModel.position.x, 1, this.playerModel.position.z);
            const to = new CANNON.Vec3(nextPos.x, 1, nextPos.z);
            
            this.engine.physics.world.raycastClosest(from, to, { skipBackfaces: true }, ray);
            
            // إذا لم يصطدم بجسم صلب
            if (!ray.hasHit) {
                this.playerModel.position.copy(nextPos);
                // تدوير الشخصية
                const angle = Math.atan2(moveVector.x, moveVector.z);
                this.playerModel.rotation.y = angle;
            }
        }

        // الجاذبية
        this.velocityY -= 20 * dt; 
        this.playerModel.position.y += this.velocityY * dt;
        if (this.playerModel.position.y <= 1) { 
            this.playerModel.position.y = 1; 
            this.velocityY = 0; 
            this.isGrounded = true; 
        }

        // ✅ تحديث الكاميرا (Spring Arm)
        const camOffset = new THREE.Vector3(
            Math.sin(this.cameraYaw) * this.cameraDist * Math.cos(this.cameraPitch),
            Math.sin(this.cameraPitch) * this.cameraDist,
            Math.cos(this.cameraYaw) * this.cameraDist * Math.cos(this.cameraPitch)
        );
        
        const targetCamPos = this.playerModel.position.clone().add(camOffset).add(new THREE.Vector3(0, 1.5, 0));
        this.engine.camera.position.lerp(targetCamPos, 10 * dt);
        this.engine.camera.lookAt(this.playerModel.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
    }
}
