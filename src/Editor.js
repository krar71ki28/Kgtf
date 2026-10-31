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

        this.gizmo.addEventListener('dragging-changed', (event) => { this.engine.controls.enabled = !event.value; this.isDraggingGizmo = event.value; });
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
            if (Math.hypot(e.clientX - this.pointerDown.x, e.clientY - this.pointerDown.y) > 5) return;
            const rect = canvas.getBoundingClientRect(); const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
            this.raycaster.setFromCamera(mouse, this.engine.editorCamera);
            const hits = this.raycaster.intersectObjects(this.engine.objects, true);
            if (hits.length > 0) { let root = hits[0].object; while (root && root.parent !== this.engine.scene) root = root.parent; if (root) return this.engine.selectObject(root); }
            this.engine.selectObject(null);
        });
    }

    bindButtons() {
        const addMenu = document.getElementById('add-menu');
        document.getElementById('btn-add-menu').onclick = (e) => { e.stopPropagation(); addMenu.classList.toggle('show'); };
        document.addEventListener('click', (e) => { if (!addMenu.contains(e.target) && e.target.id !== 'btn-add-menu') addMenu.classList.remove('show'); });
        
        ['cube','sphere','cylinder','cone','torus','tree','rock','light','character','camera'].forEach(t => {
            const el = document.getElementById(`btn-${t}`); 
            if(el) el.onclick = () => { 
                if(t === 'character') this.engine.loadCharacter(); 
                else this.engine.addObject(t); 
                addMenu.classList.remove('show'); 
            }; 
        });

        document.getElementById('btn-vfx-fire').onclick = () => { this.engine.createFireVFX(new THREE.Vector3(0, 0, 0)); addMenu.classList.remove('show'); };

        document.getElementById('btn-gizmo-translate').onclick = () => this.gizmo.setMode('translate');
        document.getElementById('btn-gizmo-rotate').onclick = () => this.gizmo.setMode('rotate');
        document.getElementById('btn-gizmo-scale').onclick = () => this.gizmo.setMode('scale');
        
        document.getElementById('btn-add-text').onclick = () => {
            const txt = document.getElementById('ui-text-input').value || 'نص جديد';
            const div = document.createElement('div');
            div.innerText = txt;
            div.style.cssText = `position:absolute; top:50px; left:50px; font-size:20px; color:#fff; font-weight:bold; pointer-events:auto; font-family:Cairo;`;
            document.getElementById('custom-hud').appendChild(div);
        };

        document.getElementById('btn-toggle-grid').onclick = () => {
            const isVis = document.getElementById('btn-toggle-grid').classList.toggle('active');
            this.engine.toggleGrid(isVis);
        };

        const dragHandle = document.getElementById('panel-drag-handle');
        dragHandle.onclick = () => document.getElementById('inspector-panel').classList.toggle('collapsed');

        document.getElementById('env-night-mode').addEventListener('change', (e) => this.engine.toggleNightMode(e.target.checked));
    }

    bindInspector() {
        const bindProp = (id, callback) => { 
            const el = document.getElementById(id); 
            if(!el) return; 
            el.addEventListener('input', (e) => { 
                if (!this.engine.selected) return; 
                callback(this.engine.selected, el.type === 'checkbox' ? el.checked : (el.type === 'range' ? parseFloat(el.value) : el.value)); 
                this.gizmo.attach(this.engine.selected); 
            }); 
        };
        bindProp('prop-x', (obj, v) => obj.position.x = v); 
        bindProp('prop-y', (obj, v) => obj.position.y = v); 
        bindProp('prop-z', (obj, v) => obj.position.z = v);
        bindProp('prop-rot-y', (obj, v) => obj.rotation.y = v);
        bindProp('prop-scale', (obj, v) => obj.scale.set(v, v, v)); 
        bindProp('prop-color', (obj, v) => { if (obj.isMesh) obj.material.color.set(v); else if (obj.isLight) obj.color.set(v); });
        bindProp('prop-physics', (obj, v) => { if(obj.userData.physics) obj.userData.physics.enabled = v; });
        bindProp('prop-light-intensity', (obj, v) => { if(obj.isLight) obj.intensity = v; });
        bindProp('prop-material', (obj, v) => { 
            if (obj.isMesh && obj.userData.type !== 'character') { 
                obj.material.dispose(); obj.material = this.engine.makeMaterial(v); obj.userData.material = v; 
            } 
        });
    }

    updateList() {
        const list = document.getElementById('object-list'); list.innerHTML = '';
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
            this.inspector.style.display = 'none'; 
            document.getElementById('no-selection-msg').style.display = 'block'; 
            document.getElementById('object-actions').style.display = 'none';
            this.gizmo.detach(); 
            return; 
        }
        this.inspector.style.display = 'block'; 
        document.getElementById('no-selection-msg').style.display = 'none'; 
        document.getElementById('object-actions').style.display = 'flex';
        this.gizmo.attach(obj);
        
        document.getElementById('prop-x').value = obj.position.x.toFixed(2);
        document.getElementById('prop-y').value = obj.position.y.toFixed(2);
        document.getElementById('prop-z').value = obj.position.z.toFixed(2);
        document.getElementById('prop-rot-y').value = obj.rotation.y;
        document.getElementById('prop-scale').value = obj.scale.x;
        if (obj.isMesh && obj.material) document.getElementById('prop-color').value = '#' + obj.material.color.getHexString();
        
        const lightProps = document.getElementById('light-properties');
        if (obj.isLight) {
            lightProps.style.display = 'block';
            document.getElementById('prop-light-intensity').value = obj.intensity;
        } else { lightProps.style.display = 'none'; }
    }
    
    updateUIValues() {
        if(!this.engine.selected) return;
        document.getElementById('prop-x').value = this.engine.selected.position.x.toFixed(2);
        document.getElementById('prop-y').value = this.engine.selected.position.y.toFixed(2);
        document.getElementById('prop-z').value = this.engine.selected.position.z.toFixed(2);
        document.getElementById('prop-rot-y').value = this.engine.selected.rotation.y;
    }
}
