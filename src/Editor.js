import { TransformControls } from 'three/addons/controls/TransformControls.js';

export class Editor {
    constructor(engine) {
        this.engine = engine;
        this.inspector = document.getElementById('inspector');
        this.gizmo = new TransformControls(this.engine.camera, this.engine.renderer.domElement);
        this.gizmo.setSize(0.8);
        this.engine.scene.add(this.gizmo);

        this.gizmo.addEventListener('dragging-changed', (event) => { this.engine.controls.enabled = !event.value; });
        this.gizmo.addEventListener('objectChange', () => this.updateUIValues());

        this.bindButtons();
        this.bindInspector();
        
        engine.onSelect = (obj) => this.updateInspector(obj);
        engine.onSceneChange = () => this.updateList();
        
        this.updateList();
        if (this.engine.selected) this.updateInspector(this.engine.selected);
    }

    bindButtons() {
        document.getElementById('btn-cube').onclick = () => this.engine.addObject('cube');
        document.getElementById('btn-sphere').onclick = () => this.engine.addObject('sphere');
        document.getElementById('btn-cylinder').onclick = () => this.engine.addObject('cylinder');
        document.getElementById('btn-tree').onclick = () => this.engine.addObject('tree');
        document.getElementById('btn-rock').onclick = () => this.engine.addObject('rock');
        document.getElementById('btn-building').onclick = () => this.engine.addObject('building');
        document.getElementById('btn-light').onclick = () => this.engine.addObject('light');
        document.getElementById('btn-character').onclick = () => this.engine.loadCharacter();
        
        document.getElementById('btn-gizmo-translate').onclick = () => this.gizmo.setMode('translate');
        document.getElementById('btn-gizmo-rotate').onclick = () => this.gizmo.setMode('rotate');
        document.getElementById('btn-gizmo-scale').onclick = () => this.gizmo.setMode('scale');

        document.getElementById('btn-duplicate').onclick = () => {
            const newObj = this.engine.duplicateObject();
            if (newObj) this.engine.selectObject(newObj);
        };
        document.getElementById('btn-delete').onclick = () => this.engine.deleteSelected();
        document.getElementById('btn-save').onclick = () => this.engine.saveScene();
        
        document.getElementById('btn-clear-scene').onclick = () => {
            if (confirm('هل أنت متأكد من مسح المشهد بالكامل؟')) this.engine.clearScene();
        };
    }

    bindInspector() {
        const bindProp = (id, callback) => {
            const el = document.getElementById(id);
            el.addEventListener('input', (e) => {
                if (!this.engine.selected) return;
                callback(this.engine.selected, el.type === 'checkbox' ? el.checked : (el.type === 'range' ? parseFloat(el.value) : el.value));
                this.gizmo.attach(this.engine.selected);
            });
        };
        bindProp('prop-x', (obj, v) => obj.position.x = v);
        bindProp('prop-y', (obj, v) => obj.position.y = v);
        bindProp('prop-z', (obj, v) => obj.position.z = v);
        bindProp('prop-rot', (obj, v) => obj.rotation.y = v);
        bindProp('prop-scale', (obj, v) => obj.scale.set(v, v, v));
        bindProp('prop-color', (obj, v) => { if (obj.isMesh) obj.material.color.set(v); else if (obj.isLight) obj.color.set(v); });
        bindProp('prop-physics', (obj, v) => { if(obj.userData.physics) obj.userData.physics.enabled = v; });
        bindProp('prop-bounce', (obj, v) => { if(obj.userData.physics) obj.userData.physics.bounce = v; });
        bindProp('prop-material', (obj, v) => {
            if (obj.isMesh && obj.userData.type !== 'character') {
                obj.material.dispose();
                obj.material = this.engine.makeMaterial(v);
                obj.userData.material = v;
            }
        });
    }

    updateUIValues() {
        const obj = this.engine.selected;
        if (!obj) return;
        document.getElementById('prop-x').value = obj.position.x.toFixed(2);
        document.getElementById('prop-y').value = obj.position.y.toFixed(2);
        document.getElementById('prop-z').value = obj.position.z.toFixed(2);
        document.getElementById('prop-rot').value = obj.rotation.y;
        document.getElementById('prop-scale').value = obj.scale.x;
        if (obj.isMesh && obj.material) document.getElementById('prop-color').value = '#' + obj.material.color.getHexString();
        else if (obj.isLight) document.getElementById('prop-color').value = '#' + obj.color.getHexString();
    }

    updateInspector(obj) {
        if (!obj) {
            this.inspector.style.display = 'none';
            this.gizmo.detach();
            return;
        }
        this.inspector.style.display = 'block';
        this.gizmo.attach(obj);
        this.updateUIValues();
        if (obj.userData.physics) {
            document.getElementById('prop-physics').checked = obj.userData.physics.enabled;
            document.getElementById('prop-bounce').value = obj.userData.physics.bounce;
        }
    }

    updateList() {
        const list = document.getElementById('object-list');
        list.innerHTML = '';
        this.engine.objects.forEach(obj => {
            const div = document.createElement('div');
            div.style.padding = '4px';
            div.style.cursor = 'pointer';
            div.style.borderBottom = '1px solid #222';
            div.innerText = obj.userData.id + ' - ' + obj.userData.type;
            div.onclick = () => this.engine.selectObject(obj);
            list.appendChild(div);
        });
    }
}
