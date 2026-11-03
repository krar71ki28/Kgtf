const STATE_NAMES = ["Idle", "Walk", "Run"];

export class AnimationStateMachine {
    constructor(animationSystem, objectManager) {
        if (!animationSystem || !objectManager) {
            throw new Error("AnimationStateMachine requires engine systems");
        }

        this.animationSystem = animationSystem;
        this.objectManager = objectManager;
        this.models = new Map();
        this.currentModel = null;
        this.panel = null;
        this.stateSelects = {};
        this.clipSelect = null;
        this.targetStateSelect = null;
        this.status = null;

        this.createPanel();
    }

    createPanel() {
        const panel = document.createElement("section");
        panel.id = "kgtf-state-machine";

        Object.assign(panel.style, {
            position: "fixed",
            left: "12px",
            bottom: "54px",
            zIndex: "1199",
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
        title.textContent = "ANIMATION STATE MACHINE";

        const makeSelect = () => {
            const select = document.createElement("select");

            Object.assign(select.style, {
                width: "100%",
                minHeight: "36px",
                marginTop: "6px",
                padding: "7px",
                background: "#263449",
                color: "white",
                border: "1px solid #526176",
                borderRadius: "7px",
                boxSizing: "border-box"
            });

            return select;
        };

        const mappingTitle = document.createElement("div");
        mappingTitle.textContent = "CLIP MAPPING";

        Object.assign(mappingTitle.style, {
            marginTop: "12px",
            fontWeight: "600",
            color: "#93c5fd"
        });

        const mappings = document.createElement("div");

        for (const stateName of STATE_NAMES) {
            const row = document.createElement("div");

            Object.assign(row.style, {
                marginTop: "8px"
            });

            const label = document.createElement("label");
            label.textContent = stateName;

            const select = makeSelect();

            row.append(label, select);
            mappings.append(row);

            this.stateSelects[stateName] = select;

            select.addEventListener("change", () => {
                const model = this.currentModel;
                if (!model) return;

                const value = select.value;

                if (value === "") {
                    this.unmapState(model, stateName);
                } else {
                    this.mapState(model, stateName, Number(value));
                }

                this.refreshStatus();
            });
        }

        const stateTitle = document.createElement("div");
        stateTitle.textContent = "CURRENT STATE";

        Object.assign(stateTitle.style, {
            marginTop: "14px",
            fontWeight: "600",
            color: "#93c5fd"
        });

        const targetStateSelect = makeSelect();

        for (const name of STATE_NAMES) {
            const option = document.createElement("option");
            option.value = name;
            option.textContent = name;
            targetStateSelect.append(option);
        }

        const applyButton = document.createElement("button");
        applyButton.type = "button";
        applyButton.textContent = "Set Animation State";

        Object.assign(applyButton.style, {
            width: "100%",
            minHeight: "40px",
            marginTop: "10px",
            border: "0",
            borderRadius: "7px",
            background: "#2563a6",
            color: "white",
            fontWeight: "600"
        });

        applyButton.addEventListener("click", () => {
            if (!this.currentModel) return;

            const success = this.setState(
                this.currentModel,
                targetStateSelect.value
            );

            this.refreshStatus();

            if (!success) {
                this.status.textContent =
                    "State unavailable or model not selected";
            }
        });

        const status = document.createElement("div");
        status.textContent = "No state selected";

        Object.assign(status.style, {
            marginTop: "9px",
            fontSize: "11px",
            color: "#cbd5e1"
        });

        panel.append(
            title,
            mappingTitle,
            mappings,
            stateTitle,
            targetStateSelect,
            applyButton,
            status
        );

        document.body.append(panel);

        this.panel = panel;
        this.targetStateSelect = targetStateSelect;
        this.status = status;
    }

    registerModel(model, states = {}) {
        if (!model?.isObject3D) {
            throw new Error("Invalid animation model");
        }

        const animationEntry =
            this.animationSystem.registerModel(model);

        if (!animationEntry) {
            throw new Error("Model has no animation clips");
        }

        const normalizedStates = {};

        for (const [name, index] of Object.entries(states)) {
            if (
                !STATE_NAMES.includes(name) ||
                !Number.isInteger(index) ||
                index < 0 ||
                index >= animationEntry.actions.length
            ) {
                continue;
            }

            normalizedStates[name] = index;
        }

        const existing = this.models.get(model);

        if (existing) {
            existing.states = normalizedStates;
            return existing;
        }

        const state = {
            states: normalizedStates,
            current: null,
            transitions: true
        };

        this.models.set(model, state);

        return state;
    }

    mapState(model, stateName, clipIndex) {
        const state = this.models.get(model);
        const entry = this.animationSystem.mixers.get(model);

        if (
            !state ||
            !entry ||
            !STATE_NAMES.includes(stateName) ||
            !Number.isInteger(clipIndex) ||
            clipIndex < 0 ||
            clipIndex >= entry.actions.length
        ) {
            return false;
        }

        state.states[stateName] = clipIndex;

        return true;
    }

    unmapState(model, stateName) {
        const state = this.models.get(model);

        if (!state || !STATE_NAMES.includes(stateName)) {
            return false;
        }

        delete state.states[stateName];

        if (state.current === stateName) {
            state.current = null;
        }

        return true;
    }

    setState(model, stateName) {
        const state = this.models.get(model);

        if (!state) {
            throw new Error("Model is not registered");
        }

        if (!Object.hasOwn(state.states, stateName)) {
            return false;
        }

        if (this.objectManager.getSelected() !== model) {
            return false;
        }

        const clipIndex = state.states[stateName];
        const entry = this.animationSystem.mixers.get(model);

        if (!entry?.actions[clipIndex]) {
            return false;
        }

        if (state.current === stateName) {
            return true;
        }

        entry.selectedIndex = clipIndex;

        if (state.transitions) {
            this.animationSystem.blend();
        } else {
            this.animationSystem.play();
        }

        state.current = stateName;

        return true;
    }

    setTransitions(model, enabled) {
        const state = this.models.get(model);

        if (!state) return false;

        state.transitions = Boolean(enabled);

        return true;
    }

    getState(model) {
        return this.models.get(model)?.current ?? null;
    }

    getAvailableStates(model) {
        const state = this.models.get(model);

        return state ? { ...state.states } : {};
    }

    refreshPanel() {
        const model = this.objectManager.getSelected();
        const clips = model?.userData?.kgtfAnimations;

        if (!model || !Array.isArray(clips) || clips.length === 0) {
            this.panel.style.display = "none";
            this.currentModel = null;
            return;
        }

        this.animationSystem.registerModel(model);

        if (!this.models.has(model)) {
            this.registerModel(model);
        }

        const state = this.models.get(model);

        this.panel.style.display = "block";

        if (this.currentModel !== model) {
            this.currentModel = model;

            for (const stateName of STATE_NAMES) {
                const select = this.stateSelects[stateName];
                select.replaceChildren();

                const emptyOption = document.createElement("option");
                emptyOption.value = "";
                emptyOption.textContent = "Not mapped";
                select.append(emptyOption);

                clips.forEach((clip, index) => {
                    const option = document.createElement("option");
                    option.value = String(index);
                    option.textContent =
                        clip.name || `Animation ${index + 1}`;

                    select.append(option);
                });
            }
        }

        for (const stateName of STATE_NAMES) {
            const index = state.states[stateName];

            this.stateSelects[stateName].value =
                index === undefined ? "" : String(index);
        }

        this.refreshStatus();
    }

    refreshStatus() {
        if (!this.currentModel) return;

        const state = this.models.get(this.currentModel);

        if (!state) return;

        this.status.textContent = state.current
            ? `Current: ${state.current}`
            : "No active state";
    }

    update() {
        this.refreshPanel();
    }

    unregisterModel(model) {
        return this.models.delete(model);
    }

    dispose() {
        this.models.clear();
        this.panel?.remove();

        this.panel = null;
        this.currentModel = null;
    }
}
