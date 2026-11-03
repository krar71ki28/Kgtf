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
    width: min(320px, calc(100vw - 24px));
    max-height: 65vh;
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
#asset-browser[hidden] {
    display: none;
}
#asset-browser-header,
.asset-browser-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}
#asset-browser-header {
    margin-bottom: 12px;
}
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
        <strong>ASSET BROWSER</strong>
        <button id="asset-browser-close" type="button">×</button>
    </div>
    <div id="asset-browser-count">ASSETS: 0</div>
    <div id="asset-browser-list"></div>
`;

document.body.appendChild(panel);

const list = panel.querySelector("#asset-browser-list");
const count = panel.querySelector("#asset-browser-count");

function refreshAssets() {
    list.replaceChildren();

    const assets = editor.objectManager.getAll().filter(
        ({ object }) => object.userData.kgtfAsset
    );

    count.textContent = `ASSETS: ${assets.length}`;

    if (assets.length === 0) {
        const empty = document.createElement("div");
        empty.id = "asset-browser-empty";
        empty.textContent = "No imported models in this scene.";
        list.appendChild(empty);
        return;
    }

    for (const entry of assets) {
        const { id, object } = entry;
        const asset = object.userData.kgtfAsset;

        const item = document.createElement("div");
        item.className = "asset-browser-item";

        const info = document.createElement("div");
        info.className = "asset-browser-info";

        const name = document.createElement("strong");
        name.textContent = object.name;

        const details = document.createElement("div");
        details.textContent =
            `${asset.format.toUpperCase()} · ${asset.filename}`;

        info.append(name, details);

        const actions = document.createElement("div");
        actions.className = "asset-browser-actions";

        const selectButton = document.createElement("button");
        selectButton.type = "button";
        selectButton.textContent = "Select";

        selectButton.addEventListener("click", () => {
            editor.objectManager.select(id);
            editor.transformSystem.syncSelection(object);
        });

        const duplicateButton = document.createElement("button");
        duplicateButton.type = "button";
        duplicateButton.textContent = "Duplicate";

        duplicateButton.addEventListener("click", async () => {
            duplicateButton.disabled = true;

            try {
                const duplicate = await editor.serializer.parseModel(asset);

                duplicate.position.copy(object.position);
                duplicate.position.x += 1.5;
                duplicate.position.y = object.position.y;

                duplicate.rotation.copy(object.rotation);
                duplicate.scale.copy(object.scale);

                editor.objectManager.registerObject(
                    duplicate,
                    `${object.name}_Copy`
                );

                editor.transformSystem.syncSelection(duplicate);
                refreshAssets();
            } catch (error) {
                console.error("Asset duplication failed:", error);
                alert("Could not duplicate this model.");
                duplicateButton.disabled = false;
            }
        });

        actions.append(selectButton, duplicateButton);
        item.append(info, actions);
        list.appendChild(item);
    }
}

openButton.addEventListener("click", () => {
    panel.hidden = !panel.hidden;

    if (!panel.hidden) {
        refreshAssets();
    }
});

panel.querySelector("#asset-browser-close").addEventListener(
    "click",
    () => {
        panel.hidden = true;
    }
);
