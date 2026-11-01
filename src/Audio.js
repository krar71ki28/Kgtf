import * as THREE from 'three';

export class AudioManager {
    constructor(camera) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);
        
        this.bgMusic = new THREE.Audio(this.listener);
        this.audioLoader = new THREE.AudioLoader();
        this.isMuted = false;

        // 1. تحميل الموسيقى الخلفية
        this.audioLoader.load('https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3', (buffer) => {
            this.bgMusic.setBuffer(buffer);
            this.bgMusic.setLoop(true);
            this.bgMusic.setVolume(0.2);
        });

        // 2. إعداد مجمع أصوات (Pool) للاصطدام (لحل مشكلة التكرار)
        this.sfxPool = [];
        const sfxURL = 'https://assets.mixkit.co/active_storage/sfx/224/224-preview.mp3';
        for (let i = 0; i < 5; i++) {
            const sfx = new Audio(sfxURL);
            sfx.volume = 0.5;
            this.sfxPool.push(sfx);
        }
    }

    // ✅ دالة لفك حظر الصوت (تستدعى عند الضغط على زر التشغيل)
    unlock() {
        if (this.listener.context.state === 'suspended') {
            this.listener.context.resume();
        }
    }

    playBGM() {
        this.unlock();
        if (this.bgMusic.buffer && !this.bgMusic.isPlaying) {
            this.bgMusic.play();
        }
    }

    stopBGM() {
        if (this.bgMusic.isPlaying) {
            this.bgMusic.pause();
        }
    }

    playSFX() {
        this.unlock();
        // البحث عن صوت غير مشغول
        const availableSfx = this.sfxPool.find(s => s.paused || s.ended);
        if (availableSfx) {
            availableSfx.currentTime = 0;
            availableSfx.play().catch(e => console.warn("SFX Error:", e));
        } else {
            // إذا كانت كل الأصوات مشغولة، نعيد تشغيل الأول
            this.sfxPool[0].currentTime = 0;
            this.sfxPool[0].play().catch(e => {});
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        this.listener.setMasterVolume(this.isMuted ? 0 : 1);
        this.sfxPool.forEach(s => s.muted = this.isMuted);
        return this.isMuted;
    }
}
