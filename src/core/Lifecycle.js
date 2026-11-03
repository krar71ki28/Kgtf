export class Lifecycle {
    constructor() {
        this.state = "idle";
        this.systems = [];
        this.initializedSystems = [];
    }

    register(system) {
        if (!system || typeof system !== "object") {
            throw new TypeError("Invalid lifecycle system");
        }

        if (this.state !== "idle") {
            throw new Error("Cannot register systems after initialization");
        }

        if (this.systems.includes(system)) {
            throw new Error("System already registered");
        }

        this.systems.push(system);
        return system;
    }

    async initialize(context) {
        if (this.state !== "idle") {
            throw new Error("Lifecycle already initialized");
        }

        this.state = "initializing";

        try {
            for (const system of this.systems) {
                if (typeof system.initialize === "function") {
                    await system.initialize(context);
                }

                this.initializedSystems.push(system);
            }

            this.state = "ready";
        } catch (error) {
            await this.shutdown();
            throw error;
        }
    }

    async shutdown() {
        if (this.state === "stopped") return;

        this.state = "stopping";
        const systems = [...this.initializedSystems].reverse();

        for (const system of systems) {
            try {
                await system.dispose?.();
            } catch (error) {
                console.error("Lifecycle cleanup error:", error);
            }
        }

        this.initializedSystems = [];
        this.state = "stopped";
    }
}
