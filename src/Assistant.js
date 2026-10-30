export class Assistant {
    constructor() {
        const fab = document.getElementById('ai-fab');
        const chat = document.getElementById('ai-chat');
        fab.onclick = () => { chat.style.display = chat.style.display === 'flex' ? 'none' : 'flex'; };
        document.getElementById('close-ai').onclick = () => { chat.style.display = 'none'; };
        
        document.getElementById('ai-send').onclick = async () => {
            const input = document.getElementById('ai-input');
            const text = input.value.trim();
            if (!text) return;
            const msgs = document.getElementById('ai-messages');
            input.value = '';
            msgs.innerHTML += `<div style="color:#ff5577;margin-bottom:6px;">👤 ${text}</div>`;
            msgs.innerHTML += `<div id="ai-loading" style="color:#888;">...</div>`;
            msgs.scrollTop = msgs.scrollHeight;
            try {
                const res = await fetch('https://text.pollinations.ai/openai', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ model: 'openai', messages: [{ role: 'system', content: 'أنت خبير Three.js. أجب بكود مختصر.' }, { role: 'user', content: text }] })
                });
                const data = await res.json();
                document.getElementById('ai-loading').remove();
                msgs.innerHTML += `<div style="color:#00e5ff;margin-bottom:6px;white-space:pre-wrap;">🤖 ${data.choices[0].message.content}</div>`;
            } catch(e) {
                document.getElementById('ai-loading').remove();
                msgs.innerHTML += `<div style="color:#f00;">خطأ في الاتصال</div>`;
            }
            msgs.scrollTop = msgs.scrollHeight;
        };
    }
}
