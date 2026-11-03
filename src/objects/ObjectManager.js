import * as THREE from "three";

export class ObjectManager {
    constructor(scene) {
        if (!scene?.isScene) {
            throw new TypeError("ObjectManager requires a THREE.Scene");
        }

        this.scene = scene;
        this.objects = new Map();
        this.selected = null;
        this.nextId = 1;
        this.onChange = null;
    }

    createCube() {
        const id = `object-${this.nextId++}`;

        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({
                color: 0x438ee8,
                roughness: 0.48,
                metalness: 0.04
            })
        );

        cube.name = `Cube_${this.objects.size + 1}`;
        cube.userData.editorObjectId = id;
        cube.position.set(0, 0.5, 0);
        cube.castShadow = true;
        cube.receiveShadow = true;

        this.scene.add(cube);
        this.objects.set(id, cube);

        this.select(id);
        this.notify();

        return cube;
    }

    getAll() {
        return [...this.objects.entries()].map(([id, object]) => ({
            id,
            object,
            name: object.name,
            type: object.type
        }));
    }

    get(id) {
        return this.objects.get(id) ?? null;
    }

    getSelected() {
        return this.selected;
    }

    select(id) {
        const object = this.get(id);

        if (!object) {
            this.clearSelection();
            return false;
        }

        this.restoreSelectionMaterial();
        this.selected = object;

        const material = object.material;

        if (material && !Array.isArray(material) && material.emissive) {
            object.userData.previousEmissive = material.emissive.getHex();
            object.userData.previousEmissiveIntensity =
                material.emissiveIntensity;

            material.emissive.setHex(0x263b55);
            material.emissiveIntensity = 0.7;
        }

        this.notify();
        return true;
    }

    clearSelection() {
        this.restoreSelectionMaterial();
        this.selected = null;
        this.notify();
    }

    restoreSelectionMaterial() {
        if (!this.selected) return;

        const material = this.selected.material;

        if (material && !Array.isArray(material) && material.emissive) {
            const previous = this.selected.userData.previousEmissive;
            const intensity =
                this.selected.userData.previousEmissiveIntensity;

            if (previous !== undefined) {
                material.emissive.setHex(previous);
                material.emissiveIntensity = intensity ?? 1;
            }
        }

        delete this.selected.userData.previousEmissive;
        delete this.selected.userData.previousEmissiveIntensity;
    }

    rename(id, name) {
        const object = this.get(id);
        const cleanName = String(name ?? "").trim();

        if (!object || !cleanName) return false;

        object.name = cleanName.slice(0, 40);
        this.notify();
        return true;
    }

    remove(id) {
        const object = this.get(id);

        if (!object) return false;

        if (this.selected === object) {
            this.restoreSelectionMaterial();
            this.selected = null;
        }

        this.scene.remove(object);
        this.disposeObject(object);
        this.objects.delete(id);

        this.notify();
        return true;
    }

    removeSelected() {
        if (!this.selected) return false;

        const entry = [...this.objects.entries()].find(
            ([, object]) => object === this.selected
        );

        return entry ? this.remove(entry[0]) : false;
    }

    disposeObject(object) {
        object.traverse((child) => {
            if (!child.isMesh) return;

            child.geometry?.dispose();

            if (Array.isArray(child.material)) {
                child.material.forEach((material) => material.dispose());
            } else {
                child.material?.dispose();
            }
        });
    }

    notify() {
        if (typeof this.onChange === "function") {
            this.onChange(this.getAll(), this.selected);
        }
    }

    dispose() {
        this.restoreSelectionMaterial();

        for (const object of this.objects.values()) {
            this.scene.remove(object);
            this.disposeObject(object);
        }

        this.objects.clear();
        this.selected = null;
        this.onChange = null;
    }
}
