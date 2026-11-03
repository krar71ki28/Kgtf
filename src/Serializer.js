export class Serializer {
    constructor(objectManager) {
        if (!objectManager) {
            throw new Error("Serializer requires ObjectManager");
        }

        this.objectManager = objectManager;
        this.version = 1;
    }

    serialize() {
        const objects = this.objectManager.getAll().map(({ object }) => {
            const material = object.material;

            if (!material || Array.isArray(material)) {
                throw new Error(`Unsupported material: ${object.name}`);
            }

            return {
                type: "cube",
                name: object.name,
                position: {
                    x: object.position.x,
                    y: object.position.y,
                    z: object.position.z
                },
                rotation: {
                    x: object.rotation.x,
                    y: object.rotation.y,
                    z: object.rotation.z
                },
                scale: {
                    x: object.scale.x,
                    y: object.scale.y,
                    z: object.scale.z
                },
                material: {
                    color: `#${material.color.getHexString()}`,
                    roughness: material.roughness,
                    metalness: material.metalness
                }
            };
        });

        return {
            format: "KGTF_SCENE",
            version: this.version,
            objects
        };
    }

    download(filename = "kgtf-scene.json") {
        const data = this.serialize();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], {
            type: "application/json"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    validate(data) {
        if (
            !data ||
            data.format !== "KGTF_SCENE" ||
            data.version !== this.version ||
            !Array.isArray(data.objects) ||
            data.objects.length > 500
        ) {
            throw new Error("Invalid or unsupported KGTF scene file");
        }

        const validVector = (vector) =>
            vector &&
            ["x", "y", "z"].every(
                (axis) => Number.isFinite(vector[axis])
            );

        for (const item of data.objects) {
            if (
                item?.type !== "cube" ||
                typeof item.name !== "string" ||
                !validVector(item.position) ||
                !validVector(item.rotation) ||
                !validVector(item.scale) ||
                !item.material ||
                typeof item.material.color !== "string" ||
                !/^#[0-9a-fA-F]{6}$/.test(item.material.color) ||
                !Number.isFinite(item.material.roughness) ||
                item.material.roughness < 0 ||
                item.material.roughness > 1 ||
                !Number.isFinite(item.material.metalness) ||
                item.material.metalness < 0 ||
                item.material.metalness > 1 ||
                ["x", "y", "z"].some(
                    (axis) => item.scale[axis] <= 0
                )
            ) {
                throw new Error("Scene contains invalid object data");
            }
        }

        return true;
    }

    load(data) {
        this.validate(data);

        const manager = this.objectManager;

        for (const item of manager.getAll()) {
            manager.remove(item.id);
        }

        for (const item of data.objects) {
            const object = manager.createCube();

            object.name = item.name.slice(0, 40);

            object.position.set(
                item.position.x,
                item.position.y,
                item.position.z
            );

            object.rotation.set(
                item.rotation.x,
                item.rotation.y,
                item.rotation.z
            );

            object.scale.set(
                Math.max(0.01, item.scale.x),
                Math.max(0.01, item.scale.y),
                Math.max(0.01, item.scale.z)
            );

            object.material.color.set(item.material.color);
            object.material.roughness = item.material.roughness;
            object.material.metalness = item.material.metalness;

            object.updateMatrixWorld(true);
        }

        if (data.objects.length === 0) {
            manager.clearSelection();
        }

        manager.notify();

        return data.objects.length;
    }

    async loadFile(file) {
        if (!file || file.size > 5 * 1024 * 1024) {
            throw new Error("Invalid file or file exceeds 5 MB");
        }

        const text = await file.text();
        const data = JSON.parse(text);

        return this.load(data);
    }
}
