import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export class Editor {
    constructor(engine) {
        this.engine = engine;
        this.gizmo = new TransformControls(this.engine.editorCamera, this.engine.renderer.domElement);
        this.engine.scene.add(this.gizmo.getHelper());
        this.gizmo.addEventListener('dragging-changed', (e) => this.engine.controls.enabled = !e.value);
        
        this.setupButtons();
        this.engine.onSceneChange = () => this.updateList();
        this.updateList();
    }

    setupButtons() {
        const addMenu = document.getElementById('add-menu');
        const btnAdd = document.getElementById('btn-add-menu');
        if (btnAdd) btnAdd.onpointerdown = (e) => { e.stopPropagation(); addMenu.classList.toggle('show'); };
        document.addEventListener('pointerdown', (e) => { if (addMenu && !addMenu.contains(e.target) && e.target.id !== 'btn-add-menu') addMenu.classList.remove('show'); });

        ['cube','sphere','cylinder','tree','rock','light','character'].forEach(t => {
            const el = document.getElementById(`btn-${t}`);
            if (el) el.onpointerdown = () => { this.engine.addObject(t); addMenu.classList.remove('show'); };
        });

        const btnSave = document.getElementById('btn-save');
        if (btnSave) btnSave.onpointerdown = () => this.engine.saveScene();

        const btnClear = document.getElementById('btn-clear-scene');
        if (btnClear) btnClear.onpointerdown = () => this.engine.clearScene();
    }

    updateList() {
        const list = document.getElementById('object-list');
        if (!list) return;
        list.innerHTML = '';
        this.engine.objects.forEach(obj => {
            const div = document.createElement('div');
            div.className = 'obj-item';
            div.innerText = obj.userData.type;
            div.onpointerdown = () => { this.gizmo.attach(obj); this.engine.selectObject(obj); };
            list.appendChild(div);
        });
    }
}
