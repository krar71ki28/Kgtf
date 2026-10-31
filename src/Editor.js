import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export class Editor {
    constructor(engine) {
        this.engine = engine;
        this.raycaster = new THREE.Raycaster();
        this.isDraggingGizmo = false;

        this.gizmo = new TransformControls(this.engine.editorCamera, this.engine.renderer.domElement);
        this.engine.scene.add(this.gizmo); // إضافة مباشرة بدون getHelper

        this.gizmo.addEventListener('dragging-changed', (e) => {
            this.engine.controls.enabled = !e.value;
            this.isDraggingGizmo = e.value;
        });
        this.gizmo.addEventListener('objectChange', () => this.updateUIValues());

        this.setupTabs();
        this.setupRaycaster();
        this.setupButtons();
        this.bindInspector();

        engine.onSelect = (o) => this.updateInspector(o);
        engine.onSceneChange = () => this.updateList();
        this.updateList();
    }

    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onpointerdown = () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.target).classList.add('active');
            };
        });
    }

    setupRaycaster() {
        const canvas = this.engine.renderer.domElement;
        canvas.addEventListener('pointerdown', (e) => { this.pointerDown = { x: e.clientX, y: e.clientY }; });
        canvas.addEventListener('pointerup', (e) => {
            if (document.body.classList.contains('play-mode') || this.isDraggingGizmo) return;
            if (!this.pointerDown) return;
            if (Math.hypot(e.clientX - this.pointerDown.x, e.clientY - this.pointerDown.y) > 5) return;
            
            const rect = canvas.getBoundingClientRect();
            const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
            this.raycaster.setFromCamera(mouse, this.engine.editorCamera);
            
            const hits = this.raycaster.intersectObjects(this.engine.objects, true);
            if (hits.length > 0) {
                let root = hits[0].object;
                while (root && root.parent !== this.engine.scene) root = root.parent;
                if (root) return this.engine.selectObject(root);
            }
            this.engine.selectObject(null);
        });
    }

    setupButtons() {
        const addMenu = document.getElementById('add-menu');
        const btnAddMenu = document.getElementById('btn-add-menu');
        if (btnAddMenu) btnAddMenu.onpointerdown = (e) => { e.stopPropagation(); addMenu.classList.toggle('show'); };
        document.addEventListener('pointerdown', (e) => { if (addMenu && !addMenu.contains(e.target) && e.target.id !== 'btn-add-menu') addMenu.classList.remove('show'); });

        ['cube','sphere','cylinder','cone','tree','rock','building','light','character'].forEach(t => {
            const el = document.getElementById(`btn-${t}`);
            if (el) el.onpointerdown = (e) => { e.preventDefault(); this.engine.addObject(t); addMenu.classList.remove('show'); };
        });

        ['translate','rotate','scale'].forEach(m => {
            const el = document.getElementById(`btn-gizmo-${m}`);
            if (el) el.onpointerdown = () => this.gizmo.setMode(m);
        });

        const btnSave = document.getElementById('btn-save');
        if (btnSave) btnSave.onpointerdown = () => this.engine.saveScene();
        const btnSaveFab = document.getElementById('btn-save-fab');
        if (btnSaveFab) btnSaveFab.onpointerdown = () => this.engine.saveScene();

        const btnClear = document.getElementById('btn-clear-scene');
        if (btnClear) btnClear.onpointerdown = () => { if(confirm('مسح الكل؟')) { this.engine.clearScene(); this.gizmo.detach(); } };

        const btnDel = document.getElementById('btn-delete');
        if (btnDel) btnDel.onpointerdown = () => {
            if (!this.engine.selected) return;
            this.engine.scene.remove(this.engine.selected);
            this.engine.objects = this.engine.objects.filter(o => o !== this.engine.selected);
            this.engine.selectObject(null);
            this.updateList();
            this.gizmo.detach();
        };
    }

    bindInspector() {
        const bind = (id, cb) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', () => {
                if (this.engine.selected) cb(this.engine.selected, el.type === 'checkbox' ? el.checked : parseFloat(el.value));
            });
        };
        bind('prop-x', (o, v) => o.position.x = v);
        bind('prop-y', (o, v) => o.position.y = v);
        bind('prop-z', (o, v) => o.position.z = v);
        bind('prop-rot-y', (o, v) => o.rotation.y = v);
        bind('prop-scale', (o, v) => o.scale.set(v, v, v));
        bind('prop-physics', (o, v) => { if(o.userData.physics) o.userData.physics.enabled = v; });
        
        const colorEl = document.getElementById('prop-color');
        if (colorEl) colorEl.addEventListener('input', () => {
            if (this.engine.selected && this.engine.selected.material) this.engine.selected.material.color.set(colorEl.value);
        });
    }

    updateList() {
        const list = document.getElementById('object-list');
        if (!list) return;
        list.innerHTML = '';
        this.engine.objects.forEach(obj => {
            const div = document.createElement('div');
            div.className = 'obj-item' + (obj === this.engine.selected ? ' selected' : '');
            div.innerText = obj.userData.type;
            div.onpointerdown = () => this.engine.selectObject(obj);
            list.appendChild(div);
        });
    }

    updateInspector(obj) {
        if (!obj) {
            document.getElementById('inspector').style.display = 'none';
            document.getElementById('no-selection-msg').style.display = 'block';
            document.getElementById('object-actions').style.display = 'none';
            this.gizmo.detach();
            return;
        }
        document.getElementById('inspector').style.display = 'block';
        document.getElementById('no-selection-msg').style.display = 'none';
        document.getElementById('object-actions').style.display = 'flex';
        this.gizmo.attach(obj);
        this.updateUIValues();
    }

    updateUIValues() {
        if (!this.engine.selected) return;
        const s = this.engine.selected;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        set('prop-x', s.position.x.toFixed(2));
        set('prop-y', s.position.y.toFixed(2));
        set('prop-z', s.position.z.toFixed(2));
        set('prop-rot-y', s.rotation.y);
        set('prop-scale', s.scale.x);
        set('prop-physics', s.userData.physics?.enabled || false);
    }
}
