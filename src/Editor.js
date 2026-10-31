import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { BEHAVIORS } from './Engine.js';

export class Editor {
    constructor(engine) {
        this.engine = engine;
        this.inspector = document.getElementById('inspector');
        this.raycaster = new THREE.Raycaster();
        this.pointerDown = { x: 0, y: 0 };
        this.isDraggingGizmo = false;

        this.gizmo = new TransformControls(this.engine.camera, this.engine.renderer.domElement);
        this.gizmo.setSize(0.8);
        this.engine.scene.add(this.gizmo);

        this.gizmo.addEventListener('dragging-changed', (event) => { this.engine.controls.enabled = !event.value; this.isDraggingGizmo = event.value; });
        this.gizmo.addEventListener('objectChange', () => this.updateUIValues());

        this.bindButtons();
        this.bindInspector();
        this.bindMaterialProps();
        this.bindWorldSettings();
        this.bindPhase5Settings();
        this.bindSceneManager();
        this.setupRaycaster();
        this.setupDropdown();
        this.setupTabs();
        this.populateBehaviorSelect();
        
        engine.onSelect = (obj) => this.updateInspector(obj);
        engine.onSceneChange = () => { this.updateList(); this.renderAssets(); };
        engine.onScoreChanged = (score) => { const scoreVal = document.getElementById('score-val'); if(scoreVal) scoreVal.innerText = score; };

        this.updateList(); this.renderAssets();
        if (this.engine.selected) this.updateInspector(this.engine.selected);
    }

    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const target = document.getElementById(btn.dataset.target);
                if(target) target.classList.add('active');
            });
        });
    }

    setupDropdown() {
        const btn = document.getElementById('btn-add-menu'); const menu = document.getElementById('add-menu');
        if(btn && menu) { btn.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('show'); }; document.addEventListener('click', (e) => { if (!menu.contains(e.target) && e.target !== btn) menu.classList.remove('show'); }); }
        const types = ['cube','sphere','cylinder','cone','torus','tree','rock','building','light','character'];
        types.forEach(t => { const el = document.getElementById(`btn-${t}`); if(el) el.onclick = () => { if(t === 'character') this.engine.loadCharacter(); else this.engine.addObject(t); if(menu) menu.classList.remove('show'); }; });
        const vfxFire = document.getElementById('btn-vfx-fire'); if(vfxFire) vfxFire.onclick = () => { this.engine.createParticleSystem('fire', new THREE.Vector3(0, 0.5, 0)); if(menu) menu.classList.remove('show'); };
        const vfxSparks = document.getElementById('btn-vfx-sparks'); if(vfxSparks) vfxSparks.onclick = () => { this.engine.createParticleSystem('sparks', new THREE.Vector3(0, 0.5, 0)); if(menu) menu.classList.remove('show'); };
        const vfxSmoke = document.getElementById('btn-vfx-smoke'); if(vfxSmoke) vfxSmoke.onclick = () => { this.engine.createParticleSystem('smoke', new THREE.Vector3(0, 0.5, 0)); if(menu) menu.classList.remove('show'); };
        const audioBtn = document.getElementById('btn-audio'); if(audioBtn) audioBtn.onclick = () => { this.engine.createAudioEmitter(new THREE.Vector3(0, 1, 0)); if(menu) menu.classList.remove('show'); };
    }

    populateBehaviorSelect() {
        const select = document.getElementById('add-behavior-select'); if(!select) return;
        select.innerHTML = '<option value="">-- اختر سلوك --</option>';
        for (const key in BEHAVIORS) { const option = document.createElement('option'); option.value = key; option.textContent = BEHAVIORS[key].name; select.appendChild(option); }
    }

    setupRaycaster() {
        const canvas = this.engine.renderer.domElement;
        canvas.addEventListener('pointerdown', (e) => { this.pointerDown = { x: e.clientX, y: e.clientY }; });
        canvas.addEventListener('pointerup', (e) => {
            if (document.body.classList.contains('play-mode') || this.isDraggingGizmo) return;
            if (Math.hypot(e.clientX - this.pointerDown.x, e.clientY - this.pointerDown.y) > 5) return;
            const rect = canvas.getBoundingClientRect(); const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
            this.raycaster.setFromCamera(mouse, this.engine.camera);
            const hits = this.raycaster.intersectObjects(this.engine.objects, true);
            if (hits.length > 0) { let root = hits[0].object; while (root && root.parent !== this.engine.scene) root = root.parent; if (root) return this.engine.selectObject(root); }
            this.engine.selectObject(null);
        });
    }

    bindButtons() {
        const gTrans = document.getElementById('btn-gizmo-translate'); if(gTrans) gTrans.onclick = () => { this.gizmo.setMode('translate'); this.setActiveTool('btn-gizmo-translate'); };
        const gRot = document.getElementById('btn-gizmo-rotate'); if(gRot) gRot.onclick = () => { this.gizmo.setMode('rotate'); this.setActiveTool('btn-gizmo-rotate'); };
        const gScale = document.getElementById('btn-gizmo-scale'); if(gScale) gScale.onclick = () => { this.gizmo.setMode('scale'); this.setActiveTool('btn-gizmo-scale'); };
        const dupBtn = document.getElementById('btn-duplicate'); if(dupBtn) dupBtn.onclick = () => { const newObj = this.engine.duplicateObject(); if (newObj) this.engine.selectObject(newObj); };
        const delBtn = document.getElementById('btn-delete'); if(delBtn) delBtn.onclick = () => this.engine.deleteSelected();
        const saveBtn = document.getElementById('btn-save'); if(saveBtn) saveBtn.onclick = () => this.engine.saveScene();
        const exportBtn = document.getElementById('btn-export'); if(exportBtn) exportBtn.onclick = () => this.engine.exportScene();
        const importBtn = document.getElementById('btn-import'); if(importBtn) importBtn.onclick = () => document.getElementById('file-import').click();
        const fileImport = document.getElementById('file-import'); if(fileImport) fileImport.onchange = (e) => { if (e.target.files.length > 0) { this.engine.importScene(e.target.files[0]); e.target.value = ''; } };
        const clearSceneBtn = document.getElementById('btn-clear-scene'); if(clearSceneBtn) clearSceneBtn.onclick = () => { if (confirm('هل أنت متأكد من مسح المشهد بالكامل؟')) this.engine.clearScene(); };
        const clearAssetsBtn = document.getElementById('btn-clear-assets'); if(clearAssetsBtn) clearAssetsBtn.onclick = () => { if (confirm('هل أنت متأكد من مسح كل الأصول المحفوظة؟')) { this.engine.assets = []; localStorage.removeItem('kgtf_assets'); this.renderAssets(); } };
        const saveAssetBtn = document.getElementById('btn-save-asset'); if(saveAssetBtn) saveAssetBtn.onclick = () => { if (!this.engine.selected) return; this.engine.saveAsAsset(this.engine.selected); this.renderAssets(); document.querySelector('[data-target="tab-content"]').click(); };
        const snapProp = document.getElementById('prop-snap'); if(snapProp) snapProp.addEventListener('change', (e) => { if (e.target.checked) { this.gizmo.translationSnap = 0.5; this.gizmo.rotationSnap = Math.PI / 12; } else { this.gizmo.translationSnap = null; this.gizmo.rotationSnap = null; } });
        const addBehBtn = document.getElementById('btn-add-behavior'); if(addBehBtn) addBehBtn.onclick = () => { if (!this.engine.selected) return; const select = document.getElementById('add-behavior-select'); const bName = select.value; if (!bName) return; if (!this.engine.selected.userData.behaviors) this.engine.selected.userData.behaviors = {}; if (!this.engine.selected.userData.behaviorStates) this.engine.selected.userData.behaviorStates = {}; if (!this.engine.selected.userData.behaviors[bName]) { this.engine.selected.userData.behaviors[bName] = { ...BEHAVIORS[bName].defaultParams }; this.renderBehaviorsUI(); } select.value = ''; };
        const texBtn = document.getElementById('btn-upload-texture'); if(texBtn) texBtn.onclick = () => document.getElementById('texture-input').click();
        const texInput = document.getElementById('texture-input'); if(texInput) texInput.onchange = (e) => { if (!this.engine.selected || !this.engine.selected.isMesh) return; const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = (event) => { const textureLoader = new THREE.TextureLoader(); textureLoader.load(event.target.result, (texture) => { texture.colorSpace = THREE.SRGBColorSpace; this.engine.selected.material.map = texture; this.engine.selected.material.needsUpdate = true; }); }; reader.readAsDataURL(file); e.target.value = ''; };
        const uploadModelBtn = document.getElementById('btn-upload-model'); const modelUploadInput = document.getElementById('model-upload-input');
        if(uploadModelBtn && modelUploadInput) { uploadModelBtn.onclick = () => modelUploadInput.click(); modelUploadInput.onchange = (e) => { if (e.target.files.length > 0) { this.engine.loadModelFromFile(e.target.files[0]); e.target.value = ''; } }; }
    }

    bindMaterialProps() {
        const props = ['roughness', 'metalness', 'opacity'];
        props.forEach(prop => { const el = document.getElementById(`prop-${prop}`); if (!el) return; el.addEventListener('input', (e) => { if (!this.engine.selected || !this.engine.selected.material) return; const val = parseFloat(e.target.value); this.engine.selected.material[prop] = val; if (prop === 'opacity') this.engine.selected.material.transparent = val < 1.0; this.engine.selected.material.needsUpdate = true; }); });
    }

    bindWorldSettings() {
        const bloomStr = document.getElementById('pp-bloom-strength'); if(bloomStr) bloomStr.addEventListener('input', (e) => { this.engine.bloomPass.strength = parseFloat(e.target.value); });
        const bloomRad = document.getElementById('pp-bloom-radius'); if(bloomRad) bloomRad.addEventListener('input', (e) => { this.engine.bloomPass.radius = parseFloat(e.target.value); });
        const bloomThr = document.getElementById('pp-bloom-threshold'); if(bloomThr) bloomThr.addEventListener('input', (e) => { this.engine.bloomPass.threshold = parseFloat(e.target.value); });
        const vigEn = document.getElementById('pp-vignette-enabled'); if(vigEn) vigEn.addEventListener('change', (e) => { this.engine.vignettePass.enabled = e.target.checked; });
        const vigStr = document.getElementById('pp-vignette-strength'); if(vigStr) vigStr.addEventListener('input', (e) => { this.engine.vignettePass.uniforms["darkness"].value = parseFloat(e.target.value); });
    }

    bindPhase5Settings() {
        const focusBtn = document.getElementById('btn-focus'); if(focusBtn) focusBtn.onclick = () => { if (this.engine.selected) this.engine.focusOnObject(this.engine.selected); else alert('الرجاء تحديد مجسم أولاً للتركيز عليه.'); };
        const autoCyc = document.getElementById('env-auto-cycle'); if(autoCyc) autoCyc.addEventListener('change', (e) => { this.engine.autoTime = e.target.checked; });
        const timeSl = document.getElementById('env-time-slider'); if(timeSl) timeSl.addEventListener('input', (e) => { this.engine.setTimeOfDay(parseFloat(e.target.value)); if(autoCyc) autoCyc.checked = false; this.engine.autoTime = false; });
        const timeSp = document.getElementById('env-time-speed'); if(timeSp) timeSp.addEventListener('input', (e) => { this.engine.daySpeed = parseFloat(e.target.value); });
        const sunInt = document.getElementById('env-sun-intensity'); if(sunInt) sunInt.addEventListener('input', (e) => { this.engine.isManualSun = true; this.engine.sun.intensity = parseFloat(e.target.value); });
        const fogDist = document.getElementById('env-fog-distance'); if(fogDist) fogDist.addEventListener('input', (e) => { this.engine.scene.fog.far = parseFloat(e.target.value); });
        const rainTog = document.getElementById('env-rain-toggle'); if(rainTog) rainTog.addEventListener('change', (e) => { this.engine.toggleRain(e.target.checked); });
        const bindRot = (id, axis) => { const el = document.getElementById(id); if(!el) return; el.addEventListener('input', (e) => { if (!this.engine.selected) return; this.engine.selected.rotation[axis] = parseFloat(e.target.value); this.gizmo.attach(this.engine.selected); }); };
        bindRot('prop-rot-x', 'x'); bindRot('prop-rot-y', 'y'); bindRot('prop-rot-z', 'z');
    }

    bindSceneManager() {
        const renderSceneList = () => {
            const list = document.getElementById('scene-list'); if(!list) return; list.innerHTML = ''; const allScenes = JSON.parse(localStorage.getItem('kgtf_all_scenes') || '{}');
            if (Object.keys(allScenes).length === 0) { list.innerHTML = '<div style="color:#666; font-size:11px; text-align:center;">لا توجد مشاهد محفوظة.</div>'; return; }
            for (const name in allScenes) {
                const div = document.createElement('div'); div.style.display = 'flex'; div.style.justifyContent = 'space-between'; div.style.alignItems = 'center'; div.style.background = '#25252b'; div.style.padding = '6px 10px'; div.style.borderRadius = '4px'; div.style.border = '1px solid #3c3c45';
                const title = document.createElement('span'); title.innerText = name; title.style.fontSize = '12px'; title.style.cursor = 'pointer'; title.style.color = '#4ade80';
                title.onclick = () => { if(confirm('هل تريد فتح هذا المشهد؟ (سيتم استبدال المشهد الحالي)')) this.engine.loadSceneByName(name); };
                const delBtn = document.createElement('span'); delBtn.innerText = '✕'; delBtn.style.color = '#ff5577'; delBtn.style.cursor = 'pointer';
                delBtn.onclick = () => { if(confirm('هل أنت متأكد من حذف هذا المشهد؟')) { this.engine.deleteSceneByName(name); renderSceneList(); } };
                div.appendChild(title); div.appendChild(delBtn); list.appendChild(div);
            }
        };
        const saveAsBtn = document.getElementById('btn-save-scene-as'); if(saveAsBtn) saveAsBtn.onclick = () => { const name = document.getElementById('new-scene-name').value.trim(); if (name) { this.engine.saveSceneAs(name); document.getElementById('new-scene-name').value = ''; renderSceneList(); } };
        const newSceneBtn = document.getElementById('btn-new-scene'); if(newSceneBtn) newSceneBtn.onclick = () => { if (confirm('هل تريد إنشاء مشهد جديد فارغ؟ (سيتم مسح المشهد الحالي إذا لم يتم حفظه)')) { this.engine.clearScene(); this.engine.addObject('cube'); renderSceneList(); document.querySelector('[data-target="tab-outliner"]').click(); } };
        renderSceneList(); const scenesTab = document.querySelector('[data-target="tab-scenes"]'); if(scenesTab) scenesTab.addEventListener('click', renderSceneList);
    }

    setActiveTool(id) { document.querySelectorAll('.gizmo-group .icon-btn').forEach(btn => btn.classList.remove('active')); const el = document.getElementById(id); if(el) el.classList.add('active'); }

    renderAssets() {
        const grid = document.getElementById('asset-grid'); if(!grid) return; grid.innerHTML = '';
        if (this.engine.assets.length === 0) { grid.innerHTML = '<div style="color:#666; font-size:12px; grid-column: 1/-1; text-align:center; margin-top:20px;">لا توجد أصول محفوظة.<br>حدد مجسماً واضغط "حفظ كأصل".</div>'; return; }
        this.engine.assets.forEach(asset => {
            const card = document.createElement('div'); card.className = 'asset-card'; card.style.position = 'relative';
            const icon = document.createElement('div'); icon.className = 'asset-icon'; icon.innerText = asset.type === 'cube' ? '📦' : asset.type === 'tree' ? '🌲' : '🧊'; 
            const name = document.createElement('div'); name.className = 'asset-name'; name.innerText = asset.name;
            const delBtn = document.createElement('div'); delBtn.innerText = '✕'; delBtn.style.color = '#ff5577'; delBtn.style.position = 'absolute'; delBtn.style.top = '2px'; delBtn.style.left = '2px'; delBtn.style.fontSize = '10px'; delBtn.style.cursor = 'pointer';
            delBtn.onclick = (e) => { e.stopPropagation(); this.engine.removeAsset(asset.id); this.renderAssets(); };
            card.appendChild(icon); card.appendChild(name); card.appendChild(delBtn); card.onclick = () => { this.engine.spawnAsset(asset.id); }; grid.appendChild(card);
        });
    }

    bindInspector() {
        const bindProp = (id, callback) => { const el = document.getElementById(id); if(!el) return; el.addEventListener('input', (e) => { if (!this.engine.selected) return; callback(this.engine.selected, el.type === 'checkbox' ? el.checked : (el.type === 'range' ? parseFloat(el.value) : el.value)); this.gizmo.attach(this.engine.selected); }); };
        bindProp('prop-x', (obj, v) => obj.position.x = v); bindProp('prop-y', (obj, v) => obj.position.y = v); bindProp('prop-z', (obj, v) => obj.position.z = v);
        bindProp('prop-scale', (obj, v) => obj.scale.set(v, v, v)); bindProp('prop-color', (obj, v) => { if (obj.isMesh) obj.material.color.set(v); else if (obj.isLight) obj.color.set(v); });
        bindProp('prop-physics', (obj, v) => { if(obj.userData.physics) obj.userData.physics.enabled = v; }); bindProp('prop-bounce', (obj, v) => { if(obj.userData.physics) obj.userData.physics.bounce = v; });
        bindProp('prop-light-intensity', (obj, v) => { if(obj.isLight) obj.intensity = v; }); bindProp('prop-light-distance', (obj, v) => { if(obj.isLight) obj.distance = v; });
        bindProp('prop-material', (obj, v) => { if (obj.isMesh && obj.userData.type !== 'character') { obj.material.dispose(); obj.material = this.engine.makeMaterial(v); obj.userData.material = v; } });
    }

    updateUIValues() {
        const obj = this.engine.selected; if (!obj) return;
        document.getElementById('prop-x').value = obj.position.x.toFixed(2); document.getElementById('prop-y').value = obj.position.y.toFixed(2); document.getElementById('prop-z').value = obj.position.z.toFixed(2);
        document.getElementById('prop-rot-x').value = obj.rotation.x; document.getElementById('prop-rot-y').value = obj.rotation.y; document.getElementById('prop-rot-z').value = obj.rotation.z;
        document.getElementById('prop-scale').value = obj.scale.x;
        if (obj.isMesh && obj.material) { document.getElementById('prop-color').value = '#' + obj.material.color.getHexString(); document.getElementById('prop-roughness').value = obj.material.roughness !== undefined ? obj.material.roughness : 0.5; document.getElementById('prop-metalness').value = obj.material.metalness !== undefined ? obj.material.metalness : 0.1; document.getElementById('prop-opacity').value = obj.material.opacity !== undefined ? obj.material.opacity : 1.0; } 
        else if (obj.isLight) { document.getElementById('prop-color').value = '#' + obj.color.getHexString(); document.getElementById('prop-light-intensity').value = obj.intensity; document.getElementById('prop-light-distance').value = obj.distance; }
    }

    renderBehaviorsUI() {
        const container = document.getElementById('active-behaviors-list'); if(!container) return; container.innerHTML = ''; if (!this.engine.selected) return; const behaviors = this.engine.selected.userData.behaviors || {};
        for (const bName in behaviors) {
            const behaviorDef = BEHAVIORS[bName]; if (!behaviorDef) continue; const currentParams = behaviors[bName];
            const card = document.createElement('div'); card.style.background = '#25252b'; card.style.padding = '6px'; card.style.borderRadius = '4px'; card.style.border = '1px solid #3c3c45'; card.style.marginTop = '5px';
            const header = document.createElement('div'); header.style.display = 'flex'; header.style.justifyContent = 'space-between'; header.style.alignItems = 'center'; header.style.marginBottom = '4px';
            const title = document.createElement('span'); title.style.fontWeight = 'bold'; title.style.color = '#60a5fa'; title.style.fontSize = '10px'; title.textContent = behaviorDef.name;
            const deleteBtn = document.createElement('button'); deleteBtn.textContent = '✕'; deleteBtn.style.background = 'transparent'; deleteBtn.style.border = 'none'; deleteBtn.style.color = '#ef4444'; deleteBtn.style.cursor = 'pointer';
            deleteBtn.addEventListener('click', () => { delete this.engine.selected.userData.behaviors[bName]; if (this.engine.selected.userData.behaviorStates) delete this.engine.selected.userData.behaviorStates[bName]; this.renderBehaviorsUI(); });
            header.appendChild(title); header.appendChild(deleteBtn); card.appendChild(header);
            for (const paramKey in behaviorDef.defaultParams) {
                const row = document.createElement('div'); row.style.display = 'flex'; row.style.justifyContent = 'space-between'; row.style.alignItems = 'center'; row.style.marginTop = '2px';
                const paramLabel = document.createElement('label'); paramLabel.style.fontSize = '9px'; paramLabel.style.color = '#bbb'; paramLabel.textContent = paramKey + ':';
                const input = document.createElement('input'); input.type = typeof behaviorDef.defaultParams[paramKey] === 'number' ? 'number' : 'text';
                input.value = currentParams[paramKey] !== undefined ? currentParams[paramKey] : behaviorDef.defaultParams[paramKey];
                input.style.width = '50px'; input.style.padding = '2px 4px'; input.style.background = '#121215'; input.style.border = '1px solid #444'; input.style.borderRadius = '3px'; input.style.color = '#fff'; input.style.fontSize = '9px';
                input.addEventListener('input', (e) => { const val = input.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value; currentParams[paramKey] = val; if (this.engine.selected.userData.behaviorStates) delete this.engine.selected.userData.behaviorStates[bName]; });
                row.appendChild(paramLabel); row.appendChild(input); card.appendChild(row);
            }
            container.appendChild(card);
        }
    }

    // دالة جديدة: إضافة قائمة الحركات في لوحة الخصائص
    renderAnimationUI(obj) {
        const container = document.getElementById('animation-properties');
        if(!container) return;
        
        // إذا كان المجسم ليس شخصية أو ليس لديه حركات، نخفي القائمة
        if (!obj || obj.userData.type !== 'character' || !obj.userData.actions || Object.keys(obj.userData.actions).length === 0) {
            container.style.display = 'none';
            return;
        }

        container.style.display = 'block';
        const select = document.getElementById('anim-select');
        select.innerHTML = '<option value="">-- اختر حركة --</option>';
        
        for (const animName in obj.userData.actions) {
            const option = document.createElement('option');
            option.value = animName;
            option.textContent = animName;
            select.appendChild(option);
        }

        // إذا كان هناك حركة شغالة حالياً، نحددها في القائمة
        if (obj.userData.currentAction) {
            select.value = typeof obj.userData.currentAction === 'object' ? obj.userData.currentAction.getClip().name : obj.userData.currentAction;
        }

        // عند اختيار حركة جديدة من القائمة، يتم تشغيلها
        select.onchange = (e) => {
            const animName = e.target.value;
            if (!animName) return;
            
            const actions = obj.userData.actions;
            if (obj.userData.currentAction && actions[obj.userData.currentAction]) {
                 actions[obj.userData.currentAction].fadeOut(0.2);
            }
            if (actions[animName]) {
                 actions[animName].reset().fadeIn(0.2).play();
                 obj.userData.currentAction = animName;
            }
        };
    }

    updateInspector(obj) {
        if (!obj) { this.inspector.style.display = 'none'; document.getElementById('no-selection-msg').style.display = 'block'; document.getElementById('object-actions').style.display = 'none'; this.gizmo.detach(); this.updateList(); return; }
        this.inspector.style.display = 'block'; document.getElementById('no-selection-msg').style.display = 'none'; document.getElementById('object-actions').style.display = 'flex'; this.gizmo.attach(obj); this.updateUIValues(); this.renderBehaviorsUI();
        
        // تحديث قائمة الحركات
        this.renderAnimationUI(obj);

        const lightProps = document.getElementById('light-properties');
        if (obj.isLight) { lightProps.style.display = 'block'; document.getElementById('prop-light-intensity').value = obj.intensity; document.getElementById('prop-light-distance').value = obj.distance; } else { lightProps.style.display = 'none'; }
        if (obj.userData.physics) { document.getElementById('prop-physics').checked = obj.userData.physics.enabled; document.getElementById('prop-bounce').value = obj.userData.physics.bounce; }
        this.updateList();
    }

    updateList() {
        const list = document.getElementById('object-list'); if(!list) return; list.innerHTML = '';
        this.engine.objects.forEach(obj => { const div = document.createElement('div'); div.className = 'obj-item' + (obj === this.engine.selected ? ' selected' : ''); div.innerText = obj.userData.type; div.onclick = () => this.engine.selectObject(obj); list.appendChild(div); });
    }
}
