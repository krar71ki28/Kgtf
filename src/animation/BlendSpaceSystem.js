import { LoopRepeat } from "three";

const STATE_NAMES = ["Idle", "Walk", "Run"];

export class BlendSpaceSystem {
    constructor(animationSystem, stateMachine, objectManager) {
        if (!animationSystem || !stateMachine || !objectManager) {
            throw new Error("BlendSpaceSystem requires animation systems");
        }

        this.animationSystem = animationSystem;
        this.stateMachine = stateMachine;
        this.objectManager = objectManager;
        this.models = new Map();
        this.currentModel = null;
        this.panel = null;
        this.slider = null;
        this.valueLabel = null;
        this.statusLabel = null;
        this.enableButton = null;
        this.originalMethods = {};

        this.wrapAnimationControls();
        this.createPanel();
    }

    wrapAnimationControls() {
        for (const method of [
            "play", "blend", "pause", "stop", "selectClip", "seek"
        ]) {
            const original = this.animationSystem[method];

            if (typeof original !== "function") continue;

            this.originalMethods[method] = original;

            this.animationSystem[method] = (...args) => {
                const model = this.objectManager.getSelected();

                if (model) this.deactivate(model);

                return original.apply(this.animationSystem, args);
            };
        }
    }

    createPanel() {
        const panel = document.createElement("section");
        panel.id = "kgtf-blend-space";

        Object.assign(panel.style, {
            position: "fixed",
            left: "12px",
            bottom: "310px",
            zIndex: "1198",
            width: "min(290px, calc(100vw - 24px))",
            padding: "12px",
            border: "1px solid #39465a",
            borderRadius: "12px",
            background: "rgba(17, 24, 39, 0.97)",
            color: "#f1f5f9",
            font: "13px sans-serif",
            display: "none",
            boxSizing: "border-box"
        });

        const title = document.createElement("strong");
        title.textContent = "ANIMATION BLEND SPACE 1D";

        const description = document.createElement("div");
        description.textContent = "Idle  ←  Walk  →  Run";
        description.style.marginTop = "12px";
        description.style.color = "#93c5fd";

        const slider = document.createElement("input");
        slider.type = "range";
        slider.min = "0";
        slider.max = "1";
        slider.step = "0.01";
        slider.value = "0";

        Object.assign(slider.style, {
            width: "100%",
            marginTop: "12px",
            accentColor: "#38bdf8"
        });

        const valueLabel = document.createElement("div");
        valueLabel.textContent = "Parameter: 0.00";

        const enableButton = document.createElement("button");
        enableButton.type = "button";
        enableButton.textContent = "Enable Blend Space";

        Object.assign(enableButton.style, {
            width: "100%",
            minHeight: "40px",
            marginTop: "10px",
            border: "0",
            borderRadius: "7px",
            background: "#2563a6",
            color: "white",
            fontWeight: "600"
        });

        const statusLabel = document.createElement("div");
        statusLabel.textContent = "Blend Space inactive";

        Object.assign(statusLabel.style, {
            marginTop: "9px",
            color: "#cbd5e1",
            fontSize: "11px"
        });

        enableButton.addEventListener("click", () => {
            const model = this.objectManager.getSelected();

            if (!model) {
                statusLabel.textContent = "Select an animated model";
                return;
            }

            if (this.models.get(model)?.active) {
                this.deactivate(model);
                return;
            }

            if (!this.activate(model)) {
                statusLabel.textContent =
                    "Map three different clips: Idle, Walk, Run";
            }
        });

        slider.addEventListener("input", () => {
            const model = this.objectManager.getSelected();
            if (!model) return;

            const value = Number(slider.value);

            if (!this.models.get(model)?.active && !this.activate(model)) {
                statusLabel.textContent =
                    "Map three different clips: Idle, Walk, Run";
                return;
            }

            this.setParameter(model, value);
        });

        panel.append(
            title,
            description,
            slider,
            valueLabel,
            enableButton,
            statusLabel
        );

        document.body.append(panel);

        this.panel = panel;
        this.slider = slider;
        this.valueLabel = valueLabel;
        this.statusLabel = statusLabel;
        this.enableButton = enableButton;
    }

