export class Assistant {
    constructor() {
        this.fab = document.getElementById('ai-fab');
        this.chat = document.getElementById('ai-chat');
        this.closeBtn = document.getElementById('close-ai');
        this.sendBtn = document.getElementById('ai-send');
        this.input = document.getElementById('ai-input');
        this.messages = document.getElementById('ai-messages');

        this.fab.onclick = () => { this.chat.style.display = this.chat.style.display === 'flex' ? 'none' : 'flex'; };
        this.closeBtn.onclick = () => this.chat.style.display = 'none';
        this.sendBtn.onclick = () => this.handleSend();
        this.input.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleSend(); });
    }

    handleSend() {
        const text = this.input.value.trim();
        if (!text) return;
        this.addMessage('أنت: ' + text, '#fff');
        this.input.value = '';
        this.addMessage('KGTF AI يفكر...', '#888');

        setTimeout(() => {
            this.messages.lastChild.remove();
            const response = this.generateResponse(text);
            this.addMessage('KGTF AI: ' + response, '#4ade80');
        }, 500);
    }

    addMessage(text, color) {
        const div = document.createElement('div');
        div.style.marginBottom = '8px';
        div.style.color = color;
        div.innerText = text;
        this.messages.appendChild(div);
        this.messages.scrollTop = this.messages.scrollHeight;
    }

    generateResponse(text) {
        const lower = text.toLowerCase();
        
        if (lower.includes('امسح') || lower.includes('مسح') || lower.includes('حذف الكل')) {
            window.engine.clearScene();
            return 'تم مسح المشهد بالكامل.';
        }

        // استخراج العدد
        const numMatch = text.match(/\d+/);
        let count = numMatch ? parseInt(numMatch[0]) : 1;
        if (count > 20) count = 20; // حد أقصى للطلب الواحد

        let type = '';
        let name = '';
        if (lower.includes('مكعب') || lower.includes('cube')) { type = 'cube'; name = 'مكعب'; }
        else if (lower.includes('كرة') || lower.includes('sphere')) { type = 'sphere'; name = 'كرة'; }
        else if (lower.includes('شجرة') || lower.includes('tree')) { type = 'tree'; name = 'شجرة'; }
        else if (lower.includes('صخرة') || lower.includes('rock')) { type = 'rock'; name = 'صخرة'; }
        else if (lower.includes('مبنى') || lower.includes('building')) { type = 'building'; name = 'مبنى'; }
        else if (lower.includes('ضوء') || lower.includes('light')) { type = 'light'; name = 'ضوء'; }
        else if (lower.includes('مخروط') || lower.includes('cone')) { type = 'cone'; name = 'مخروط'; }
        else if (lower.includes('حلقة') || lower.includes('torus')) { type = 'torus'; name = 'حلقة'; }

        if (!type) return 'عذراً، ما فهمت نوع المجسم. جرب: مكعب، كرة، شجرة، صخرة، مبنى.';

        // استخراج نمط التوزيع
        const isRandom = lower.includes('عشوائي') || lower.includes('مبعثر');
        const isStacked = lower.includes('فوق') || lower.includes('مكدس') || lower.includes('برج');

        for (let i = 0; i < count; i++) {
            let pos = [0, 0, 0];
            
            if (isStacked) {
                pos = [0, i * 1.2, 0]; // فوق بعض
            } else if (isRandom) {
                pos = [(Math.random() - 0.5) * 10, 0, (Math.random() - 0.5) * 10]; // عشوائي
            } else {
                // صف جنب بعض
                pos = [(i - (count-1)/2) * 1.5, 0, 0]; 
            }
            
            // تعديل ارتفاع بعض المجسمات عشان ما تغوص في الأرض
            if (type === 'cube' || type === 'sphere' || type === 'rock' || type === 'tree' || type === 'rock' || type === 'cone') pos[1] = 0.5;
            if (type === 'cylinder' || type === 'torus') pos[1] = 0.7;
            if (type === 'building') pos[1] = 2;
            if (type === 'light') pos[1] = 3;

            window.engine.addObject(type, { position: pos });
        }

        return `تمت إضافة ${count} ${name} ${isStacked ? 'فوق بعضها' : isRandom ? 'بشكل عشوائي' : 'بجانب بعضها'}.`;
    }
}
