import * as THREE from 'three';

export class Serializer {
    // تحويل المجسم إلى بيانات JSON
    static serialize(node) {
        if (!node) return null;
        
        const data = {
            type: node.userData.type,
            position: node.position.toArray(),
            rotation: [node.rotation.x, node.rotation.y, node.rotation.z],
            scale: node.scale.toArray(),
            logic: node.userData.logic || [],
            physicsEnabled: node.userData.physics ? node.userData.physics.enabled : false,
            isCharacter: node.userData.isCharacter || false
        };

        // حفظ خصائص المادة (للمجسمات البدائية فقط)
        if (node.children.length > 0 && node.children[0].isMesh) {
            const mesh = node.children[0];
            if (mesh.material && mesh.material.color) {
                data.color = mesh.material.color.getHex();
            }
            data.materialType = node.userData.materialType || 'default';
        }

        return data;
    }

    // إعادة بناء المجسم من بيانات JSON
    static deserialize(data, engine) {
        if (!data) return null;

        // نستخدم createObject الموجود في المحرك لضمان البناء الصحيح
        let node = engine.createObject(data.type, false); 
        if (!node) return null;

        node.position.fromArray(data.position);
        node.rotation.set(data.rotation[0], data.rotation[1], data.rotation[2]);
        node.scale.fromArray(data.scale);
        
        if (data.logic) node.userData.logic = data.logic;
        if (data.physicsEnabled !== undefined && node.userData.physics) {
            node.userData.physics.enabled = data.physicsEnabled;
        }

        // استعادة المادة واللون
        if (data.color && node.children.length > 0 && node.children[0].isMesh) {
            if (data.materialType && data.materialType !== 'default') {
                node.children[0].material = engine.getMaterial(data.materialType, data.color);
                node.userData.materialType = data.materialType;
            } else {
                node.children[0].material.color.setHex(data.color);
            }
        }

        return node;
    }
}
