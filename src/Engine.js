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

export const MATERIALS = {
    default:  { color: 0x00e5ff, roughness: 0.4, metalness: 0.1 },
    wood:     { color: 0x5c3a21, roughness: 0.95, metalness: 0.0 },
    metal:    { color: 0x888888, roughness: 0.2,  metalness: 0.9 },
    gold:     { color: 0xffaa00, roughness: 0.3,  metalness: 0.95 },
    glass:    { color: 0xaaddff, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.3 },
    rock:     { color: 0x666666, roughness: 0.9,  metalness: 0.2 },
    grass:    { color: 0x2d5a27, roughness: 0.9,  metalness: 0.0 },
    emissive: { color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.0 }
};

export const BEHAVIORS = {
    rotate: { name: 'دوران', defaultParams: { speed: 1.5 }, update: (obj, params, state, dt) => { obj.rotation.y += params.speed * dt; } },
    float: { name: 'طيران', defaultParams: { amplitude: 0.5, speed: 2 }, update: (obj, params, state, dt, time) => { if (state.baseY === undefined) state.baseY = obj.position.y; obj.position.y = state.baseY + Math.sin(time * params.speed) * params.amplitude; } },
    follow: { name: 'مطاردة', defaultParams: { speed: 3, stopDistance: 1.5 }, update: (obj, params, state, dt, time, engine) => { const p = engine.objects.find(o => o.userData.type === 'character'); if (!p) return; const d = new THREE.Vector3().subVectors(p.position, obj.position); d.y=0; if(d.length()>params.stopDistance){ d.normalize(); obj.position.add(d.multiplyScalar(params.speed*dt)); } } }
};

