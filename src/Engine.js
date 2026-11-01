import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Physics } from './Physics.js?v=102';

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

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
        this.scene.add(hemiLight);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);

        const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x4a6e52 }));
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        this.physics = new Physics(this);
        this.objects = [];
        this.selectedObj = null;
        this.onSelectCallback = null;
        this.onSceneChangeCallback = null;

        window.addEventListener('resize', () => this.resize());
        this.resize();
        
        this.createObject('cube');
    }

    createObject(type) {
        let mesh;
        const material = new THREE.MeshStandardMaterial({ color: 0x00e5ff });
        
        if (type === 'cube') {
            mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
            mesh.position.y = 0.5;
        } else if (type === 'sphere') {
            mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), material);
            mesh.position.y = 0.5;
        } else if (type === 'character') {
            mesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.2, 4, 8), new THREE.MeshStandardMaterial({ color: 0xffaa00 }));
            mesh.position.y = 1;
            mesh.userData.isCharacter = true;
        }

        mesh.userData.type = type;
        mesh.userData.physicsEnabled = false; // افتراضياً الجاذبية مقفلة
        
        this.scene.add(mesh);
        this.objects.push(mesh);
        this.physics.addNode(mesh);
        this.selectObject(mesh);
        if (this.onSceneChangeCallback) this.onSceneChangeCallback();
        return mesh;
    }

    removeObject(obj) {
        this.scene.remove(obj);
        this.physics.removeNode(obj);
        this.objects = this.objects.filter(o => o !== obj);
        this.selectObject(null);
        if (this.onSceneChangeCallback) this.onSceneChangeCallback();
    }

    clearScene() {
        this.objects.forEach(o => {
            this.scene.remove(o);
            this.physics.removeNode(o);
        });
        this.objects = [];
        this.selectObject(null);
        if (this.onSceneChangeCallback) this.onSceneChangeCallback();
    }

    selectObject(obj) {
        this.selectedObj = obj;
        if (this.onSelectCallback) this.onSelectCallback(obj);
    }

    resize() {
        const c = document.getElementById('viewport-container');
        this.camera.aspect = c.clientWidth / c.clientHeight; 
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(c.clientWidth, c.clientHeight, false);
    }

    update(dt) {
        if (!document.body.classList.contains('play-mode')) {
            this.orbit.update();
        }
        // تحديث الفيزياء دائماً لكي تسقط المجسمات
        this.physics.update(dt);
    }

    render() { this.renderer.render(this.scene, this.camera); }
}
