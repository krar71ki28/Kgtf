export class Assistant {
    constructor() {
        this.fab = document.getElementById('ai-fab');
        this.chat = document.getElementById('ai-chat');
        this.closeBtn = document.getElementById('close-ai');
        this.sendBtn = document.getElementById('ai-send');
        this.input = document.getElementById('ai-input');
        this.messages = document.getElementById('ai-messages');

        this.fab.onclick = () => {
            this.chat.style.display = this.chat.style.display === 'flex' ? 'none' : 'flex';
        };
        this.closeBtn.onclick = () => this.chat.style.display = 'none';
        
        this.sendBtn.onclick = () => this.handleSend();
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSend();
        });
    }

    handleSend() {
        const text = this.input.value.trim();
        if (!text) return;
        
        this.addMessage('أنت: ' + text, '#fff');
        this.input.value = '';
        
        this.addMessage('KGTF AI يفكر...', '#888');

        setTimeout(() => {
            this.messages.lastChild.remove(); // مسح رسالة التفكير
            const response = this.generateResponse(text);
            this.addMessage('KGTF AI: ' + response, '#4ade80');
        }, 600);
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
        let added = false;
        let itemsAdded = [];

        // البحث عن الكلمات المفتاحية وإضافة المجسمات
        if (lower.includes('مكعب') || lower.includes('cube')) {
            window.engine.addObject('cube', { position: [(Math.random() - 0.5) * 6, 1, (Math.random() - 0.5) * 6] });
            itemsAdded.push('مكعب');
            added = true;
        }
        if (lower.includes('كرة') || lower.includes('sphere')) {
            window.engine.addObject('sphere', { position: [(Math.random() - 0.5) * 6, 1, (Math.random() - 0.5) * 6] });
            itemsAdded.push('كرة');
            added = true;
        }
        if (lower.includes('شجرة') || lower.includes('tree')) {
            window.engine.addObject('tree', { position: [(Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6] });
            itemsAdded.push('شجرة');
            added = true;
        }
        if (lower.includes('صخرة') || lower.includes('rock')) {
            window.engine.addObject('rock', { position: [(Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6] });
            itemsAdded.push('صخرة');
            added = true;
        }
        if (lower.includes('مبنى') || lower.includes('building')) {
            window.engine.addObject('building', { position: [(Math.random() - 0.5) * 6, 2, (Math.random() - 0.5) * 6] });
            itemsAdded.push('مبنى');
            added = true;
        }
        if (lower.includes('ضوء') || lower.includes('light')) {
            window.engine.addObject('light', { position: [0, 4, 0] });
            itemsAdded.push('ضوء');
            added = true;
        }
        
        if (lower.includes('امسح') || lower.includes('مسح') || lower.includes('حذف الكل')) {
            window.engine.clearScene();
            return 'تم مسح المشهد بالكامل.';
        }

        if (added) {
            return 'تمت إضافة: ' + itemsAdded.join(' و ') + ' إلى المشهد.';
        }

        return 'عذراً، أنا مساعد محلي بسيط. جرب تكتب: "أضف مكعب وشجرة" أو "امسح المشهد".';
    }
}
