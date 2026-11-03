import { assetLibrary } from "./AssetLibrary.js";

const editor = window.KGTF_EDITOR;
const toolbar = document.querySelector(".toolbar-actions");

if (!editor || !toolbar) {
    throw new Error("KGTF Asset Browser: editor is not ready");
}

const style = document.createElement("style");

style.textContent = `
#asset-browser {
    position: fixed;
    top: 70px;
    left: 12px;
    width: min(340px, calc(100vw - 24px));
    max-height: 70vh;
    overflow-y: auto;
    z-index: 30;
    padding: 12px;
    border: 1px solid #414958;
    border-radius: 9px;
    background: #1c222c;
    color: #edf2fa;
    box-shadow: 0 8px 28px #0008;
    font-family: inherit;
}
#asset-browser[hidden] { display: none; }
#asset-browser-header,
.asset-browser-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}
#asset-browser-header { margin-bottom: 12px; }
.asset-browser-item {
    padding: 9px 0;
    border-top: 1px solid #39414e;
}
.asset-browser-info {
    min-width: 0;
    overflow-wrap: anywhere;
    font-size: 12px;
}
.asset-browser-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
}
.asset-browser-actions button {
    padding: 5px 8px;
    min-height: 30px;
    font-size: 11px;
}
#asset-browser-empty {
    color: #aab4c3;
    font-size: 12px;
    padding: 12px 0;
}
#asset-browser-status {
    color: #aab4c3;
    font-size: 11px;
    margin: 8px 0;
}
`;

document.head.appendChild(style);

const openButton = document.createElement("button");
openButton.id = "asset-browser-toggle";
openButton.type = "button";
openButton.textContent = "Assets";
toolbar.appendChild(openButton);

const panel = document.createElement("section");
panel.id = "asset-browser";
panel.hidden = true;

panel.innerHTML = `
    <div id="asset-browser-header">
        <strong>ASSET LIBRARY</strong>
        <button id="asset-browser-close" type="button">×</button>
    </div>
    <div id="asset-browser-count">ASSETS: 0</div>
    <div id="asset-browser-status"></div>
    <div id="asset-browser-list"></div>
`;

document.body.appendChild(panel);

const list = panel.querySelector("#asset-browser-list");
const count = panel.querySelector("#asset-browser-count");
const status = panel.querySelector("#asset-browser-status");

async function refreshAssets() {
    list.replaceChildren();
    status.textContent = "Loading library...";

    try {
        const assets = await assetLibrary.getAll();

        count.textContent = `ASSETS: ${assets.length}`;
        status.textContent = "";

        if (assets.length === 0) {
            const empty = document.createElement("div");
            empty.id = "asset-browser-empty";
            empty.textContent = "No saved assets. Import a model first.";
            list.appendChild(empty);
            return;
        }

        for (const asset of assets) {
            const item = document.createElement("div");
            item.className = "asset-browser-item";

            const info = document.createElement("div");
            info.className = "asset-browser-info";

            const name = document.createElement("strong");
            name.textContent = asset.filename;

            const details = document.createElement("div");
            details.textContent = asset.format.toUpperCase();

            info.append(name, details);

            const actions = document.createElement("div");
            actions.className = "asset-browser-actions";

            const addButton = document.createElement("button");
            addButton.type = "button";
            addButton.textContent = "Add to Scene";

            addButton.addEventListener("click", async () => {
                addButton.disabled = true;
                addButton.textContent = "Loading...";

                try {
                    const model = await editor.serializer.parseModel(asset);

                    model.userData.kgtfAsset = asset;

                    editor.objectManager.registerObject(
                        model,
                        asset.filename.replace(/\.(glb|gltf|fbx)$/i, "")
                    );

                    editor.transformSystem.syncSelection(model);

                    const engineStatus =
                        document.getElementById("engine-status");

                    if (engineStatus) {
                        engineStatus.textContent = "ASSET: ADDED";
                    }

                    addButton.textContent = "Added";
                } catch (error) {
                    console.error("Asset loading failed:", error);
                    alert(error.message || "Could not add this asset.");
                    addButton.disabled = false;
                    addButton.textContent = "Add to Scene";
                }
            });

            const deleteButton = document.createElement("button");
            deleteButton.type = "button";
            deleteButton.textContent = "Delete";

            deleteButton.addEventListener("click", async () => {
                if (!confirm(`Delete ${asset.filename} from the asset library?`)) {
                    return;
                }

                deleteButton.disabled = true;

                try {
                    await assetLibrary.remove(asset.id);
                    await refreshAssets();
                } catch (error) {
                    console.error("Asset deletion failed:", error);
                    alert("Could not delete this asset.");
                    deleteButton.disabled = false;
                }
            });

            actions.append(addButton, deleteButton);
            item.append(info, actions);
            list.appendChild(item);
        }
    } catch (error) {
        console.error("Asset library error:", error);
        status.textContent = "Could not open asset library.";
        count.textContent = "ASSETS: unavailable";
    }
}

openButton.addEventListener("click", async () => {
    panel.hidden = !panel.hidden;

    if (!panel.hidden) {
        await refreshAssets();
    }
});

panel.querySelector("#asset-browser-close").addEventListener(
    "click",
    () => {
        panel.hidden = true;
    }
);
