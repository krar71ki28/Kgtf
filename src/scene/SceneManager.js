import * as THREE from "three";

export class SceneManager {
    constructor() {
        this.scenes = new Map();
        this.activeScene = null;
    }

    create(name, options = {}) {
        if (!name || typeof name !== "string") {
            throw new TypeError("Scene name must be a non-empty string");
        }

        if (this.scenes.has(name)) {
            throw new Error(`Scene already exists: ${name}`);
        }

        const scene = new THREE.Scene();

        if (options.background !== undefined) {
            scene.background = new THREE.Color(options.background);
        }

        this.scenes.set(name, scene);

        if (!this.activeScene) {
            this.activeScene = scene;
        }

        return scene;
    }

    get(name) {
        return this.scenes.get(name) ?? null;
    }

    setActive(name) {
        const scene = this.get(name);

        if (!scene) {
            throw new Error(`Scene not found: ${name}`);
        }

        this.activeScene = scene;
        return scene;
    }

    add(object, scene = this.activeScene) {
        if (!scene) {
            throw new Error("No active scene available");
        }

        if (!object || !object.isObject3D) {
            throw new TypeError("Only Three.js Object3D instances can be added");
        }

        scene.add(object);
        return object;
    }

    remove(object, scene = this.activeScene) {
        if (!scene || !object) return false;

        if (object.parent !== scene) return false;

        scene.remove(object);
        return true;
    }

    clear(name) {
        const scene = this.get(name);

        if (!scene) return false;

        for (const object of [...scene.children]) {
            scene.remove(object);
        }

        return true;
    }

    delete(name) {
        const scene = this.get(name);

        if (!scene) return false;

        if (scene === this.activeScene) {
            this.activeScene = null;
        }

        this.scenes.delete(name);

        if (!this.activeScene) {
            this.activeScene = this.scenes.values().next().value ?? null;
        }

        return true;
    }

    getSceneNames() {
        return [...this.scenes.keys()];
    }

    dispose() {
        this.scenes.clear();
        this.activeScene = null;
    }
}
