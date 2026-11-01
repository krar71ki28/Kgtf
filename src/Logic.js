export class LogicManager {
    constructor(engine) {
        this.engine = engine;
        this.score = 0;
    }

    executeAction(obj, action) {
        if (action === 'destroy') {
            this.engine.removeObject(obj);
        } else if (action === 'addScore') {
            this.score += 10;
            this.engine.ui.updateScore(this.score); // ✅ تحديث الواجهة
        } else if (action === 'playSound') {
            this.engine.audio.playSFX(); 
        }
    }

    triggerEvent(obj, eventName) {
        if (!obj.userData.logic) return;
        obj.userData.logic.forEach(l => {
            if (l.event === eventName) this.executeAction(obj, l.action);
        });
    }
}
