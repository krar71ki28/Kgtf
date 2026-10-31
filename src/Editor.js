import * as THREE from 'three';

export class Editor {
    constructor(engine) {
        this.engine = engine;
        this.setupUI();
        
        this.engine.onSelect = (obj) => this.updateInspector(obj);
        this.engine.onSceneChange = () => this.updateList();
        this.updateList();
    }

    setupUI() {
        // التبويبات
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById(btn.dataset.target).classList.add('active');
            };
        });

        // فتح/إغلاق القائمة المنسدلة
        const addMenu = document.getElementById('add-menu');
        const addBtn = document.getElementById('btn-add-menu');
        if (addBtn && addMenu) {
            addBtn.onclick = (e) => { 
                e.stopPropagation(); 
                addMenu.classList.toggle('show'); 
            };
            document.body.onclick = (e) => { 
                if (!addMenu.contains(e.target) && e.target !== addBtn) {
                    addMenu.classList.remove('show'); 
                }
            };
        }

        // ربط أزرار الإضافة
        const types = ['cube','sphere','tree','camera','character','light'];
        types.forEach(t => {
            const el = document.getElementById(`btn-${t}`);
            if(el) el.onclick = () => {
                this.engine.addObject(t);
                addMenu.classList.remove('show');
            };
        });

        // باقي الأزرار
        const gridBtn = document.getElementById('btn-toggle-grid');
        if(gridBtn) gridBtn.onclick = () => this.engine.toggleGrid(gridBtn.classList.toggle('active'));
        
        const clearBtn = document.getElementById('btn-clear-scene');
        if(clearBtn) clearBtn.onclick = () => { 
            if(confirm('مسح الكل؟')) { 
                this.engine.objects.forEach(o=>this.engine.scene.remove(o)); 
                this.engine.objects = []; 
                this.updateList(); 
            } 
        };
    }

    updateList() {
        const list = document.getElementById('object-list');
        if(!list) return;
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
            if(inspector) inspector.style.display = 'none'; 
            if(noMsg) noMsg.style.display = 'block'; 
            return; 
        }
        if(inspector) inspector.style.display = 'block'; 
        if(noMsg) noMsg.style.display = 'none'; 
    }
}
