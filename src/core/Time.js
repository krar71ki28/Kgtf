export class Time {
    constructor() {
        this.deltaTime = 0;
        this.elapsedTime = 0;
        this.frame = 0;
        this.fps = 0;

        this.maxDeltaTime = 0.1;
        this.fpsUpdateInterval = 0.5;

        this.fpsElapsed = 0;
        this.fpsFrames = 0;
        this.lastTimestamp = null;
    }

    start(timestamp = performance.now()) {
        this.deltaTime = 0;
        this.elapsedTime = 0;
        this.frame = 0;
        this.fps = 0;

        this.fpsElapsed = 0;
        this.fpsFrames = 0;
        this.lastTimestamp = timestamp;
    }

    update(timestamp = performance.now()) {
        if (this.lastTimestamp === null) {
            this.start(timestamp);
            return 0;
        }

        const rawDelta = Math.max(
            0,
            (timestamp - this.lastTimestamp) / 1000
        );

        this.lastTimestamp = timestamp;

        this.deltaTime = Math.min(
            rawDelta,
            this.maxDeltaTime
        );

        this.elapsedTime += this.deltaTime;
        this.frame++;

        this.fpsElapsed += rawDelta;
        this.fpsFrames++;

        if (this.fpsElapsed >= this.fpsUpdateInterval) {
            this.fps = Math.round(
                this.fpsFrames / this.fpsElapsed
            );

            this.fpsElapsed = 0;
            this.fpsFrames = 0;
        }

        return this.deltaTime;
    }

    reset() {
        this.start();
    }
}
