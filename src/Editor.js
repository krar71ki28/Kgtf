import * as THREE from 'three';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { BEHAVIORS } from './Engine.js';

export class Editor {
    constructor(engine) {
        this.engine = engine;
        this.inspector = document.getElementById('inspector');
        this.bottomPanel = document.getElementById('bottom-panel');
        this.inspectorHeader = document.getElementById('inspector-header');
        this.raycaster = new THREE.Raycaster();
        this.pointerDown = { x: 0, y: 0 };
        this.isDraggingGizmo = false;

        this.gizmo = new TransformControls(this.engine.camera, this.engine.renderer.domElement);
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
        this.populateBehaviorSelect();
        
        engine.onSelect = (obj) => this.updateInspector(obj);
        engine.onSceneChange = () => this.updateList();
        
        engine.onScoreChanged = (score) => {
            const scoreVal = document.getElementById('score-val');
            if(scoreVal) scoreVal.innerText = score;
        };

        // سحب اللوحة السفلية
        const dragHandle = document.querySelector('.drag-handle');
        dragHandle.addEventListener('click', () => {
            this.bottomPanel.classList.toggle('closed');
        });

        this.updateList();
        if (this.engine.selected) this.updateInspector(this.engine.selected);
    }

    populateBehaviorSelect() {
        const select = document.getElementById('add-behavior-select');
        select.innerHTML = '<option value="">-- اختر سلوك --</option>';
        for (const key in BEHAVIORS) {
            const option = document.createElement('option');
            option.value = key;
            option.textContent = BEHAVIORS[key].name;
            select.appendChild(option);
        }
    }

    setupRaycaster() {
        const canvas = this.engine.renderer.domElement;
        canvas.addEventListener('pointerdown', (e) => { this.pointerDown = { x: e.clientX, y: e.clientY }; });

        canvas.addEventListener('pointerup', (e) => {
            if (document.body.classList.contains('play-mode') || this.isDraggingGizmo) return;
            if (Math.hypot(e.clientX - this.pointerDown.x, e.clientY - this.pointerDown.y) > 5) return;

            const rect = canvas.getBoundingClientRect();
            const mouse = new THREE.Vector2(
                ((e.clientX - rect.left) / rect.width) * 2 - 1,
                -((e.clientY - rect.top) / rect.height) * 2 + 1
            );

            this.raycaster.setFromCamera(mouse, this.engine.camera);
            const hits = this.raycaster.intersectObjects(this.engine.objects, true);
            
            if (hits.length > 0) {
                let root = hits[0].object;
                while (root && root.parent !== this.engine.scene) root = root.parent;
                if (root) {
                    this.engine.selectObject(root);
                    this.bottomPanel.classList.remove('closed'); // فتح اللوحة عند التحديد
                    return;
                }
            }
            this.engine.selectObject(null);
        });
    }

    bindButtons() {
        document.getElementById('btn-cube').onclick = () => this.engine.addObject('cube');
        document.getElementById('btn-sphere').onclick = () => this.engine.addObject('sphere');
        document.getElementById('btn-cylinder').onclick = () => this.engine.addObject('cylinder');
        document.getElementById('btn-cone').onclick = () => this.engine.addObject('cone');
        document.getElementById('btn-torus').onclick = () => this.engine.addObject('torus');
        document.getElementById('btn-tree').onclick = () => this.engine.addObject('tree');
        document.getElementById('btn-rock').onclick = () => this.engine.addObject('rock');
        document.getElementById('btn-building').onclick = () => this.engine.addObject('building');
        document.getElementById('btn-light').onclick = () => this.engine.addObject('light');
        document.getElementById('btn-character').onclick = () => this.engine.loadCharacter();
        
        document.getElementById('btn-gizmo-translate').onclick = () => { this.gizmo.setMode('translate'); this.setActiveTool('btn-gizmo-translate'); };
        document.getElementById('btn-gizmo-rotate').onclick = () => { this.gizmo.setMode('rotate'); this.setActiveTool('btn-gizmo-rotate'); };
        document.getElementById('btn-gizmo-scale').onclick = () => { this.gizmo.setMode('scale'); this.setActiveTool('btn-gizmo-scale'); };

        document.getElementById('btn-toggle-panel').onclick = () => this.bottomPanel.classList.toggle('closed');

        document.getElementById('btn-duplicate').onclick = () => {
            const newObj = this.engine.duplicateObject();
            if (newObj) this.engine.selectObject(newObj);
        };
        document.getElementById('btn-delete').onclick = () => this.engine.deleteSelected();
        document.getElementById('btn-save').onclick = () => this.engine.saveScene();
        document.getElementById('btn-export').onclick = () => this.engine.exportScene();
        document.getElementById('btn-import').onclick = () => document.getElementById('file-import').click();
        
        document.getElementById('file-import').onchange = (e) => {
            if (e.target.files.length > 0) {
                this.engine.importScene(e.target.files[0]);
                e.target.value = ''; 
            }
        };
        
        document.getElementById('btn-clear-scene').onclick = () => {
            if (confirm('هل أنت متأكد من مسح المشهد بالكامل؟')) this.engine.clearScene();
        };
        
        document.getElementById('prop-snap').addEventListener('change', (e) => {
            if (e.target.checked) {
                this.gizmo.translationSnap = 0.5;
                this.gizmo.rotationSnap = Math.PI / 12;
            } else {
                this.gizmo.translationSnap = null;
                this.gizmo.rotationSnap = null;
            }
        });

        document.getElementById('btn-add-behavior').onclick = () => {
            if (!this.engine.selected) return;
            const select = document.getElementById('add-behavior-select');
            const bName = select.value;
            if (!bName) return;

            if (!this.engine.selected.userData.behaviors) this.engine.selected.userData.behaviors = {};
            if (!this.engine.selected.userData.behaviorStates) this.engine.selected.userData.behaviorStates = {};
            
            if (!this.engine.selected.userData.behaviors[bName]) {
                this.engine.selected.userData.behaviors[bName] = { ...BEHAVIORS[bName].defaultParams };
                this.renderBehaviorsUI();
            }
            select.value = '';
        };

        document.getElementById('btn-upload-texture').onclick = () => document.getElementById('texture-input').click();
        document.getElementById('texture-input').onchange = (e) => {
            if (!this.engine.selected || !this.engine.selected.isMesh) return;
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const textureLoader = new THREE.TextureLoader();
                textureLoader.load(event.target.result, (texture) => {
                    texture.colorSpace = THREE.SRGBColorSpace;
                    this.engine.selected.material.map = texture;
                    this.engine.selected.material.needsUpdate = true;
                });
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        };
    }

