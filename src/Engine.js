import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Physics } from './Physics.js?v=115';
import { Serializer } from './Serializer.js?v=115';
import { Animator } from './Animator.js?v=115';
import { LogicManager } from './Logic.js?v=115';
import { Environment } from './Environment.js?v=115';

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

        // ✅ استخدام البيئة الجديدة
        this.environment = new Environment(this.scene);

        const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x4a6e52 }));
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        this.physics = new Physics(this);
        this.logic = new LogicManager(this);
        this.loader = new GLTFLoader(); 
        this.objects = [];
        this.selectedObj = null;
        this.onSelectCallback = null;
        this.onSceneChangeCallback = null;

        window.addEventListener('resize', () => this.resize());
        this.resize();
        
        this.loadScene();
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
                
                if (gltf.animations && gltf.animations.length > 0) {
                    mesh.userData.animator = new Animator(model, gltf.animations);
                    mesh.userData.animationNames = gltf.animations.map(clip => clip.name);
                }
                
                if (this.onSceneChangeCallback) this.onSceneChangeCallback();
                if (this.onSelectCallback && this.selectedObj === mesh) this.onSelectCallback(mesh);
            }, undefined, (err) => {
                console.warn('لم يتم العثور على ملف character.glb.');
            });
        }

        mesh.userData.type = type;
        mesh.userData.physicsEnabled = false;
        mesh.userData.logic = [];
        
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

    saveScene() {
        const data = this.objects.map(o => Serializer.serialize(o));
        localStorage.setItem('kgtf_saved_scene', JSON.stringify(data));
        alert('تم حفظ المشهد بنجاح!');
    }

    loadScene() {
        const raw = localStorage.getItem('kgtf_saved_scene');
        if (raw) {
            try {
                const data = JSON.parse(raw);
                this.clearScene();
                data.forEach(d => Serializer.deserialize(d, this));
                this.selectObject(null);
                return;
            } catch (e) {
                console.error("Load failed:", e);
            }
        }
        this.clearScene();
        this.createObject('cube');
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
            this.objects.forEach(o => {
                if (o.userData.animator) o.userData.animator.update(dt);
            });
        }
        this.physics.update(dt);
        this.environment.update(dt); // ✅ تحديث المطر
    }

    render() { this.renderer.render(this.scene, this.camera); }
}
