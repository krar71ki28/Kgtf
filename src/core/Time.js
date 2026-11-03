export class Time {
    constructor(options = {}) {
        this.maxDelta = options.maxDelta ?? 0.05;

        if (!Number.isFinite(this.maxDelta) || this.maxDelta <= 0) {
            throw new RangeError('maxDelta must be a positive number.');
        }

        this.elapsedTime = 0;
        this.deltaTime = 0;
        this.rawDeltaTime = 0;
        this.frame = 0;
        this.fps = 0;

        this.lastTimestamp = null;
        this.isPaused = false;
    }

    update(timestamp) {
        if (!Number.isFinite(timestamp)) {
            throw new TypeError('Invalid timestamp.');
        }

        if (this.lastTimestamp === null) {
            this.lastTimestamp = timestamp;
            this.deltaTime = 0;
            this.rawDeltaTime = 0;
            return;
        }

        const rawDelta = Math.max(
            0,
            (timestamp - this.lastTimestamp) / 1000
        );

        this.lastTimestamp = timestamp;
        this.rawDeltaTime = rawDelta;

        if (this.isPaused) {
            this.deltaTime = 0;
            return;
        }

        this.deltaTime = Math.min(rawDelta, this.maxDelta);
        this.elapsedTime += this.deltaTime;
        this.frame++;

        if (rawDelta > 0) {
            this.fps = 1 / rawDelta;
        }
    }

    pause() {
        this.isPaused = true;
    }

    resume(timestamp = null) {
        this.isPaused = false;

        if (Number.isFinite(timestamp)) {
            this.lastTimestamp = timestamp;
        }
    }

    reset() {
        this.elapsedTime = 0;
        this.deltaTime = 0;
        this.rawDeltaTime = 0;
        this.frame = 0;
        this.fps = 0;
        this.lastTimestamp = null;
        this.isPaused = false;
    }
}
