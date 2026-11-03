import * as THREE from 'three';

export class ObjectFactory {
    constructor(sceneManager) {
        this.sceneManager = sceneManager;
        this.nextObjectNumber = 1;
    }

    create(type, options = {}) {
        if (!this.sceneManager?.isInitialized) {
            throw new Error('SceneManager is not initialized.');
        }

        const geometry = this.createGeometry(type, options);

        const material = new THREE.MeshStandardMaterial({
            color: options.color ?? 0x8b9bb4,
            roughness: options.roughness ?? 0.8,
            metalness: options.metalness ?? 0
        });

        const object = new THREE.Mesh(geometry, material);

        object.name = options.name ??
            `${type}_${this.nextObjectNumber}`;

        object.position.set(
            options.position?.x ?? 0,
            options.position?.y ?? 0,
            options.position?.z ?? 0
        );

        object.rotation.set(
            options.rotation?.x ?? 0,
            options.rotation?.y ?? 0,
            options.rotation?.z ?? 0
        );

        object.scale.set(
            options.scale?.x ?? 1,
            options.scale?.y ?? 1,
            options.scale?.z ?? 1
        );

        object.userData.engineObject = true;
        object.userData.objectType = type;

        this.sceneManager.add(object);

        this.nextObjectNumber++;

        return object;
    }

    createGeometry(type, options) {
        switch (type) {
            case 'cube':
                return new THREE.BoxGeometry(
                    options.width ?? 1,
                    options.height ?? 1,
                    options.depth ?? 1
                );

            case 'sphere':
                return new THREE.SphereGeometry(
                    options.radius ?? 0.5,
                    options.widthSegments ?? 24,
                    options.heightSegments ?? 16
                );

            case 'plane':
                return new THREE.PlaneGeometry(
                    options.width ?? 10,
                    options.height ?? 10
                );

            case 'cylinder':
                return new THREE.CylinderGeometry(
                    options.radiusTop ?? 0.5,
                    options.radiusBottom ?? 0.5,
                    options.height ?? 1,
                    options.radialSegments ?? 24
                );

            default:
                throw new Error(`Unsupported object type: ${type}`);
        }
    }
}
