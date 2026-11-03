export class SceneManager {
    constructor(renderer) {
        this.renderer = renderer;
        this.scene = null;
        this.objects = new Map();
        this.isInitialized = false;
    }

    init() {
        if (!this.renderer?.scene) {
            throw new Error(
                'SceneManager requires an initialized Renderer.'
            );
        }

        this.scene = this.renderer.scene;
        this.isInitialized = true;
    }

    add(object) {
        if (!this.isInitialized) {
            throw new Error('SceneManager is not initialized.');
        }

        if (!object || object.isObject3D !== true) {
            throw new TypeError('Invalid 3D object.');
        }

        if (this.objects.has(object.uuid)) {
            throw new Error('Object already exists in the scene.');
        }

        this.scene.add(object);
        this.objects.set(object.uuid, object);

        return object;
    }

    remove(objectOrId) {
        const id = typeof objectOrId === 'string'
            ? objectOrId
            : objectOrId?.uuid;

        const object = this.objects.get(id);

        if (!object) return false;

        this.scene.remove(object);
        this.objects.delete(id);

        return true;
    }

    get(id) {
        return this.objects.get(id) ?? null;
    }

    getAll() {
        return Array.from(this.objects.values());
    }

    get count() {
        return this.objects.size;
    }

    clear() {
        for (const object of this.objects.values()) {
            this.scene.remove(object);
        }

        this.objects.clear();
    }

    dispose() {
        this.clear();

        this.scene = null;
        this.renderer = null;
        this.isInitialized = false;
    }
}
