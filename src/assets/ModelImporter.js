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

button.addEventListener("click", () => input.click());

input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
        alert("Model file exceeds 50 MB");
        input.value = "";
        return;
    }

    button.disabled = true;
    button.textContent = "Importing...";

    try {
        const extension = file.name.split(".").pop().toLowerCase();

        let data;

        if (extension === "glb") {
            data = await file.arrayBuffer();
        } else if (extension === "gltf") {
            data = await file.text();
        } else {
            throw new Error("Only GLB and GLTF files are supported");
        }

        loader.parse(
            data,
            "",
            (gltf) => {
                try {
                    const model = gltf.scene;

                    if (!model) {
                        throw new Error("The model has no scene");
                    }

                    const name = file.name.replace(/\.(glb|gltf)$/i, "");

                    editor.objectManager.registerObject(model, name);
                    editor.transformSystem.syncSelection(model);

                    const status = document.getElementById("engine-status");
                    if (status) status.textContent = "MODEL: IMPORTED";

                    button.textContent = "Import Model";
                    button.disabled = false;
                    input.value = "";
                } catch (error) {
                    console.error("Model registration failed:", error);
                    alert(error.message || "Could not add model to scene");
                    button.textContent = "Import Model";
                    button.disabled = false;
                    input.value = "";
                }
            },
            (error) => {
                console.error("Model loading failed:", error);
                alert("Could not load model. Check that the file is a valid GLB or GLTF with embedded resources.");
                button.textContent = "Import Model";
                button.disabled = false;
                input.value = "";
            }
        );
    } catch (error) {
        console.error("Model import failed:", error);
        alert(error.message || "Model import failed");
        button.textContent = "Import Model";
        button.disabled = false;
        input.value = "";
    }
});
