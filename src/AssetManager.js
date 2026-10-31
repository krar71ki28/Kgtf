import { Serializer } from './Serializer.js?v=28.0.0';

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
        
        // استخدام Serializer لحفظ الشجرة كاملة
        const serializedData = Serializer.serialize(obj);
        
        prefabs.push({
            id: 'prefab_' + Date.now(),
            name: obj.userData.type,
            data: serializedData
        });
        
        try {
            localStorage.setItem('kgtf_prefabs', JSON.stringify(prefabs));
            return true;
        } catch (e) {
            alert('مساحة التخزين ممتلئة! لا يمكن حفظ المزيد.');
            return false;
        }
    }

    deletePrefab(id) {
        let prefabs = this.getPrefabs();
        prefabs = prefabs.filter(p => p.id !== id);
        localStorage.setItem('kgtf_prefabs', JSON.stringify(prefabs));
    }

    exportScene() {
        const data = this.engine.objects.map(o => Serializer.serialize(o));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kgtf_scene.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    importScene(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            this.engine.clearScene();
            
            data.forEach(d => {
                Serializer.deserialize(d, this.engine);
            });
            
            this.engine.selectObject(null);
            return true;
        } catch (e) {
            console.error(e);
            return false;
        }
    }
}
