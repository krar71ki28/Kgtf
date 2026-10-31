import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

import { VFXManager } from './VFX.js?v=4.2.0';
import { Physics } from './Physics.js?v=4.2.0';
import { LogicManager } from './Logic.js?v=4.2.0';
import { UIManager } from './UI.js?v=4.2.0';
import { AssetManager } from './AssetManager.js?v=4.2.0';

export class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 30, 120);

        this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        this.camera.position.set(6, 6, 8);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; 

        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        const smaaPass = new SMAAPass(window.innerWidth * this.renderer.getPixelRatio(), window.innerHeight * this.renderer.getPixelRatio());
        this.composer.addPass(smaaPass);
        this.composer.addPass(new OutputPass());

        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.5);
        this.scene.add(this.hemiLight);

        this.sun = new THREE.DirectionalLight(0xfff5e6, 2.5);
        this.sun.position.set(15, 25, 15);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.width = 2048;
        this.sun.shadow.mapSize.height = 2048;
        this.sun.shadow.camera.near = 1;
        this.sun.shadow.camera.far = 50;
        this.sun.shadow.camera.left = -20;
        this.sun.shadow.camera.right = 20;
        this.sun.shadow.camera.top = 20;
        this.sun.shadow.camera.bottom = -20;
        this.sun.shadow.bias = -0.0005;
        this.scene.add(this.sun);

        this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbit.target.set(0, 1, 0);
        this.orbit.enableDamping = true;
        this.orbit.maxPolarAngle = Math.PI / 2.05;

        this.setupGround();

        this.objects = [];
        this.selectedObj = null;
        this.loader = new GLTFLoader();
        this.rainSystem = null;
        
        this.vfxManager = new VFXManager(this.scene);
        this.physics = new Physics(this);
        this.logic = new LogicManager(this);
        this.ui = new UIManager();
        this.assetManager = new AssetManager(this);
        
        this.transform = new TransformControls(this.camera, this.renderer.domElement);
        this.transform.addEventListener('dragging-changed', (e) => { this.orbit.enabled = !e.value; });
        this.scene.add(this.transform);
        
        this.onSelectCallback = null;
        this.onSceneChangeCallback = null;

        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    setupGround() {
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a5a40, roughness: 0.8, metalness: 0.2 });
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const grid = new THREE.GridHelper(200, 100, 0x00e5ff, 0x222222);
        grid.position.y = 0.01;
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        this.scene.add(grid);
    }

    toggleNightMode(isNight) {
        if (isNight) {
            this.scene.background.setHex(0x050510); 
            this.scene.fog.color.setHex(0x050510);
            this.sun.intensity = 0.2; this.hemiLight.intensity = 0.3;
        } else {
            this.scene.background.setHex(0x87CEEB); 
            this.scene.fog.color.setHex(0x87CEEB);
            this.sun.intensity = 2.5; this.hemiLight.intensity = 1.5;
        }
    }

    toggleRain(enabled) {
        if (enabled && !this.rainSystem) {
            const count = 1500;
            const geo = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 80;
                positions[i * 3 + 1] = Math.random() * 40;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
            }
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const mat = new THREE.PointsMaterial({ color: 0xaaaaaa, size: 0.15, transparent: true, opacity: 0.6 });
            this.rainSystem = new THREE.Points(geo, mat);
            this.scene.add(this.rainSystem);
        } else if (!enabled && this.rainSystem) {
            this.scene.remove(this.rainSystem);
            this.rainSystem.geometry.dispose();
            this.rainSystem.material.dispose();
            this.rainSystem = null;
        }
    }

    createObject(type) {
        let group = new THREE.Group();
        group.userData.type = type;
        group.userData.physics = { vy: 0, enabled: false };
        group.userData.logic = [];
        
        if (type === 'cube') {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.3, metalness: 0.6 }));
            mesh.position.y = 0.5; group.add(mesh);
        } else if (type === 'sphere') {
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 64, 64), new THREE.MeshStandardMaterial({ color: 0xff5577, roughness: 0.1, metalness: 0.1 }));
            mesh.position.y = 0.5; group.add(mesh);
        } else if (type === 'tree') {
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.5, 16), new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 }));
            trunk.position.y = 0.75;
            const leaves = new THREE.Mesh(new THREE.ConeGeometry(1, 1.5, 16), new THREE.MeshStandardMaterial({ color: 0x2d5a27, roughness: 0.8 }));
            leaves.position.y = 1.8;
            group.add(trunk, leaves);
        } else if (type === 'light') {
            const light = new THREE.PointLight(0xffaa00, 20, 20); light.position.y = 2;
            const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0xffaa00 })); bulb.position.y = 2;
            group.add(light, bulb);
        } else if (type === 'character') {
            group.userData.isCharacter = true;
            const tempMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 8, 16), new THREE.MeshStandardMaterial({ color: 0x888888 }));
            tempMesh.position.y = 0.75; group.add(tempMesh);
            
            this.loader.load('models/character.glb', (gltf) => {
                group.clear(); 
                const model = gltf.scene;
                model.traverse(c => { 
                    if (c.isMesh) { 
                        c.castShadow = true; c.receiveShadow = true; 
                        if(c.material) { c.material.roughness = 0.5; c.material.metalness = 0.2; }
                    } 
                });
                group.add(model);
                if (gltf.animations && gltf.animations.length > 0) {
                    group.userData.mixer = new THREE.AnimationMixer(model);
                    group.userData.actions = {};
                    gltf.animations.forEach(clip => { group.userData.actions[clip.name] = group.userData.mixer.clipAction(clip); });
                    const idleKey = Object.keys(group.userData.actions).find(k => k.toLowerCase().includes('idle'));
                    if (idleKey) { group.userData.actions[idleKey].play(); group.userData.currentAction = idleKey; }
                }
            }, undefined, (err) => console.warn('فشل تحميل GLB'));
        } else if (type === 'vfx-fire') {
            this.vfxManager.createFire(new THREE.Vector3(0, 0.5, 0));
            return null;
        } else if (type === 'vfx-smoke') {
            this.vfxManager.createSmoke(new THREE.Vector3(0, 0.5, 0));
            return null;
        }

        group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
        this.scene.add(group);
        this.objects.push(group);
        this.selectObject(group);
        if (this.onSceneChangeCallback) this.onSceneChangeCallback();
        return group;
    }

    // ==========================================
    // دالة الحذف الآمن (تنظف الذاكرة)
    // ==========================================
    removeObject(obj) {
        if (!obj) return;
        
        // إزالة من المشهد
        this.scene.remove(obj);
        
        // تنظيف الهندسة والمواد من الذاكرة (منع تسريب الذاكرة)
        obj.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) {
                if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
                else c.material.dispose();
            }
        });

        // إزالة من المصفوفة
        this.objects = this.objects.filter(o => o !== obj);
        
        // إلغاء التحديد
        this.selectObject(null);
        if (this.onSceneChangeCallback) this.onSceneChangeCallback();
    }

    // ==========================================
    // دالة التكرار الآمن (Duplicate)
    // ==========================================
    duplicateObject(obj) {
        if (!obj) return null;
        if (obj.userData.isCharacter) {
            alert("لا يمكن تكرار الشخصية (GLB) حالياً لتجنب مشاكل الأنميشن.");
            return null;
        }

        // استنساخ عميق (Deep Clone)
        const clone = obj.clone(true);
        
        // إزاحة المجسم الجديد قليلاً عشان ما يتراكب مع الأصلي
        clone.position.x += 1.5;

        // نسخ البيانات (Logic, Physics) مع إعطاء ID جديد
        clone.userData = JSON.parse(JSON.stringify(obj.userData));
        clone.userData.id = Date.now() + Math.random(); // ID جديد
        
        this.scene.add(clone);
        this.objects.push(clone);
        this.selectObject(clone);
        
        if (this.onSceneChangeCallback) this.onSceneChangeCallback();
        return clone;
    }

    selectObject(obj) {
        this.selectedObj = obj;
        if (obj) this.transform.attach(obj);
        else this.transform.detach();
        if (this.onSelectCallback) this.onSelectCallback(obj);
    }

    clearScene() {
        this.objects.forEach(o => this.scene.remove(o));
        this.objects = [];
        this.selectObject(null);
        if (this.onSceneChangeCallback) this.onSceneChangeCallback();
    }

    startGameLogic() {
        this.logic.resetScore();
        this.objects.forEach(obj => {
            if (obj.userData.logic) {
                this.logic.triggerEvent(obj, 'onStart');
            }
        });
    }

    update(dt) {
        if (!document.body.classList.contains('play-mode')) {
            this.orbit.update();
            this.physics.updateGravity(dt);
        }
        
        this.objects.forEach(o => { if (o.userData.mixer) o.userData.mixer.update(dt); });
        this.vfxManager.update(dt);

        if (this.rainSystem) {
            const pos = this.rainSystem.geometry.attributes.position.array;
            for (let i = 0; i < pos.length; i += 3) {
                pos[i + 1] -= 25 * dt;
                if (pos[i + 1] < 0) pos[i + 1] = 40;
            }
            this.rainSystem.geometry.attributes.position.needsUpdate = true;
        }
    }

    render() { this.composer.render(); }

    resize() {
        const c = document.getElementById('viewport-container');
        this.camera.aspect = c.clientWidth / c.clientHeight; 
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(c.clientWidth, c.clientHeight, false);
        this.composer.setSize(c.clientWidth, c.clientHeight);
    }
}
