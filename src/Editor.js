export class Editor {
    constructor(engine) {
        this.engine = engine;
        this.inspector = document.getElementById('inspector');
        this.bindButtons();
        this.bindInspector();
        engine.onSelect = (obj) => this.updateInspector(obj);
        engine.onSceneChange = () => this.updateList();
        this.updateList();
    }

    bindButtons() {
        document.getElementById('btn-cube').onclick = () => this.engine.addObject('cube');
        document.getElementById('btn-sphere').onclick = () => this.engine.addObject('sphere');
        document.getElementById('btn-cylinder').onclick = () => this.engine.addObject('cylinder');
        document.getElementById('btn-light').onclick = () => this.engine.addObject('light');
        document.getElementById('btn-character').onclick = () => this.engine.loadCharacter();
        document.getElementById('btn-save').onclick = () => this.engine.saveScene();
        document.getElementById('btn-delete').onclick = () => this.engine.deleteSelected();
    }

    bindInspector() {
        document.getElementById('prop-material').onchange = (e) => {
            if (this.engine.selected && this.engine.selected.isMesh) {
                const oldColor = this.engine.selected.material.color.getHex();
                this.engine.selected.material.dispose();
                this.engine.selected.material = this.engine.makeMaterial(e.target.value, oldColor);
                this.engine.selected.userData.material = e.target.value;
                document.getElementById('prop-color').value = '#' + oldColor.toString(16).padStart(6, '0');
            }
        };
        document.getElementById('prop-color').oninput = (e) => {
            const s = this.engine.selected; if (!s) return;
            if (s.isMesh) s.material.color.set(e.target.value); else if (s.isLight) s.color.set(e.target.value);
        };
        ['x','y','z','rot','scale'].forEach(prop => {
            document.getElementById('prop-' + prop).oninput = (e) => {
                const s = this.engine.selected; if (!s) return;
                const val = parseFloat(e.target.value);
                if (prop === 'x') s.position.x = val;
                if (prop === 'y') { s.position.y = val; if (s.userData.physics) s.userData.physics.vy = 0; }
                if (prop === 'z') s.position.z = val;
                if (prop === 'rot') s.rotation.y = val;
                if (prop === 'scale') s.scale.setScalar(val);
            };
        });
        document.getElementById('prop-physics').onchange = (e) => {
            const s = this.engine.selected; if (s && s.userData.physics) { s.userData.physics.enabled = e.target.checked; s.userData.physics.vy = 0; }
        };
        document.getElementById('prop-bounce').oninput = (e) => {
            const s = this.engine.selected; if (s && s.userData.physics) s.userData.physics.bounce = parseFloat(e.target.value);
        };
    }

    updateInspector(obj) {
        if (!obj) { this.inspector.style.display = 'none'; return; }
        this.inspector.style.display = 'block';
        const isMesh = obj.isMesh;
        document.getElementById('prop-physics').disabled = !isMesh;
        document.getElementById('prop-bounce').disabled = !isMesh;
        if (isMesh) {
            document.getElementById('prop-color').value = '#' + obj.material.color.getHexString();
            document.getElementById('prop-material').value = obj.userData.material || 'default';
            document.getElementById('prop-physics').checked = obj.userData.physics.enabled;
            document.getElementById('prop-bounce').value = obj.userData.physics.bounce;
        } else {
            document.getElementById('prop-physics').checked = false;
            if (obj.isLight) document.getElementById('prop-color').value = '#' + obj.color.getHexString();
        }
        document.getElementById('prop-x').value = obj.position.x;
        document.getElementById('prop-y').value = obj.position.y;
        document.getElementById('prop-z').value = obj.position.z;
        document.getElementById('prop-rot').value = obj.rotation.y;
        document.getElementById('prop-scale').value = obj.scale.x;
    }

    updateList() {
        const list = document.getElementById('object-list');
        list.innerHTML = '';
        this.engine.objects.forEach(o => {
            const div = document.createElement('div');
            div.innerText = o.userData.type + ' — ' + o.userData.id;
            div.style.cursor = 'pointer'; div.style.padding = '4px'; div.style.borderRadius = '4px';
            if (o === this.engine.selected) { div.style.background = '#1a2a3a'; div.style.color = '#00e5ff'; }
            div.onclick = () => this.engine.selectObject(o);
            list.appendChild(div);
        });
    }
}
