export class Assistant {
    constructor() {
        this.fab = document.getElementById('ai-fab');
        this.chat = document.getElementById('ai-chat');
        this.closeBtn = document.getElementById('close-ai');
        this.sendBtn = document.getElementById('ai-send');
        this.input = document.getElementById('ai-input');
        this.messages = document.getElementById('ai-messages');

        this.apiKey = localStorage.getItem('gemini_api_key');

        this.fab.onclick = () => {
            if (!this.apiKey) {
                this.apiKey = prompt("مرحباً! لإ activación المساعد الذكي، يرجى إدخال Google Gemini API Key:");
                if (this.apiKey) localStorage.setItem('gemini_api_key', this.apiKey);
                else return;
            }
            this.chat.style.display = this.chat.style.display === 'flex' ? 'none' : 'flex';
        };
        this.closeBtn.onclick = () => this.chat.style.display = 'none';
        
        this.sendBtn.onclick = () => this.handleSend();
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSend();
        });
    }

    async handleSend() {
        const text = this.input.value.trim();
        if (!text) return;
        
        this.addMessage('أنت: ' + text, '#fff');
        this.input.value = '';
        this.input.disabled = true;
        this.sendBtn.disabled = true;
        
        const loadingMsg = this.addMessage('KGTF AI يفكر...', '#888');

        try {
            const code = await this.fetchAIResponse(text);
            if (code) {
                this.addMessage('KGTF AI: تم التنفيذ.', '#4ade80');
                this.executeCode(code);
            }
        } catch (error) {
            this.addMessage('خطأ: ' + error.message, '#ff5577');
        } finally {
            this.messages.removeChild(loadingMsg);
            this.input.disabled = false;
            this.sendBtn.disabled = false;
            this.input.focus();
        }
    }

    addMessage(text, color) {
        const div = document.createElement('div');
        div.style.marginBottom = '8px';
        div.style.color = color;
        div.innerText = text;
        this.messages.appendChild(div);
        this.messages.scrollTop = this.messages.scrollHeight;
        return div;
    }

    async fetchAIResponse(userPrompt) {
        const systemPrompt = `
أنت مساعد ذكي في محرك Three.js.
استخدم window.engine.addObject(type, opts).
الأنواع المتاحة: 'cube', 'sphere', 'cylinder', 'tree', 'rock', 'building', 'light'.
مثال: window.engine.addObject('tree', { position: [2, 0, 2] });
اكتب كود JavaScript فقط بدون أي شرح أو markdown.
        `;

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: `${systemPrompt}\n\nطلب المستخدم: ${userPrompt}` }] }]
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || 'فشل الاتصال');
        }

        const data = await response.json();
        let code = data.candidates[0].content.parts[0].text.trim();
        code = code.replace(/```javascript/g, '').replace(/```js/g, '').replace(/```/g, '');
        return code.trim();
    }

    executeCode(code) {
        try {
            const func = new Function('engine', code);
            func(window.engine);
        } catch (e) {
            this.addMessage('خطأ في الكود: ' + e.message, '#ff5577');
        }
    }
}
