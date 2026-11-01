import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Physics } from './Physics.js?v=107';
import { Serializer } from './Serializer.js?v=107';

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
            // ✅ الحل الهندسي: استخدام Group كحاوية بدلاً من Mesh
            mesh = new THREE.Group();
            mesh.position.y = 0; // نضع الحاوية على الأرض
            mesh.userData.isCharacter = true;
            
            // 1. إنشاء الكبسولة المؤقتة
            const placeholder = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.4, 1.2, 4, 8), 
                new THREE.MeshStandardMaterial({ color: 0xffaa00 })
            );
            placeholder.position.y = 1;
            mesh.add(placeholder);
            
            // 2. تحميل الشخصية الحقيقية
            this.loader.load('models/character.glb', (gltf) => {
                mesh.remove(placeholder); // حذف الكبسولة نهائياً
                const model = gltf.scene;
                
                // إصلاح حجم وموقع الشخصية لتناسب المحرك
                model.scale.set(1, 1, 1); 
                
                mesh.add(model);
                if (this.onSceneChangeCallback) this.onSceneChangeCallback();
            }, undefined, (err) => {
                console.warn('لم يتم العثور على ملف character.glb، سنستخدم الكبسولة المؤقتة.');
            });
        }

        mesh.userData.type = type;
        mesh.userData.physicsEnabled = false;
        
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
        }
        this.physics.update(dt);
    }

    render() { this.renderer.render(this.scene, this.camera); }
}
