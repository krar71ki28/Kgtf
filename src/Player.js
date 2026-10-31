import * as THREE from 'three';

export class Player {
    constructor(engine) {
        this.engine = engine;
        this.isPlaying = false;
        this.keys = {};
        this.joystickActive = false;
        this.joystickDir = { x: 0, y: 0 };
        
        this.setupControls();
    }

    setupControls() {
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        document.getElementById('btn-play').onclick = () => {
            const p = this.engine.objects.find(o => o.userData.type === 'character');
            if (!p) { alert('أضف شخصية أولاً!'); return; }
            this.playerModel = p;
            this.isPlaying = true;
            document.body.classList.add('play-mode');
            document.getElementById('play-ui').style.display = 'block';
            this.engine.controls.enabled = false;
            this.engine.selectObject(null);
        };

        document.getElementById('exit-play').onclick = () => {
            this.isPlaying = false;
            document.body.classList.remove('play-mode');
            document.getElementById('play-ui').style.display = 'none';
            this.engine.controls.enabled = true;
        };

        const zone = document.getElementById('joystick-zone'), knob = document.getElementById('joystick-knob'), base = document.getElementById('joystick-base');
        if(zone) {
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
        }
    }

    update(dt) {
        if (!this.isPlaying || !this.playerModel) return;
        
        let moveX = 0, moveZ = 0;
        if (this.keys['KeyW'] || this.keys['ArrowUp']) moveZ -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) moveZ += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) moveX -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) moveX += 1;
        
        if (this.joystickActive) { moveX += this.joystickDir.x; moveZ += this.joystickDir.y; }

        if (moveX !== 0 || moveZ !== 0) {
            const speed = 5 * dt;
            this.playerModel.position.x += moveX * speed;
            this.playerModel.position.z += moveZ * speed;
            const angle = Math.atan2(moveX, moveZ);
            this.playerModel.rotation.y = angle;
        }
        
        // متابعة الكاميرا للشخصية
        this.engine.camera.position.lerp(this.playerModel.position.clone().add(new THREE.Vector3(0, 4, -6)), 5 * dt);
        this.engine.camera.lookAt(this.playerModel.position);
    }
}
