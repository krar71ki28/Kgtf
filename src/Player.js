import * as THREE from 'three';

export class Player {
    constructor(engine) {
        this.engine = engine;
        this.isPlaying = false;
        this.keys = {};
        this.velocityY = 0;
        this.isGrounded = true;

        this.setupControls();
    }

    setupControls() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            if (e.code === 'Space' && this.isPlaying && this.isGrounded) {
                this.velocityY = 8; this.isGrounded = false;
            }
        });
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        document.getElementById('btn-play').onclick = () => this.startPlay();
        const fabPlay = document.getElementById('btn-play-fab');
        if (fabPlay) fabPlay.onclick = () => this.startPlay();
        
        document.getElementById('exit-play').onclick = () => this.stopPlay();
    }

    startPlay() {
        const p = this.engine.objects.find(o => o.userData.type === 'character');
        if (!p) { alert('أضف شخصية أولاً!'); return; }
        this.isPlaying = true; 
        this.playerModel = p;
        document.body.classList.add('play-mode'); 
        document.getElementById('play-ui').style.display = 'block';
        this.engine.controls.enabled = false;
        this.engine.selectObject(null);
    }

    stopPlay() {
        this.isPlaying = false; 
        document.body.classList.remove('play-mode');
        document.getElementById('play-ui').style.display = 'none';
        this.engine.controls.enabled = true;
        this.engine.editorCamera.position.set(8, 6, 10);
        this.engine.controls.target.set(0, 2, 0);
    }

    update(dt) {
        if (!this.isPlaying || !this.playerModel) return;
        
        const speed = 5;
        let moveX = 0, moveZ = 0;
        const camForward = new THREE.Vector3();
        this.engine.editorCamera.getWorldDirection(camForward); camForward.y = 0; camForward.normalize();
        const camRight = new THREE.Vector3().crossVectors(camForward, new THREE.Vector3(0,1,0)).normalize();

        if (this.keys['KeyW']) { moveX += camForward.x; moveZ += camForward.z; }
        if (this.keys['KeyS']) { moveX -= camForward.x; moveZ -= camForward.z; }
        if (this.keys['KeyA']) { moveX -= camRight.x; moveZ -= camRight.z; }
        if (this.keys['KeyD']) { moveX += camRight.x; moveZ += camRight.z; }

        if (moveX !== 0 || moveZ !== 0) {
            const len = Math.sqrt(moveX * moveX + moveZ * moveZ);
            this.playerModel.position.x += (moveX / len) * speed * dt;
            this.playerModel.position.z += (moveZ / len) * speed * dt;
            this.playerModel.rotation.y = Math.atan2(moveX, moveZ);
        }

        this.velocityY -= 24 * dt;
        this.playerModel.position.y += this.velocityY * dt;
        if (this.playerModel.position.y <= 0) { this.playerModel.position.y = 0; this.velocityY = 0; this.isGrounded = true; }

        // كاميرا تتبع
        const targetCamPos = this.playerModel.position.clone().add(new THREE.Vector3(0, 3, -5));
        this.engine.editorCamera.position.lerp(targetCamPos, 5 * dt);
        this.engine.editorCamera.lookAt(this.playerModel.position.x, this.playerModel.position.y + 1, this.playerModel.position.z);
    }
}