    getConfiguration(model) {
        const states = this.stateMachine.getAvailableStates(model);
        const indices = STATE_NAMES.map((name) => states[name]);

        if (
            indices.some((index) => !Number.isInteger(index)) ||
            new Set(indices).size !== 3
        ) {
            return null;
        }

        const entry = this.animationSystem.mixers.get(model);

        if (!entry || indices.some((index) => !entry.actions[index])) {
            return null;
        }

        return { entry, indices };
    }

    activate(model) {
        const configuration = this.getConfiguration(model);
        if (!configuration) return false;

        const { entry, indices } = configuration;

        this.deactivate(model);

        entry.mixer.stopAllAction();
        entry.transition = null;
        entry.activeIndex = -1;
        entry.isPlaying = false;
        entry.isPaused = false;
        entry.blendSpaceActive = true;

        for (const index of indices) {
            const action = entry.actions[index];

            action.reset();
            action.enabled = true;
            action.paused = false;
            action.timeScale = entry.speed;
            action.setLoop(LoopRepeat, Infinity);
            action.clampWhenFinished = false;
            action.setEffectiveWeight(0);
            action.play();
        }

        this.models.set(model, {
            indices,
            parameter: 0,
            active: true
        });

        this.applyWeights(model);
        this.refreshStatus();

        return true;
    }

    setParameter(model, value) {
        const state = this.models.get(model);

        if (!state?.active || !Number.isFinite(value)) return false;

        state.parameter = Math.max(0, Math.min(1, value));

        this.applyWeights(model);
        this.refreshStatus();

        return true;
    }

    applyWeights(model) {
        const state = this.models.get(model);
        const entry = this.animationSystem.mixers.get(model);

        if (!state?.active || !entry) return;

        const p = state.parameter;

        const weights = p <= 0.5
            ? [1 - (p * 2), p * 2, 0]
            : [0, 2 * (1 - p), (p * 2) - 1];

        state.indices.forEach((index, position) => {
            const action = entry.actions[index];

            action.enabled = true;
            action.setEffectiveWeight(weights[position]);

            if (!action.isRunning()) {
                action.play();
            }
        });
    }

    deactivate(model) {
        const state = this.models.get(model);
        const entry = this.animationSystem.mixers.get(model);

        if (state) {
            for (const index of state.indices) {
                entry?.actions[index]?.stop();
            }

            this.models.delete(model);
        }

        if (entry) {
            entry.blendSpaceActive = false;
        }

        if (this.currentModel === model) {
            this.refreshStatus();
        }
    }

    refreshStatus() {
        const model = this.objectManager.getSelected();

        if (!model) {
            this.panel.style.display = "none";
            this.currentModel = null;
            return;
        }

        const entry = this.animationSystem.registerModel(model);

        if (!entry) {
            this.panel.style.display = "none";
            return;
        }

        this.panel.style.display = "block";

        if (this.currentModel !== model) {
            this.currentModel = model;

            const state = this.models.get(model);
            const parameter = state?.parameter ?? 0;

            this.slider.value = String(parameter);
            this.valueLabel.textContent =
                `Parameter: ${parameter.toFixed(2)}`;
        }

        const active = this.models.get(model)?.active ?? false;

        this.enableButton.textContent = active
            ? "Disable Blend Space"
            : "Enable Blend Space";

        this.statusLabel.textContent = active
            ? "Blend Space active"
            : "Blend Space inactive";
    }

    update() {
        for (const model of [...this.models.keys()]) {
            if (!this.animationSystem.mixers.has(model)) {
                this.models.delete(model);
            }
        }

        refresh: {
            this.refreshStatus();
        }
    }

    dispose() {
        for (const model of [...this.models.keys()]) {
            this.deactivate(model);
        }

        for (const [method, original] of Object.entries(this.originalMethods)) {
            this.animationSystem[method] = original;
        }

        this.panel?.remove();
        this.models.clear();
        this.panel = null;
    }
}
