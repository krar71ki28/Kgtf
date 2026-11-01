export class Editor {
    constructor(engine) {
        this.engine = engine;
        this.setupUI();
        
        engine.onSelectCallback = (obj) => this.updateInspector(obj);
        engine.onSceneChangeCallback = () => this.updateOutliner();
        
        this.updateOutliner();
    }

    setupUI() {
        // قائمة الإضافة
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

        // مسح الكل
        document.getElementById('btn-clear-scene').onclick = () => this.engine.clearScene();

        // الخصائص
        const bindProp = (id, cb) => {
            document.getElementById(id).addEventListener('input', (e) => {
                if (this.engine.selectedObj) cb(this.engine.selectedObj, parseFloat(e.target.value) || e.target.value);
            });
        };
        bindProp('prop-x', (o, v) => o.position.x = v);
        bindProp('prop-z', (o, v) => o.position.z = v);
        document.getElementById('prop-color').addEventListener('input', (e) => {
            if (this.engine.selectedObj) this.engine.selectedObj.material.color.set(e.target.value);
        });
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

    updateInspector(obj) {
        const insp = document.getElementById('inspector');
        if (!obj) { insp.style.display = 'none'; return; }
        insp.style.display = 'block';
        
        document.getElementById('prop-x').value = obj.position.x;
        document.getElementById('prop-z').value = obj.position.z;
        if(obj.material && obj.material.color) {
            document.getElementById('prop-color').value = '#' + obj.material.color.getHexString();
        }
    }
}
