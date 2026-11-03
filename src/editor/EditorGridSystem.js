import * as THREE from 'three';

export class EditorGridSystem {
    constructor(renderer) {
        this.renderer = renderer;
        this.group = new THREE.Group();
        this.group.name = 'KGTF Editor Grid';
    }

    init() {
        const scene = this.renderer.scene;

        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(400, 400),
            new THREE.MeshBasicMaterial({
                color: 0x383838
            })
        );

        floor.rotation.x = -Math.PI / 2;
        floor.position.y = -0.025;
        floor.name = 'Editor Floor';

        this.group.add(floor);

        const minorGrid = new THREE.GridHelper(
            100,
            100,
            0x858585,
            0x555555
        );

        minorGrid.position.y = 0;
        minorGrid.material.transparent = true;
        minorGrid.material.opacity = 0.7;

        this.group.add(minorGrid);

        const majorGrid = new THREE.GridHelper(
            100,
            10,
            0xa0a0a0,
            0x777777
        );

        majorGrid.position.y = 0.002;
        majorGrid.material.transparent = true;
        majorGrid.material.opacity = 0.9;

        this.group.add(majorGrid);

        const axes = new THREE.AxesHelper(5);
        axes.position.y = 0.01;

        this.group.add(axes);

        scene.add(this.group);
    }

    dispose() {
        this.group.traverse(object => {
            if (object.geometry) {
                object.geometry.dispose();
            }

            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose());
                } else {
                    object.material.dispose();
                }
            }
        });

        this.renderer.scene.remove(this.group);
        this.group.clear();
    }
}
