export class AssetManager {
    constructor(engine) {
        this.engine = engine;
    }

    getPrefabs() {
        return JSON.parse(localStorage.getItem('kgtf_prefabs') || '[]');
    }

    savePrefab(obj) {
        if (!obj) return false;
        const prefabs = this.getPrefabs();
        
        // استخراج اللون
        let color = '#00e5ff';
        obj.traverse(c => { if(c.isMesh && c.material && c.material.color) color = '#' + c.material.color.getHexString(); });

        prefabs.push({
            id: 'prefab_' + Date.now(),
            type: obj.userData.type,
            color: color,
            logic: obj.userData.logic || []
        });
        
        localStorage.setItem('kgtf_prefabs', JSON.stringify(prefabs));
        return true;
    }

    deletePrefab(id) {
        let prefabs = this.getPrefabs();
        prefabs = prefabs.filter(p => p.id !== id);
        localStorage.setItem('kgtf_prefabs', JSON.stringify(prefabs));
    }

    // تصدير المشهد كملف
    exportScene() {
        const data = this.engine.objects.map(o => {
            let color = '#00e5ff';
            o.traverse(c => { if(c.isMesh && c.material && c.material.color) color = '#' + c.material.color.getHexString(); });
            return { 
                type: o.userData.type, 
                pos: o.position.toArray(), 
                rot: [o.rotation.x, o.rotation.y, o.rotation.z],
                scale: o.scale.toArray(),
                color: color, 
                logic: o.userData.logic,
                physics: o.userData.physics
            };
        });
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kgtf_scene.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    // استيراد مشهد من ملف
    importScene(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            this.engine.clearScene();
            
            data.forEach(d => {
                const obj = this.engine.createObject(d.type);
                if (obj) {
                    obj.position.fromArray(d.pos);
                    if (d.rot) obj.rotation.set(d.rot[0], d.rot[1], d.rot[2]);
                    if (d.scale) obj.scale.fromArray(d.scale);
                    obj.traverse(c => { if(c.isMesh && c.material && c.material.color) c.material.color.set(d.color); });
                    obj.userData.logic = d.logic || [];
                    if (d.physics) obj.userData.physics = d.physics;
                }
            });
            this.engine.selectObject(null);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }
}
