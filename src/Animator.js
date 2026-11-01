import * as THREE from 'three';

export class Animator {
    constructor(model, animations) {
        this.model = model;
        this.mixer = new THREE.AnimationMixer(model);
        this.actions = {};
        this.currentAction = null;
        this.animationNames = []; // لحفظ أسماء الحركات

        if (animations && animations.length > 0) {
            animations.forEach(clip => {
                this.actions[clip.name] = this.mixer.clipAction(clip);
                this.animationNames.push(clip.name); // حفظ الاسم
            });
        }
    }

    play(stateName, fadeTime = 0.2) {
        // محاولة البحث عن الأنميشن المطلوب (idle, walk, jump)
        let actionKey = Object.keys(this.actions).find(k => k.toLowerCase().includes(stateName.toLowerCase()));
        
        // ✅ الحل الذكي: إذا لم نجد الاسم، استخدم أول أنميشن متاح لكسر وضعية T-Pose
        if (!actionKey && Object.keys(this.actions).length > 0) {
            actionKey = Object.keys(this.actions)[0];
        }

        if (actionKey && this.actions[actionKey]) {
            const nextAction = this.actions[actionKey];
            
            if (this.currentAction === nextAction) return;

            if (this.currentAction) {
                this.currentAction.fadeOut(fadeTime);
            }

            nextAction.reset().fadeIn(fadeTime).play();
            this.currentAction = nextAction;
        }
    }

    update(dt) {
        if (this.mixer) this.mixer.update(dt);
    }
}
