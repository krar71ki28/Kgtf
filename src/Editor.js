import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export class Editor {
    constructor(engine) {
        this.engine = engine;
        this.inspector = document.getElementById('inspector');
        this.raycaster = new THREE.Raycaster();
        this.isDraggingGizmo = false;

        this.gizmo = new TransformControls(this.engine.editorCamera, this.engine.renderer.domElement);
        this.gizmo.setSize(0.8);
        
        // ✅ تم إصلاح الخطأ هنا: الإصدار 0.160.0 لا يحتاج getHelper
        this.engine.scene.add(this.gizmo);

        this.gizmo.addEventListener('dragging-changed', (e) => {
            this.engine.controls.enabled = !e.value;
            this.isDraggingGizmo = e.value;
        });
        this.gizmo.addEventListener('objectChange', () => this.updateUIValues());

        this.bindButtons();
        this.bindInspector();
        this.setupRaycaster();
        this.setupTabs();

        engine.onSelect = (o) => this.updateInspector(o);
        engine.onSceneChange = () => { this.updateList(); this.populateAssetGrid(); };
        this.updateList();
        this.populateAssetGrid();
    }

    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('pointerdown', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const t = document.getElementById(btn.dataset.target);
                if (t) t.classList.add('active');
            });
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
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );
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

    bindButtons() {
        const addMenu = document.getElementById('add-menu');
        const btnAddMenu = document.getElementById('btn-add-menu');
        if (btnAddMenu) btnAddMenu.onpointerdown = (e) => { e.stopPropagation(); addMenu?.classList.toggle('show'); };
        document.addEventListener('pointerdown', (e) => {
            if (addMenu && !addMenu.contains(e.target) && e.target.id !== 'btn-add-menu') addMenu.classList.remove('show');
        });

        ['cube','sphere','cylinder','cone','torus','tree','bush','mountain','building','rock','light','character','camera'].forEach(t => {
            const el = document.getElementById(`btn-${t}`);
            if (!el) return;
            el.onpointerdown = (e) => {
                e.preventDefault();
                if (t === 'character') this.engine.loadCharacter();
                else this.engine.addObject(t);
                addMenu?.classList.remove('show');
            };
        });

        const bf = document.getElementById('btn-vfx-fire');
        if (bf) bf.onpointerdown = (e) => { e.preventDefault(); this.engine.createFireVFX(new THREE.Vector3(0, 0, 0)); addMenu?.classList.remove('show'); };
        const bs = document.getElementById('btn-vfx-smoke');
        if (bs) bs.onpointerdown = (e) => { e.preventDefault(); this.engine.createSmokeVFX(new THREE.Vector3(0, 0, 0)); addMenu?.classList.remove('show'); };

        ['translate','rotate','scale'].forEach(m => {
            const el = document.getElementById(`btn-gizmo-${m}`);
            if (el) el.onpointerdown = () => this.gizmo.setMode(m);
        });

        const btnGrid = document.getElementById('btn-toggle-grid');
        if (btnGrid) btnGrid.onpointerdown = () => this.engine.toggleGrid(btnGrid.classList.toggle('active'));

        const dh = document.getElementById('panel-drag-handle');
        if (dh) dh.onpointerdown = () => document.getElementById('inspector-panel')?.classList.toggle('collapsed');

        const nt = document.getElementById('env-night-mode');
        if (nt) nt.addEventListener('change', (e) => this.engine.toggleNightMode(e.target.checked));

        const btnFocus = document.getElementById('btn-focus');
        if (btnFocus) btnFocus.onpointerdown = () => {
            if (!this.engine.selected) return;
            const p = this.engine.selected.position;
            this.engine.controls.target.copy(p);
            this.engine.editorCamera.position.copy(p).add(new THREE.Vector3(5, 5, 5));
            this.engine.controls.update();
        };

        const btnSave = document.getElementById('btn-save');
        if (btnSave) btnSave.onpointerdown = () => this.engine.saveScene();
        
        const btnSaveFab = document.getElementById('btn-save-fab');
        if (btnSaveFab) btnSaveFab.onpointerdown = () => this.engine.saveScene();

        const btnClear = document.getElementById('btn-clear-scene');
        if (btnClear) btnClear.onpointerdown = () => {
            if (confirm('مسح كل المجسمات؟')) { this.engine.clearScene(); this.gizmo.detach(); }
        };

        const btnDel = document.getElementById('btn-delete');
        if (btnDel) btnDel.onpointerdown = () => {
            if (!this.engine.selected) return;
            this.engine.scene.remove(this.engine.selected);
            this.engine.objects = this.engine.objects.filter(o => o !== this.engine.selected);
            this.engine.selectObject(null);
            this.updateList();
        };
    }

    populateAssetGrid() {
        const grid = document.getElementById('asset-grid');
        if (grid) grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#666; padding:20px;">مكتبة الأصول (قريباً)</div>';
    }

    bindInspector() {
        const bind = (id, cb) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', () => {
                if (!this.engine.selected) return;
                const v = el.type === 'checkbox' ? el.checked : (el.type === 'range' ? parseFloat(el.value) : el.value);
                cb(this.engine.selected, v);
            });
        };
        bind('prop-x', (o, v) => o.position.x = v);
        bind('prop-y', (o, v) => o.position.y = v);
        bind('prop-z', (o, v) => o.position.z = v);
        bind('prop-scale', (o, v) => o.scale.set(v, v, v));
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
            this.gizmo.detach();
            return;
        }
        this.gizmo.attach(obj);
        
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        set('prop-x', obj.position.x.toFixed(2));
        set('prop-y', obj.position.y.toFixed(2));
        set('prop-z', obj.position.z.toFixed(2));
        set('prop-scale', obj.scale.x);
    }

    updateUIValues() {
        if (!this.engine.selected) return;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        set('prop-x', this.engine.selected.position.x.toFixed(2));
        set('prop-y', this.engine.selected.position.y.toFixed(2));
        set('prop-z', this.engine.selected.position.z.toFixed(2));
        set('prop-scale', this.engine.selected.scale.x);
    }
}
