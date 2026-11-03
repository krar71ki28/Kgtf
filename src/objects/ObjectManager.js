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

    registerObject(object, name = "Imported_Model") {
        if (!object?.isObject3D || object === this.scene) {
            throw new TypeError("Invalid 3D object");
        }

        const id = `object-${this.nextId++}`;

        object.name = String(name).slice(0, 40) || "Imported_Model";
        object.userData.editorObjectId = id;

        object.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        this.scene.add(object);
        this.objects.set(id, object);
        this.select(id);
        this.notify();

        return object;
    }

    createCube() {
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshStandardMaterial({
                color: 0x438ee8,
                roughness: 0.48,
                metalness: 0.04
            })
        );

        cube.name = `Cube_${this.objects.size + 1}`;
        cube.position.set(0, 0.5, 0);

        return this.registerObject(cube, cube.name);
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

        object.traverse((child) => {
            const materials = Array.isArray(child.material)
                ? child.material
                : [child.material];

            materials.forEach((material) => {
                if (!material?.emissive) return;

                material.userData ??= {};

                if (material.userData.kgtfPreviousEmissive === undefined) {
                    material.userData.kgtfPreviousEmissive =
                        material.emissive.getHex();

                    material.userData.kgtfPreviousIntensity =
                        material.emissiveIntensity;
                }

                material.emissive.setHex(0x263b55);
                material.emissiveIntensity = 0.7;
            });
        });

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

        this.selected.traverse((child) => {
            const materials = Array.isArray(child.material)
                ? child.material
                : [child.material];

            materials.forEach((material) => {
                if (!material?.emissive || !material.userData) return;

                const previous = material.userData.kgtfPreviousEmissive;

                if (previous !== undefined) {
                    material.emissive.setHex(previous);
                    material.emissiveIntensity =
                        material.userData.kgtfPreviousIntensity ?? 1;

                    delete material.userData.kgtfPreviousEmissive;
                    delete material.userData.kgtfPreviousIntensity;
                }
            });
        });
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

            const materials = Array.isArray(child.material)
                ? child.material
                : [child.material];

            materials.forEach((material) => material?.dispose());
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
