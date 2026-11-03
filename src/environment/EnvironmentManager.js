import * as THREE from 'three';

export class EnvironmentManager {
    constructor(renderer, editorGrid, sky) {
        this.renderer = renderer;
        this.editorGrid = editorGrid;
        this.sky = sky;

        this.mode = 'editor';

        this.editorBackground = new THREE.Color(0x383838);
    }

    init() {
        this.setMode('editor');
    }

    setMode(mode) {
        if (mode !== 'editor' && mode !== 'play') {
            throw new Error(`Unknown environment mode: ${mode}`);
        }

        const scene = this.renderer.scene;

        this.mode = mode;

        if (mode === 'editor') {
            this.sky.setSkyVisible(false);
            scene.background = this.editorBackground.clone();
            scene.fog = null;
        } else {
            scene.background = null;
            this.sky.setSkyVisible(true);
        }
    }

    getMode() {
        return this.mode;
    }

    dispose() {
        // الأنظمة الفرعية تُدار وتُزال بشكل مستقل
        this.mode = 'editor';
    }
}
