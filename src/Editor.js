export class Editor {
    constructor(engine) {
        this.engine = engine;
        this.setupUI();
        
        engine.onSelectCallback = (obj) => this.updateInspector(obj);
        engine.onSceneChangeCallback = () => this.updateOutliner();
        
        this.updateOutliner();
    }

    setupUI() {
        const btnAdd = document.getElementById('btn-add-menu');
        const addMenu = document.getElementById('add-menu');
        btnAdd.onclick = (e) => { e.stopPropagation(); addMenu.classList.toggle('show'); };
        document.addEventListener('click', () => addMenu.classList.remove('show'));

        document.querySelectorAll('.add-btn').forEach(btn => {
            btn.onclick = () => {
                this.engine.createObject(btn.dataset.type);
                addMenu.classList.remove('show');
            };
        });

        document.getElementById('btn-clear-scene').onclick = () => this.engine.clearScene();
        document.getElementById('btn-save').onclick = () => this.engine.saveScene();

        const bindProp = (id, cb) => {
            document.getElementById(id).addEventListener('input', (e) => {
                if (this.engine.selectedObj) cb(this.engine.selectedObj, parseFloat(e.target.value) || e.target.value);
            });
        };
        bindProp('prop-x', (o, v) => { 
            o.position.x = v; 
            if (o.userData.body) { o.userData.body.position.x = v; o.userData.body.velocity.set(0,0,0); } 
        });
        bindProp('prop-z', (o, v) => { 
            o.position.z = v; 
            if (o.userData.body) { o.userData.body.position.z = v; o.userData.body.velocity.set(0,0,0); } 
        });
        
        document.getElementById('prop-color').addEventListener('input', (e) => {
            if (this.engine.selectedObj) this.engine.selectedObj.material.color.set(e.target.value);
        });

        document.getElementById('prop-physics').addEventListener('change', (e) => {
            if (this.engine.selectedObj && this.engine.selectedObj.userData.body) {
                this.engine.selectedObj.userData.physicsEnabled = e.target.checked;
                this.engine.selectedObj.userData.body.mass = e.target.checked ? 1 : 0;
                this.engine.selectedObj.userData.body.updateMassProperties();
            }
        });

        // ✅ ربط زر المطر
        document.getElementById('env-rain').addEventListener('change', (e) => {
            this.engine.environment.toggleRain(e.target.checked);
        });

        const animSelect = document.getElementById('anim-select');
        if (animSelect) {
            animSelect.onchange = (e) => {
                if (this.engine.selectedObj && this.engine.selectedObj.userData.animator) {
                    this.engine.selectedObj.userData.animator.play(e.target.value, 0.1);
                }
            };
        }

        document.getElementById('btn-add-logic').onclick = () => {
            if (!this.engine.selectedObj) return;
            const ev = document.getElementById('logic-event').value;
            const ac = document.getElementById('logic-action').value;
            
            if (!this.engine.selectedObj.userData.logic) this.engine.selectedObj.userData.logic = [];
            this.engine.selectedObj.userData.logic.push({ event: ev, action: ac });
            this.updateLogicList();
        };
    }

    updateOutliner() {
        const list = document.getElementById('object-list');
        list.innerHTML = '';
        this.engine.objects.forEach(o => {
            const div = document.createElement('div');
            div.className = 'obj-item' + (o === this.engine.selectedObj ? ' selected' : '');
            div.innerText = o.userData.type;
            div.onclick = () => this.engine.selectObject(o);
            list.appendChild(div);
        });
    }

    updateLogicList() {
        const list = document.getElementById('logic-list');
        list.innerHTML = '';
        if (!this.engine.selectedObj || !this.engine.selectedObj.userData.logic) return;
        
        this.engine.selectedObj.userData.logic.forEach((l, i) => {
            const div = document.createElement('div');
            div.style.cssText = 'background:#2a2a35; padding:5px; margin-bottom:5px; border-radius:3px; display:flex; justify-content:space-between;';
            div.innerHTML = `<span>${l.event} ➔ ${l.action}</span> <button style="background:red; color:white; border:none; border-radius:3px;">X</button>`;
            div.querySelector('button').onclick = () => {
                this.engine.selectedObj.userData.logic.splice(i, 1);
                this.updateLogicList();
            };
            list.appendChild(div);
        });
    }

    updateInspector(obj) {
        const insp = document.getElementById('inspector');
        const animContainer = document.getElementById('anim-container');
        const logicSection = document.getElementById('logic-section');
        const animSelect = document.getElementById('anim-select');
        
        if (!obj) { insp.style.display = 'none'; return; }
        insp.style.display = 'block';
        
        document.getElementById('prop-x').value = obj.position.x;
        document.getElementById('prop-z').value = obj.position.z;
        document.getElementById('prop-physics').checked = obj.userData.physicsEnabled || false;
        
        if(obj.material && obj.material.color) {
            document.getElementById('prop-color').value = '#' + obj.material.color.getHexString();
        }

        if (obj.userData.animationNames && obj.userData.animationNames.length > 0) {
            animContainer.style.display = 'flex';
            animSelect.innerHTML = '';
            obj.userData.animationNames.forEach(name => {
                const opt = document.createElement('option');
                opt.value = name;
                opt.innerText = name;
                animSelect.appendChild(opt);
            });
        } else {
            animContainer.style.display = 'none';
        }

        logicSection.style.display = 'block';
        this.updateLogicList();
    }
}