export class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); 
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        
        this.editorCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        this.editorCamera.position.set(8, 6, 10);
        this.activeCamera = this.editorCamera;

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.activeCamera));
        this.smaaPass = new SMAAPass(window.innerWidth, window.innerHeight);
        this.composer.addPass(this.smaaPass);
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.4, 0.8); 
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

        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        this.scene.add(this.hemiLight);

        this.sun = new THREE.DirectionalLight(0xfff5e6, 2.0);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.width = 2048;
        this.sun.shadow.mapSize.height = 2048;
        this.sun.shadow.camera.left = -40; this.sun.shadow.camera.right = 40;
        this.sun.shadow.camera.top = 40; this.sun.shadow.camera.bottom = -40;
        this.scene.add(this.sun); this.scene.add(this.sun.target);

        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a6e52, roughness: 1.0 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        this.grid = new THREE.GridHelper(200, 100, 0x00e5ff, 0x556677);
        this.grid.position.y = 0.05; this.grid.material.opacity = 0.3; this.grid.material.transparent = true;
        this.scene.add(this.grid);

        this.objects = [];
        this.assets = JSON.parse(localStorage.getItem('kgtf_assets') || '[]'); 
        this.selected = null;
        this.idCounter = 1;
        this.onSelect = null; this.onSceneChange = null;
        this.sceneVersion = 0;
        this.totalTime = 0;
        
        // مطر
        const rainGeo = new THREE.BufferGeometry();
        const rainCount = 3000;
        const rainPos = new Float32Array(rainCount * 3);
        for(let i=0; i<rainCount*3; i+=3) { rainPos[i]=(Math.random()-0.5)*100; rainPos[i+1]=Math.random()*40; rainPos[i+2]=(Math.random()-0.5)*100; }
        rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
        this.rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xaaccff, size: 0.15, transparent: true, opacity: 0.6 }));
        this.rain.visible = false; this.scene.add(this.rain);
        this.isRaining = false;

        this.loadScene();
        this.resize();
        window.addEventListener('resize', () => this.resize());
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
        else if (type === 'tree') {
            obj = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.5, 8), this.makeMaterial('wood'));
            trunk.position.y = 0.75;
            for(let i=0; i<3; i++) {
                const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.2 - (i*0.3), 1.5, 8), this.makeMaterial('grass', 0x1e5631 - (i*0x001100)));
                leaves.position.y = 1.5 + (i*0.7); obj.add(leaves);
            }
            obj.add(trunk);
        }
        else if (type === 'bush') {
            obj = new THREE.Mesh(new THREE.SphereGeometry(0.6, 8, 8), this.makeMaterial('grass', 0x2d5a27));
            obj.position.y = 0.4; obj.scale.set(1, 0.7, 1);
        }
        else if (type === 'mountain') {
            obj = new THREE.Mesh(new THREE.ConeGeometry(4, 8, 6), this.makeMaterial('rock', 0x555555)); obj.position.y = 4;
        }
        else if (type === 'building') {
            obj = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), this.makeMaterial('glass')); obj.position.y = 2;
        }
        else if (type === 'rock') { 
            obj = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 1), this.makeMaterial('rock')); obj.position.y = 0.4; 
            obj.scale.set(1 + Math.random()*0.5, 1 + Math.random()*0.5, 1 + Math.random()*0.5); 
        }
        else if (type === 'light') { obj = new THREE.PointLight(0xffaa00, 10, 15); obj.position.set(0, 3, 0); }
        else if (type === 'camera') {
            obj = new THREE.PerspectiveCamera(60, 1, 0.1, 1000); obj.position.set(0, 3, 5);
            obj.userData = { id: 'cam_' + (this.idCounter++), type: 'camera', physics: { enabled: false }, behaviors: {}, logic: [] };
            this.scene.add(obj); this.objects.push(obj); this.selectObject(obj); if(this.onSceneChange) this.onSceneChange(); return obj;
        }
        else if (type === 'vfx') { 
            if (opts.vfxType === 'smoke') {
                obj = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 16), new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.4, depthWrite: false }));
            } else {
                obj = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff4400 }));
            }
            obj.position.y = 0.5;
        }

        if (!obj) { console.warn('Unknown type:', type); return null; }

        if (obj.isMesh || obj.isGroup) { obj.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); }
        
        if (!obj.userData || Object.keys(obj.userData).length === 0) {
            obj.userData = { id: 'obj_' + (this.idCounter++), type: type, material: 'default', physics: { enabled: false, vy: 0, bounce: 0.5 }, behaviors: {}, logic: [] };
        }
        
        if (opts.position) obj.position.fromArray(opts.position);
        if (opts.material && obj.isMesh) { obj.material.dispose(); obj.material = this.makeMaterial(opts.material, opts.color); obj.userData.material = opts.material; }
        else if (opts.color && obj.isMesh) obj.material.color.set(opts.color);

        this.scene.add(obj); this.objects.push(obj); this.selectObject(obj);
        if (this.onSceneChange) this.onSceneChange();
        return obj;
    }

    removeObject(obj) {
        const idx = this.objects.indexOf(obj);
        if (idx !== -1) {
            this.scene.remove(obj);
            // تحرير الذاكرة (إصلاح النقطة 10)
            obj.traverse((child) => {
                if (child.isMesh) {
                    if (child.geometry) child.geometry.dispose();
                    if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                    else if (child.material) child.material.dispose();
                }
            });
            this.objects.splice(idx, 1);
            if (this.onSceneChange) this.onSceneChange();
            if (this.selected === obj) this.selectObject(null);
        }
    }

    loadCharacter() {
        const loader = new GLTFLoader();
        loader.load('./models/character.glb', (gltf) => {
            const model = gltf.scene;
            model.scale.set(1, 1, 1);
            model.traverse(o => { if(o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
            
            const mixer = new THREE.AnimationMixer(model);
            const actions = {};
            gltf.animations.forEach(clip => { actions[clip.name] = mixer.clipAction(clip); });
            
            const animNames = Object.keys(actions);
            if (animNames.length > 0) actions[animNames[0]].play();

            model.userData = { id: 'char_' + (this.idCounter++), type: 'character', mixer, actions, currentAction: animNames[0], physics: { enabled: false }, behaviors: {}, logic: [] };
            this.scene.add(model); this.objects.push(model);
            
            const defaultCube = this.objects.find(o => o.userData.type === 'cube' && o.position.x === 0 && o.position.z === 0);
            if(defaultCube) this.removeObject(defaultCube);

            this.selectObject(model);
            if (this.onSceneChange) this.onSceneChange();
        }, undefined, (err) => { 
            // كبسولة في حال الفشل (إصلاح 1)
            const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 4, 8), this.makeMaterial('default'));
            body.position.y = 0.75; body.castShadow = true;
            body.userData = { id: 'char_' + (this.idCounter++), type: 'character', physics: { enabled: true }, actions: {}, behaviors: {}, logic: [] };
            this.scene.add(body); this.objects.push(body);
            this.selectObject(body); if (this.onSceneChange) this.onSceneChange();
        });
    }

    saveScene() {
        const data = this.objects.map(o => ({
            type: o.userData.type, material: o.userData.material,
            position: o.position.toArray(), rotation: [o.rotation.x, o.rotation.y, o.rotation.z], scale: o.scale.toArray()
        }));
        localStorage.setItem('kgtf_scene_final', JSON.stringify(data));
        alert('تم الحفظ!');
    }

    loadScene() {
        const saved = localStorage.getItem('kgtf_scene_final');
        if (!saved) { this.addObject('cube'); return; }
        try {
            JSON.parse(saved).forEach(d => this.addObject(d.type, d));
        } catch(e) { this.addObject('cube'); }
    }

    exportScene() {
        const data = this.objects.map(o => ({ type: o.userData.type, material: o.userData.material, position: o.position.toArray() }));
        const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
        const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'kgtf_scene.json'; a.click();
    }

    toggleGrid(v) { if(this.grid) this.grid.visible = v; }
    toggleRain(v) { this.isRaining = v; this.rain.visible = v; }
    selectObject(obj) { this.selected = obj; if (this.onSelect) this.onSelect(obj); }
    
    update(dt) {
        this.totalTime += dt;
        
        // فيزياء المجسمات (إصلاح 6)
        this.objects.forEach(o => {
            if (o.userData.mixer) o.userData.mixer.update(dt);
            if (o.userData.physics && o.userData.physics.enabled && o.isMesh) {
                o.userData.physics.vy -= 9.8 * dt;
                o.position.y += o.userData.physics.vy * dt;
                if (o.position.y <= 0.5) {
                    o.position.y = 0.5; o.userData.physics.vy = 0;
                }
            }
        });

        if (this.isRaining) {
            const pos = this.rain.geometry.attributes.position.array;
            for (let i = 1; i < pos.length; i += 3) { pos[i] -= 25 * dt; if (pos[i] < 0) pos[i] = 30; }
            this.rain.geometry.attributes.position.needsUpdate = true;
        }
        
        if (!document.body.classList.contains('play-mode')) this.controls.update();
    }

    render() { this.composer.render(); }
    resize() { const c = document.getElementById('viewport-container'); this.editorCamera.aspect = c.clientWidth/c.clientHeight; this.editorCamera.updateProjectionMatrix(); this.renderer.setSize(c.clientWidth, c.clientHeight, false); this.composer.setSize(c.clientWidth, c.clientHeight); }
}
