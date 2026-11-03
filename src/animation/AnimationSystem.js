import {
    AnimationMixer,
    LoopOnce,
    LoopRepeat,
    LoopPingPong
} from "three";

const LOOP_MODES = {
    once: LoopOnce,
    repeat: LoopRepeat,
    pingpong: LoopPingPong
};

export class AnimationSystem {
    constructor(objectManager) {
        this.objectManager = objectManager;
        this.mixers = new Map();
        this.currentModel = null;
        this.panel = null;
        this.clipSelect = null;
        this.speedSelect = null;
        this.loopSelect = null;
        this.fadeSelect = null;
        this.timeline = null;
        this.timeLabel = null;
        this.statusLabel = null;
        this.isSeeking = false;

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
            width: "min(330px, calc(100vw - 24px))",
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
        title.textContent = "ANIMATION CONTROLS";

        const makeSelect = (options) => {
            const select = document.createElement("select");

            Object.assign(select.style, {
                width: "100%",
                minHeight: "38px",
                marginTop: "8px",
                padding: "8px",
                background: "#263449",
                color: "white",
                border: "1px solid #526176",
                borderRadius: "7px",
                boxSizing: "border-box"
            });

            for (const [value, label] of options) {
                const option = document.createElement("option");
                option.value = value;
                option.textContent = label;
                select.append(option);
            }

            return select;
        };

        const clipSelect = makeSelect([]);

        const speedSelect = makeSelect([
            ["0.25", "Speed: 0.25x"],
            ["0.5", "Speed: 0.5x"],
            ["1", "Speed: 1x"],
            ["2", "Speed: 2x"]
        ]);

        const loopSelect = makeSelect([
            ["repeat", "Loop: Repeat"],
            ["once", "Loop: Once"],
            ["pingpong", "Loop: PingPong"]
        ]);

        const fadeSelect = makeSelect([
            ["0.1", "Blend: 0.1s"],
            ["0.25", "Blend: 0.25s"],
            ["0.5", "Blend: 0.5s"],
            ["1", "Blend: 1s"]
        ]);

        const timeline = document.createElement("input");
        timeline.type = "range";
        timeline.min = "0";
        timeline.max = "1";
        timeline.step = "0.001";
        timeline.value = "0";

        Object.assign(timeline.style, {
            width: "100%",
            margin: "12px 0 4px",
            accentColor: "#38bdf8"
        });

        const timeRow = document.createElement("div");

        Object.assign(timeRow.style, {
            display: "flex",
            justifyContent: "space-between",
            fontSize: "11px",
            color: "#cbd5e1"
        });

        const timeLabel = document.createElement("span");
        timeLabel.textContent = "00:00 / 00:00";

        const statusLabel = document.createElement("span");
        statusLabel.textContent = "Stopped";

        timeRow.append(timeLabel, statusLabel);

        const controls = document.createElement("div");

        Object.assign(controls.style, {
            display: "flex",
            gap: "7px",
            marginTop: "10px"
        });

        const makeButton = (label, color, callback) => {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = label;

            Object.assign(button.style, {
                flex: "1",
                minWidth: "0",
                minHeight: "40px",
                border: "0",
                borderRadius: "7px",
                background: color,
                color: "white",
                fontWeight: "600",
                cursor: "pointer"
            });

            button.addEventListener("click", callback);
            controls.append(button);

            return button;
        };

        makeButton("Play", "#16834b", () => this.play());
        makeButton("Blend", "#2563a6", () => this.blend());
        makeButton("Pause", "#9a6b18", () => this.pause());
        makeButton("Stop", "#a33a43", () => this.stop());

        clipSelect.addEventListener("change", () => {
            this.selectClip(Number(clipSelect.value));
        });

        speedSelect.addEventListener("change", () => {
            this.setSpeed(Number(speedSelect.value));
        });

        loopSelect.addEventListener("change", () => {
            this.setLoopMode(loopSelect.value);
        });

        timeline.addEventListener("pointerdown", () => {
            this.isSeeking = true;
        });

        timeline.addEventListener("pointerup", () => {
            this.isSeeking = false;
        });

        timeline.addEventListener("pointercancel", () => {
            this.isSeeking = false;
        });

        timeline.addEventListener("input", () => {
            this.seek(Number(timeline.value));
        });

        panel.append(
            title,
            clipSelect,
            speedSelect,
            loopSelect,
            fadeSelect,
            timeline,
            timeRow,
            controls
        );

        document.body.append(panel);

        this.panel = panel;
        this.clipSelect = clipSelect;
        this.speedSelect = speedSelect;
        this.loopSelect = loopSelect;
        this.fadeSelect = fadeSelect;
        this.timeline = timeline;
        this.timeLabel = timeLabel;
        this.statusLabel = statusLabel;
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
            selectedIndex: 0,
            activeIndex: -1,
            speed: 1,
            loopMode: "repeat",
            fadeDuration: 0.25,
            transition: null,
            isPlaying: false,
            isPaused: false
        };

