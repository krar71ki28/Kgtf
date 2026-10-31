export class LogicManager {
    constructor(engine) {
        this.engine = engine;
        this.score = 0;
    }

    executeAction(obj, action) {
        if (action === 'destroy') {
            this.engine.scene.remove(obj);
            this.engine.objects = this.engine.objects.filter(o => o !== obj);
            if (this.engine.selectedObj === obj) this.engine.selectObject(null);
            if (this.engine.onSceneChangeCallback) this.engine.onSceneChangeCallback();
        } 
        else if (action === 'addScore') {
            this.score += 10;
            this.updateScoreUI();
        } 
        else if (action === 'playSound') {
            // صوت مؤقت للتجربة
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/224/224-preview.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => {});
        }
    }

    triggerEvent(obj, eventName) {
        if (!obj.userData.logic) return;
        obj.userData.logic.forEach(l => {
            if (l.event === eventName) {
                this.executeAction(obj, l.action);
            }
        });
    }

    updateScoreUI() {
        const scoreDisplay = document.getElementById('score-display');
        const scoreVal = document.getElementById('score-val');
        if (scoreDisplay && scoreVal) {
            scoreDisplay.style.display = 'block';
            scoreVal.innerText = this.score;
        }
    }

    resetScore() {
        this.score = 0;
        this.updateScoreUI();
    }
}
