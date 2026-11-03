import { Lifecycle } from './Lifecycle.js';
import { Time } from './Time.js';

export class Engine {
    constructor(options = {}) {
        this.lifecycle = new Lifecycle();
        this.time = new Time(options.time);

        this.context = {
            engine: this,
            time: this.time
        };

        this.isRunning = false;
        this.animationFrame = null;
        this.lastError = null;

        this.handleFrame = this.handleFrame.bind(this);
    }

    registerSystem(system) {
        return this.lifecycle.register(system);
    }

    async start() {
        if (this.isRunning) return;

        await this.lifecycle.start(this.context);

        this.lastError = null;
        this.isRunning = true;
        this.time.resetFrame();

        this.animationFrame = requestAnimationFrame(
            this.handleFrame
        );
    }

    handleFrame(timestamp) {
        if (!this.isRunning) return;

        try {
            this.time.update(timestamp);

            this.lifecycle.update(
                this.time.deltaTime,
                this.context
            );

            this.animationFrame = requestAnimationFrame(
                this.handleFrame
            );
        } catch (error) {
            this.lastError = error;
            this.stop().catch(stopError => {
                this.lastError = new AggregateError(
                    [error, stopError],
                    'Engine update and shutdown failed.'
                );
            });
        }
    }

    async stop() {
        if (!this.isRunning && this.lifecycle.state === 'stopped') {
            return;
        }

        this.isRunning = false;

        if (this.animationFrame !== null) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        this.time.pause();

        await this.lifecycle.stop();
    }
}
