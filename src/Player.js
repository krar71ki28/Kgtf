import * as THREE from 'three';

export class Player {
    constructor(engine) {
        this.engine = engine;
        this.isPlaying = false;
        this.velocityY = 0;
        this.isGrounded = true;
        this.playerModel = null;
        
        this.setupControls();
    }

    setupControls() {
        document.getElementById('btn-play').onclick = () => this.startPlay();
        document.getElementById('exit-play').onclick = () => this.stopPlay();

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

        document.getElementById('btn-jump').addEventListener('touchstart', (e) => { 
            e.preventDefault(); 
            if(this.isPlaying && this.isGrounded) { this.velocityY = 8; this.isGrounded = false; } 
        }, { passive: false });
    }

    startPlay() {
        // البحث عن شخصية
        this.playerModel = this.engine.objects.find(o => o.userData.isCharacter);
        if (!this.playerModel) { alert('أضف شخصية أولاً من زر الإضافة!'); return; }
        
        this.isPlaying = true;
        document.body.classList.add('play-mode');
        document.getElementById('play-ui').style.display = 'block';
        this.engine.orbit.enabled = false;
        
        this.velocityY = 0;
        this.isGrounded = true;
        this.engine.camera.position.set(0, 3, 6); // كاميرا خلف الشخصية
        this.engine.selectObject(null); // إلغاء تحديد
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
        if (this.joyDir.x !== 0 || this.joyDir.y !== 0) {
            this.playerModel.position.x += this.joyDir.x * speed * dt;
            this.playerModel.position.z -= this.joyDir.y * speed * dt;
            
            // تدوير الشخصية نحو اتجاه الحركة
            const angle = Math.atan2(this.joyDir.x, -this.joyDir.y);
            this.playerModel.rotation.y = angle;
        }

        // الجاذبية
        this.velocityY -= 20 * dt; 
        this.playerModel.position.y += this.velocityY * dt;
        if (this.playerModel.position.y <= 1) { 
            this.playerModel.position.y = 1; 
            this.velocityY = 0; 
            this.isGrounded = true; 
        }

        // الكاميرا تتبع الشخصية
        const targetCamPos = this.playerModel.position.clone().add(new THREE.Vector3(0, 3, 6));
        this.engine.camera.position.lerp(targetCamPos, 5 * dt);
        this.engine.camera.lookAt(this.playerModel.position);
    }
}
