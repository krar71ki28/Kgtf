import * as THREE from 'three';

export class Player {
    constructor(engine) {
        this.engine = engine;
        this.isPlaying = false;
        this.keys = {};
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.joystickActive = false;
        this.joystickDir = { x: 0, y: 0 };

        this.setupControls();
    }

    setupControls() {
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        document.getElementById('btn-play').onclick = () => this.startPlay();
        document.getElementById('exit-play').onclick = () => this.stopPlay();

        const zone = document.getElementById('joystick-zone');
        const knob = document.getElementById('joystick-knob');
        const base = document.getElementById('joystick-base');

        let touchStart = null;
        const maxDist = 35;

        zone.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            const rect = base.getBoundingClientRect();
            touchStart = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
            this.joystickActive = true;
        });

        zone.addEventListener('touchmove', (e) => {
            if (!this.joystickActive) return;
            const touch = e.touches[0];
            let dx = touch.clientX - touchStart.x;
            let dy = touch.clientY - touchStart.y;
            
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist > maxDist) {
                dx = (dx / dist) * maxDist;
                dy = (dy / dist) * maxDist;
            }
            
            knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
            this.joystickDir.x = dx / maxDist;
            this.joystickDir.y = dy / maxDist;
        });

        zone.addEventListener('touchend', () => {
            this.joystickActive = false;
            knob.style.transform = `translate(-50%, -50%)`;
            this.joystickDir = { x: 0, y: 0 };
        });
    }

    startPlay() {
        const playerObj = this.engine.objects.find(o => o.userData.type === 'character');
        if (!playerObj) { alert('أضف شخصية أولاً لتتمكن من اللعب!'); return; }
        
        this.isPlaying = true;
        this.playerModel = playerObj;
        document.body.classList.add('play-mode');
        
        // 1. إلغاء تحديد المجسم عشان تختفي الأسهم (Gizmo) والقائمة
        this.engine.selectObject(null);
        
        // 2. إبعاد الكاميرا للخلف والأعلى
        this.engine.camera.position.copy(this.playerModel.position).add(new THREE.Vector3(0, 5, -10));
        this.engine.controls.target.copy(this.playerModel.position);
        this.engine.resize();
    }

    stopPlay() {
        this.isPlaying = false;
        document.body.classList.remove('play-mode');
        this.engine.camera.position.set(8, 6, 10);
        this.engine.controls.target.set(0, 2, 0);
        this.engine.resize();
    }

    update(dt) {
        if (!this.isPlaying || !this.playerModel) return;

        const speed = 5;
        this.direction.set(0, 0, 0);

        if (this.keys['KeyW'] || this.keys['ArrowUp']) this.direction.z -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) this.direction.z += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.direction.x -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) this.direction.x += 1;

        if (this.joystickActive) {
            this.direction.x += this.joystickDir.x;
            this.direction.z += this.joystickDir.y;
        }

        if (this.direction.lengthSq() > 0) {
            this.direction.normalize();
            
            const targetAngle = Math.atan2(this.direction.x, this.direction.z);
            this.playerModel.rotation.y = targetAngle;

            this.playerModel.position.x += this.direction.x * speed * dt;
            this.playerModel.position.z += this.direction.z * speed * dt;

            if (this.playerModel.userData.actions && this.playerModel.userData.actions['Walking']) {
                if (this.playerModel.userData.currentAction !== 'Walking') {
                    this.playerModel.userData.actions['Idle'].stop();
                    this.playerModel.userData.actions['Walking'].play();
                    this.playerModel.userData.currentAction = 'Walking';
                }
            }
        } else {
            if (this.playerModel.userData.actions && this.playerModel.userData.actions['Idle']) {
                if (this.playerModel.userData.currentAction !== 'Idle') {
                    if (this.playerModel.userData.actions['Walking']) this.playerModel.userData.actions['Walking'].stop();
                    this.playerModel.userData.actions['Idle'].play();
                    this.playerModel.userData.currentAction = 'Idle';
                }
            }
        }

        // متابعة الكاميرا للشخصية (تعديل المسافة والارتفاع)
        const targetPos = this.playerModel.position.clone();
        targetPos.y += 2; 
        this.engine.controls.target.lerp(targetPos, 0.1);
        
        const desiredCamPos = this.playerModel.position.clone();
        desiredCamPos.y += 5; // رفع الكاميرا
        desiredCamPos.z -= 10; // إبعاد الكاميرا للخلف
        desiredCamPos.applyAxisAngle(new THREE.Vector3(0,1,0), this.playerModel.rotation.y);
        
        this.engine.camera.position.lerp(desiredCamPos, 0.05);
    }
}
