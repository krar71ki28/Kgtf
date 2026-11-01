export class Serializer {
    static serialize(mesh) {
        if (!mesh) return null;
        
        return {
            type: mesh.userData.type,
            position: [mesh.position.x, mesh.position.y, mesh.position.z],
            rotation: [mesh.rotation.x, mesh.rotation.y, mesh.rotation.z],
            color: mesh.material && mesh.material.color ? '#' + mesh.material.color.getHexString() : '#ffffff',
            physicsEnabled: mesh.userData.physicsEnabled || false
        };
    }

    static deserialize(data, engine) {
        if (!data) return null;
        
        // إنشاء المجسم باستخدام دالة المحرك
        const mesh = engine.createObject(data.type);
        if (!mesh) return null;

        mesh.position.set(data.position[0], data.position[1], data.position[2]);
        mesh.rotation.set(data.rotation[0], data.rotation[1], data.rotation[2]);
        
        if (mesh.material && mesh.material.color) {
            mesh.material.color.set(data.color);
        }

        // تحديث حالة الفيزياء إذا كانت مفعلة
        if (data.physicsEnabled && mesh.userData.body) {
            mesh.userData.physicsEnabled = true;
            mesh.userData.body.mass = 1;
            mesh.userData.body.position.set(data.position[0], data.position[1], data.position[2]);
            mesh.userData.body.updateMassProperties();
        }

        return mesh;
    }
}
