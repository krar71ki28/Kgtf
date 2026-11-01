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
        this.cameraLag = 15; 
        this.cameraMode = 'TPS'; 
        
        this.setupControls();
    }

    setupControls() {
        document.getElementById('btn-play').addEventListener('click', () => this.startPlay());
        
        const btnExit = document.getElementById('exit-play');
        if(btnExit) {
            btnExit.addEventListener('click', (e) => {
                e.preventDefault();
                this.stopPlay();
            });
        }

        window.addEventListener('keydown', (e) => { 
            this.keys[e.code] = true; 
            if (e.code === 'Space' && this.isPlaying && this.isGrounded) { this.velocityY = 8; this.isGrounded = false; } 
        });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        let joyActive = false, joyDir = {x:0, y:0};
        const joyZone = document.getElementById('joystick-zone'), joyKnob = document.getElementById('joystick-knob');
        
        if(joyZone && joyKnob) {
            joyZone.addEventListener('touchstart', (e) => { 
                e.preventDefault(); e.stopPropagation(); 
                joyActive = true; 
            }, { passive: false });

            joyZone.addEventListener('touchmove', (e) => {
                e.preventDefault(); e.stopPropagation(); 
                if(!joyActive) return;
                const rect = joyZone.getBoundingClientRect();
                let dx = e.touches[0].clientX - (rect.left + rect.width/2);
                let dy = e.touches[0].clientY - (rect.top + rect.height/2);
                const dist = Math.sqrt(dx*dx + dy*dy); 
                if(dist > 40) { dx = (dx/dist)*40; dy = (dy/dist)*40; }
                joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
                joyDir.x = dx/40; joyDir.y = dy/40;
            }, { passive: false });

            joyZone.addEventListener('touchend', (e) => { 
                e.preventDefault(); e.stopPropagation(); 
                joyActive = false; 
                joyKnob.style.transform = `translate(-50%, -50%)`; 
                joyDir = {x:0, y:0}; 
            }, { passive: false });
        }
        
        const btnJump = document.getElementById('btn-jump');
        if(btnJump) btnJump.addEventListener('touchstart', (e) => { 
            e.preventDefault(); e.stopPropagation(); 
            if(this.isPlaying && this.isGrounded) { this.velocityY = 8; this.isGrounded = false; } 
        }, { passive: false });

        const canvas = this.engine.renderer.domElement;
        let isDraggingCam = false;
        let lastCamPos = { x: 0, y: 0 };
        let initialPinchDist = 0;

        canvas.addEventListener('touchstart', (e) => {
            if (!this.isPlaying) return;
            e.preventDefault(); 
            if (e.touches.length === 2) {
                initialPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
            } else if (e.touches.length === 1) {
                isDraggingCam = true;
                lastCamPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        }, { passive: false });
        
        canvas.addEventListener('touchmove', (e) => {
            if (!this.isPlaying) return;
            e.preventDefault();
            if (e.touches.length === 2 && initialPinchDist > 0) {
                const currentPinchDist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
                const delta = initialPinchDist - currentPinchDist;
                this.targetDist = Math.max(0.5, Math.min(8, this.targetDist + delta * 0.05));
                initialPinchDist = currentPinchDist;
            } else if (e.touches.length === 1 && isDraggingCam) {
                const touch = e.touches[0];
                this.cameraYaw -= (touch.clientX - lastCamPos.x) * 0.005;
                this.cameraPitch = Math.max(-0.5, Math.min(1.2, this.cameraPitch + (touch.clientY - lastCamPos.y) * 0.005));
                lastCamPos = { x: touch.clientX, y: touch.clientY };
            }
        }, { passive: false });
        
        canvas.addEventListener('touchend', (e) => { 
            e.preventDefault();
            isDraggingCam = false; initialPinchDist = 0; 
        }, { passive: false });

        this.getJoyDir = () => joyActive ? joyDir : {x:0, y:0};
    }

    startPlay() {
        this.playerModel = this.engine.objects.find(o => o.userData.isCharacter);
        if (!this.playerModel) { alert('أضف شخصية أولاً!'); return; }
        
        this.isPlaying = true;
        this.playerModel.visible = true;
        this.playerModel.position.set(0, 0, 0);
        this.playerModel.rotation.set(0, 0, 0);
        this.velocityY = 0;
        this.isGrounded = true;
        
        document.body.classList.add('play-mode');
        document.getElementById('play-ui').style.display = 'block';
        this.engine.selectObject(null); 
        this.engine.orbit.enabled = false;
        
        this.cameraYaw = Math.PI; 
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
        
        // ✅ تحديث شاشة التشخيص
        const debug = document.getElementById('debug-info');
        if (debug) {
            debug.innerHTML = `Joy: ${joy.x.toFixed(2)}, ${joy.y.toFixed(2)}<br>` +
                              `Move: ${moveVector.x.toFixed(2)}, ${moveVector.z.toFixed(2)}<br>` +
                              `isPlaying: ${this.isPlaying}`;
        }

        this.currentDist += (this.targetDist - this.currentDist) * 10 * dt;
        const isFirstPerson = this.currentDist < 0.8;
        this.playerModel.visible = !isFirstPerson;

        if (isMoving) {
            moveVector.normalize(); 
            // حركة حرة مطلقة
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

        const camHeight = 1.5; 
        const anchorPos = this.playerModel.position.clone().add(new THREE.Vector3(0, camHeight, 0));
        
        const offsetX = Math.sin(this.cameraYaw) * this.currentDist * Math.cos(this.cameraPitch);
        const offsetZ = Math.cos(this.cameraYaw) * this.currentDist * Math.cos(this.cameraPitch);
        const offsetY = Math.sin(this.cameraPitch) * this.currentDist;
        
        let targetCamPos = anchorPos.clone().add(new THREE.Vector3(offsetX, offsetY, offsetZ));
        this.engine.camera.position.lerp(targetCamPos, this.cameraLag * dt);
        this.engine.camera.lookAt(anchorPos);
    }
}
