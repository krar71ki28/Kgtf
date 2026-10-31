// الكود مختصر هنا، لكنه يشمل ربط الكاميرا
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

        this.gizmo = new TransformControls(this.engine.editorCamera, this.engine.renderer.domElement);
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
        this.bindCameraControls(); // دالة جديدة
        this.setupRaycaster();
        this.setupDropdown();
        this.setupTabs();
        this.populateBehaviorSelect();
        
        engine.onSelect = (obj) => this.updateInspector(obj);
        engine.onSceneChange = () => { this.updateList(); this.renderAssets(); };
        engine.onCameraListChange = () => this.updateCameraList(); // حدث جديد
        engine.onScoreChanged = (score) => { const scoreVal = document.getElementById('score-val'); if(scoreVal) scoreVal.innerText = score; };

        this.updateList(); this.renderAssets(); this.updateCameraList();
        if (this.engine.selected) this.updateInspector(this.engine.selected);
    }

    /* ... دوال الإعداد الأساسية (setupTabs, setupDropdown, etc) ... */
    setupTabs() { /* ... */ }
    setupDropdown() { 
        const btn = document.getElementById('btn-add-menu'); const menu = document.getElementById('add-menu');
        if(btn && menu) { btn.onclick = (e) => { e.stopPropagation(); menu.classList.toggle('show'); }; document.addEventListener('click', (e) => { if (!menu.contains(e.target) && e.target !== btn) menu.classList.remove('show'); }); }
        const types = ['cube','sphere','cylinder','cone','torus','tree','bush','mountain','rock','building','light','spotlight','character','camera'];
        types.forEach(t => { const el = document.getElementById(`btn-${t}`); if(el) el.onclick = () => { if(t === 'character') this.engine.loadCharacter(); else this.engine.addObject(t); if(menu) menu.classList.remove('show'); }; });
        /* ... vfx audio ... */
    }

    bindCameraControls() {
        const select = document.getElementById('active-camera-select');
        if (select) {
            select.onchange = (e) => {
                const val = e.target.value;
                if (val === 'editor') this.engine.setActiveCamera(this.engine.editorCamera);
                else {
                    const cam = this.engine.customCameras.find(c => c.userData.id === val);
                    if (cam) this.engine.setActiveCamera(cam);
                }
            };
        }
    }

    updateCameraList() {
        const select = document.getElementById('active-camera-select');
        if (!select) return;
        select.innerHTML = '<option value="editor">Editor Camera (Default)</option>';
        this.engine.customCameras.forEach((cam, index) => {
            const option = document.createElement('option');
            option.value = cam.userData.id;
            option.textContent = `Camera ${index + 1} (${cam.userData.id})`;
            select.appendChild(option);
        });
        // إعادة التحديد للكاميرا الحالية
        if (this.engine.activeCamera === this.engine.editorCamera) select.value = 'editor';
        else select.value = this.engine.activeCamera.userData.id;
    }

    /* ... باقي الدوال ... */
    populateBehaviorSelect() { /* ... */ }
    setupRaycaster() { /* ... */ }
    bindButtons() { /* ... */ }
    bindMaterialProps() { /* ... */ }
    bindWorldSettings() { /* ... */ }
    bindPhase5Settings() { /* ... */ }
    bindSceneManager() { /* ... */ }
    setActiveTool(id) { /* ... */ }
    renderAssets() { /* ... */ }
    bindInspector() { /* ... */ }
    updateUIValues() { /* ... */ }
    renderBehaviorsUI() { /* ... */ }
    renderAnimationUI(obj) { /* ... */ }
    updateInspector(obj) { /* ... */ }
    updateList() { /* ... */ }
}
