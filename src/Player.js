import * as THREE from 'three';

export class Player {
    constructor(engine) {
        this.engine = engine;
        this.isPlaying = false;
        this.keys = {};
        this.direction = new THREE.Vector3();
        this.joystickActive = false;
        this.joystickDir = { x: 0, y: 0 };
        
        // متغيرات للقفز
        this.velocityY = 0;
        this.isGrounded = true;

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
        const maxDist = 40; // زيادة مسافة الجويستيك شوي عشان يكون أدق

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
        
        // إضافة زر القفز (عبر النقر على الشاشة في وضع اللعب)
        this.engine.canvas.addEventListener('touchstart', (e) => {
            if (this.isPlaying && this.isGrounded && !this.joystickActive) {
                // إذا ضغط على الشاشة (مو على الجويستيك)، يقفز
                this.velocityY = 7;
                this.isGrounded = false;
            }
        });
    }

    startPlay() {
        const playerObj = this.engine.objects.find(o => o.userData.type === 'character');
        if (!playerObj) { alert('أضف شخصية أولاً لتتمكن من اللعب!'); return; }
        
        this.isPlaying = true;
        this.playerModel = playerObj;
        document.body.classList.add('play-mode');
        
        this.engine.selectObject(null);
        this.engine.controls.enabled = false;
        
        // ضبط ارتفاع الكاميرا الأولي
        const camOffset = new THREE.Vector3(0, 4, -8);
        camOffset.applyAxisAngle(new THREE.Vector3(0,1,0), this.playerModel.rotation.y);
        this.engine.camera.position.copy(this.playerModel.position).add(camOffset);
        this.engine.camera.lookAt(this.playerModel.position.x, this.playerModel.position.y + 1.5, this.playerModel.position.z);
        this.engine.resize();
    }

    stopPlay() {
        this.isPlaying = false;
        document.body.classList.remove('play-mode');
        this.engine.controls.enabled = true;
        
        this.engine.camera.position.set(8, 6, 10);
        this.engine.controls.target.set(0, 2, 0);
        this.engine.resize();
    }

    update(dt) {
        if (!this.isPlaying || !this.playerModel) return;

        const speed = 6; // سرعة اللاعب
        this.direction.set(0, 0, 0);

        // الحصول على اتجاه الكاميرا الحالي (عشان نحرك اللاعب بالنسبة للي نشوفه)
        const camForward = new THREE.Vector3();
        this.engine.camera.getWorldDirection(camForward);
        camForward.y = 0; // نلغي الارتفاع
        camForward.normalize();
        
        const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0, 1, 0)).normalize();

        // حركة الكيبورد
        if (this.keys['KeyW'] || this.keys['ArrowUp']) this.direction.add(camForward);
        if (this.keys['KeyS'] || this.keys['ArrowDown']) this.direction.sub(camForward);
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.direction.sub(camRight);
        if (this.keys['KeyD'] || this.keys['ArrowRight']) this.direction.add(camRight);

        // حركة الجويستيك (دفع لقدام = تمشي باتجاه نظر الكاميرا)
        if (this.joystickActive) {
            this.direction.add(camForward.clone().multiplyScalar(-this.joystickDir.y));
            this.direction.add(camRight.clone().multiplyScalar(this.joystickDir.x));
        }

        let isMoving = false;

        if (this.direction.lengthSq() > 0.01) {
            this.direction.normalize();
            isMoving = true;
            
            // تدوير اللاعب بسلاسة باتجاه الحركة
            const targetAngle = Math.atan2(this.direction.x, this.direction.z);
            
            // حساب أقصر مسار للدوران لتجنب اللف 360 درجة
            let diff = targetAngle - this.playerModel.rotation.y;
            while (diff < -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            
            this.playerModel.rotation.y += diff * 10 * dt; // سرعة الدوران

            // تحريك اللاعب
            this.playerModel.position.x += this.direction.x * speed * dt;
            this.playerModel.position.z += this.direction.z * speed * dt;
        }

        // إدارة الأنيميشن (انتقال سلس)
        const actions = this.playerModel.userData.actions;
        if (actions && actions['Walking'] && actions['Idle']) {
            if (isMoving && this.playerModel.userData.currentAction !== 'Walking') {
                actions['Idle'].fadeOut(0.2);
                actions['Walking'].reset().fadeIn(0.2).play();
                this.playerModel.userData.currentAction = 'Walking';
            } else if (!isMoving && this.playerModel.userData.currentAction !== 'Idle') {
                actions['Walking'].fadeOut(0.2);
                actions['Idle'].reset().fadeIn(0.2).play();
                this.playerModel.userData.currentAction = 'Idle';
            }
        }

        // --- فيزياء القفز ---
        if (!this.isGrounded) {
            this.velocityY -= 20 * dt; // الجاذبية
            this.playerModel.position.y += this.velocityY * dt;
            
            if (this.playerModel.position.y <= 0) {
                this.playerModel.position.y = 0;
                this.velocityY = 0;
                this.isGrounded = true;
            }
        }

        // --- الكاميرا ---
        const camOffset = new THREE.Vector3(0, 4.5, -8);
        camOffset.applyAxisAngle(new THREE.Vector3(0,1,0), this.playerModel.rotation.y);
        
        const desiredCamPos = this.playerModel.position.clone().add(camOffset);
        
        // تحريك الكاميرا بسلاسة
        this.engine.camera.position.lerp(desiredCamPos, 0.1);
        
        // منع الكاميرا من النزول تحت الأرض
        if (this.engine.camera.position.y < 0.5) this.engine.camera.position.y = 0.5;

        // جعل الكاميرا تنظر للاعب
        this.engine.camera.lookAt(this.playerModel.position.x, this.playerModel.position.y + 1.5, this.playerModel.position.z);
    }
}
