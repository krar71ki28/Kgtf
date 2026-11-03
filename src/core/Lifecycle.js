export class Lifecycle {
    constructor() {
        this.state = 'idle';
        this.systems = [];
        this.isTransitioning = false;
    }

    register(system) {
        if (this.state !== 'idle' || this.isTransitioning) {
            throw new Error('Cannot register systems after startup.');
        }

        if (!system || typeof system !== 'object') {
            throw new TypeError('Invalid system.');
        }

        for (const method of ['init', 'update', 'dispose']) {
            if (
                system[method] !== undefined &&
                typeof system[method] !== 'function'
            ) {
                throw new TypeError(`System ${method} must be a function.`);
            }
        }

        if (this.systems.some(entry => entry.system === system)) {
            throw new Error('System already registered.');
        }

        this.systems.push({
            system,
            initialized: false
        });

        return system;
    }

    async start(context) {
        if (this.state !== 'idle' || this.isTransitioning) {
            throw new Error('Lifecycle cannot start in its current state.');
        }

        this.isTransitioning = true;
        this.state = 'starting';

        try {
            for (const entry of this.systems) {
                // Mark before init to allow cleanup after partial initialization.
                entry.initialized = true;

                if (entry.system.init) {
                    await entry.system.init(context);
                }
            }

            this.state = 'running';
        } catch (startupError) {
            const cleanupErrors = await this.stopInitializedSystems();

            this.state = 'failed';

            if (cleanupErrors.length > 0) {
                throw new AggregateError(
                    [startupError, ...cleanupErrors],
                    'Startup failed and cleanup was incomplete.',
                    { cause: startupError }
                );
            }

            throw startupError;
        } finally {
            this.isTransitioning = false;
        }
    }

    update(deltaTime, context) {
        if (this.state !== 'running') return;

        if (!Number.isFinite(deltaTime) || deltaTime < 0) {
            throw new RangeError('Invalid delta time.');
        }

        for (const entry of this.systems) {
            if (!entry.initialized) continue;

            if (entry.system.update) {
                entry.system.update(deltaTime, context);
            }
        }
    }

    async stopInitializedSystems() {
        const errors = [];

        for (let i = this.systems.length - 1; i >= 0; i--) {
            const entry = this.systems[i];

            if (!entry.initialized) continue;

            try {
                if (entry.system.dispose) {
                    await entry.system.dispose();
                }
            } catch (error) {
                errors.push(error);
            } finally {
                entry.initialized = false;
            }
        }

        return errors;
    }

    async stop() {
        if (this.isTransitioning) {
            throw new Error('Lifecycle transition already in progress.');
        }

        if (this.state === 'stopped') return;

        this.isTransitioning = true;
        this.state = 'stopping';

        try {
            const errors = await this.stopInitializedSystems();

            if (errors.length > 0) {
                throw new AggregateError(
                    errors,
                    'System shutdown failed.'
                );
            }

            this.state = 'stopped';
        } catch (error) {
            this.state = 'failed';
            throw error;
        } finally {
            this.isTransitioning = false;
        }
    }
}
