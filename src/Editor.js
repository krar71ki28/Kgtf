import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export class Editor {
    constructor(engine) {
        this.engine = engine;
        this.gizmo = new TransformControls(this.engine.camera, this.engine.renderer.domElement);
        this.gizmo.setSize(0.8);
        this.engine.scene.add(this.gizmo);
        this.gizmo.addEventListener('dragging-changed', (event) => { this.engine.controls.enabled = !event.value; });
        this.gizmo.addEventListener('objectChange', () => this.updateUIValues());

        this.setupUI();
        this.setupRaycaster();
        
        this.engine.onSelect = (obj) => this.updateInspector(obj);
        this.engine.onSceneChange = () => this.updateList();
        if (this.engine.objects.length > 0) this.engine.selectObject(this.engine.objects[0]);
        this.updateList();
    }

    setupUI() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const target = document.getElementById(btn.dataset.target);
                if(target) target.classList.add('active');
            };
        });

        
        const addMenu = document.getElementById('add-menu');
        const addBtn = document.getElementById('btn-add-menu');
        if (addBtn && addMenu) {
            addBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                addMenu.classList.toggle('show');
            });
            document.addEventListener('click', (e) => {
                    menu.classList.remove('show');
                }
            });
        }


        ['cube','sphere','tree','rock','light','character','camera'].forEach(t => {
            const el = document.getElementById(`btn-${t}`);
            if(el) el.onclick = () => { this.engine.addObject(t); if(addMenu) addMenu.classList.remove('show'); };
        });

        const vfxFire = document.getElementById('btn-vfx-fire');
        if(vfxFire) vfxFire.onclick = () => { this.engine.addObject('vfx'); if(addMenu) addMenu.classList.remove('show'); };

        const gTrans = document.getElementById('btn-gizmo-translate');
        if(gTrans) gTrans.onclick = () => { this.gizmo.setMode('translate'); this.setActiveTool('btn-gizmo-translate'); };
        const gRot = document.getElementById('btn-gizmo-rotate');
        if(gRot) gRot.onclick = () => { this.gizmo.setMode('rotate'); this.setActiveTool('btn-gizmo-rotate'); };
        const gScale = document.getElementById('btn-gizmo-scale');
        if(gScale) gScale.onclick = () => { this.gizmo.setMode('scale'); this.setActiveTool('btn-gizmo-scale'); };

        const gridBtn = document.getElementById('btn-toggle-grid');
        if(gridBtn) gridBtn.onclick = () => this.engine.toggleGrid(gridBtn.classList.toggle('active'));
        const clearBtn = document.getElementById('btn-clear-scene');
        if(clearBtn) clearBtn.onclick = () => { if(confirm('مسح الكل؟')) { this.engine.objects.forEach(o=>this.engine.scene.remove(o)); this.engine.objects = []; this.updateList(); } };
        const delBtn = document.getElementById('btn-delete');
        if(delBtn) delBtn.onclick = () => { if(this.engine.selected) this.engine.removeObject(this.engine.selected); };
        const dragHandle = document.getElementById('panel-drag-handle');
        if(dragHandle) dragHandle.onclick = () => document.getElementById('inspector-panel').classList.toggle('collapsed');

        const rainTog = document.getElementById('env-rain-toggle');
        if(rainTog) rainTog.onchange = (e) => this.engine.toggleRain(e.target.checked);
        const nightTog = document.getElementById('env-night-mode');
        if(nightTog) nightTog.onchange = (e) => this.engine.toggleNightMode(e.target.checked);

        const addLogicBtn = document.getElementById('btn-add-logic');
        if(addLogicBtn) addLogicBtn.onclick = () => {
            if (!this.engine.selected) return alert('اختر مجسماً أولاً!');
            const ev = document.getElementById('logic-event').value;
            const act = document.getElementById('logic-action').value;
            if (!this.engine.selected.userData.logic) this.engine.selected.userData.logic = [];
            this.engine.selected.userData.logic.push({ event: ev, action: act });
            this.renderLogicList();
        };

        const bindProp = (id, callback) => {
            const el = document.getElementById(id);
            if(!el) return;
            el.oninput = (e) => {
                if (!this.engine.selected) return;
                callback(this.engine.selected, el.type === 'checkbox' ? el.checked : (el.type === 'range' ? parseFloat(el.value) : el.value));
                this.gizmo.attach(this.engine.selected);
            };
        };
        bindProp('prop-x', (obj, v) => obj.position.x = v);
        bindProp('prop-y', (obj, v) => obj.position.y = v);
        bindProp('prop-z', (obj, v) => obj.position.z = v);
        bindProp('prop-rot-y', (obj, v) => obj.rotation.y = v);
        bindProp('prop-scale', (obj, v) => obj.scale.set(v, v, v));
        bindProp('prop-color', (obj, v) => { if (obj.isMesh) obj.material.color.set(v); });
        bindProp('prop-physics', (obj, v) => { if(obj.userData.physics) obj.userData.physics.enabled = v; });
    }

    setActiveTool(id) {
        document.querySelectorAll('.gizmo-group .icon-btn').forEach(b => b.classList.remove('active'));
        const el = document.getElementById(id);
        if(el) el.classList.add('active');
    }

    setupRaycaster() {
        const canvas = this.engine.renderer.domElement;
        canvas.addEventListener('pointerdown', (e) => { this.pointerDown = { x: e.clientX, y: e.clientY }; });
        canvas.addEventListener('pointerup', (e) => {
            if (document.body.classList.contains('play-mode') || this.gizmo.dragging) return;
            if (Math.hypot(e.clientX - this.pointerDown.x, e.clientY - this.pointerDown.y) > 5) return;
            const rect = canvas.getBoundingClientRect(); 
            const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.engine.camera);
            const hits = raycaster.intersectObjects(this.engine.objects, true);
            if (hits.length > 0) { let root = hits[0].object; while (root && root.parent !== this.engine.scene) root = root.parent; if (root) this.engine.selectObject(root); }
            else this.engine.selectObject(null);
        });
    }

    updateList() {
        const list = document.getElementById('object-list'); if(!list) return;
        list.innerHTML = '';
        this.engine.objects.forEach(obj => {
            const div = document.createElement('div');
            div.className = 'obj-item' + (obj === this.engine.selected ? ' selected' : '');
            div.innerText = obj.userData.type;
            div.onclick = () => this.engine.selectObject(obj);
            list.appendChild(div);
        });
    }

    renderLogicList() {
        const list = document.getElementById('active-logic-list'); if(!list) return;
        list.innerHTML = '';
        if (!this.engine.selected || !this.engine.selected.userData.logic) return;
        this.engine.selected.userData.logic.forEach((item, index) => {
            const div = document.createElement('div');
            div.style.cssText = 'background:#1e1e24; padding:8px; border-radius:4px; font-size:11px; display:flex; justify-content:space-between; border:1px solid #333;';
            div.innerHTML = `<span>${item.event} ← ${item.action}</span>`;
            const del = document.createElement('span'); del.innerText = '✕'; del.style.cssText = 'color:#ff5577; cursor:pointer;';
            del.onclick = () => { this.engine.selected.userData.logic.splice(index, 1); this.renderLogicList(); };
            div.appendChild(del); list.appendChild(div);
        });
    }

    updateUIValues() {
        if(!this.engine.selected) return;
        const obj = this.engine.selected;
        if(document.getElementById('prop-x')) document.getElementById('prop-x').value = obj.position.x.toFixed(2);
        if(document.getElementById('prop-y')) document.getElementById('prop-y').value = obj.position.y.toFixed(2);
        if(document.getElementById('prop-z')) document.getElementById('prop-z').value = obj.position.z.toFixed(2);
        if(document.getElementById('prop-rot-y')) document.getElementById('prop-rot-y').value = obj.rotation.y;
        if(document.getElementById('prop-scale')) document.getElementById('prop-scale').value = obj.scale.x;
    }

    updateInspector(obj) {
        const inspector = document.getElementById('inspector');
        const noMsg = document.getElementById('no-selection-msg');
        const actions = document.getElementById('object-actions');
        if (!obj) { 
            if(inspector) inspector.style.display = 'none'; if(noMsg) noMsg.style.display = 'block'; if(actions) actions.style.display = 'none'; this.gizmo.detach(); this.renderLogicList(); return; 
        }
        if(inspector) inspector.style.display = 'block'; if(noMsg) noMsg.style.display = 'none'; if(actions) actions.style.display = 'flex'; this.gizmo.attach(obj);
        this.updateUIValues();
        if (obj.isMesh && obj.material) document.getElementById('prop-color').value = '#' + obj.material.color.getHexString();
        this.renderLogicList();
    }
}
