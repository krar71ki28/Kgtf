const DEFAULT_STATES = {
    Idle: 0,
    Walk: 1,
    Run: 2
};

export class AnimationStateMachine {
    constructor(animationSystem) {
        if (!animationSystem) {
            throw new Error(
                "AnimationStateMachine requires AnimationSystem"
            );
        }

        this.animationSystem = animationSystem;
        this.models = new Map();
    }

    registerModel(model, states = DEFAULT_STATES) {
        if (!model?.isObject3D) {
            throw new Error("Invalid animation model");
        }

        const entry = this.animationSystem.registerModel(model);

        if (!entry) {
            throw new Error(
                "Model has no registered animation clips"
            );
        }

        const normalizedStates = {};

        for (const [name, index] of Object.entries(states)) {
            if (
                typeof name !== "string" ||
                !Number.isInteger(index) ||
                index < 0 ||
                index >= entry.actions.length
            ) {
                continue;
            }

            normalizedStates[name] = index;
        }

        if (Object.keys(normalizedStates).length === 0) {
            throw new Error("No valid animation states provided");
        }

        const state = {
            states: normalizedStates,
            current: null,
            transitions: true
        };

        this.models.set(model, state);

        return state;
    }

    setState(model, stateName) {
        const state = this.models.get(model);

        if (!state) {
            throw new Error("Model is not registered");
        }

        if (!Object.hasOwn(state.states, stateName)) {
            return false;
        }

        const clipIndex = state.states[stateName];
        const animationEntry = this.animationSystem.mixers.get(model);

        if (
            !animationEntry ||
            !animationEntry.actions[clipIndex]
        ) {
            return false;
        }

        if (state.current === stateName) {
            return true;
        }

        const selectedModel = this.animationSystem.objectManager.getSelected();

        if (selectedModel !== model) {
            return false;
        }

        animationEntry.selectedIndex = clipIndex;

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
        const state = this.models.get(model);

        return state?.current ?? null;
    }

    getAvailableStates(model) {
        const state = this.models.get(model);

        return state
            ? { ...state.states }
            : {};
    }

    unregisterModel(model) {
        return this.models.delete(model);
    }

    dispose() {
        this.models.clear();
    }
}
