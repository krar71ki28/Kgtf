import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { BEHAVIORS } from './Engine.js';

export class Editor {
    constructor(engine) {
        this.engine = engine;
        this.inspector = document.getElementById('inspector');
        this.raycaster = new THREE.Raycaster();
        this.isDraggingGizmo = false;

        this.gizmo = new TransformControls(this.engine.editorCamera, this.engine.renderer.domElement);
        this.gizmo.setSize(0.8);
        this.engine.scene.add(this.gizmo);

        this.gizmo.addEventListener('dragging-changed', (event) => {
            this.engine.controls.enabled = !event.value;
            this.isDraggingGizmo = event.value;
        });
        this.gizmo.addEventListener('objectChange', () => this.updateUIValues());

        this.bindButtons();
        this.bindInspector();
        this.setupRaycaster();
        this.setupTabs();

        engine.onSelect = (obj) => this.updateInspector(obj);
        engine.onSceneChange = () => this.updateList();
        this.updateList();
    }

    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.target).classList.add('active');
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
        if (btnAddMenu) btnAddMenu.onclick = (e) => { e.stopPropagation(); addMenu.classList.toggle('show'); };
        document.addEventListener('click', (e) => {
            if (addMenu && !addMenu.contains(e.target) && e.target.id !== 'btn-add-menu') addMenu.classList.remove('show');
        });

        ['cube','sphere','cylinder','cone','torus','tree','bush','mountain','building','rock','light','character','camera'].forEach(t => {
            const el = document.getElementById(`btn-${t}`);
            if (el) el.onclick = () => {
                if (t === 'character') this.engine.loadCharacter();
                else this.engine.addObject(t);
                addMenu?.classList.remove('show');
            };
        });

        const btnFire = document.getElementById('btn-vfx-fire');
        if (btnFire) btnFire.onclick = () => { this.engine.createFireVFX(new THREE.Vector3(0, 0, 0)); addMenu?.classList.remove('show'); };
        const btnSmoke = document.getElementById('btn-vfx-smoke');
        if (btnSmoke) btnSmoke.onclick = () => { this.engine.createSmokeVFX(new THREE.Vector3(0, 0, 0)); addMenu?.classList.remove('show'); };

        const gT = document.getElementById('btn-gizmo-translate');
        const gR = document.getElementById('btn-gizmo-rotate');
        const gS = document.getElementById('btn-gizmo-scale');
        if (gT) gT.onclick = () => this.gizmo.setMode('translate');
        if (gR) gR.onclick = () => this.gizmo.setMode('rotate');
        if (gS) gS.onclick = () => this.gizmo.setMode('scale');

        const btnAddText = document.getElementById('btn-add-text');
        if (btnAddText) btnAddText.onclick = () => {
            const input = document.getElementById('ui-text-input');
            const txt = input?.value || 'نص جديد';
            const div = document.createElement('div');
            div.innerText = txt;
            div.style.cssText = 'position:absolute; top:50px; left:50px; font-size:20px; color:#fff; font-weight:bold; pointer-events:auto; font-family:Cairo;';
            document.getElementById('custom-hud').appendChild(div);
            if (input) input.value = '';
        };

        const btnGrid = document.getElementById('btn-toggle-grid');
        if (btnGrid) btnGrid.onclick = () => {
            const isVis = btnGrid.classList.toggle('active');
            this.engine.toggleGrid(isVis);
        };

        const dragHandle = document.getElementById('panel-drag-handle');
        if (dragHandle) dragHandle.onclick = () => document.getElementById('inspector-panel').classList.toggle('collapsed');

        const nightToggle = document.getElementById('env-night-mode');
        if (nightToggle) nightToggle.addEventListener('change', (e) => this.engine.toggleNightMode(e.target.checked));

        const btnFocus = document.getElementById('btn-focus');
        if (btnFocus) btnFocus.onclick = () => {
            if (!this.engine.selected) return;
            const p = this.engine.selected.position;
            this.engine.controls.target.copy(p);
            this.engine.editorCamera.position.copy(p).add(new THREE.Vector3(5, 5, 5));
            this.engine.controls.update();
        };

        const btnSave = document.getElementById('btn-save');
        if (btnSave) btnSave.onclick = () => {
            this.engine.saveScene();
            const old = btnSave.innerHTML;
            btnSave.innerHTML = '✓';
            setTimeout(() => btnSave.innerHTML = old, 800);
        };

        const btnExport = document.getElementById('btn-export');
        if (btnExport) btnExport.onclick = () => {
            const blob = new Blob([this.engine.exportScene()], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'kgtf_scene.json'; a.click();
            URL.revokeObjectURL(url);
        };

        const btnImport = document.getElementById('btn-import');
        const fileImport = document.getElementById('file-import');
        if (btnImport && fileImport) {
            btnImport.onclick = () => fileImport.click();
            fileImport.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    if (this.engine.importScene(reader.result)) alert('تم الاستيراد بنجاح');
                    else alert('ملف غير صالح');
                };
                reader.readAsText(file);
                e.target.value = '';
            };
        }

        const btnClear = document.getElementById('btn-clear-scene');
        if (btnClear) btnClear.onclick = () => {
            if (!confirm('مسح كل المجسمات؟')) return;
            this.engine.clearScene();
            this.gizmo.detach();
        };

        const btnDelete = document.getElementById('btn-delete');
        if (btnDelete) btnDelete.onclick = () => {
            if (!this.engine.selected) return;
            const obj = this.engine.selected;
            this.engine.scene.remove(obj);
            this.engine.objects = this.engine.objects.filter(o => o !== obj);
            this.engine.selectObject(null);
            this.updateList();
        };

        const btnDup = document.getElementById('btn-duplicate');
        if (btnDup) btnDup.onclick = () => {
            if (!this.engine.selected) return;
            const src = this.engine.selected;
            const clone = src.clone(true);
            clone.position.x += 1.5;
            clone.userData = {
                ...JSON.parse(JSON.stringify(src.userData)),
                id: 'obj_' + (this.engine.idCounter++),
                actions: src.userData.actions || {},
                behaviorStates: {}
            };
            this.engine.scene.add(clone);
            this.engine.objects.push(clone);
            this.engine.selectObject(clone);
            this.updateList();
        };

        const btnUpload = document.getElementById('btn-upload-model');
        const fileModel = document.getElementById('model-upload-input');
        if (btnUpload && fileModel) {
            btnUpload.onclick = () => fileModel.click();
            fileModel.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try { await this.engine.loadModel(file); }
                catch (err) { alert('فشل التحميل: ' + err.message); }
                e.target.value = '';
            };
        }
    }

    bindInspector() {
        const bindProp = (id, callback) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', (e) => {
                if (!this.engine.selected) return;
                const val = el.type === 'checkbox' ? el.checked : (el.type === 'range' ? parseFloat(el.value) : el.value);
                callback(this.engine.selected, val);
                if (this.engine.selected) this.gizmo.attach(this.engine.selected);
            });
        };
        bindProp('prop-x', (o, v) => o.position.x = v);
        bindProp('prop-y', (o, v) => o.position.y = v);
        bindProp('prop-z', (o, v) => o.position.z = v);
        bindProp('prop-rot-y', (o, v) => o.rotation.y = v);
        bindProp('prop-scale', (o, v) => o.scale.set(v, v, v));
        bindProp('prop-color', (o, v) => { if (o.isMesh && o.material?.color) o.material.color.set(v); else if (o.isLight) o.color.set(v); });
        bindProp('prop-physics', (o, v) => { if (o.userData.physics) o.userData.physics.enabled = v; });
        bindProp('prop-light-intensity', (o, v) => { if (o.isLight) o.intensity = v; });
        bindProp('prop-material', (o, v) => {
            if (o.isMesh && o.userData.type !== 'character') {
                o.material.dispose();
                o.material = this.engine.makeMaterial(v);
                o.userData.material = v;
            }
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
            div.onclick = () => this.engine.selectObject(obj);
            list.appendChild(div);
        });
    }

    updateInspector(obj) {
        if (!obj) {
            if (this.inspector) this.inspector.style.display = 'none';
            const noSel = document.getElementById('no-selection-msg');
            if (noSel) noSel.style.display = 'block';
            const actions = document.getElementById('object-actions');
            if (actions) actions.style.display = 'none';
            this.gizmo.detach();
            return;
        }
        if (this.inspector) this.inspector.style.display = 'block';
        const noSel = document.getElementById('no-selection-msg');
        if (noSel) noSel.style.display = 'none';
        const actions = document.getElementById('object-actions');
        if (actions) actions.style.display = 'flex';
        this.gizmo.attach(obj);

        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        set('prop-x', obj.position.x.toFixed(2));
        set('prop-y', obj.position.y.toFixed(2));
        set('prop-z', obj.position.z.toFixed(2));
        set('prop-rot-y', obj.rotation.y);
        set('prop-scale', obj.scale.x);
        if (obj.isMesh && obj.material?.color) set('prop-color', '#' + obj.material.color.getHexString());

        const lightProps = document.getElementById('light-properties');
        if (lightProps) {
            if (obj.isLight) {
                lightProps.style.display = 'block';
                set('prop-light-intensity', obj.intensity);
            } else lightProps.style.display = 'none';
        }
    }

    updateUIValues() {
        if (!this.engine.selected) return;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        set('prop-x', this.engine.selected.position.x.toFixed(2));
        set('prop-y', this.engine.selected.position.y.toFixed(2));
        set('prop-z', this.engine.selected.position.z.toFixed(2));
        set('prop-rot-y', this.engine.selected.rotation.y);
        set('prop-scale', this.engine.selected.scale.x);
    }
}
