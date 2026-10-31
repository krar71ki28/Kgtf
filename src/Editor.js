import * as THREE from 'three';

export class Editor {
    constructor(engine) {
        this.engine = engine;
        
        try {
            this.setupTabs();
            this.setupUI();
            this.setupRaycaster();
            
            engine.onSelectCallback = (obj) => this.updateInspector(obj);
            engine.onSceneChangeCallback = () => this.updateOutliner();
            
            const raw = localStorage.getItem('kgtf_scene_modular');
            if (raw) {
                try {
                    JSON.parse(raw).forEach(d => {
                        const obj = engine.createObject(d.type);
                        if(obj) {
                            if(d.pos) obj.position.fromArray(d.pos);
                            if(d.materialType) {
                                obj.traverse(c => { if(c.isMesh) c.material = engine.getMaterial(d.materialType, d.color || 0x00e5ff); });
                            } else if(d.color) {
                                obj.traverse(c => { if(c.isMesh && c.material && c.material.color) c.material.color.set(d.color); });
                            }
                            if(d.logic) obj.userData.logic = d.logic;
                        }
                    });
                    engine.selectObject(null);
                } catch(e) { console.warn("Local storage error"); }
            }
            if(engine.objects.length === 0) engine.createObject('cube');
            
            this.renderAssetGrid();
        } catch(e) {
            console.error("Editor Init Error:", e);
        }
    }

    setupTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                const target = document.getElementById(btn.dataset.target);
                if(target) target.classList.add('active');
                if(btn.dataset.target === 'tab-assets') this.renderAssetGrid();
            });
        });
    }

    setupUI() {
        const addMenu = document.getElementById('add-menu');
        const btnAddMenu = document.getElementById('btn-add-menu');
        
        if(btnAddMenu && addMenu) {
            btnAddMenu.addEventListener('click', (e) => {
                e.preventDefault(); e.stopPropagation();
                addMenu.classList.toggle('show');
            });
            document.addEventListener('click', (e) => {
                if (addMenu.classList.contains('show') && !addMenu.contains(e.target) && e.target !== btnAddMenu) {
                    addMenu.classList.remove('show');
                }
            });
        }

        document.querySelectorAll('.add-btn').forEach(btn => {
            btn.addEventListener('click', (e) => { 
                e.preventDefault();
                this.engine.createObject(btn.dataset.type); 
                addMenu?.classList.remove('show'); 
            });
        });

        const btnUploadGlb = document.getElementById('btn-upload-glb');
        const fileUploadGlb = document.getElementById('file-upload-glb');
        if (btnUploadGlb && fileUploadGlb) {
            btnUploadGlb.addEventListener('click', () => fileUploadGlb.click());
            fileUploadGlb.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) this.engine.loadGLB(file);
                e.target.value = '';
            });
        }

        const btnClear = document.getElementById('btn-clear-scene');
        if(btnClear) btnClear.addEventListener('click', () => this.engine.clearScene());
        
        const btnDuplicate = document.getElementById('btn-duplicate');
        if(btnDuplicate) btnDuplicate.addEventListener('click', () => {
            if (this.engine.selectedObj) this.engine.duplicateObject(this.engine.selectedObj);
        });

        const btnDeleteObj = document.getElementById('btn-delete-obj');
        if(btnDeleteObj) btnDeleteObj.addEventListener('click', () => {
            if (this.engine.selectedObj) this.engine.removeObject(this.engine.selectedObj);
        });

        const btnSnap = document.getElementById('btn-snap-toggle');
        if(btnSnap) btnSnap.addEventListener('click', () => {
            this.engine.isSnapping = !this.engine.isSnapping;
            btnSnap.classList.toggle('active', this.engine.isSnapping);
            btnSnap.style.color = this.engine.isSnapping ? '#00e5ff' : '#ffaa00';
        });

        const gT = document.getElementById('btn-gizmo-translate');
        if(gT) gT.addEventListener('click', () => this.engine.transform.setMode('translate'));
        const gR = document.getElementById('btn-gizmo-rotate');
        if(gR) gR.addEventListener('click', () => this.engine.transform.setMode('rotate'));
        const gS = document.getElementById('btn-gizmo-scale');
        if(gS) gS.addEventListener('click', () => this.engine.transform.setMode('scale'));

        // ربط شريط وقت اليوم
        const timeSlider = document.getElementById('env-time-of-day');
        if(timeSlider) {
            timeSlider.addEventListener('input', (e) => {
                this.engine.updateSun(parseFloat(e.target.value));
            });
        }

        const rainEl = document.getElementById('env-rain-toggle');
        if(rainEl) rainEl.addEventListener('change', (e) => this.engine.toggleRain(e.target.checked));

        const nightEl = document.getElementById('env-night-mode');
        if(nightEl) nightEl.addEventListener('change', (e) => this.engine.toggleNightMode(e.target.checked));

        const btnAddText = document.getElementById('btn-add-text');
        if(btnAddText) btnAddText.addEventListener('click', () => {
            const textInput = document.getElementById('ui-text-input');
            if(textInput) {
                this.engine.ui.addText(textInput.value);
                textInput.value = '';
            }
        });
        const btnClearUi = document.getElementById('btn-clear-ui');
        if(btnClearUi) btnClearUi.addEventListener('click', () => this.engine.ui.clearUI());

        const btnAddLogic = document.getElementById('btn-add-logic');
        if(btnAddLogic) btnAddLogic.addEventListener('click', () => {
            if (!this.engine.selectedObj) return;
            const ev = document.getElementById('logic-event').value;
            const ac = document.getElementById('logic-action').value;
            
            if (!this.engine.selectedObj.userData.logic) this.engine.selectedObj.userData.logic = [];
            this.engine.selectedObj.userData.logic.push({ event: ev, action: ac });
            this.renderLogicList();
        });

        const btnSave = document.getElementById('btn-save');
        if(btnSave) btnSave.addEventListener('click', () => {
            const data = this.engine.objects.map(o => {
                let color = 0x00e5ff;
                let matType = 'default';
                o.traverse(c => { 
                    if(c.isMesh && c.material) {
                        if(c.material.color) color = c.material.color.getHex();
                        if(c.material.metalness === 0.9) matType = 'metal';
                        else if(c.material.roughness === 0.9) matType = 'wood';
                        else if(c.material.opacity === 0.4) matType = 'glass';
                        else if(c.material.metalness === 1.0) matType = 'gold';
                        else if(c.material.roughness === 1.0) matType = 'rubber';
                    }
                });
                return { type: o.userData.type, pos: o.position.toArray(), color: color, materialType: matType, logic: o.userData.logic };
            });
            localStorage.setItem('kgtf_scene_modular', JSON.stringify(data));
            alert('تم الحفظ المحلي!');
        });

        const btnExport = document.getElementById('btn-export');
        if(btnExport) btnExport.addEventListener('click', () => this.engine.assetManager.exportScene());
        
        const fileImport = document.getElementById('file-import');
        const btnImport = document.getElementById('btn-import');
        if(btnImport && fileImport) {
            btnImport.addEventListener('click', () => fileImport.click());
            fileImport.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => {
                    if (this.engine.assetManager.importScene(ev.target.result)) alert('تم الاستيراد بنجاح!');
                    else alert('ملف غير صالح!');
                    this.renderAssetGrid();
                };
                reader.readAsText(file);
                e.target.value = '';
            });
        }

        const btnSaveAsset = document.getElementById('btn-save-asset');
        if(btnSaveAsset) {
            btnSaveAsset.addEventListener('click', () => {
                if(!this.engine.selectedObj) return;
                if(this.engine.assetManager.savePrefab(this.engine.selectedObj)) {
                    alert('تم حفظ الأصل في المكتبة!');
                    this.renderAssetGrid();
                }
            });
        }

        const bindProp = (id, cb) => {
            const el = document.getElementById(id);
            if(el) el.addEventListener('input', (e) => {
                if (this.engine.selectedObj) cb(this.engine.selectedObj, parseFloat(e.target.value));
            });
        };
        bindProp('prop-x', (o, v) => o.position.x = v);
        bindProp('prop-y', (o, v) => o.position.y = v);
        bindProp('prop-z', (o, v) => o.position.z = v);
        
        const colorEl = document.getElementById('prop-color');
        if(colorEl) colorEl.addEventListener('input', (e) => {
            if(this.engine.selectedObj) this.engine.selectedObj.traverse(c => { if(c.isMesh && c.material && c.material.color) c.material.color.set(e.target.value); });
        });

        const matEl = document.getElementById('prop-material');
        if(matEl) matEl.addEventListener('input', (e) => {
            if(this.engine.selectedObj) {
                const matType = e.target.value;
                this.engine.selectedObj.traverse(c => { 
                    if(c.isMesh) {
                        let currentColor = 0x00e5ff;
                        if(c.material && c.material.color) currentColor = c.material.color.getHex();
                        if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
                        else c.material.dispose();
                        c.material = this.engine.getMaterial(matType, currentColor);
                    }
                });
            }
        });

        const physEl = document.getElementById('prop-physics');
        if(physEl) physEl.addEventListener('change', (e) => {
            if(this.engine.selectedObj && this.engine.selectedObj.userData.physics) {
                this.engine.selectedObj.userData.physics.enabled = e.target.checked;
            }
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
                let root = hits[0].object; 
                while (root && root.parent && root.parent !== this.engine.scene) root = root.parent; 
                if (root && root.parent === this.engine.scene) {
                    this.engine.selectObject(root);
                } else {
                    this.engine.selectObject(null);
                }
            } else { this.engine.selectObject(null); }
        });
    }

    renderAssetGrid() {
        const grid = document.getElementById('asset-grid');
        if(!grid) return;
        grid.innerHTML = '';
        
        const prefabs = this.engine.assetManager.getPrefabs();
        if(prefabs.length === 0) {
            grid.innerHTML = '<div style="grid-column: span 3; text-align:center; color:#666; font-size:12px; margin-top:20px;">لا توجد أصول محفوظة بعد.</div>';
            return;
        }

        prefabs.forEach(p => {
            const card = document.createElement('div');
            card.className = 'asset-card';
            card.innerHTML = `
                <button class="asset-delete" data-id="${p.id}">✕</button>
                <div class="asset-icon" style="color:${p.color}">📦</div>
                <div class="asset-name">${p.type}</div>
            `;
            
            card.addEventListener('click', (e) => {
                if(e.target.classList.contains('asset-delete')) return;
                const obj = this.engine.createObject(p.type);
                if (obj) {
                    obj.traverse(c => { if(c.isMesh && c.material && c.material.color) c.material.color.set(p.color); });
                    if (p.logic) obj.userData.logic = JSON.parse(JSON.stringify(p.logic));
                }
            });

            const delBtn = card.querySelector('.asset-delete');
            if(delBtn) {
                delBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.engine.assetManager.deletePrefab(p.id);
                    this.renderAssetGrid();
                });
            }

            grid.appendChild(card);
        });
    }

    updateOutliner() {
        const list = document.getElementById('object-list'); 
        if(!list) return;
        list.innerHTML = '';
        this.engine.objects.forEach(o => {
            const div = document.createElement('div');
            div.className = 'obj-item' + (o === this.engine.selectedObj ? ' selected' : '');
            div.innerText = o.userData.type;
            div.addEventListener('click', () => this.engine.selectObject(o));
            list.appendChild(div);
        });
    }

    renderLogicList() {
        const list = document.getElementById('active-logic-list');
        if(!list) return;
        list.innerHTML = '';
        if (!this.engine.selectedObj || !this.engine.selectedObj.userData.logic) return;
        
        this.engine.selectedObj.userData.logic.forEach((l, index) => {
            const div = document.createElement('div');
            div.className = 'logic-item';
            div.innerHTML = `<span>${l.event} ➔ ${l.action}</span> <button data-index="${index}">✕</button>`;
            const btn = div.querySelector('button');
            if(btn) {
                btn.onclick = () => {
                    this.engine.selectedObj.userData.logic.splice(index, 1);
                    this.renderLogicList();
                };
            }
            list.appendChild(div);
        });
    }

    updateInspector(obj) {
        const insp = document.getElementById('inspector');
        const msg = document.getElementById('no-selection-msg');
        const logicEditor = document.getElementById('logic-editor');
        const noLogicMsg = document.getElementById('no-logic-selection');
        const actionsDiv = document.getElementById('object-actions');

        if (!obj) { 
            if(insp) insp.style.display = 'none'; 
            if(msg) msg.style.display = 'block'; 
            if(logicEditor) logicEditor.style.display = 'none'; 
            if(noLogicMsg) noLogicMsg.style.display = 'block';
            if(actionsDiv) actionsDiv.style.display = 'none';
            return; 
        }
        
        if(insp) insp.style.display = 'block'; 
        if(msg) msg.style.display = 'none';
        if(logicEditor) logicEditor.style.display = 'block'; 
        if(noLogicMsg) noLogicMsg.style.display = 'none';
        if(actionsDiv) actionsDiv.style.display = 'flex';
        
        const px = document.getElementById('prop-x');
        const py = document.getElementById('prop-y');
        const pz = document.getElementById('prop-z');
        if(px) px.value = obj.position.x;
        if(py) py.value = obj.position.y;
        if(pz) pz.value = obj.position.z;
        
        let color = '#00e5ff';
        obj.traverse(c => { if(c.isMesh && c.material && c.material.color) color = '#' + c.material.color.getHexString(); });
        const pc = document.getElementById('prop-color');
        if(pc) pc.value = color;

        const matEl = document.getElementById('prop-material');
        if(matEl) {
            let matType = 'default';
            obj.traverse(c => {
                if(c.isMesh && c.material) {
                    if(c.material.metalness === 0.9) matType = 'metal';
                    else if(c.material.roughness === 0.9) matType = 'wood';
                    else if(c.material.opacity === 0.4) matType = 'glass';
                    else if(c.material.metalness === 1.0) matType = 'gold';
                    else if(c.material.roughness === 1.0) matType = 'rubber';
                }
            });
            matEl.value = matType;
        }

        const phys = document.getElementById('prop-physics');
        if(obj.userData.physics && phys) {
            phys.checked = obj.userData.physics.enabled;
        }
        this.renderLogicList();
    }
}
