import * as THREE from 'three';

/**
 * KGTFNode: الكائن الأساسي في محرك KGTF.
 * يرث من THREE.Group لضمان التوافق مع الرسم والـ Gizmo،
 * لكنه يفصل بيانات المحرك (Entity Data) عن مكتبة Three.js.
 */
export class KGTFNode extends THREE.Group {
    constructor(type) {
        super();
        
        // هوية الكائن في المحرك
        this.entityType = type;
        this.entityId = 'ent_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        this.name = type; // اسم يظهر في الـ Outliner مستقبلاً
        
        // هيكلة البيانات (تمهيد لنظام ECS)
        // نستخدم userData للحفاظ على التوافق مع الأنظمة الحالية (Editor, Logic, Physics)
        this.userData = {
            id: this.entityId,
            type: type,
            physics: { vy: 0, enabled: false },
            logic: [],
            isCharacter: false,
            lastTimerAction: 0
        };
    }

    /**
     * دوال مستقبلية (WIP - للمراحل القادمة)
     */
    addComponent(component) {
        // سيتم استخدامها في نظام ECS لاحقاً
    }
}
