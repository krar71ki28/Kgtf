import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);

        this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        this.camera.position.set(6, 6, 8);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbit.target.set(0, 1, 0);

        this.scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));

        const light = new THREE.DirectionalLight(0xffffff, 1.5);
        light.position.set(10, 20, 10);
        this.scene.add(light);

        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(200, 200),
            new THREE.MeshStandardMaterial({ color: 0x4a6e52 })
        );
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        this.objects = [];
        this.selectedObj = null;
        this.objectRemovalListeners = new Set();

        this.handleResize = () => this.resize();
        window.addEventListener('resize', this.handleResize);

        this.resize();
        this.createObject('cube');
    }

    onObjectRemoved(callback) {
        this.objectRemovalListeners.add(callback);
        return () => this.objectRemovalListeners.delete(callback);
    }

    createObject(type) {
        let mesh;

        if (type === 'cube') {
            mesh = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1),
                new THREE.MeshStandardMaterial({ color: 0x00e5ff })
            );
            mesh.position.y = 0.5;
        } else if (type === 'sphere') {
            mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.5, 32, 32),
                new THREE.MeshStandardMaterial({ color: 0xff5577 })
            );
            mesh.position.y = 0.5;
        } else if (type === 'character') {
            mesh = new THREE.Group();
            mesh.userData.isCharacter = true;

            const capsule = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.3, 1.23, 8, 16),
                new THREE.MeshStandardMaterial({ color: 0xffaa00 })
            );

            capsule.position.y = 0.915;
            mesh.add(capsule);
        }

        if (!mesh) return null;

        mesh.userData.type = type;
        mesh.userData.disposed = false;

        this.scene.add(mesh);
        this.objects.push(mesh);
        return mesh;
    }

    removeObject(obj) {
        const index = this.objects.indexOf(obj);
        if (index === -1) return false;

        this.objects.splice(index, 1);
        this.scene.remove(obj);
        obj.userData.disposed = true;

        if (this.selectedObj === obj) this.selectedObj = null;

        for (const callback of this.objectRemovalListeners) {
            callback(obj);
        }

        obj.traverse(child => {
            child.geometry?.dispose();

            if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
            } else {
                child.material?.dispose();
            }
        });

        return true;
    }

    clearScene() {
        for (const obj of [...this.objects]) this.removeObject(obj);
        this.selectedObj = null;
    }

    resize() {
        const container = document.getElementById('viewport-container');
        if (!container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;
        if (!width || !height) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height, false);
    }

    update() {
        if (!document.body.classList.contains('play-mode')) {
            this.orbit.update();
        }
    }

    render() {
        this.renderer.render(this.scene, this.camera);
    }
}
