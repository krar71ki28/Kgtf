const editor = window.KGTF_EDITOR;

if (!editor?.objectManager || !editor?.transformSystem) {
    throw new Error("DetailsPanel: editor systems not found");
}

const { objectManager, transformSystem } = editor;

const viewport = document.getElementById("viewport-container");

const stylesheet = document.createElement("link");
stylesheet.rel = "stylesheet";
stylesheet.href = "src/editor/details-panel.css";
document.head.appendChild(stylesheet);

const toggle = document.createElement("button");
toggle.id = "details-toggle";
toggle.type = "button";
toggle.textContent = "التفاصيل";

const panel = document.createElement("section");
panel.id = "details-panel";
panel.hidden = true;

panel.innerHTML = `
    <div class="details-header">
        <strong>DETAILS</strong>
        <button id="details-close" type="button">×</button>
    </div>

    <div class="details-content">
        <label for="details-name">اسم العنصر</label>
        <input id="details-name" type="text" maxlength="40"
            placeholder="لا يوجد عنصر محدد">

        <div class="details-section">
            <strong>الموقع — POSITION</strong>
            <div class="details-fields" data-group="position">
                <label>X<input type="number" step="0.1" data-axis="x"></label>
                <label>Y<input type="number" step="0.1" data-axis="y"></label>
                <label>Z<input type="number" step="0.1" data-axis="z"></label>
            </div>
        </div>

        <div class="details-section">
            <strong>الدوران — ROTATION</strong>
            <div class="details-fields" data-group="rotation">
                <label>X<input type="number" step="1" data-axis="x"></label>
                <label>Y<input type="number" step="1" data-axis="y"></label>
                <label>Z<input type="number" step="1" data-axis="z"></label>
            </div>
        </div>

        <div class="details-section">
            <strong>الحجم — SCALE</strong>
            <div class="details-fields" data-group="scale">
                <label>X<input type="number" step="0.1" min="0.01" data-axis="x"></label>
                <label>Y<input type="number" step="0.1" min="0.01" data-axis="y"></label>
                <label>Z<input type="number" step="0.1" min="0.01" data-axis="z"></label>
            </div>
        </div>

        <div id="details-empty">اختر عنصراً لعرض خصائصه</div>
    </div>
`;

viewport.append(toggle, panel);

const nameInput = panel.querySelector("#details-name");
const emptyMessage = panel.querySelector("#details-empty");

const groups = {
    position: panel.querySelector('[data-group="position"]'),
    rotation: panel.querySelector('[data-group="rotation"]'),
    scale: panel.querySelector('[data-group="scale"]')
};

function getSelected() {
    return objectManager.getSelected();
}

function setInputsEnabled(enabled) {
    nameInput.disabled = !enabled;

    for (const group of Object.values(groups)) {
        for (const input of group.querySelectorAll("input")) {
            input.disabled = !enabled;
        }
    }

    emptyMessage.hidden = enabled;
}

function refresh() {
    const object = getSelected();
    setInputsEnabled(Boolean(object));

    if (!object) {
        nameInput.value = "";
        return;
    }

    nameInput.value = object.name;

    for (const axis of ["x", "y", "z"]) {
        groups.position.querySelector(`[data-axis="${axis}"]`).value =
            object.position[axis].toFixed(3);

        groups.rotation.querySelector(`[data-axis="${axis}"]`).value =
            THREE_DEGREES(object.rotation[axis]);

        groups.scale.querySelector(`[data-axis="${axis}"]`).value =
            object.scale[axis].toFixed(3);
    }
}

function THREE_DEGREES(radians) {
    return (radians * 180 / Math.PI).toFixed(1);
}

for (const [groupName, group] of Object.entries(groups)) {
    group.addEventListener("change", (event) => {
        const input = event.target;

        if (!input.matches("input")) return;

        const object = getSelected();
        if (!object) return;

        const axis = input.dataset.axis;
        const value = Number(input.value);

        if (!Number.isFinite(value)) {
            refresh();
            return;
        }

        if (groupName === "position") {
            object.position[axis] = value;
        } else if (groupName === "rotation") {
            object.rotation[axis] = value * Math.PI / 180;
        } else {
            object.scale[axis] = Math.max(0.01, value);
        }

        object.updateMatrixWorld(true);
        refresh();
    });
}

nameInput.addEventListener("change", () => {
    const object = getSelected();
    if (!object) return;

    objectManager.rename(
        object.userData.editorObjectId,
        nameInput.value
    );
});

toggle.addEventListener("click", () => {
    panel.hidden = !panel.hidden;
});

panel.querySelector("#details-close").addEventListener("click", () => {
    panel.hidden = true;
});

transformSystem.controls.addEventListener("objectChange", refresh);

const previousOnChange = objectManager.onChange;

objectManager.onChange = (...args) => {
    previousOnChange?.(...args);
    refresh();
};

refresh();
