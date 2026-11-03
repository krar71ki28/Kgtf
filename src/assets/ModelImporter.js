import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
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
input.accept = ".glb,.gltf,.fbx";
input.hidden = true;

toolbar.appendChild(button);
document.body.appendChild(input);

const gltfLoader = new GLTFLoader();
const fbxLoader = new FBXLoader();

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

async function createFingerprint(buffer) {
    if (!crypto.subtle) {
        throw new Error("Secure file fingerprinting is unavailable");
    }

    const digest = await crypto.subtle.digest("SHA-256", buffer);

    return Array.from(new Uint8Array(digest))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

function parseModel(extension, source) {
    if (extension === "fbx") {
        const model = fbxLoader.parse(source, "");
        model.userData.kgtfAnimations = model.animations || [];
        return Promise.resolve(model);
    }

    return new Promise((resolve, reject) => {
        gltfLoader.parse(
            source,
            "",
            (gltf) => {
                if (!gltf.scene) {
                    reject(new Error("The model has no scene"));
                    return;
                }

                gltf.scene.userData.kgtfAnimations =
                    gltf.animations || [];

                resolve(gltf.scene);
            },
            reject
        );
    });
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

        if (!["glb", "gltf", "fbx"].includes(extension)) {
            throw new Error("Supported formats: GLB, GLTF, FBX");
        }

        const isGLTF = extension === "gltf";
        const source = isGLTF
            ? await file.text()
            : await file.arrayBuffer();

        const fingerprint = await createFingerprint(
            isGLTF
                ? new TextEncoder().encode(source)
                : source
        );

        const model = await parseModel(extension, source);

        const asset = await assetLibrary.put({
            id: `asset_${fingerprint}`,
            fingerprint,
            format: extension,
            filename: file.name,
            fileSize: file.size,
            data: isGLTF
                ? source
                : arrayBufferToBase64(source),
            importedAt: Date.now()
        });

        model.userData.kgtfAsset = asset;

        editor.objectManager.registerObject(
            model,
            file.name.replace(/\.(glb|gltf|fbx)$/i, "")
        );

        editor.transformSystem.syncSelection(model);

        const status = document.getElementById("engine-status");

        if (status) {
            status.textContent = `${extension.toUpperCase()}: IMPORTED & SAVED`;
        }
    } catch (error) {
        console.error("Model import failed:", error);
        alert(error.message || "Model import failed");
    } finally {
        resetButton();
    }
});
