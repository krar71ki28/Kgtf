import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

export class Serializer {
    constructor(objectManager) {
        if (!objectManager) {
            throw new Error("Serializer requires ObjectManager");
        }

        this.objectManager = objectManager;
        this.version = 1;
        this.loader = new GLTFLoader();
    }

    serialize() {
        const objects = this.objectManager.getAll().map(({ object }) => {
            const transform = {
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
                }
            };

            const asset = object.userData.kgtfAsset;

            if (asset) {
                return {
                    type: "model",
                    name: object.name,
                    ...transform,
                    asset: {
                        format: asset.format,
                        filename: asset.filename,
                        data: asset.data
                    }
                };
            }

            const material = object.material;

            if (!material || Array.isArray(material) || !material.color) {
                throw new Error(`Unsupported object: ${object.name}`);
            }

            return {
                type: "cube",
                name: object.name,
                ...transform,
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
            const validTransform =
                typeof item.name === "string" &&
                validVector(item.position) &&
                validVector(item.rotation) &&
                validVector(item.scale) &&
                ["x", "y", "z"].every(
                    (axis) => item.scale[axis] > 0 && item.scale[axis] <= 10000
                );

            if (!validTransform) {
                throw new Error("Scene contains invalid transform data");
            }

            if (item.type === "cube") {
                if (
                    !item.material ||
                    typeof item.material.color !== "string" ||
                    !/^#[0-9a-fA-F]{6}$/.test(item.material.color) ||
                    !Number.isFinite(item.material.roughness) ||
                    item.material.roughness < 0 ||
                    item.material.roughness > 1 ||
                    !Number.isFinite(item.material.metalness) ||
                    item.material.metalness < 0 ||
                    item.material.metalness > 1
                ) {
                    throw new Error("Scene contains invalid cube data");
                }

                continue;
            }

            if (item.type === "model") {
                const asset = item.asset;

                if (
                    !asset ||
                    !["glb", "gltf"].includes(asset.format) ||
                    typeof asset.filename !== "string" ||
                    typeof asset.data !== "string" ||
                    asset.data.length === 0 ||
                    asset.data.length > 70 * 1024 * 1024 ||
                    (asset.format === "glb" &&
                        !/^[A-Za-z0-9+/]+={0,2}$/.test(asset.data))
                ) {
                    throw new Error("Scene contains invalid model data");
                }

                continue;
            }

            throw new Error("Unsupported scene object type");
        }

        return true;
    }

    decodeBase64(value) {
        const binary = atob(value);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return bytes.buffer;
    }

    parseModel(asset) {
        return new Promise((resolve, reject) => {
            try {
                const source = asset.format === "glb"
                    ? this.decodeBase64(asset.data)
                    : asset.data;

                this.loader.parse(
                    source,
                    "",
                    (gltf) => {
                        if (!gltf.scene) {
                            reject(new Error("Model has no scene"));
                            return;
                        }

                        gltf.scene.userData.kgtfAsset = {
                            format: asset.format,
                            filename: asset.filename,
                            data: asset.data
                        };

                        resolve(gltf.scene);
                    },
                    reject
                );
            } catch (error) {
                reject(error);
            }
        });
    }

    async load(data) {
        this.validate(data);

        // Prepare imported models before changing the current scene.
        const prepared = [];

        for (const item of data.objects) {
            if (item.type === "model") {
                const object = await this.parseModel(item.asset);
                prepared.push({ item, object });
            } else {
                prepared.push({ item, object: null });
            }
        }

        const manager = this.objectManager;

        for (const item of manager.getAll()) {
            manager.remove(item.id);
        }

        for (const entry of prepared) {
            const { item } = entry;
            let object;

            if (item.type === "cube") {
                object = manager.createCube();

                object.material.color.set(item.material.color);
                object.material.roughness = item.material.roughness;
                object.material.metalness = item.material.metalness;
            } else {
                object = manager.registerObject(
                    entry.object,
                    item.name.slice(0, 40)
                );
            }

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
                item.scale.x,
                item.scale.y,
                item.scale.z
            );

            object.updateMatrixWorld(true);
        }

        if (data.objects.length === 0) {
            manager.clearSelection();
        }

        manager.notify();

        return data.objects.length;
    }

    async loadFile(file) {
        if (!file || file.size > 100 * 1024 * 1024) {
            throw new Error("Invalid scene file or file exceeds 100 MB");
        }

        const text = await file.text();
        const data = JSON.parse(text);

        return this.load(data);
    }
}
