export class Time {
    constructor(options = {}) {
        this.maxDelta = options.maxDelta ?? 0.05;

        if (!Number.isFinite(this.maxDelta) || this.maxDelta <= 0) {
            throw new RangeError('maxDelta must be positive.');
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

        this.fps = rawDelta > 0 ? 1 / rawDelta : 0;
    }

    pause() {
        if (this.isPaused) return;

        this.isPaused = true;
        this.deltaTime = 0;
    }

    resume(timestamp = null) {
        if (!this.isPaused) return;

        this.isPaused = false;
        this.deltaTime = 0;
        this.rawDeltaTime = 0;
        this.lastTimestamp = Number.isFinite(timestamp)
            ? timestamp
            : null;
    }

    resetFrame() {
        this.lastTimestamp = null;
        this.deltaTime = 0;
        this.rawDeltaTime = 0;
        this.fps = 0;
    }

    reset() {
        this.elapsedTime = 0;
        this.frame = 0;
        this.resetFrame();
        this.isPaused = false;
    }
}
