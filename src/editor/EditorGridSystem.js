import * as THREE from 'three';

export class EditorGridSystem {
    constructor(renderer) {
        this.renderer = renderer;
        this.group = new THREE.Group();
        this.group.name = 'KGTF Editor Ground';

        this.floor = null;
    }

    init() {
        if (this.floor) return;

        const scene = this.renderer.scene;

        // أرضية المحرر الرمادية
        this.floor = new THREE.Mesh(
            new THREE.PlaneGeometry(4000, 4000),
            new THREE.MeshBasicMaterial({
                color: 0x383838,
                depthWrite: true,
                toneMapped: false
            })
        );

        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.y = -0.03;
        this.floor.name = 'Editor Ground';
        this.group.add(this.floor);

        // شبكة المربعات الصغيرة
        const minorGrid = new THREE.GridHelper(
            100,
            100,
            0x999999,
            0x606060
        );

        minorGrid.position.y = 0;
        minorGrid.material.transparent = true;
        minorGrid.material.opacity = 0.75;
        minorGrid.material.depthWrite = false;
        minorGrid.name = 'Minor Grid';

        this.group.add(minorGrid);

        // الخطوط الرئيسية
        const majorGrid = new THREE.GridHelper(
            100,
            10,
            0xb0b0b0,
            0x858585
        );

        majorGrid.position.y = 0.003;
        majorGrid.material.transparent = true;
        majorGrid.material.opacity = 0.9;
        majorGrid.material.depthWrite = false;
        majorGrid.name = 'Major Grid';

        this.group.add(majorGrid);

        // محاور العالم
        const axes = new THREE.AxesHelper(5);
        axes.position.y = 0.01;
        axes.name = 'World Axes';

        this.group.add(axes);

        scene.add(this.group);
    }

    dispose() {
        const scene = this.renderer.scene;

        this.group.traverse(object => {
            if (object.geometry) {
                object.geometry.dispose();
            }

            if (object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => {
                        material.dispose();
                    });
                } else {
                    object.material.dispose();
                }
            }
        });

        scene.remove(this.group);
        this.group.clear();
        this.floor = null;
    }
}
