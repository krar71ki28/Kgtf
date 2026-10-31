import * as THREE from 'three';

export class KGTFNode extends THREE.Group {
    constructor(type) {
        super();
        this.entityType = type;
        this.entityId = 'ent_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
        this.name = type;
        
        this.userData = {
            id: this.entityId,
            type: type,
            physics: { vy: 0, enabled: false },
            logic: [],
            isCharacter: false,
            lastTimerAction: 0
        };
    }
}