    setActiveTool(id) {
        document.querySelectorAll('#right-toolbar .tool-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(id).classList.add('active');
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
        bindProp('prop-light-intensity', (obj, v) => { if(obj.isLight) obj.intensity = v; });
        bindProp('prop-light-distance', (obj, v) => { if(obj.isLight) obj.distance = v; });

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
        else if (obj.isLight) {
            document.getElementById('prop-color').value = '#' + obj.color.getHexString();
            document.getElementById('prop-light-intensity').value = obj.intensity;
            document.getElementById('prop-light-distance').value = obj.distance;
        }
    }

    renderBehaviorsUI() {
        const container = document.getElementById('active-behaviors-list');
        container.innerHTML = '';
        if (!this.engine.selected) return;

        const behaviors = this.engine.selected.userData.behaviors || {};

        for (const bName in behaviors) {
            const behaviorDef = BEHAVIORS[bName];
            if (!behaviorDef) continue;
            
            const currentParams = behaviors[bName];

            const card = document.createElement('div');
            card.style.background = '#25252b';
            card.style.padding = '6px';
            card.style.borderRadius = '4px';
            card.style.border = '1px solid #3c3c45';

            const header = document.createElement('div');
            header.style.display = 'flex';
            header.style.justifyContent = 'space-between';
            header.style.alignItems = 'center';
            header.style.marginBottom = '4px';

            const title = document.createElement('span');
            title.style.fontWeight = 'bold';
            title.style.color = '#60a5fa';
            title.style.fontSize = '11px';
            title.textContent = behaviorDef.name;

            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '✕';
            deleteBtn.style.background = 'transparent';
            deleteBtn.style.border = 'none';
            deleteBtn.style.color = '#ef4444';
            deleteBtn.style.cursor = 'pointer';
            deleteBtn.addEventListener('click', () => {
                delete this.engine.selected.userData.behaviors[bName];
                if (this.engine.selected.userData.behaviorStates) {
                    delete this.engine.selected.userData.behaviorStates[bName];
                }
                this.renderBehaviorsUI();
            });

            header.appendChild(title);
            header.appendChild(deleteBtn);
            card.appendChild(header);

            for (const paramKey in behaviorDef.defaultParams) {
                const row = document.createElement('div');
                row.style.display = 'flex';
                row.style.justifyContent = 'space-between';
                row.style.alignItems = 'center';
                row.style.marginTop = '2px';

                const paramLabel = document.createElement('label');
                paramLabel.style.fontSize = '10px';
                paramLabel.style.color = '#bbb';
                paramLabel.textContent = paramKey + ':';

                const input = document.createElement('input');
                input.type = typeof behaviorDef.defaultParams[paramKey] === 'number' ? 'number' : 'text';
                input.value = currentParams[paramKey] !== undefined ? currentParams[paramKey] : behaviorDef.defaultParams[paramKey];
                input.style.width = '60px';
                input.style.padding = '2px 4px';
                input.style.background = '#18181b';
                input.style.border = '1px solid #444';
                input.style.borderRadius = '3px';
                input.style.color = '#fff';
                input.style.fontSize = '10px';

                input.addEventListener('input', (e) => {
                    const val = input.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
                    currentParams[paramKey] = val;
                    if (this.engine.selected.userData.behaviorStates) {
                        delete this.engine.selected.userData.behaviorStates[bName];
                    }
                });

                row.appendChild(paramLabel);
                row.appendChild(input);
                card.appendChild(row);
            }
            container.appendChild(card);
        }
    }

    updateInspector(obj) {
        if (!obj) {
            this.inspector.style.display = 'none';
            this.inspectorHeader.style.display = 'none';
            this.gizmo.detach();
            return;
        }
        this.inspector.style.display = 'block';
        this.inspectorHeader.style.display = 'flex';
        this.gizmo.attach(obj);
        this.updateUIValues();
        this.renderBehaviorsUI();
        
        const lightProps = document.getElementById('light-properties');
        if (obj.isLight) {
            lightProps.style.display = 'block';
            document.getElementById('prop-light-intensity').value = obj.intensity;
            document.getElementById('prop-light-distance').value = obj.distance;
        } else {
            lightProps.style.display = 'none';
        }

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
            div.style.padding = '4px 8px';
            div.style.cursor = 'pointer';
            div.style.background = '#1e1e30';
            div.style.borderRadius = '4px';
            div.style.fontSize = '10px';
            div.style.border = '1px solid transparent';
            div.innerText = obj.userData.type;
            div.onclick = () => {
                this.engine.selectObject(obj);
                this.bottomPanel.classList.remove('closed');
            };
            list.appendChild(div);
        });
    }
}
