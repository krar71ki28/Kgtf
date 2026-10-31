import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

export class Editor {
    constructor(engine) {
        this.engine = engine;
        this.gizmo = new TransformControls(this.engine.editorCamera, this.engine.renderer.domElement);
        this.gizmo.setSize(0.8);
        this.engine.scene.add(this.gizmo);
        
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
                document.getElementById(btn.dataset.target).classList.add('active');
            };
        });

        const addMenu = document.getElementById('add-menu');
        document.getElementById('btn-add-menu').onclick = (e) => { e.stopPropagation(); addMenu.classList.toggle('show'); };
        document.body.onclick = (e) => { if (!addMenu.contains(e.target) && e.target.id !== 'btn-add-menu') addMenu.classList.remove('show'); };

        const types = ['cube','sphere','cylinder','tree','rock','light','character','camera'];
        types.forEach(t => {
            const el = document.getElementById(`btn-${t}`);
            if(el) el.onclick = () => {
                if(t === 'character') this.engine.loadCharacter();
                else this.engine.addObject(t);
                addMenu.classList.remove('show');
            };
        });
        
        document.getElementById('btn-upload-model').onclick = () => document.getElementById('model-upload-input').click();
        document.getElementById('model-upload-input').onchange = (e) => { if(e.target.files.length > 0) this.engine.loadModelFromFile(e.target.files[0]); };

        document.getElementById('btn-gizmo-translate').onclick = () => { this.gizmo.setMode('translate'); this.setActiveTool('btn-gizmo-translate'); };
        document.getElementById('btn-gizmo-rotate').onclick = () => { this.gizmo.setMode('rotate'); this.setActiveTool('btn-gizmo-rotate'); };
        document.getElementById('btn-gizmo-scale').onclick = () => { this.gizmo.setMode('scale'); this.setActiveTool('btn-gizmo-scale'); };
        document.getElementById('btn-toggle-grid').onclick = () => this.engine.toggleGrid(document.getElementById('btn-toggle-grid').classList.toggle('active'));
        
        document.getElementById('btn-save').onclick = () => this.engine.saveScene();
        document.getElementById('btn-clear-scene').onclick = () => { if(confirm('مسح الكل؟')) { this.engine.objects.forEach(o=>this.engine.scene.remove(o)); this.engine.objects = []; this.updateList(); } };
        document.getElementById('btn-delete').onclick = () => { if(this.engine.selected) this.engine.removeObject(this.engine.selected); };
        document.getElementById('panel-drag-handle').onclick = () => document.getElementById('inspector-panel').classList.toggle('collapsed');

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
        document.getElementById(id).classList.add('active');
    }

    setupRaycaster() {
        const canvas = this.engine.renderer.domElement;
        canvas.addEventListener('pointerdown', (e) => { this.pointerDown = { x: e.clientX, y: e.clientY }; });
        canvas.addEventListener('pointerup', (e) => {
            if (document.body.classList.contains('play-mode') || this.gizmo.dragging) return;
            if (Math.hypot(e.clientX - this.pointerDown.x, e.clientY - this.pointerDown.y) > 5) return;
            const rect = canvas.getBoundingClientRect(); const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
            const raycaster = new THREE.Raycaster();
            raycaster.setFromCamera(mouse, this.engine.editorCamera);
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

    updateInspector(obj) {
        const inspector = document.getElementById('inspector');
        const noMsg = document.getElementById('no-selection-msg');
        const actions = document.getElementById('object-actions');
        
        if (!obj) { 
            inspector.style.display = 'none'; noMsg.style.display = 'block'; actions.style.display = 'none'; this.gizmo.detach(); return; 
        }
        inspector.style.display = 'block'; noMsg.style.display = 'none'; actions.style.display = 'flex'; this.gizmo.attach(obj);
        
        document.getElementById('prop-x').value = obj.position.x.toFixed(2);
        document.getElementById('prop-y').value = obj.position.y.toFixed(2);
        document.getElementById('prop-z').value = obj.position.z.toFixed(2);
        document.getElementById('prop-rot-y').value = obj.rotation.y;
        document.getElementById('prop-scale').value = obj.scale.x;
        if (obj.isMesh) document.getElementById('prop-color').value = '#' + obj.material.color.getHexString();
        
        const physCheck = document.getElementById('prop-physics');
        if (physCheck && obj.userData.physics) physCheck.checked = obj.userData.physics.enabled;
    }
}
