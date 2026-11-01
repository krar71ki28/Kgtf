import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Physics } from './Physics.js?v=126';
import { Serializer } from './Serializer.js?v=126';
import { Animator } from './Animator.js?v=126';
import { LogicManager } from './Logic.js?v=126';
import { Environment } from './Environment.js?v=126';

// ✅ خط رسم مستقر: Bloom + SMAA فقط (بدون God Rays أو SSAO)
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

export class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        this.camera.position.set(6, 6, 8);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.6;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;

        this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbit.target.set(0, 1, 0);

        this.environment = new Environment(this);

        // ✅ خط معالجة الرسم المستقر
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        // Bloom (توهج خفيف)
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.2, 0.4, 0.9);
        this.composer.addPass(this.bloomPass);

        // SMAA (تنعيم الحواف)
        const smaaPass = new SMAAPass(window.innerWidth * this.renderer.getPixelRatio(), window.innerHeight * this.renderer.getPixelRatio());
        this.composer.addPass(smaaPass);

        // Output (التصحيح النهائي)
        this.composer.addPass(new OutputPass());

        // ✅ أرضية احترافية بنسيج إجرائي (Procedural Grass Texture)
        const groundTexture = this.createGrassTexture();
        const groundMat = new THREE.MeshStandardMaterial({ 
            map: groundTexture,
            roughness: 0.9, 
            metalness: 0.1 
        });
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const grid = new THREE.GridHelper(200, 100, 0x00e5ff, 0x111111);
        grid.position.y = 0.01;
        grid.material.opacity = 0.1;
        grid.material.transparent = true;
        this.scene.add(grid);

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

    // ✅ دالة توليد نسيج العشب برمجياً
    createGrassTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#2e4a35';
        ctx.fillRect(0, 0, 256, 256);

        for (let i = 0; i < 5000; i++) {
            const x = Math.random() * 256;
            const y = Math.random() * 256;
            const size = Math.random() * 3 + 1;
            
            const r = Math.floor(30 + Math.random() * 20);
            const g = Math.floor(60 + Math.random() * 40);
            const b = Math.floor(30 + Math.random() * 20);
            
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(x, y, size, size);
        }

        const texture = new THREE.CanvasTexture(canvas);
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(50, 50);
        return texture;
    }

    createObject(type) {
        let mesh;
        const material = new THREE.MeshStandardMaterial({ color: 0x00e5ff });
        
        if (type === 'cube') {
            mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
            mesh.position.y = 0.5;
            mesh.castShadow = true; mesh.receiveShadow = true;
        } else if (type === 'sphere') {
            mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), material);
            mesh.position.y = 0.5;
            mesh.castShadow = true; mesh.receiveShadow = true;
        } else if (type === 'character') {
            mesh = new THREE.Group();
            mesh.userData.isCharacter = true;
            
            const placeholder = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.2, 4, 8), new THREE.MeshStandardMaterial({ color: 0xffaa00 }));
            placeholder.position.y = 1;
            mesh.add(placeholder);
            
            this.loader.load('models/character.glb', (gltf) => {
                mesh.remove(placeholder); 
                const model = gltf.scene;
                model.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
                mesh.add(model);
                
                if (gltf.animations && gltf.animations.length > 0) {
                    mesh.userData.animator = new Animator(model, gltf.animations);
                    mesh.userData.animationNames = gltf.animations.map(clip => clip.name);
                }
                
                if (this.onSceneChangeCallback) this.onSceneChangeCallback();
                if (this.onSelectCallback && this.selectedObj === mesh) this.onSelectCallback(mesh);
            }, undefined, (err) => { console.warn('GLB Error'); });
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
        // مسح المشهد القديم قسرياً لتجنب التعارضات
        localStorage.removeItem('kgtf_saved_scene');
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
        this.composer.setSize(c.clientWidth, c.clientHeight);
    }

    update(dt) {
        if (!document.body.classList.contains('play-mode')) {
            this.orbit.update();
            this.objects.forEach(o => {
                if (o.userData.animator) o.userData.animator.update(dt);
            });
        }
        this.physics.update(dt);
        this.environment.update(dt);
    }

    render() { 
        this.composer.render(); 
    }
}
