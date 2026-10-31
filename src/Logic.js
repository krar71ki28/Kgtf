export class LogicManager {
    constructor(engine) {
        this.engine = engine;
        this.score = 0;
    }

    executeAction(obj, action) {
        try {
            if (action === 'destroy') {
                this.engine.removeObject(obj); 
            } 
            else if (action === 'addScore') {
                this.score += 10;
                this.updateScoreUI();
            } 
            else if (action === 'playSound') {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/224/224-preview.mp3');
                audio.volume = 0.5;
                audio.play().catch(e => {});
            }
            else if (action === 'spawnCube') {
                // ✅ استخدام setTimeout عشان ما ينهار المحرك أثناء التوليد
                setTimeout(() => {
                    const newObj = this.engine.createObject('cube', false);
                    if (newObj) {
                        newObj.position.set((Math.random()-0.5)*6, 3, (Math.random()-0.5)*6);
                        newObj.traverse(c => { if(c.isMesh && c.material) c.material = this.engine.getMaterial('gold', 0xffaa00); });
                    }
                }, 50);
            }
            else if (action === 'teleport') {
                obj.position.set((Math.random()-0.5)*10, 0.5, (Math.random()-0.5)*10);
            }
        } catch (e) {
            console.error("Logic Execution Error:", e);
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
