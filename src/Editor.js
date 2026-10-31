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

        this.gizmo.addEventListener('dragging-changed', (event) => { this.engine.controls.enabled = !event.value; this.isDraggingGizmo = event.value; });
        this.gizmo.addEventListener('objectChange', () => this.updateUIValues());

        this.bindButtons();
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
                const target = document.getElementById(btn.dataset.target);
                if(target) target.classList.add('active');
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
        if(document.getElementById('btn-add-menu')) {
            document.getElementById('btn-add-menu').onclick = (e) => { e.stopPropagation(); addMenu.classList.toggle('show'); };
            document.addEventListener('click', (e) => { if (!addMenu.contains(e.target) && e.target.id !== 'btn-add-menu') addMenu.classList.remove('show'); });
        }
        
        ['cube','sphere','cylinder','cone','torus','tree','rock','light','character','camera'].forEach(t => {
            const el = document.getElementById(`btn-${t}`); 
            if(el) el.onclick = () => { 
                if(t === 'character') this.engine.loadCharacter(); 
                else this.engine.addObject(t); 
                addMenu.classList.remove('show'); 
            }; 
        });

        // إضافة النار
        const fireBtn = document.getElementById('btn-vfx-fire');
        if(fireBtn) fireBtn.onclick = () => { this.engine.createFireVFX(new THREE.Vector3(0, 0, 0)); addMenu.classList.remove('show'); };

        // الأدوات
        if(document.getElementById('btn-gizmo-translate')) document.getElementById('btn-gizmo-translate').onclick = () => this.gizmo.setMode('translate');
        if(document.getElementById('btn-gizmo-rotate')) document.getElementById('btn-gizmo-rotate').onclick = () => this.gizmo.setMode('rotate');
        if(document.getElementById('btn-gizmo-scale')) document.getElementById('btn-gizmo-scale').onclick = () => this.gizmo.setMode('scale');
        
        // UI Editor
        if(document.getElementById('btn-add-text')) {
            document.getElementById('btn-add-text').onclick = () => {
                const txt = document.getElementById('ui-text-input').value || 'نص جديد';
                const size = document.getElementById('ui-text-size').value + 'px';
                const color = document.getElementById('ui-text-color').value;
                const div = document.createElement('div');
                div.innerText = txt;
                div.style.cssText = `position:absolute; top:50px; left:50px; font-size:${size}; color:${color}; font-weight:bold; pointer-events:auto; font-family:Cairo;`;
                document.getElementById('custom-hud').appendChild(div);
            };
        }
        
        if(document.getElementById('btn-add-health')) {
            document.getElementById('btn-add-health').onclick = () => {
                const div = document.createElement('div');
                div.innerHTML = `<div style="width:200px; height:20px; background:#333; border:2px solid #fff; border-radius:10px; position:absolute; top:20px; left:20px;"><div style="width:100%; height:100%; background:#ff5577; border-radius:8px;"></div></div>`;
                document.getElementById('custom-hud').appendChild(div);
            };
        }

        // Logic System
        if(document.getElementById('btn-add-logic')) {
            document.getElementById('btn-add-logic').onclick = () => {
                if(!this.engine.selected) return alert('اختر مجسم أولاً');
                const ev = document.getElementById('logic-event').value;
                const act = document.getElementById('logic-action').value;
                if(!this.engine.selected.userData.logic) this.engine.selected.userData.logic = [];
                this.engine.selected.userData.logic.push({ event: ev, action: act });
                
                const list = document.getElementById('active-logic-list');
                list.innerHTML += `<div style="background:#25252b; padding:5px; margin-bottom:5px; border-radius:4px;">إذا: ${ev} -> أفعل: ${act}</div>`;
            };
        }
    }

    updateList() {
        const list = document.getElementById('object-list'); if(!list) return; list.innerHTML = '';
        this.engine.objects.forEach(obj => { 
            const div = document.createElement('div'); 
            div.className = 'obj-item' + (obj === this.engine.selected ? ' selected' : ''); 
            div.innerText = obj.userData.type; 
            div.onclick = () => this.engine.selectObject(obj); 
            list.appendChild(div); 
        });
    }

    updateInspector(obj) {
        if (!obj) { this.inspector.style.display = 'none'; document.getElementById('no-selection-msg').style.display = 'block'; this.gizmo.detach(); return; }
        this.inspector.style.display = 'block'; document.getElementById('no-selection-msg').style.display = 'none'; this.gizmo.attach(obj);
        if(document.getElementById('prop-x')) document.getElementById('prop-x').value = obj.position.x.toFixed(2);
        if(document.getElementById('prop-y')) document.getElementById('prop-y').value = obj.position.y.toFixed(2);
        if(document.getElementById('prop-z')) document.getElementById('prop-z').value = obj.position.z.toFixed(2);
        if(document.getElementById('prop-rot-y')) document.getElementById('prop-rot-y').value = obj.rotation.y;
        if(document.getElementById('prop-scale')) document.getElementById('prop-scale').value = obj.scale.x;
    }
    
    updateUIValues() {
        if(!this.engine.selected) return;
        if(document.getElementById('prop-x')) document.getElementById('prop-x').value = this.engine.selected.position.x.toFixed(2);
        if(document.getElementById('prop-y')) document.getElementById('prop-y').value = this.engine.selected.position.y.toFixed(2);
        if(document.getElementById('prop-z')) document.getElementById('prop-z').value = this.engine.selected.position.z.toFixed(2);
    }
}
