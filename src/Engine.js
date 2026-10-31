import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js'; 
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { Sky } from 'three/addons/objects/Sky.js';

export const MATERIALS = {
    default:  { color: 0x00e5ff, roughness: 0.4, metalness: 0.1 },
    wood:     { color: 0x8b5a2b, roughness: 0.95, metalness: 0.0 },
    metal:    { color: 0xaaaaaa, roughness: 0.2,  metalness: 0.9 },
    gold:     { color: 0xffaa00, roughness: 0.3,  metalness: 0.95 },
    glass:    { color: 0x88ccff, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.4 },
    rubber:   { color: 0x222222, roughness: 1.0,  metalness: 0.0 },
    marble:   { color: 0xeeeeee, roughness: 0.4,  metalness: 0.0 },
    emissive: { color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.0 }
};

export const BEHAVIORS = {
    rotate: { name: 'دوران مستمر', defaultParams: { speed: 1.5 }, update: (obj, params, state, dt) => { obj.rotation.y += params.speed * dt; } },
    float: { name: 'طيران/تذبذب', defaultParams: { amplitude: 0.5, speed: 2 }, update: (obj, params, state, dt, time) => { if (state.baseY === undefined) state.baseY = obj.position.y; obj.position.y = state.baseY + Math.sin(time * params.speed) * params.amplitude; } },
    follow: { name: 'مطاردة اللاعب', defaultParams: { speed: 2, stopDistance: 1.5 }, update: (obj, params, state, dt, time, engine) => { const player = engine.objects.find(o => o.userData.type === 'character'); if (!player) return; const dir = new THREE.Vector3().subVectors(player.position, obj.position); dir.y = 0; if (dir.length() > params.stopDistance) { dir.normalize(); obj.position.add(dir.multiplyScalar(params.speed * dt)); } } },
    patrol: { name: 'دورية', defaultParams: { speed: 2, distance: 4, axis: 'x' }, init: (obj, state) => { state.startPos = obj.position.clone(); state.direction = 1; }, update: (obj, params, state, dt) => { const axis = params.axis; obj.position[axis] += state.direction * params.speed * dt; const currentDist = obj.position[axis] - state.startPos[axis]; if (Math.abs(currentDist) >= params.distance / 2) state.direction *= -1; } },
    shoot: { name: 'إطلاق مقذوفات', defaultParams: { interval: 2, speed: 15 }, update: (obj, params, state, dt, time, engine) => { const player = engine.objects.find(o => o.userData.type === 'character'); if (!player) return; state.timer = (state.timer || 0) + dt; if (state.timer >= params.interval) { state.timer = 0; const dir = new THREE.Vector3().subVectors(player.position, obj.position).normalize(); engine.createProjectile(obj.position.clone().add(new THREE.Vector3(0, 1, 0)), dir, params.speed); } } },
    collect: { name: 'جمع', defaultParams: { distance: 1.5, points: 10 }, update: (obj, params, state, dt, time, engine) => { const player = engine.objects.find(o => o.userData.type === 'character'); if (!player) return; if (player.position.distanceTo(obj.position) < params.distance) { engine.score += params.points; if (engine.onScoreChanged) engine.onScoreChanged(engine.score); engine.removeObject(obj); } } }
};

