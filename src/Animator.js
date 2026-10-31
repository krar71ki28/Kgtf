import * as THREE from 'three';

export class Animator {
    constructor(model, animations) {
        this.model = model;
        this.mixer = new THREE.AnimationMixer(model);
        this.actions = {};
        this.currentAction = null;
        this.currentState = '';

        // تحويل مصفوفة الأنميشن إلى قاموس (Dictionary)
        if (animations && animations.length > 0) {
            animations.forEach(clip => {
                this.actions[clip.name] = this.mixer.clipAction(clip);
            });
        }
    }

    play(stateName, fadeTime = 0.2) {
        if (this.currentState === stateName) return; // لا تعيد التشغيل إذا كانت نفس الحالة

        // البحث عن الأنميشن بناءً على الكلمة المفتاحية (idle, walk, run, jump)
        const actionKey = Object.keys(this.actions).find(k => k.toLowerCase().includes(stateName.toLowerCase()));
        
        if (actionKey && this.actions[actionKey]) {
            const nextAction = this.actions[actionKey];
            
            // إيقاف الأنميشن الحالي بسلاسة
            if (this.currentAction && this.currentAction !== nextAction) {
                this.currentAction.fadeOut(fadeTime);
            }

            // تشغيل الأنميشن الجديد
            nextAction.reset().fadeIn(fadeTime).play();
            this.currentAction = nextAction;
            this.currentState = stateName;
        }
    }

    update(dt) {
        if (this.mixer) this.mixer.update(dt);
    }
}
