import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // سماء زرقاء بسيطة

        this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        this.camera.position.set(6, 6, 8);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 

        this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbit.target.set(0, 1, 0);

        // ✅ إضاءة بسيطة جداً (بدون ظلال)
        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);

        // أرضية مسطحة بسيطة
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(200, 200), 
            new THREE.MeshStandardMaterial({ color: 0x4a6e52 })
        );
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        this.loader = new GLTFLoader(); 
        this.objects = [];
        this.selectedObj = null;

        window.addEventListener('resize', () => this.resize());
        this.resize();
        
        this.createObject('cube');
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
            
            const placeholder = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.4, 1.2, 4, 8), 
                new THREE.MeshStandardMaterial({ color: 0xffaa00 })
            );
            placeholder.position.y = 1; 
            mesh.add(placeholder);
            
            this.loader.load('models/character.glb', (gltf) => {
                mesh.remove(placeholder); 
                const model = gltf.scene;
                mesh.add(model);
            }, undefined, (err) => { console.warn('GLB Error'); });
        }

        if (!mesh) return null;

        mesh.userData.type = type;
        this.scene.add(mesh);
        this.objects.push(mesh);
        return mesh;
    }

    removeObject(obj) {
        this.scene.remove(obj);
        this.objects = this.objects.filter(o => o !== obj);
    }

    clearScene() {
        this.objects.forEach(o => this.scene.remove(o));
        this.objects = [];
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
