import { AnimationMixer } from "three";

export class AnimationSystem {
    constructor(objectManager) {
        this.objectManager = objectManager;
        this.mixers = new Map();
        this.currentModel = null;
        this.currentClipIndex = 0;
        this.panel = null;
        this.clipSelect = null;
        this.playButton = null;
        this.pauseButton = null;
        this.stopButton = null;

        this.createPanel();
    }

    createPanel() {
        const panel = document.createElement("section");
        panel.id = "kgtf-animation-panel";

        Object.assign(panel.style, {
            position: "fixed",
            right: "12px",
            bottom: "54px",
            zIndex: "1200",
            width: "min(310px, calc(100vw - 24px))",
            padding: "12px",
            border: "1px solid #39465a",
            borderRadius: "12px",
            background: "rgba(17, 24, 39, 0.96)",
            color: "#f1f5f9",
            font: "13px sans-serif",
            display: "none",
            boxSizing: "border-box"
        });

        const title = document.createElement("strong");
        title.textContent = "ANIMATION";

        const select = document.createElement("select");
        select.style.cssText =
            "width:100%;margin-top:10px;padding:9px;background:#263449;color:white;border:1px solid #526176;border-radius:7px;";

        const controls = document.createElement("div");
        controls.style.cssText =
            "display:flex;gap:7px;margin-top:9px;";

        const makeButton = (label, color, callback) => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = label;
            button.style.cssText =
                `flex:1;min-height:38px;border:0;border-radius:7px;background:${color};color:white;font-weight:600;`;
            button.addEventListener("click", callback);
            controls.append(button);
            return button;
        };

        this.clipSelect = select;
        this.playButton = makeButton("Play", "#16834b", () => this.play());
        this.pauseButton = makeButton("Pause", "#9a6b18", () => this.pause());
        this.stopButton = makeButton("Stop", "#a33a43", () => this.stop());

        select.addEventListener("change", () => {
            this.currentClipIndex = Number(select.value) || 0;
            this.stop();
        });

        panel.append(title, select, controls);
        document.body.append(panel);

        this.panel = panel;
    }

    registerModel(model) {
        if (!model?.isObject3D) return null;

        const clips = model.userData?.kgtfAnimations;

        if (!Array.isArray(clips) || clips.length === 0) {
            return null;
        }

        if (this.mixers.has(model)) {
            return this.mixers.get(model);
        }

        const mixer = new AnimationMixer(model);

        const actions = clips.map((clip) => mixer.clipAction(clip));

        const entry = {
            mixer,
            clips,
            actions,
            activeIndex: -1
        };

        this.mixers.set(model, entry);
        return entry;
    }

    getSelectedEntry() {
        const model = this.objectManager.getSelected();

        if (!model) return null;

        const entry = this.mixers.get(model);
        if (!entry) return null;

        return { model, ...entry };
    }

    play() {
        const selected = this.getSelectedEntry();
        if (!selected) return;

        const index = Math.min(
            Math.max(this.currentClipIndex, 0),
            selected.actions.length - 1
        );

        selected.mixer.stopAllAction();

        const action = selected.actions[index];
        if (!action) return;

        action.reset();
        action.enabled = true;
        action.paused = false;
        action.play();

        selected.activeIndex = index;
    }

    pause() {
        const selected = this.getSelectedEntry();
        if (!selected || selected.activeIndex < 0) return;

        const action = selected.actions[selected.activeIndex];
        if (action) action.paused = true;
    }

    stop() {
        const selected = this.getSelectedEntry();
        if (!selected) return;

        selected.mixer.stopAllAction();
        selected.mixer.setTime(0);
        selected.activeIndex = -1;
    }

    removeModel(model) {
        const entry = this.mixers.get(model);
        if (!entry) return;

        entry.mixer.stopAllAction();
        entry.mixer.uncacheRoot(model);
        this.mixers.delete(model);

        if (this.currentModel === model) {
            this.currentModel = null;
        }
    }

    refreshPanel() {
        const model = this.objectManager.getSelected();
        const clips = model?.userData?.kgtfAnimations;

        if (!model || !Array.isArray(clips) || clips.length === 0) {
            this.panel.style.display = "none";
            this.currentModel = null;
            return;
        }

        this.registerModel(model);
        this.panel.style.display = "block";

        if (this.currentModel === model) return;

        this.currentModel = model;
        this.currentClipIndex = 0;
        this.clipSelect.replaceChildren();

        clips.forEach((clip, index) => {
            const option = document.createElement("option");
            option.value = String(index);
            option.textContent = clip.name || `Animation ${index + 1}`;
            this.clipSelect.append(option);
        });

        this.clipSelect.value = "0";
    }

    update(deltaTime) {
        const activeObjects = new Set(
            this.objectManager.getAll().map((item) => item.object)
        );

        for (const object of activeObjects) {
            this.registerModel(object);
        }

        for (const [model, entry] of this.mixers) {
            if (!activeObjects.has(model)) {
                this.removeModel(model);
                continue;
            }

            entry.mixer.update(deltaTime);
        }

        this.refreshPanel();
    }

    dispose() {
        for (const model of [...this.mixers.keys()]) {
            this.removeModel(model);
        }

        this.panel?.remove();
        this.panel = null;
    }
}
