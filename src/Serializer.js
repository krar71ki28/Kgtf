export class Serializer {

    static saveScene(engine) {
        const sceneData = {
            version: "1.0",
            engine: "KGTF ENGINE",
            objects: engine.objects.map(obj => {
                const material = obj.children.length > 0
                    ? obj.children[0].material
                    : obj.material;

                let color = "#ffffff";

                if (material && material.color) {
                    color = "#" + material.color.getHexString();
                }

                return {
                    type: obj.userData.type,
                    position: {
                        x: obj.position.x,
                        y: obj.position.y,
                        z: obj.position.z
                    },
                    rotation: {
                        x: obj.rotation.x,
                        y: obj.rotation.y,
                        z: obj.rotation.z
                    },
                    scale: {
                        x: obj.scale.x,
                        y: obj.scale.y,
                        z: obj.scale.z
                    },
                    color: color
                };
            })
        };

        return JSON.stringify(sceneData, null, 2);
    }

    static loadScene(engine, jsonData) {
        try {
            const data = typeof jsonData === "string"
                ? JSON.parse(jsonData)
                : jsonData;

            if (
                !data ||
                data.engine !== "KGTF ENGINE" ||
                !Array.isArray(data.objects)
            ) {
                throw new Error("Invalid KGTF scene file");
            }

            const allowedTypes = ["cube", "sphere", "character"];

            for (const item of data.objects) {
                if (
                    !allowedTypes.includes(item.type) ||
                    !this.validTransform(item.position) ||
                    !this.validTransform(item.rotation) ||
                    !this.validTransform(item.scale)
                ) {
                    throw new Error("Invalid object data");
                }
            }

            engine.clearScene();

            for (const item of data.objects) {
                const obj = engine.createObject(item.type);

                if (!obj) continue;

                obj.position.set(
                    item.position.x,
                    item.position.y,
                    item.position.z
                );

                obj.rotation.set(
                    item.rotation.x,
                    item.rotation.y,
                    item.rotation.z
                );

                obj.scale.set(
                    item.scale.x,
                    item.scale.y,
                    item.scale.z
                );

                if (item.color && /^#[0-9a-fA-F]{6}$/.test(item.color)) {
                    obj.traverse(child => {
                        if (child.isMesh && child.material && child.material.color) {
                            child.material.color.set(item.color);
                        }
                    });
                }
            }

            return true;

        } catch (error) {
            console.error("KGTF Serializer Error:", error);
            return false;
        }
    }

    static validTransform(value) {
        return value &&
            Number.isFinite(value.x) &&
            Number.isFinite(value.y) &&
            Number.isFinite(value.z);
    }

    static downloadScene(engine) {
        const json = this.saveScene(engine);
        const blob = new Blob(
            [json],
            { type: "application/json" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = "KGTF_Scene.json";
        link.click();

        URL.revokeObjectURL(url);
    }
}
