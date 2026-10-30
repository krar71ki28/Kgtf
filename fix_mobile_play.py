with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# 1. إضافة أزرار عائمة داخل حاوية العرض
if 'id="floating-controls"' not in html:
    floating_ui = """
            <div id="floating-controls" style="position: absolute; top: 15px; right: 15px; z-index: 50; display: flex; gap: 10px; flex-direction: column;">
                <button class="btn green" id="btn-play-fab" style="padding: 12px 20px; font-size: 14px; border-radius: 8px; box-shadow: 0 4px 15px rgba(74,222,128,0.4);">▶ تشغيل</button>
                <button class="btn" id="btn-save-fab" style="padding: 10px 20px; font-size: 13px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.5);">💾 حفظ</button>
            </div>
"""
    html = html.replace('<canvas id="viewport"></canvas>', '<canvas id="viewport"></canvas>\n' + floating_ui)

# 2. إخفاء الشريط العلوي في الموبايل لتوفير المساحة
mobile_css = """
    @media (max-width: 768px) {
        #header { display: none !important; }
        #workspace { flex-direction: column; height: 100vh; }
        #left-panel { width: 100%; height: 62px; flex-direction: row; justify-content: space-around; border-left: none; border-bottom: 1px solid #2a2a3a; padding: 4px; gap: 4px; }
        .icon-btn { width: 48px; height: 48px; }
        #right-panel { width: 100%; height: 260px; border-right: none; border-top: 1px solid #2a2a3a; }
        #ai-chat { right: 10px; bottom: 70px; width: calc(100% - 20px); height: 60vh; }
        #status-bar { bottom: 270px; left: 10px; }
    }
"""
# استبدال كتلة الـ media query القديمة
import re
html = re.sub(r"@media \(max-width: 768px\) \{[\s\S]*?\}\n", mobile_css, html)

# 3. ربط الأزرار العائمة بنفس الوظائف
js_bind = """
        document.getElementById('btn-play-fab').onclick = () => {
            player = objects.find(o => o.userData.type === 'character');
            if (!player) { alert('أضف شخصية أولاً لتتمكن من اللعب!'); return; }
            isPlaying = true;
            document.body.classList.add('play-mode');
            camera.position.copy(player.position).add(new THREE.Vector3(0, 3, -6));
            controls.target.copy(player.position);
            resize();
        };

        document.getElementById('btn-save-fab').onclick = () => {
            const data = objects
                .filter(o => o.userData.type !== 'character')
                .map(o => ({
                    type: o.userData.type,
                    material: o.userData.material,
                    color: o.isMesh ? o.material.color.getHex() : (o.isLight ? o.color.getHex() : 0xffffff),
                    intensity: o.isLight ? o.intensity : undefined,
                    position: o.position.toArray(),
                    rotation: [o.rotation.x, o.rotation.y, o.rotation.z],
                    scale: o.scale.toArray(),
                    physics: o.userData.physics
                }));
            localStorage.setItem('kgtf_scene_v5', JSON.stringify(data));
            alert('تم حفظ المشهد (' + data.length + ' كائن)');
        };
"""
if 'btn-play-fab' not in html:
    html = html.replace("loadScene();\n        animate();", js_bind + "\n        loadScene();\n        animate();")

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("✅ تم نقل أزرار التشغيل والحفظ لتصبح عائمة!")
