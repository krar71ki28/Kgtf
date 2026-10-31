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
            btn.addEventListener('pointerdown', () => { // استخدام pointerdown بدل click
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
            this.raycaster.far = 1000;
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
        
        // استخدام pointerdown لفتح القائمة
        if (btnAddMenu) {
            btnAddMenu.onpointerdown = (e) => { 
                e.stopPropagation(); 
                addMenu?.classList.toggle('show'); 
            };
        }
        
        document.addEventListener('pointerdown', (e) => {
            if (addMenu && !addMenu.contains(e.target) && e.target.id !== 'btn-add-menu') {
                addMenu.classList.remove('show');
            }
        });

        // أنواع المجسمات.. نستخدم pointerdown لتشتغل فوراً بدون تأخير
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

        const btnAddText = document.getElementById('btn-add-text');
        if (btnAddText) btnAddText.onpointerdown = () => {
            const input = document.getElementById('ui-text-input');
            const hud = document.getElementById('custom-hud');
            if (!hud) return;
            const div = document.createElement('div');
            div.innerText = input?.value || 'نص جديد';
            div.style.cssText = 'position:absolute; top:50px; left:50px; font-size:20px; color:#fff; font-weight:bold; pointer-events:auto; font-family:Cairo;';
            hud.appendChild(div);
            if (input) input.value = '';
        };

        const btnGrid = document.getElementById('btn-toggle-grid');
        if (btnGrid) btnGrid.onpointerdown = () => this.engine.toggleGrid(btnGrid.classList.toggle('active'));

        const dh = document.getElementById('panel-drag-handle');
        if (dh) dh.onpointerdown = () => document.getElementById('inspector-panel')?.classList.toggle('collapsed');

        const nt = document.getElementById('env-night-mode');
        if (nt) nt.addEventListener('change', (e) => this.engine.toggleNightMode(e.target.checked));

        const rt = document.getElementById('env-rain-toggle');
        if (rt) rt.addEventListener('change', (e) => this.engine.toggleRain(e.target.checked));

        const btnFocus = document.getElementById('btn-focus');
        if (btnFocus) btnFocus.onpointerdown = () => {
            if (!this.engine.selected) return;
            const p = this.engine.selected.position;
            this.engine.controls.target.copy(p);
            this.engine.editorCamera.position.copy(p).add(new THREE.Vector3(5, 5, 5));
            this.engine.controls.update();
        };

        const btnSave = document.getElementById('btn-save');
        if (btnSave) btnSave.onpointerdown = () => {
            this.engine.saveScene();
            const old = btnSave.innerHTML;
            btnSave.innerHTML = '✓';
            setTimeout(() => btnSave.innerHTML = old, 800);
        };

        const btnExport = document.getElementById('btn-export');
        if (btnExport) btnExport.onpointerdown = () => {
            const blob = new Blob([this.engine.exportScene()], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = 'kgtf_scene.json'; a.click();
            URL.revokeObjectURL(url);
        };

        const btnImport = document.getElementById('btn-import');
        const fileImport = document.getElementById('file-import');
        if (btnImport && fileImport) {
            btnImport.onpointerdown = () => fileImport.click();
            fileImport.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    if (this.engine.importScene(reader.result)) alert('تم الاستيراد');
                    else alert('ملف غير صالح');
                };
                reader.readAsText(file);
                e.target.value = '';
            };
        }

        const btnClear = document.getElementById('btn-clear-scene');
        if (btnClear) btnClear.onpointerdown = () => {
            if (!confirm('مسح كل المجسمات؟')) return;
            this.engine.clearScene();
            this.gizmo.detach();
        };

        const btnDel = document.getElementById('btn-delete');
        if (btnDel) btnDel.onpointerdown = () => {
            if (!this.engine.selected) return;
            const obj = this.engine.selected;
            this.engine.scene.remove(obj);
            obj.traverse?.(c => {
                if (c.geometry) c.geometry.dispose?.();
                if (c.material) {
                    if (Array.isArray(c.material)) c.material.forEach(m => m.dispose?.());
                    else c.material.dispose?.();
                }
            });
            this.engine.objects = this.engine.objects.filter(o => o !== obj);
            this.engine.selectObject(null);
            this.updateList();
        };

        const btnDup = document.getElementById('btn-duplicate');
        if (btnDup) btnDup.onpointerdown = () => {
            if (!this.engine.selected) return;
            const src = this.engine.selected;
            const clone = src.clone(true);
            clone.position.x += 1.5;
            clone.userData = {
                ...JSON.parse(JSON.stringify({ ...src.userData, actions: undefined, mixer: undefined })),
                id: 'obj_' + (this.engine.idCounter++),
                actions: {}, behaviorStates: {}, currentAction: null
            };
            this.engine.scene.add(clone);
            this.engine.objects.push(clone);
            this.engine.selectObject(clone);
            this.updateList();
        };

        const btnSaveAsset = document.getElementById('btn-save-asset');
        if (btnSaveAsset) btnSaveAsset.onpointerdown = () => {
            if (!this.engine.selected) return;
            const obj = this.engine.selected;
            this.engine.assets.push({ type: obj.userData.type, material: obj.userData.material });
            try {
                localStorage.setItem('kgtf_assets', JSON.stringify(this.engine.assets));
                this.populateAssetGrid();
                alert('تم حفظ الأصل في المكتبة');
            } catch (e) { alert('فشل الحفظ'); }
        };

        const btnAddLogic = document.getElementById('btn-add-logic');
        if (btnAddLogic) btnAddLogic.onpointerdown = () => {
            if (!this.engine.selected) { alert('اختر مجسماً أولاً'); return; }
            const ev = document.getElementById('logic-event')?.value || 'onStart';
            const ac = document.getElementById('logic-action')?.value || 'addScore';
            this.engine.selected.userData.logic = this.engine.selected.userData.logic || [];
            this.engine.selected.userData.logic.push({ event: ev, action: ac });
            this.renderLogicList();
        };

        const btnUpload = document.getElementById('btn-upload-model');
        const fileModel = document.getElementById('model-upload-input');
        if (btnUpload && fileModel) {
            btnUpload.onpointerdown = () => fileModel.click();
            fileModel.onchange = async (e) => {
                const file = e.target.files[0];
                if (!file) return;
                try { await this.engine.loadModel(file); }
                catch (err) { alert('فشل التحميل: ' + err.message); }
                e.target.value = '';
            };
        }
    }

    renderLogicList() {
        const list = document.getElementById('active-logic-list');
        if (!list || !this.engine.selected) return;
        list.innerHTML = '';
        const logic = this.engine.selected.userData.logic || [];
        if (logic.length === 0) { list.innerHTML = '<div style="color:#666;text-align:center;">لا يوجد منطق</div>'; return; }
        logic.forEach((l, i) => {
            const div = document.createElement('div');
            div.style.cssText = 'background:#22222a; padding:6px 10px; margin-bottom:5px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;';
            div.innerHTML = `<span>${l.event} → ${l.action}</span><button class="btn-small" style="color:#ff5577;">✕</button>`;
            div.querySelector('button').onpointerdown = () => {
                logic.splice(i, 1);
                this.renderLogicList();
            };
            list.appendChild(div);
        });
    }

    populateAssetGrid() {
        const grid = document.getElementById('asset-grid');
        if (!grid) return;
        grid.innerHTML = '';
        if (this.engine.assets.length === 0) {
            grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; color:#666; font-size:12px; padding:20px;">احفظ مجسماً كأصل من علامة 💾</div>';
            return;
        }
        this.engine.assets.forEach((a) => {
            const card = document.createElement('div');
            card.className = 'asset-card';
            card.innerHTML = `<div class="asset-icon">📦</div><div class="asset-name">${a.type}</div>`;
            card.onpointerdown = () => this.engine.addObject(a.type);
            grid.appendChild(card);
        });
    }

    bindInspector() {
        const bind = (id, cb) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', () => {
                if (!this.engine.selected) return;
                const v = el.type === 'checkbox' ? el.checked : (el.type === 'range' ? parseFloat(el.value) : el.value);
                cb(this.engine.selected, v);
                if (this.engine.selected) this.gizmo.attach(this.engine.selected);
            });
        };
        bind('prop-x', (o, v) => o.position.x = v);
        bind('prop-y', (o, v) => o.position.y = v);
        bind('prop-z', (o, v) => o.position.z = v);
        bind('prop-rot-y', (o, v) => o.rotation.y = v);
        bind('prop-scale', (o, v) => o.scale.set(v, v, v));
        bind('prop-color', (o, v) => { if (o.isMesh && o.material?.color) o.material.color.set(v); else if (o.isLight) o.color.set(v); });
        bind('prop-physics', (o, v) => { if (o.userData.physics) o.userData.physics.enabled = v; });
        bind('prop-light-intensity', (o, v) => { if (o.isLight) o.intensity = v; });
        bind('prop-material', (o, v) => {
            if (o.isMesh && o.userData.type !== 'character') {
                o.material.dispose();
                o.material = this.engine.makeMaterial(v);
                o.userData.material = v;
            }
        });

        const animSel = document.getElementById('anim-select');
        if (animSel) animSel.onchange = () => {
            const o = this.engine.selected;
            if (!o || !o.userData.actions) return;
            const key = animSel.value;
            Object.keys(o.userData.actions).forEach(k => o.userData.actions[k].stop());
            if (o.userData.actions[key]) o.userData.actions[key].play();
            o.userData.currentAction = key;
        };
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
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        if (!obj) {
            if (this.inspector) this.inspector.style.display = 'none';
            const noSel = document.getElementById('no-selection-msg'); if (noSel) noSel.style.display = 'block';
            const act = document.getElementById('object-actions'); if (act) act.style.display = 'none';
            this.gizmo.detach();
            return;
        }
        if (this.inspector) this.inspector.style.display = 'block';
        const noSel = document.getElementById('no-selection-msg'); if (noSel) noSel.style.display = 'none';
        const act = document.getElementById('object-actions'); if (act) act.style.display = 'flex';
        this.gizmo.attach(obj);

        set('prop-x', obj.position.x.toFixed(2));
        set('prop-y', obj.position.y.toFixed(2));
        set('prop-z', obj.position.z.toFixed(2));
        set('prop-rot-y', obj.rotation.y);
        set('prop-scale', obj.scale.x);
        if (obj.isMesh && obj.material?.color) set('prop-color', '#' + obj.material.color.getHexString());

        const phys = document.getElementById('prop-physics');
        if (phys) phys.checked = !!obj.userData.physics?.enabled;

        const lightProps = document.getElementById('light-properties');
        if (lightProps) {
            if (obj.isLight) { lightProps.style.display = 'block'; set('prop-light-intensity', obj.intensity); }
            else lightProps.style.display = 'none';
        }

        const animProps = document.getElementById('animation-properties');
        const animSel = document.getElementById('anim-select');
        if (animProps && animSel) {
            const actions = obj.userData.actions;
            if (actions && Object.keys(actions).length > 0) {
                animProps.style.display = 'block';
                animSel.innerHTML = '<option value="">-- اختر --</option>';
                Object.keys(actions).forEach(k => {
                    const opt = document.createElement('option');
                    opt.value = k; opt.innerText = k;
                    animSel.appendChild(opt);
                });
            } else {
                animProps.style.display = 'none';
            }
        }

        this.renderLogicList();
    }

    updateUIValues() {
        if (!this.engine.selected) return;
        const s = this.engine.selected;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.value = v; };
        set('prop-x', s.position.x.toFixed(2));
        set('prop-y', s.position.y.toFixed(2));
        set('prop-z', s.position.z.toFixed(2));
        set('prop-rot-y', ((s.rotation.y % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2));
        set('prop-scale', s.scale.x);
    }
}
