import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

const editor = window.KGTF_EDITOR;
const toolbar = document.querySelector(".toolbar-actions");

if (!editor || !toolbar) {
    throw new Error("KGTF Model Importer: editor is not ready");
}

const button = document.createElement("button");
button.id = "import-model";
button.type = "button";
button.textContent = "Import Model";

const input = document.createElement("input");
input.type = "file";
input.accept = ".glb,.gltf";
input.hidden = true;

toolbar.appendChild(button);
document.body.appendChild(input);

const loader = new GLTFLoader();

function arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    let binary = "";

    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
    }

    return btoa(binary);
}

function resetButton() {
    button.disabled = false;
    button.textContent = "Import Model";
    input.value = "";
}

button.addEventListener("click", () => input.click());

input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
        alert("Model file exceeds 50 MB");
        resetButton();
        return;
    }

    button.disabled = true;
    button.textContent = "Importing...";

    try {
        const extension = file.name.split(".").pop().toLowerCase();

        if (!["glb", "gltf"].includes(extension)) {
            throw new Error("Only GLB and GLTF files are supported");
        }

        const isGLB = extension === "glb";
        const source = isGLB
            ? await file.arrayBuffer()
            : await file.text();

        loader.parse(
            source,
            "",
            (gltf) => {
                try {
                    const model = gltf.scene;

                    if (!model) {
                        throw new Error("The model has no scene");
                    }

                    model.userData.kgtfAsset = {
                        format: extension,
                        filename: file.name,
                        data: isGLB
                            ? arrayBufferToBase64(source)
                            : source
                    };

                    editor.objectManager.registerObject(
                        model,
                        file.name.replace(/\.(glb|gltf)$/i, "")
                    );

                    editor.transformSystem.syncSelection(model);

                    const status = document.getElementById("engine-status");
                    if (status) status.textContent = "MODEL: IMPORTED";

                    resetButton();
                } catch (error) {
                    console.error("Model registration failed:", error);
                    alert(error.message || "Could not add model to scene");
                    resetButton();
                }
            },
            (error) => {
                console.error("Model loading failed:", error);
                alert(
                    "Could not load model. GLTF files must have embedded resources."
                );
                resetButton();
            }
        );
    } catch (error) {
        console.error("Model import failed:", error);
        alert(error.message || "Model import failed");
        resetButton();
    }
});
