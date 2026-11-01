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

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);

        const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x4a6e52 }));
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        // إنشاء الشخصية
        this.player = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.2, 4, 8), new THREE.MeshStandardMaterial({ color: 0xffaa00 }));
        this.player.position.y = 1;
        this.scene.add(this.player);

        window.addEventListener('resize', () => this.resize());
        this.resize();
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
    }

    render() { 
        this.renderer.render(this.scene, this.camera); 
    }
}
