export class InputManager {
    constructor(element = document) {
        this.element = element;

        this.pointer = {
            x: 0,
            y: 0,
            normalizedX: 0,
            normalizedY: 0,
            isDown: false,
            button: -1,
            pointerId: null
        };

        this.keys = new Set();
        this.isInitialized = false;

        this.handlePointerDown = this.handlePointerDown.bind(this);
        this.handlePointerMove = this.handlePointerMove.bind(this);
        this.handlePointerUp = this.handlePointerUp.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handleKeyUp = this.handleKeyUp.bind(this);
    }

    init() {
        if (this.isInitialized) return;

        this.element.addEventListener(
            'pointerdown',
            this.handlePointerDown
        );

        window.addEventListener(
            'pointermove',
            this.handlePointerMove
        );

        window.addEventListener(
            'pointerup',
            this.handlePointerUp
        );

        window.addEventListener(
            'pointercancel',
            this.handlePointerUp
        );

        window.addEventListener(
            'keydown',
            this.handleKeyDown
        );

        window.addEventListener(
            'keyup',
            this.handleKeyUp
        );

        this.isInitialized = true;
    }

    updatePointerPosition(event) {
        const rect = this.element === document
            ? {
                left: 0,
                top: 0,
                width: window.innerWidth,
                height: window.innerHeight
            }
            : this.element.getBoundingClientRect();

        if (rect.width <= 0 || rect.height <= 0) return;

        this.pointer.x = event.clientX - rect.left;
        this.pointer.y = event.clientY - rect.top;

        this.pointer.normalizedX =
            (this.pointer.x / rect.width) * 2 - 1;

        this.pointer.normalizedY =
            -(this.pointer.y / rect.height) * 2 + 1;
    }

    handlePointerDown(event) {
        if (this.pointer.isDown) return;

        this.updatePointerPosition(event);

        this.pointer.isDown = true;
        this.pointer.button = event.button;
        this.pointer.pointerId = event.pointerId;
    }

    handlePointerMove(event) {
        this.updatePointerPosition(event);
    }

    handlePointerUp(event) {
        if (this.pointer.pointerId !== event.pointerId) return;

        this.pointer.isDown = false;
        this.pointer.button = -1;
        this.pointer.pointerId = null;
    }

    handleKeyDown(event) {
        this.keys.add(event.code);
    }

    handleKeyUp(event) {
        this.keys.delete(event.code);
    }

    isKeyDown(code) {
        return this.keys.has(code);
    }

    dispose() {
        if (!this.isInitialized) return;

        this.element.removeEventListener(
            'pointerdown',
            this.handlePointerDown
        );

        window.removeEventListener(
            'pointermove',
            this.handlePointerMove
        );

        window.removeEventListener(
            'pointerup',
            this.handlePointerUp
        );

        window.removeEventListener(
            'pointercancel',
            this.handlePointerUp
        );

        window.removeEventListener(
            'keydown',
            this.handleKeyDown
        );

        window.removeEventListener(
            'keyup',
            this.handleKeyUp
        );

        this.pointer.isDown = false;
        this.pointer.pointerId = null;
        this.pointer.button = -1;

        this.keys.clear();
        this.isInitialized = false;
    }
}
