import { TransformControls } from "three/addons/controls/TransformControls.js";

export class TransformSystem {
    constructor(scene, camera, domElement, orbitControls) {
        if (!scene || !camera || !domElement || !orbitControls) {
            throw new Error("TransformSystem: missing required dependency");
        }

        this.scene = scene;
        this.orbitControls = orbitControls;
        this.isDragging = false;

        this.controls = new TransformControls(camera, domElement);
        this.helper = this.controls.getHelper();

        this.scene.add(this.helper);

        this.controls.setMode("translate");
        this.controls.setSpace("world");
        this.controls.setSize(0.85);

        this.handleDraggingChanged = (event) => {
            this.isDragging = event.value;
            this.orbitControls.enabled = !event.value;
        };

        this.controls.addEventListener(
            "dragging-changed",
            this.handleDraggingChanged
        );
    }

    syncSelection(object) {
        if (object && object.isObject3D) {
            if (this.controls.object !== object) {
                this.controls.attach(object);
            }
        } else {
            this.controls.detach();
        }
    }

    setMode(mode) {
        const validModes = ["translate", "rotate", "scale"];

        if (!validModes.includes(mode)) {
            throw new Error(`Invalid transform mode: ${mode}`);
        }

        this.controls.setMode(mode);
    }

    dispose() {
        this.controls.removeEventListener(
            "dragging-changed",
            this.handleDraggingChanged
        );

        this.controls.detach();
        this.scene.remove(this.helper);
        this.controls.dispose();

        this.orbitControls.enabled = true;
    }
}
