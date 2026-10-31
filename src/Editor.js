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

        // ربط كل الأزرار (إصلاح 3)
        const types = ['cube','sphere','cylinder','cone','torus','tree','bush','mountain','rock','building','light','character','camera'];
        types.forEach(t => {
            const el = document.getElementById(`btn-${t}`);
            if(el) el.onclick = () => {
                if(t === 'character') this.engine.loadCharacter();
                else if (t === 'camera') this.engine.addObject('camera');
                else this.engine.addObject(t);
                addMenu.classList.remove('show');
            };
        });
        
        document.getElementById('btn-vfx-fire').onclick = () => { this.engine.addObject('vfx', {vfxType:'fire'}); addMenu.classList.remove('show'); };
        document.getElementById('btn-vfx-smoke').onclick = () => { this.engine.addObject('vfx', {vfxType:'smoke'}); addMenu.classList.remove('show'); };

        // أدوات
        document.getElementById('btn-gizmo-translate').onclick = () => this.gizmo.setMode('translate');
        document.getElementById('btn-gizmo-rotate').onclick = () => this.gizmo.setMode('rotate');
        document.getElementById('btn-gizmo-scale').onclick = () => this.gizmo.setMode('scale');
        document.getElementById('btn-toggle-grid').onclick = () => this.engine.toggleGrid(document.getElementById('btn-toggle-grid').classList.toggle('active'));
        document.getElementById('panel-drag-handle').onclick = () => document.getElementById('inspector-panel').classList.toggle('collapsed');
        document.getElementById('env-rain-toggle').onchange = (e) => this.engine.toggleRain(e.target.checked);
        document.getElementById('btn-save').onclick = () => this.engine.saveScene();
        document.getElementById('btn-export').onclick = () => this.engine.exportScene();
        document.getElementById('btn-clear-scene').onclick = () => { if(confirm('مسح المشهد؟')) { this.engine.objects.forEach(o=>this.engine.scene.remove(o)); this.engine.objects = []; this.updateList(); } };

        // ربط أشرطة الخصائص (إصلاح 17)
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
        bindProp('prop-physics', (obj, v) => { if(obj.userData.physics) obj.userData.physics.enabled = v; }); // إصلاح 13
        bindProp('prop-material', (obj, v) => { if (obj.isMesh) { obj.material.dispose(); obj.material = this.engine.makeMaterial(v); } });
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
        
        if (!obj) { 
            inspector.style.display = 'none'; noMsg.style.display = 'block'; this.gizmo.detach(); return; 
        }
        inspector.style.display = 'block'; noMsg.style.display = 'none'; this.gizmo.attach(obj);
        
        document.getElementById('prop-x').value = obj.position.x.toFixed(2);
        document.getElementById('prop-y').value = obj.position.y.toFixed(2);
        document.getElementById('prop-z').value = obj.position.z.toFixed(2);
        document.getElementById('prop-rot-y').value = obj.rotation.y;
        document.getElementById('prop-scale').value = obj.scale.x;
        if (obj.isMesh) document.getElementById('prop-color').value = '#' + obj.material.color.getHexString();
        
        // مزامنة الجاذبية (إصلاح 13)
        const physCheck = document.getElementById('prop-physics');
        if (physCheck && obj.userData.physics) physCheck.checked = obj.userData.physics.enabled;
    }
}
