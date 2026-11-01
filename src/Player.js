import * as THREE from 'three';

export class Player {
    constructor(engine) {
        this.engine = engine;
        this.isPlaying = false;
        this.velocityY = 0;
        this.isGrounded = true;
        this.playerModel = null;
        
        this.cameraYaw = 0;
        this.cameraPitch = 0.3;
        this.cameraDist = 5;
        
        this.setupControls();
    }

    setupControls() {
        document.getElementById('btn-play').onclick = () => this.startPlay();
        document.getElementById('exit-play').onclick = () => this.stopPlay();

        // ✅ زر إطلاق النار
        const btnShoot = document.getElementById('btn-shoot');
        if (btnShoot) {
            btnShoot.addEventListener('touchstart', (e) => {
                e.preventDefault(); e.stopPropagation();
                this.shoot();
            }, { passive: false });
        }

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

    shoot() {
        if (!this.isPlaying || !this.playerModel) return;
        
        this.engine.audio.playSFX(); // صوت الإطلاق

        // ✅ Raycast من الكاميرا إلى الأمام
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.engine.camera); // منتصف الشاشة
        
        // نبحث عن الأعداء فقط
        const enemies = this.engine.ai.enemies;
        const hits = raycaster.intersectObjects(enemies, true);

        if (hits.length > 0) {
            let hitObj = hits[0].object;
            while (hitObj.parent && !hitObj.userData.isEnemy) hitObj = hitObj.parent;
            
            if (hitObj.userData.isEnemy) {
                this.engine.ai.takeDamage(hitObj, 34); // 3 طلقات لقتل العدو
            }
        }
    }

    checkCollision(pos) {
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            pos.clone().add(new THREE.Vector3(0, 1, 0)), 
            new THREE.Vector3(0.7, 1.9, 0.7)
        );

        for (let i = 0; i < this.engine.objects.length; i++) {
            const obj = this.engine.objects[i];
            if (obj !== this.playerModel && obj.userData.type !== 'vfx' && obj.userData.type !== 'light' && obj.userData.type !== 'enemy') {
                obj.updateMatrixWorld(true);
                const objBox = new THREE.Box3().setFromObject(obj);
                if (playerBox.intersectsBox(objBox)) return obj;
            }
        }
        return null;
    }

    startPlay() {
        this.playerModel = this.engine.objects.find(o => o.userData.isCharacter);
        if (!this.playerModel) { alert('أضف شخصية أولاً!'); return; }
        
        this.engine.objects.forEach(o => o.userData.hasCollided = false);

        this.isPlaying = true;
        document.body.classList.add('play-mode');
        document.getElementById('play-ui').style.display = 'block';
        this.engine.orbit.enabled = false;
        
        this.velocityY = 0;
        this.isGrounded = true;
        this.cameraYaw = 0;
        this.engine.selectObject(null);
        
        this.engine.audio.unlock();
        this.engine.audio.playBGM();
    }

    stopPlay() {
        this.isPlaying = false; 
        document.body.classList.remove('play-mode');
        document.getElementById('play-ui').style.display = 'none';
        this.engine.orbit.enabled = true; 
        this.engine.camera.position.set(6, 6, 8); 
        
        if (this.playerModel && this.playerModel.userData.animator) {
            this.playerModel.userData.animator.play('idle');
        }
        
        this.engine.audio.stopBGM();
    }

    update(dt) {
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
            
            const nextX = this.playerModel.position.clone().add(new THREE.Vector3(moveVector.x * speed * dt, 0, 0));
            const nextZ = this.playerModel.position.clone().add(new THREE.Vector3(0, 0, moveVector.z * speed * dt));

            const collidedX = this.checkCollision(nextX);
            const collidedZ = this.checkCollision(nextZ);

            if (!collidedX) this.playerModel.position.x = nextX.x;
            if (!collidedZ) this.playerModel.position.z = nextZ.z;

            const collidedObj = collidedX || collidedZ;
            if (collidedObj && collidedObj.userData.logic && !collidedObj.userData.hasCollided) {
                this.engine.logic.triggerEvent(collidedObj, 'onCollide');
                collidedObj.userData.hasCollided = true;
            }

            if (!collidedX && !collidedZ) {
                const angle = Math.atan2(moveVector.x, moveVector.z);
                this.playerModel.rotation.y = angle;
            }
        }

        const currentCollision = this.checkCollision(this.playerModel.position);
        if (currentCollision) {
            const pushDir = this.playerModel.position.clone().sub(currentCollision.position);
            pushDir.y = 0;
            if (pushDir.lengthSq() === 0) pushDir.set(1, 0, 0);
            pushDir.normalize();
            this.playerModel.position.add(pushDir.multiplyScalar(3 * dt));
        }

        this.velocityY -= 20 * dt; 
        this.playerModel.position.y += this.velocityY * dt;
        if (this.playerModel.position.y <= 0) { 
            this.playerModel.position.y = 0; 
            this.velocityY = 0; 
            this.isGrounded = true; 
        }

        const camOffset = new THREE.Vector3(
            Math.sin(this.cameraYaw) * this.cameraDist * Math.cos(this.cameraPitch),
            Math.sin(this.cameraPitch) * this.cameraDist,
            Math.cos(this.cameraYaw) * this.cameraDist * Math.cos(this.cameraPitch)
        );
        
        const targetCamPos = this.playerModel.position.clone().add(camOffset).add(new THREE.Vector3(0, 1.5, 0));
        this.engine.camera.position.lerp(targetCamPos, 10 * dt);
        this.engine.camera.lookAt(this.playerModel.position.clone().add(new THREE.Vector3(0, 1.5, 0)));

        if (this.playerModel.userData.animator) {
            if (!this.isGrounded) {
                this.playerModel.userData.animator.play('jump');
            } else if (isMoving) {
                this.playerModel.userData.animator.play('walk');
            } else {
                this.playerModel.userData.animator.play('idle');
            }
            this.playerModel.userData.animator.update(dt);
        }
    }
}