export class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        
        this.sky = new Sky();
        this.sky.scale.setScalar(450000);
        this.scene.add(this.sky);
        const uniforms = this.sky.material.uniforms;
        uniforms['turbidity'].value = 10;
        uniforms['rayleigh'].value = 2;
        uniforms['mieCoefficient'].value = 0.005;
        uniforms['mieDirectionalG'].value = 0.8;
        
        this.scene.fog = new THREE.Fog(0xaabbcc, 30, 150);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        this.editorCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        this.editorCamera.position.set(8, 6, 10);
        this.activeCamera = this.editorCamera;

        this.composer = new EffectComposer(this.renderer);
        this.renderPass = new RenderPass(this.scene, this.activeCamera);
        this.composer.addPass(this.renderPass);
        
        this.smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
        this.composer.addPass(this.smaaPass);
        
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0, 0.4, 0.8); 
        this.composer.addPass(this.bloomPass);
        
        this.vignettePass = new ShaderPass(VignetteShader);
        this.vignettePass.uniforms["offset"].value = 1.0;
        this.vignettePass.uniforms["darkness"].value = 1.0;
        this.vignettePass.enabled = false;
        this.composer.addPass(this.vignettePass);
        
        this.composer.addPass(new OutputPass());

        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        const envMap = pmremGenerator.fromScene(new RoomEnvironment()).texture;
        this.scene.environment = envMap;

        this.controls = new OrbitControls(this.editorCamera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.target.set(0, 2, 0);
        this.controls.maxPolarAngle = Math.PI / 2.05;

        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.4);
        this.scene.add(this.hemiLight);

        this.sun = new THREE.DirectionalLight(0xfff5e6, 2.0);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.width = 2048;
        this.sun.shadow.mapSize.height = 2048;
        this.sun.shadow.camera.left = -40; this.sun.shadow.camera.right = 40;
        this.sun.shadow.camera.top = 40; this.sun.shadow.camera.bottom = -40;
        this.sun.shadow.bias = -0.0005;
        this.scene.add(this.sun);
        this.scene.add(this.sun.target);

        const canvasTexture = document.createElement('canvas');
        canvasTexture.width = 512; canvasTexture.height = 512;
        const ctx = canvasTexture.getContext('2d');
        ctx.fillStyle = '#3a5a40'; ctx.fillRect(0, 0, 512, 512);
        for(let i=0; i<10000; i++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#2e4a33' : '#4a6e52';
            ctx.fillRect(Math.random()*512, Math.random()*512, 2, 2);
        }
        const groundTexture = new THREE.CanvasTexture(canvasTexture);
        groundTexture.wrapS = THREE.RepeatWrapping;
        groundTexture.wrapT = THREE.RepeatWrapping;
        groundTexture.repeat.set(50, 50);

        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ map: groundTexture, roughness: 0.9, metalness: 0.0 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const grid = new THREE.GridHelper(200, 100, 0x00e5ff, 0x556677);
        grid.position.y = 0.05; 
        grid.material.opacity = 0.2;
        grid.material.transparent = true;
        this.scene.add(grid);

        this.timeOfDay = 6 / 24; 
        this.autoTime = false;
        this.daySpeed = 0.01;
        this.isManualSun = false;
        this.isNightMode = false;

        this.isRaining = false;
        const rainGeo = new THREE.BufferGeometry();
        const rainCount = 3000;
        const rainPos = new Float32Array(rainCount * 3);
        for(let i=0; i<rainCount*3; i+=3) {
            rainPos[i] = (Math.random() - 0.5) * 100;
            rainPos[i+1] = Math.random() * 40;
            rainPos[i+2] = (Math.random() - 0.5) * 100;
        }
        rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
        const rainMat = new THREE.PointsMaterial({ color: 0xaaccff, size: 0.15, transparent: true, opacity: 0.6 });
        this.rain = new THREE.Points(rainGeo, rainMat);
        this.rain.visible = false;
        this.scene.add(this.rain);

        const starsGeo = new THREE.BufferGeometry();
        const starsCount = 3000;
        const starsPos = new Float32Array(starsCount * 3);
        for (let i = 0; i < starsCount * 3; i++) { starsPos[i] = (Math.random() - 0.5) * 300; }
        starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
        const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0 });
        this.stars = new THREE.Points(starsGeo, starsMat);
        this.scene.add(this.stars);

        this.moon = new THREE.Mesh(new THREE.SphereGeometry(3, 16, 16), new THREE.MeshBasicMaterial({ color: 0xdddddd }));
        this.scene.add(this.moon);

        this.objects = [];
        this.customCameras = []; // مصفوفة لتخزين الكاميرات المضافة
        this.projectiles = []; 
        this.assets = JSON.parse(localStorage.getItem('kgtf_assets') || '[]'); 
        this.score = 0;
        this.onScoreChanged = null;
        this.onCameraListChange = null; // حدث لتحديث القائمة

        this.selected = null;
        this.idCounter = 1;
        this.onSelect = null;
        this.onSceneChange = null;
        this.sceneVersion = 0;
        this.totalTime = 0;

        this.loadScene();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.updateSunPosition();
    }

    updateSunPosition() {
        const phi = THREE.MathUtils.degToRad(90 - (this.timeOfDay * 360 - 90));
        const theta = THREE.MathUtils.degToRad(0);
        const sunPos = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
        
        const uniforms = this.sky.material.uniforms;
        uniforms['sunPosition'].value.copy(sunPos);
        
        this.sun.position.copy(sunPos).multiplyScalar(100);
        
        if (sunPos.y > 0) {
            this.sun.intensity = Math.min(sunPos.y * 4, 2.0);
            this.stars.material.opacity = 0;
            this.moon.visible = false;
            this.scene.fog.color.setHex(0xaabbcc); 
        } else {
            this.sun.intensity = 0;
            this.stars.material.opacity = Math.min(Math.abs(sunPos.y) * 2, 1);
            this.moon.visible = true;
            this.scene.fog.color.setHex(0x050510);
        }
    }

    setActiveCamera(camera) {
        this.activeCamera = camera;
        this.renderPass.camera = camera;
    }

    makeMaterial(matName, colorHex) {
        const base = MATERIALS[matName] || MATERIALS.default;
        const opts = { ...base };
        if (colorHex !== undefined) opts.color = colorHex;
        return new THREE.MeshStandardMaterial(opts);
    }

    addObject(type, opts = {}) {
        let obj;
        if (type === 'cube') { obj = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.makeMaterial('default')); obj.position.y = 0.5; }
        else if (type === 'sphere') { obj = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), this.makeMaterial('default')); obj.position.y = 0.5; }
        else if (type === 'cylinder') { obj = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 32), this.makeMaterial('default')); obj.position.y = 0.6; }
        else if (type === 'cone') { obj = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 32), this.makeMaterial('default')); obj.position.y = 0.6; }
        else if (type === 'torus') { obj = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.2, 16, 100), this.makeMaterial('default')); obj.position.y = 0.7; }
        else if (type === 'mountain') { 
            obj = new THREE.Mesh(new THREE.ConeGeometry(4, 8, 6), this.makeMaterial('metal', 0x555555)); 
            obj.position.y = 4; obj.rotation.y = Math.PI / 4;
        }
        else if (type === 'bush') {
            obj = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), this.makeMaterial('default', 0x2d5a27));
            obj.position.y = 0.4; obj.scale.set(1, 0.7, 1);
        }
        else if (type === 'light') { obj = new THREE.PointLight(0xffaa00, 10, 15); obj.position.set(0, 3, 0); }
        else if (type === 'spotlight') { 
            obj = new THREE.SpotLight(0xffffff, 20, 30, Math.PI / 4, 0.5, 1);
            obj.position.set(0, 5, 0); obj.castShadow = true;
            const target = new THREE.Object3D(); target.position.set(0, 0, 0);
            this.scene.add(target); obj.target = target;
            obj.userData = { id: 'spot_' + (this.idCounter++), type: 'spotlight', material: 'n/a', physics: { enabled: false }, behaviors: {}, behaviorStates: {} };
            this.scene.add(obj); this.objects.push(obj); this.selectObject(obj);
            if (this.onSceneChange) this.onSceneChange();
            return obj;
        }
        else if (type === 'camera') {
            const cam = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 1000);
            cam.position.set(0, 5, 10);
            cam.lookAt(0, 0, 0);
            
            const helper = new THREE.CameraHelper(cam);
            this.scene.add(helper);
            
            cam.userData = { id: 'cam_' + (this.idCounter++), type: 'camera', material: 'n/a', physics: { enabled: false }, behaviors: {}, behaviorStates: {}, helper: helper };
            
            this.scene.add(cam); // إضافة الكاميرا للمشهد للتحكم بها
            this.objects.push(cam);
            this.customCameras.push(cam);
            
            this.selectObject(cam);
            if (this.onCameraListChange) this.onCameraListChange();
            if (this.onSceneChange) this.onSceneChange();
            return cam;
        }
        else if (type === 'tree') {
            obj = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5), this.makeMaterial('wood', 0x4a2e15));
            trunk.position.y = 0.75;
            const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2, 8), this.makeMaterial('default', 0x1e5631));
            leaves.position.y = 2; obj.add(trunk, leaves); obj.position.y = 0;
        }
        else if (type === 'rock') { obj = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 0), this.makeMaterial('metal', 0x666666)); obj.position.y = 0.4; }
        else if (type === 'building') { obj = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), this.makeMaterial('glass', 0x88ccff)); obj.position.y = 2; }
        else if (type === 'vfx') { return this.createParticleSystem(opts.vfxType || 'fire', new THREE.Vector3(0, 0.5, 0)); }
        else if (type === 'audio') { return this.createAudioEmitter(new THREE.Vector3(0, 1, 0)); }

        if (obj.isMesh || obj.isGroup) { obj.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); }
        
        if (!obj.userData || Object.keys(obj.userData).length === 0) {
            obj.userData = { id: 'obj_' + (this.idCounter++), type: type, material: 'default', physics: { enabled: false, vy: 0, bounce: 0.5 }, behaviors: {}, behaviorStates: {} };
        }
        
        if (opts.position) obj.position.fromArray(opts.position);
        if (opts.rotation) obj.rotation.set(opts.rotation[0] || 0, opts.rotation[1] || 0, opts.rotation[2] || 0);
        if (opts.scale) obj.scale.fromArray(opts.scale);
        if (opts.behaviors) { obj.userData.behaviors = JSON.parse(JSON.stringify(opts.behaviors)); obj.userData.behaviorStates = {}; }
        obj.userData.baseY = obj.position.y;

        if (opts.material && obj.isMesh) { obj.material.dispose(); obj.material = this.makeMaterial(opts.material, opts.color); obj.userData.material = opts.material; }
        else if (opts.color && obj.isMesh) obj.material.color.set(opts.color);
        if (opts.color && obj.isLight) obj.color.set(opts.color);
        if (opts.intensity && obj.isLight) obj.intensity = opts.intensity;
        if (opts.physics) obj.userData.physics = { ...obj.userData.physics, ...opts.physics };
        
        this.scene.add(obj);
        this.objects.push(obj);
        this.selectObject(obj);
        if (this.onSceneChange) this.onSceneChange();
        return obj;
    }

    removeObject(obj) {
        const idx = this.objects.indexOf(obj);
        if (idx !== -1) { 
            this.scene.remove(obj); 
            if (obj.material) obj.material.dispose(); 
            this.objects.splice(idx, 1); 
            if (obj.userData.type === 'camera') {
                this.customCameras = this.customCameras.filter(c => c !== obj);
                if (obj.userData.helper) this.scene.remove(obj.userData.helper);
                if (this.onCameraListChange) this.onCameraListChange();
            }
            if (this.onSceneChange) this.onSceneChange(); 
            if (this.selected === obj) this.selectObject(null); 
        }
    }

    toggleNightMode(isNight) {
        this.isNightMode = isNight;
        this.autoTime = false;
        document.getElementById('env-auto-cycle').checked = false;
        
        if (isNight) {
            this.timeOfDay = 22 / 24; 
            this.hemiLight.intensity = 0.1;
            this.bloomPass.strength = 1.0; 
        } else {
            this.timeOfDay = 12 / 24;
            this.hemiLight.intensity = 0.4;
            this.bloomPass.strength = 0;
        }
        this.updateSunPosition();
        document.getElementById('env-time-slider').value = this.timeOfDay * 24;
    }

    /* ... بقية الدوال كما هي ... */
    loadModelFromFile(file) { /* ... */ }
    focusOnObject(obj) { /* ... */ }
    setTimeOfDay(hours) { this.timeOfDay = hours / 24; }
    toggleRain(isRaining) { this.isRaining = isRaining; if (this.rain) this.rain.visible = isRaining; }
    createParticleSystem(type, position) { /* ... */ }
    createAudioEmitter(position) { /* ... */ }
    saveAsAsset(obj) { /* ... */ }
    spawnAsset(assetId) { /* ... */ }
    removeAsset(assetId) { /* ... */ }
    createProjectile(pos, dir, speed) { /* ... */ }
    checkCollision(box1, excludeObj) { /* ... */ }
    duplicateObject() { /* ... */ }
    selectObject(obj) { this.selected = obj; if (this.onSelect) this.onSelect(obj); }
    deleteSelected() { if (!this.selected || this.selected.userData.type === 'character') return; this.removeObject(this.selected); }
    clearScene() { 
        this.sceneVersion++;
        this.objects.forEach(obj => {
            this.scene.remove(obj);
            if (obj.userData.type === 'camera' && obj.userData.helper) this.scene.remove(obj.userData.helper);
            if (obj.traverse) { obj.traverse(child => { if (child.isMesh) { if (child.geometry) child.geometry.dispose(); if (Array.isArray(child.material)) child.material.forEach(m => m.dispose()); else if (child.material) child.material.dispose(); } }); } 
            else { if (obj.geometry) obj.geometry.dispose(); if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose()); else if (obj.material) obj.material.dispose(); }
        });
        this.objects = []; this.customCameras = [];
        this.projectiles.forEach(p => this.scene.remove(p.mesh)); this.projectiles = []; this.selectObject(null);
        if (this.onCameraListChange) this.onCameraListChange();
        if (this.onSceneChange) this.onSceneChange();
    }
    loadCharacter(opts = {}) { /* ... */ }
    getSceneData() { /* ... */ }
    loadSceneData(data) { /* ... */ }
    saveSceneAs(name) { /* ... */ }
    loadSceneByName(name) { /* ... */ }
    deleteSceneByName(name) { /* ... */ }
    saveScene() { /* ... */ }
    exportScene() { /* ... */ }
    importScene(file) { /* ... */ }
    loadScene() { /* ... */ }

    update(dt) {
        this.totalTime += dt;
        if (this.autoTime) { this.timeOfDay = (this.timeOfDay + dt * this.daySpeed) % 1; }
        
        if (!this.isNightMode) {
            this.updateSunPosition();
        }

        if (this.isRaining && this.rain) {
            const positions = this.rain.geometry.attributes.position.array;
            for (let i = 1; i < positions.length; i += 3) { positions[i] -= 25 * dt; if (positions[i] < 0) positions[i] = 30; }
            this.rain.geometry.attributes.position.needsUpdate = true;
        }

        const box = new THREE.Box3(), size = new THREE.Vector3();
        this.objects.forEach(o => {
            if (o.userData.mixer) o.userData.mixer.update(dt);
            const p = o.userData.physics;
            if (p && p.enabled && (o.isMesh || o.isGroup)) {
                p.vy -= 9.8 * dt; o.position.y += p.vy * dt;
                box.setFromObject(o); box.getSize(size);
                const groundLevel = size.y / 2;
                if (o.position.y < groundLevel) { o.position.y = groundLevel; if (Math.abs(p.vy) > 0.5) p.vy = -p.vy * p.bounce; else p.vy = 0; }
            }

            if (o.userData.behaviors) {
                for (const bName in o.userData.behaviors) {
                    if (BEHAVIORS[bName] && BEHAVIORS[bName].update) {
                        if (!o.userData.behaviorStates) o.userData.behaviorStates = {};
                        if (!o.userData.behaviorStates[bName]) o.userData.behaviorStates[bName] = {};
                        if (BEHAVIORS[bName].init && !o.userData.behaviorStates[bName]._inited) {
                            BEHAVIORS[bName].init(o, o.userData.behaviorStates[bName], this); o.userData.behaviorStates[bName]._inited = true;
                        }
                        BEHAVIORS[bName].update(o, o.userData.behaviors[bName], o.userData.behaviorStates[bName], dt, this.totalTime, this);
                    }
                }
            }

            if (o.userData.type === "vfx" && o.geometry) {
                const positions = o.geometry.attributes.position.array;
                for (let i = 0; i < o.userData.count; i++) {
                    positions[i * 3] += o.userData.velocities[i].x * dt; positions[i * 3 + 1] += o.userData.velocities[i].y * dt; positions[i * 3 + 2] += o.userData.velocities[i].z * dt;
                    if (positions[i * 3 + 1] > 3) { positions[i * 3] = (Math.random() - 0.5) * 0.5; positions[i * 3 + 1] = 0; positions[i * 3 + 2] = (Math.random() - 0.5) * 0.5; }
                }
                o.geometry.attributes.position.needsUpdate = true;
            }
        });

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i]; p.mesh.position.addScaledVector(p.direction, p.speed * dt); p.life -= dt;
            if (p.life <= 0) { this.scene.remove(p.mesh); p.mesh.geometry.dispose(); p.mesh.material.dispose(); this.projectiles.splice(i, 1); }
        }
        if (!document.body.classList.contains('play-mode')) this.controls.update();
    }

    render() { this.composer.render(); }
    
    resize() { 
        const c = document.getElementById('viewport-container'); 
        const w = c.clientWidth, h = c.clientHeight; 
        this.editorCamera.aspect = w / h; 
        this.editorCamera.updateProjectionMatrix(); 
        this.renderer.setSize(w, h, false); 
        this.composer.setSize(w, h); 
        if (this.smaaPass) this.smaaPass.setSize(w, h);
    }
}
