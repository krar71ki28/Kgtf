export class Player {
    constructor(engine) {
        this.engine = engine;
        this.isPlaying = false;
        this.velocityY = 0;
        this.isGrounded = true;
        
        this.setupControls();
    }

    setupControls() {
        document.getElementById('btn-play').onclick = () => this.startPlay();
        document.getElementById('exit-play').onclick = () => this.stopPlay();

        // --- الجويستيك (أحداث اللمس الأساسية) ---
        let joyActive = false;
        this.joyDir = { x: 0, y: 0 };
        const joyZone = document.getElementById('joystick-zone');
        const joyKnob = document.getElementById('joystick-knob');
        
        joyZone.addEventListener('touchstart', (e) => { 
            e.preventDefault(); 
            joyActive = true; 
        }, { passive: false });

        joyZone.addEventListener('touchmove', (e) => {
            e.preventDefault(); 
            if(!joyActive) return;
            const rect = joyZone.getBoundingClientRect();
            let dx = e.touches[0].clientX - (rect.left + rect.width/2);
            let dy = e.touches[0].clientY - (rect.top + rect.height/2);
            const dist = Math.sqrt(dx*dx + dy*dy); 
            if(dist > 40) { dx = (dx/dist)*40; dy = (dy/dist)*40; }
            
            joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            this.joyDir.x = dx/40; 
            this.joyDir.y = dy/40;
        }, { passive: false });

        joyZone.addEventListener('touchend', (e) => { 
            e.preventDefault(); 
            joyActive = false; 
            joyKnob.style.transform = `translate(-50%, -50%)`; 
            this.joyDir = {x:0, y:0}; 
        }, { passive: false });

        // --- زر القفز ---
        document.getElementById('btn-jump').addEventListener('touchstart', (e) => { 
            e.preventDefault(); 
            if(this.isPlaying && this.isGrounded) { this.velocityY = 8; this.isGrounded = false; } 
        }, { passive: false });
    }

    startPlay() {
        this.isPlaying = true;
        document.body.classList.add('play-mode');
        document.getElementById('play-ui').style.display = 'block';
        this.engine.orbit.enabled = false;
        
        // إعادة تعيين اللاعب
        this.engine.player.position.set(0, 1, 0);
        this.velocityY = 0;
        this.isGrounded = true;
        this.engine.camera.position.set(0, 3, 6); // كاميرا خلف اللاعب
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

        if (!this.isPlaying) return;
        
        const speed = 5;
        // تحريك اللاعب بناءً على الجويستيك
        if (this.joyDir.x !== 0 || this.joyDir.y !== 0) {
            this.engine.player.position.x += this.joyDir.x * speed * dt;
            this.engine.player.position.z -= this.joyDir.y * speed * dt;
            
            // تدوير اللاعب نحو اتجاه الحركة
            const angle = Math.atan2(this.joyDir.x, -this.joyDir.y);
            this.engine.player.rotation.y = angle;
        }

        // الجاذبية
        this.velocityY -= 20 * dt; 
        this.engine.player.position.y += this.velocityY * dt;
        if (this.engine.player.position.y <= 1) { 
            this.engine.player.position.y = 1; 
            this.velocityY = 0; 
            this.isGrounded = true; 
        }

        // الكاميرا تتبع اللاعب
        const targetCamPos = this.engine.player.position.clone().add({x: 0, y: 3, z: 6});
        this.engine.camera.position.lerp(targetCamPos, 5 * dt);
        this.engine.camera.lookAt(this.engine.player.position);
    }
}
