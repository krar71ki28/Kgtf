import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VFXManager } from './VFX.js';
import { Physics } from './Physics.js';
import { LogicManager } from './Logic.js';
import { UIManager } from './UI.js';

export class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 40, 150);

        this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        this.camera.position.set(6, 6, 8);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbit.target.set(0, 1, 0);
        this.orbit.enableDamping = true;
        this.orbit.maxPolarAngle = Math.PI / 2.05;

        this.setupLights();
        this.setupGround();

        this.objects = [];
        this.selectedObj = null;
        this.loader = new GLTFLoader();
        this.rainSystem = null;
        
        this.vfxManager = new VFXManager(this.scene);
        this.physics = new Physics(this);
        this.logic = new LogicManager(this);
        this.ui = new UIManager();
        
        this.transform = new TransformControls(this.camera, this.renderer.domElement);
        this.transform.addEventListener('dragging-changed', (e) => { this.orbit.enabled = !e.value; });
        this.scene.add(this.transform);
        
        this.onSelectCallback = null;
        this.onSceneChangeCallback = null;

        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    setupLights() {
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
        this.scene.add(this.hemiLight);
        this.sun = new THREE.DirectionalLight(0xffffff, 1.8);
        this.sun.position.set(10, 20, 10);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.width = 1024;
        this.sun.shadow.mapSize.height = 1024;
        this.scene.add(this.sun);
    }

    setupGround() {
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x4a6e52 }));
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const grid = new THREE.GridHelper(100, 100, 0x00e5ff, 0x556677);
        grid.position.y = 0.01;
        this.scene.add(grid);
    }

    toggleNightMode(isNight) {
        if (isNight) {
            this.scene.background.setHex(0x050510); this.scene.fog.color.setHex(0x050510);
            this.sun.intensity = 0; this.hemiLight.intensity = 0.2;
        } else {
            this.scene.background.setHex(0x87CEEB); this.scene.fog.color.setHex(0x87CEEB);
            this.sun.intensity = 1.8; this.hemiLight.intensity = 1.2;
        }
    }

    toggleRain(enabled) {
        if (enabled && !this.rainSystem) {
            const count = 800;
            const geo = new THREE.BufferGeometry();
            const positions = new Float32Array(count * 3);
            for (let i = 0; i < count; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 60;
                positions[i * 3 + 1] = Math.random() * 30;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 60;
            }
            geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            const mat = new THREE.PointsMaterial({ color: 0xaaccff, size: 0.1, transparent: true, opacity: 0.7 });
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
        group.userData.logic = []; // مصفوفة الأحداث
        
        if (type === 'cube') {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x00e5ff }));
            mesh.position.y = 0.5; group.add(mesh);
        } else if (type === 'sphere') {
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshStandardMaterial({ color: 0xff5577 }));
            mesh.position.y = 0.5; group.add(mesh);
        } else if (type === 'tree') {
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0x5c3a21 }));
            trunk.position.y = 0.75;
            const leaves = new THREE.Mesh(new THREE.ConeGeometry(1, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0x2d5a27 }));
            leaves.position.y = 1.8;
            group.add(trunk, leaves);
        } else if (type === 'light') {
            const light = new THREE.PointLight(0xffaa00, 15, 20); light.position.y = 2;
            const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0xffaa00 })); bulb.position.y = 2;
            group.add(light, bulb);
        } else if (type === 'character') {
            group.userData.isCharacter = true;
            const tempMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 4, 8), new THREE.MeshStandardMaterial({ color: 0x888888 }));
            tempMesh.position.y = 0.75; group.add(tempMesh);
            
            this.loader.load('models/character.glb', (gltf) => {
                group.clear(); 
                const model = gltf.scene;
                model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
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
                pos[i + 1] -= 20 * dt;
                if (pos[i + 1] < 0) pos[i + 1] = 30;
            }
            this.rainSystem.geometry.attributes.position.needsUpdate = true;
        }
    }

    render() { this.renderer.render(this.scene, this.camera); }

    resize() {
        const c = document.getElementById('viewport-container');
        this.camera.aspect = c.clientWidth / c.clientHeight; this.camera.updateProjectionMatrix();
        this.renderer.setSize(c.clientWidth, c.clientHeight, false);
    }
}
