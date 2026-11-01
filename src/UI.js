export class UIManager {
    constructor() {
        this.hud = document.getElementById('custom-hud');
        this.scoreElement = null;
    }

    addText(text) {
        if (!text) return;
        const div = document.createElement('div');
        div.innerText = text;
        div.style.cssText = `
            position: absolute; top: 20px; left: 20px;
            font-size: 24px; color: #fff; font-weight: bold;
            text-shadow: 2px 2px 4px #000;
        `;
        this.hud.appendChild(div);
    }

    createScoreCounter() {
        this.scoreElement = document.createElement('div');
        this.scoreElement.innerText = 'النقاط: 0';
        this.scoreElement.style.cssText = `
            position: absolute; top: 20px; right: 20px;
            font-size: 24px; color: #ffaa00; font-weight: bold;
            text-shadow: 2px 2px 4px #000; background: rgba(0,0,0,0.5);
            padding: 5px 15px; border-radius: 5px;
        `;
        this.hud.appendChild(this.scoreElement);
    }

    updateScore(score) {
        if (this.scoreElement) this.scoreElement.innerText = 'النقاط: ' + score;
    }

    clearUI() {
        this.hud.innerHTML = '';
        this.scoreElement = null;
    }
}
