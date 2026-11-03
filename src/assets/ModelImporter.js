import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { assetLibrary } from "./AssetLibrary.js";

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
        binary += String.fromCharCode(
            ...bytes.subarray(i, i + chunkSize)
        );
    }

    return btoa(binary);
}

async function createFingerprint(source, isGLB) {
    if (!crypto.subtle) {
        throw new Error("Secure file fingerprinting is unavailable");
    }

    const data = isGLB
        ? source
        : new TextEncoder().encode(source);

    const digest = await crypto.subtle.digest("SHA-256", data);

    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
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

        const fingerprint = await createFingerprint(source, isGLB);

        loader.parse(
            source,
            "",
            async (gltf) => {
                try {
                    const model = gltf.scene;


                    if (!model) {
                        throw new Error("The model has no scene");
                    }

                    model.userData.kgtfAnimations = gltf.animations || [];

                    const asset = await assetLibrary.put({
                        id: `asset_${fingerprint}`,
                        fingerprint,
                        format: extension,
                        filename: file.name,
                        fileSize: file.size,
                        data: isGLB
                            ? arrayBufferToBase64(source)
                            : source,
                        importedAt: Date.now()
                    });

                    model.userData.kgtfAsset = asset;

                    editor.objectManager.registerObject(
                        model,
                        file.name.replace(/\.(glb|gltf)$/i, "")
                    );

                    editor.transformSystem.syncSelection(model);

                    const status = document.getElementById("engine-status");

                    if (status) {
                        status.textContent = "MODEL: IMPORTED & SAVED";
                    }
                } catch (error) {
                    console.error("Model registration failed:", error);
                    alert(error.message || "Could not save model");
                } finally {
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
