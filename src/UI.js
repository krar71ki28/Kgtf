export class UIManager {
    constructor() {
        this.hud = document.getElementById('custom-hud');
    }

    addText(text) {
        if (!text) return;
        const div = document.createElement('div');
        div.innerText = text;
        // ستايل افتراضي للنص
        div.style.cssText = `
            position: absolute; 
            top: 50px; 
            left: 50%; 
            transform: translateX(-50%);
            font-size: 24px; 
            color: #fff; 
            font-weight: bold; 
            text-shadow: 2px 2px 4px #000;
            pointer-events: none;
        `;
        this.hud.appendChild(div);
    }

    clearUI() {
        this.hud.innerHTML = '';
    }
}
