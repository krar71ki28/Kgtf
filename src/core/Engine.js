export class Engine {
    constructor() {
        this.systems = [];
        this.state = "stopped";
        this.elapsedTime = 0;
        this.frame = 0;
    }

    registerSystem(system) {
        if (!system || typeof system.update !== "function") {
            throw new TypeError("Invalid engine system");
        }

        if (this.state !== "stopped") {
            throw new Error("Systems can only be registered while stopped");
        }

        if (this.systems.includes(system)) {
            throw new Error("System is already registered");
        }

        this.systems.push(system);
        return system;
    }

    async initialize() {
        if (this.state !== "stopped") {
            throw new Error("Engine is already initialized or running");
        }

        this.state = "initializing";
        const initialized = [];

        try {
            for (const system of this.systems) {
                if (typeof system.initialize === "function") {
                    await system.initialize(this);
                }

                initialized.push(system);
            }

            this.state = "ready";
        } catch (error) {
            for (const system of initialized.reverse()) {
                try {
                    await system.dispose?.();
                } catch (disposeError) {
                    console.error("System cleanup failed:", disposeError);
                }
            }

            this.state = "stopped";
            throw error;
        }
    }

    start() {
        if (this.state !== "ready") {
            throw new Error("Engine must be initialized before starting");
        }

        this.state = "running";
    }

    update(deltaTime) {
        if (this.state !== "running") return;

        const dt = Math.min(Math.max(deltaTime, 0), 0.1);

        this.elapsedTime += dt;
        this.frame++;

        for (const system of this.systems) {
            system.update(dt, this.elapsedTime);
        }
    }

    async stop() {
        if (this.state === "stopped") return;

        this.state = "stopping";

        for (const system of [...this.systems].reverse()) {
            try {
                await system.dispose?.();
            } catch (error) {
                console.error("System disposal failed:", error);
            }
        }

        this.elapsedTime = 0;
        this.frame = 0;
        this.state = "stopped";
    }
}