        this.mixers.set(model, entry);

        return entry;
    }

    getSelectedEntry() {
        const model = this.objectManager.getSelected();

        if (!model) return null;

        const entry = this.mixers.get(model);

        if (!entry) return null;

        return { model, entry };
    }

    getActiveAction(entry) {
        if (entry.activeIndex < 0) return null;

        return entry.actions[entry.activeIndex] || null;
    }

    getSelectedAction(entry) {
        return entry.actions[entry.selectedIndex] || null;
    }

    configureAction(action, entry) {
        if (!action) return;

        action.enabled = true;
        action.paused = false;
        action.timeScale = entry.speed;

        action.setLoop(
            LOOP_MODES[entry.loopMode],
            entry.loopMode === "once" ? 1 : Infinity
        );

        action.clampWhenFinished = entry.loopMode === "once";
    }

    clearTransition(entry) {
        if (!entry.transition) return;

        const fromAction =
            entry.actions[entry.transition.fromIndex];

        if (fromAction) {
            fromAction.stop();
        }

        entry.transition = null;
    }

    play() {
        const selected = this.getSelectedEntry();
        if (!selected) return;

        const { entry } = selected;
        const index = entry.selectedIndex;
        const action = entry.actions[index];

        if (!action) return;

        if (entry.activeIndex === index && entry.isPaused) {
            action.paused = false;

            if (entry.transition) {
                const fromAction =
                    entry.actions[entry.transition.fromIndex];

                if (fromAction) {
                    fromAction.paused = false;
                }
            }

            entry.isPaused = false;
            entry.isPlaying = true;
            this.updateStatus(entry);
            return;
        }

        if (entry.activeIndex === index && entry.isPlaying) {
            return;
        }

        this.clearTransition(entry);

        const duration = action.getClip().duration;

        if (
            entry.activeIndex === index &&
            action.time >= duration - 0.001
        ) {
            action.reset();
        }

        entry.mixer.stopAllAction();

        this.configureAction(action, entry);
        action.play();

        entry.activeIndex = index;
        entry.isPlaying = true;
        entry.isPaused = false;

        this.updateTimeline(entry);
        this.updateStatus(entry);
    }

    blend() {
        const selected = this.getSelectedEntry();
        if (!selected) return;

        const { entry } = selected;
        const targetIndex = entry.selectedIndex;
        const targetAction = entry.actions[targetIndex];

        if (!targetAction) return;

        if (entry.activeIndex < 0) {
            this.play();
            return;
        }

        if (entry.transition) {
            this.clearTransition(entry);
        }

        const sourceIndex = entry.activeIndex;
        const sourceAction = entry.actions[sourceIndex];

        if (!sourceAction || sourceIndex === targetIndex) {
            return;
        }

        const wasPaused = entry.isPaused;
        const duration = entry.fadeDuration;

        targetAction.stop();
        targetAction.reset();

        this.configureAction(targetAction, entry);

        targetAction.crossFadeFrom(
            sourceAction,
            duration,
            false
        );

        if (wasPaused) {
            targetAction.paused = true;
            sourceAction.paused = true;
        }

        entry.transition = {
            fromIndex: sourceIndex,
            toIndex: targetIndex,
            duration,
            remaining: duration
        };

        entry.activeIndex = targetIndex;
        entry.isPaused = wasPaused;
        entry.isPlaying = !wasPaused;

        this.updateTimeline(entry);
        this.updateStatus(entry);
    }

    pause() {
        const selected = this.getSelectedEntry();
        if (!selected) return;

        const { entry } = selected;
        const action = this.getActiveAction(entry);

        if (!action || !entry.isPlaying) return;

        action.paused = true;

        if (entry.transition) {
            const fromAction =
                entry.actions[entry.transition.fromIndex];

            if (fromAction) {
                fromAction.paused = true;
            }
        }

        entry.isPlaying = false;
        entry.isPaused = true;

        this.updateStatus(entry);
    }

    stop() {
        const selected = this.getSelectedEntry();
        if (!selected) return;

        const { entry } = selected;

        entry.mixer.stopAllAction();
        entry.transition = null;

        entry.activeIndex = -1;
        entry.isPlaying = false;
        entry.isPaused = false;

        this.updateTimeline(entry);
        this.updateStatus(entry);
    }

    selectClip(index) {
        const selected = this.getSelectedEntry();
        if (!selected) return;

        const { entry } = selected;

        if (index < 0 || index >= entry.actions.length) return;

        entry.mixer.stopAllAction();
        entry.transition = null;

        entry.selectedIndex = index;
        entry.activeIndex = -1;
        entry.isPlaying = false;
        entry.isPaused = false;

        this.updateTimeline(entry);
        this.updateStatus(entry);
    }

    setSpeed(speed) {
        const selected = this.getSelectedEntry();
        if (!selected) return;

        const { entry } = selected;

        if (![0.25, 0.5, 1, 2].includes(speed)) return;

        entry.speed = speed;

        const action = this.getActiveAction(entry);

        if (action) {
            action.timeScale = speed;
        }

        if (entry.transition) {
            const fromAction =
                entry.actions[entry.transition.fromIndex];

            if (fromAction) {
                fromAction.timeScale = speed;
            }
        }
    }

    setLoopMode(mode) {
        const selected = this.getSelectedEntry();
        if (!selected || !LOOP_MODES[mode]) return;

        const { entry } = selected;

        entry.loopMode = mode;

        const applyLoop = (action) => {
            if (!action) return;

            action.setLoop(
                LOOP_MODES[mode],
                mode === "once" ? 1 : Infinity
            );

            action.clampWhenFinished = mode === "once";
        };

        applyLoop(this.getActiveAction(entry));

        if (entry.transition) {
            applyLoop(
                entry.actions[entry.transition.fromIndex]
            );
        }
    }

    seek(value) {
        const selected = this.getSelectedEntry();
        if (!selected) return;

        const { entry } = selected;
        const action = this.getSelectedAction(entry);

        if (!action) return;

        this.clearTransition(entry);

        const duration = action.getClip().duration;
        const time = Math.max(0, Math.min(1, value)) * duration;

        if (entry.activeIndex !== entry.selectedIndex) {
            entry.mixer.stopAllAction();

            action.reset();
            this.configureAction(action, entry);
            action.play();
            action.paused = true;

            entry.activeIndex = entry.selectedIndex;
            entry.isPlaying = false;
            entry.isPaused = true;
        }

        action.time = time;
        entry.mixer.update(0);

        this.updateTimeLabel(time, duration);
        this.updateStatus(entry);
    }

    formatTime(seconds) {
        const safeTime = Math.max(0, seconds || 0);
        const minutes = Math.floor(safeTime / 60);
        const remaining = Math.floor(safeTime % 60);

        return (
            String(minutes).padStart(2, "0") +
            ":" +
            String(remaining).padStart(2, "0")
        );
    }

    updateTimeLabel(current, duration) {
        this.timeLabel.textContent =
            `${this.formatTime(current)} / ${this.formatTime(duration)}`;
    }

    updateTimeline(entry) {
        const action =
            this.getActiveAction(entry) ||
            this.getSelectedAction(entry);

        if (!action) {
            this.timeline.value = "0";
            this.updateTimeLabel(0, 0);
            return;
        }

        const duration = action.getClip().duration;
        const current = entry.activeIndex >= 0 ? action.time : 0;

        if (!this.isSeeking) {
            this.timeline.value = String(
                duration > 0 ? current / duration : 0
            );
        }

        this.updateTimeLabel(current, duration);
    }

    updateStatus(entry) {
        if (entry.transition) {
            this.statusLabel.textContent = entry.isPaused
                ? "Blend Paused"
                : "Blending";
        } else if (entry.isPlaying) {
            this.statusLabel.textContent = "Playing";
        } else if (entry.isPaused) {
            this.statusLabel.textContent = "Paused";
        } else {
            this.statusLabel.textContent = "Stopped";
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

        const entry = this.registerModel(model);

        if (!entry) {
            this.panel.style.display = "none";
            return;
        }

        this.panel.style.display = "block";

        if (this.currentModel !== model) {
            this.currentModel = model;

            this.clipSelect.replaceChildren();

            clips.forEach((clip, index) => {
                const option = document.createElement("option");
                option.value = String(index);
                option.textContent =
                    clip.name || `Animation ${index + 1}`;

                this.clipSelect.append(option);
            });
        }

        this.clipSelect.value = String(entry.selectedIndex);
        this.speedSelect.value = String(entry.speed);
        this.loopSelect.value = entry.loopMode;
        this.fadeSelect.value = String(entry.fadeDuration);

        this.updateTimeline(entry);
        this.updateStatus(entry);
    }

    update(deltaTime) {
        const activeObjects = new Set(
            this.objectManager.getAll().map((item) => item.object)
        );

        for (const object of activeObjects) {
            this.registerModel(object);
        }

        const dt = Number.isFinite(deltaTime)
            ? Math.max(0, deltaTime)
            : 0;

        for (const [model, entry] of this.mixers) {
            if (!activeObjects.has(model)) {
                this.removeModel(model);
                continue;
            }

            entry.mixer.update(dt);

            if (entry.transition && entry.isPlaying) {
                entry.transition.remaining -= dt;

                if (entry.transition.remaining <= 0) {
                    const fromAction =
                        entry.actions[entry.transition.fromIndex];

                    if (fromAction) {
                        fromAction.stop();
                    }

                    entry.transition = null;
                }
            }

            const action = this.getActiveAction(entry);

            if (
                action &&
                entry.loopMode === "once" &&
                entry.isPlaying &&
                action.time >= action.getClip().duration - 0.001
            ) {
                if (entry.transition) {
                    this.clearTransition(entry);
                }

                entry.isPlaying = false;
                entry.isPaused = false;
            }
        }

        this.refreshPanel();
    }

    removeModel(model) {
        const entry = this.mixers.get(model);
        if (!entry) return;

        entry.mixer.stopAllAction();
        entry.transition = null;

        for (const action of entry.actions) {
            entry.mixer.uncacheAction(action.getClip(), model);
        }

        entry.mixer.uncacheRoot(model);
        this.mixers.delete(model);

        if (this.currentModel === model) {
            this.currentModel = null;
            this.panel.style.display = "none";
        }
    }

    dispose() {
        for (const model of [...this.mixers.keys()]) {
            this.removeModel(model);
        }

        this.panel?.remove();

        this.panel = null;
        this.currentModel = null;
    }
}
