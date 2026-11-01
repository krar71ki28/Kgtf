import * as THREE from 'three';

export class AudioManager {
    constructor(camera) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);
        
        this.bgMusic = new THREE.Audio(this.listener);
        this.sfx = new THREE.Audio(this.listener);
        this.audioLoader = new THREE.AudioLoader();
        this.isMuted = false;

        // تحميل الموسيقى الخلفية (BGM)
        this.audioLoader.load('https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3', (buffer) => {
            this.bgMusic.setBuffer(buffer);
            this.bgMusic.setLoop(true);
            this.bgMusic.setVolume(0.2);
        });

        // تحميل مؤثر صوتي (اصطدام)
        this.audioLoader.load('https://assets.mixkit.co/active_storage/sfx/224/224-preview.mp3', (buffer) => {
            this.sfx.setBuffer(buffer);
            this.sfx.setVolume(0.5);
        });
    }

    playBGM() {
        if (this.bgMusic.buffer && !this.bgMusic.isPlaying) this.bgMusic.play();
    }

    stopBGM() {
        if (this.bgMusic.isPlaying) this.bgMusic.pause();
    }

    playSFX() {
        if (this.sfx.buffer) this.sfx.play();
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.listener.setMasterVolume(this.isMuted ? 0 : 1);
        return this.isMuted;
    }
}
