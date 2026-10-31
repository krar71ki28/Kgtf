import * as THREE from 'three';

export class Editor {
    constructor(engine) {
        this.engine = engine;
        this.setupTabs();
        this.setupUI();
        this.setupRaycaster();
        
        engine.onSelectCallback = (obj) => this.updateInspector(obj);
        engine.onSceneChangeCallback = () => this.updateOutliner();
        
        // تحميل المشهد
        const raw = localStorage.getItem('kgtf_scene_modular');
        if (raw) {
            try {
                JSON.parse(raw).forEach(d => {
                    const obj = engine.createObject(d.type);
                    obj.position.fromArray(d.pos);
                    obj.traverse(c => { if(c.isMesh && c.material && c.material.color) c.material.color.set(d.color); });
                });
                engine.selectObject(null);
            } catch(e) {}
        } else {
            engine.createObject('cube');
        }
    }

    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('pointerdown', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.target).classList.add('active');
            });
        });
    }

    setupUI() {
        const addMenu = document.getElementById('add-menu');
        document.getElementById('btn-add-menu').addEventListener('pointerdown', (e) => { e.stopPropagation(); addMenu.classList.toggle('show'); });
        document.addEventListener('pointerdown', (e) => { if (!addMenu.contains(e.target) && e.target.id !== 'btn-add-menu') addMenu.classList.remove('show'); });

        document.querySelectorAll('.add-btn').forEach(btn => {
            btn.addEventListener('pointerdown', () => { this.engine.createObject(btn.dataset.type); addMenu.classList.remove('show'); });
        });

        document.getElementById('btn-clear-scene').addEventListener('pointerdown', () => this.engine.clearScene());
        
        document.getElementById('btn-gizmo-translate').addEventListener('pointerdown', () => this.engine.transform.setMode('translate'));
        document.getElementById('btn-gizmo-rotate').addEventListener('pointerdown', () => this.engine.transform.setMode('rotate'));
        document.getElementById('btn-gizmo-scale').addEventListener('pointerdown', () => this.engine.transform.setMode('scale'));

        document.getElementById('env-night-mode').addEventListener('change', (e) => this.engine.toggleNightMode(e.target.checked));
        document.getElementById('env-rain-toggle').addEventListener('change', (e) => this.engine.toggleRain(e.target.checked));

        document.getElementById('btn-save').addEventListener('pointerdown', () => {
            const data = this.engine.objects.map(o => {
                let color = '#00e5ff';
                o.traverse(c => { if(c.isMesh && c.material && c.material.color) color = '#' + c.material.color.getHexString(); });
                return { type: o.userData.type, pos: o.position.toArray(), color: color };
            });
            localStorage.setItem('kgtf_scene_modular', JSON.stringify(data));
            alert('تم الحفظ!');
        });

        const bindProp = (id, cb) => {
            document.getElementById(id).addEventListener('input', (e) => {
                if (this.engine.selectedObj) cb(this.engine.selectedObj, parseFloat(e.target.value));
            });
        };
        bindProp('prop-x', (o, v) => o.position.x = v);
        bindProp('prop-y', (o, v) => o.position.y = v);
        bindProp('prop-z', (o, v) => o.position.z = v);
        
        document.getElementById('prop-color').addEventListener('input', (e) => {
            if(this.engine.selectedObj) this.engine.selectedObj.traverse(c => { if(c.isMesh && c.material && c.material.color) c.material.color.set(e.target.value); });
        });
    }

    setupRaycaster() {
        const canvas = this.engine.renderer.domElement;
        let pointerStart = { x: 0, y: 0 };
        canvas.addEventListener('pointerdown', (e) => { pointerStart = { x: e.clientX, y: e.clientY }; });
        canvas.addEventListener('pointerup', (e) => {
            if (this.engine.transform.dragging) return;
            if (Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 5) return;
            
            const rect = canvas.getBoundingClientRect();
            const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
            const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(mouse, this.engine.camera);
            const hits = raycaster.intersectObjects(this.engine.objects, true);
            
            if (hits.length > 0) {
                let root = hits[0].object; while (root.parent !== this.engine.scene) root = root.parent; this.engine.selectObject(root);
            } else { this.engine.selectObject(null); }
        });
    }

    updateOutliner() {
        const list = document.getElementById('object-list'); list.innerHTML = '';
        this.engine.objects.forEach(o => {
            const div = document.createElement('div');
            div.className = 'obj-item' + (o === this.engine.selectedObj ? ' selected' : '');
            div.innerText = o.userData.type;
            div.addEventListener('pointerdown', () => this.engine.selectObject(o));
            list.appendChild(div);
        });
    }

    updateInspector(obj) {
        const insp = document.getElementById('inspector');
        const msg = document.getElementById('no-selection-msg');
        if (!obj) { insp.style.display = 'none'; msg.style.display = 'block'; return; }
        insp.style.display = 'block'; msg.style.display = 'none';
        document.getElementById('prop-x').value = obj.position.x;
        document.getElementById('prop-y').value = obj.position.y;
        document.getElementById('prop-z').value = obj.position.z;
        let color = '#00e5ff';
        obj.traverse(c => { if(c.isMesh && c.material && c.material.color) color = '#' + c.material.color.getHexString(); });
        document.getElementById('prop-color').value = color;
    }
}
