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
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        const btnPlay = document.getElementById('btn-play');
        if (btnPlay) btnPlay.onclick = () => this.startPlay();
        const btnPlayFab = document.getElementById('btn-play-fab');
        if (btnPlayFab) btnPlayFab.onclick = () => this.startPlay();
        const btnExit = document.getElementById('exit-play');
        if (btnExit) btnExit.onclick = () => this.stopPlay();
    }

    startPlay() {
        const p = this.engine.objects.find(o => o.userData.type === 'character');
        if (!p) { alert('أضف شخصية أولاً!'); return; }
        this.isPlaying = true; this.playerModel = p;
        document.body.classList.add('play-mode'); 
        document.getElementById('play-ui').style.display = 'block';
        this.engine.controls.enabled = false;
    }

    stopPlay() {
        this.isPlaying = false; 
        document.body.classList.remove('play-mode');
        document.getElementById('play-ui').style.display = 'none';
        this.engine.controls.enabled = true;
    }

    update(dt) {
        if (!this.isPlaying || !this.playerModel) return;
        const maxSpeed = 5;
        let moveX = 0, moveZ = 0;
        if (this.keys['KeyW']) moveZ -= 1;
        if (this.keys['KeyS']) moveZ += 1;
        if (this.keys['KeyA']) moveX -= 1;
        if (this.keys['KeyD']) moveX += 1;

        if (moveX !== 0 || moveZ !== 0) {
            this.playerModel.position.x += moveX * maxSpeed * dt;
            this.playerModel.position.z += moveZ * maxSpeed * dt;
        }

        this.velocityY -= 24 * dt;
        this.playerModel.position.y += this.velocityY * dt;
        if (this.playerModel.position.y <= 0) { this.playerModel.position.y = 0; this.velocityY = 0; }

        // كاميرا بسيطة تتبع اللاعب
        this.engine.editorCamera.position.set(
            this.playerModel.position.x + 5, 
            this.playerModel.position.y + 5, 
            this.playerModel.position.z + 5
        );
        this.engine.editorCamera.lookAt(this.playerModel.position);
    }
}
