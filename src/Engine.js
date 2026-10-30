import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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

export class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 30, 120);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;
        
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        const envMap = pmremGenerator.fromScene(new RoomEnvironment()).texture;
        this.scene.environment = envMap;

        this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        this.camera.position.set(8, 6, 10);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.target.set(0, 2, 0);
        this.controls.maxPolarAngle = Math.PI / 2.05;

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
        this.scene.add(hemiLight);

        this.sun = new THREE.DirectionalLight(0xfff5e6, 2.0);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.width = 2048;
        this.sun.shadow.mapSize.height = 2048;
        this.sun.shadow.camera.near = 0.5;
        this.sun.shadow.camera.far = 150;
        this.sun.shadow.camera.left = -40; this.sun.shadow.camera.right = 40;
        this.sun.shadow.camera.top = 40; this.sun.shadow.camera.bottom = -40;
        this.sun.shadow.bias = -0.0005;
        this.scene.add(this.sun);
        this.scene.add(this.sun.target);

        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a5a40, roughness: 0.9, metalness: 0.1 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const grid = new THREE.GridHelper(200, 100, 0x00e5ff, 0x556677);
        grid.position.y = 0.05; 
        grid.material.opacity = 0.4;
        grid.material.transparent = true;
        this.scene.add(grid);

        this.timeOfDay = 0.25; 
        this.daySpeed = 0.02; 

        const starsGeo = new THREE.BufferGeometry();
        const starsCount = 3000;
        const starsPos = new Float32Array(starsCount * 3);
        for (let i = 0; i < starsCount * 3; i++) {
            starsPos[i] = (Math.random() - 0.5) * 300;
        }
        starsGeo.setAttribute('position', new THREE.BufferAttribute(starsPos, 3));
        const starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.6, transparent: true, opacity: 0 });
        this.stars = new THREE.Points(starsGeo, starsMat);
        this.scene.add(this.stars);

        this.moon = new THREE.Mesh(
            new THREE.SphereGeometry(3, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0xdddddd })
        );
        this.scene.add(this.moon);

        this.objects = [];
        this.selected = null;
        this.idCounter = 1;
        this.onSelect = null;
        this.onSceneChange = null;
        this.sceneVersion = 0;

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
        else if (type === 'cylinder') { obj = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 32), this.makeMaterial('default')); obj.position.y = 0.6; }
        else if (type === 'cone') { obj = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 32), this.makeMaterial('default')); obj.position.y = 0.6; }
        else if (type === 'torus') { obj = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.2, 16, 100), this.makeMaterial('default')); obj.position.y = 0.7; }
        else if (type === 'light') { obj = new THREE.PointLight(0xffaa00, 5, 15); obj.position.set(0, 3, 0); }
        else if (type === 'jumppad') {
            obj = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.2, 32), this.makeMaterial('emissive', 0x00ff00));
            obj.position.y = 0.1;
        }
        else if (type === 'tree') {
            obj = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5), this.makeMaterial('wood', 0x4a2e15));
            trunk.position.y = 0.75;
            const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2, 8), this.makeMaterial('default', 0x2e8b57));
            leaves.position.y = 2;
            obj.add(trunk, leaves);
            obj.position.y = 0;
        }
        else if (type === 'rock') {
            obj = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 0), this.makeMaterial('metal', 0x666666));
            obj.position.y = 0.4;
        }
        else if (type === 'building') {
            obj = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 2), this.makeMaterial('glass', 0x88ccff));
            obj.position.y = 2;
        }

        if (obj.isMesh || obj.isGroup) {
            obj.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
        }
        
        if (!obj.userData || Object.keys(obj.userData).length === 0) {
            obj.userData = { id: 'obj_' + (this.idCounter++), type: type, material: 'default', physics: { enabled: false, vy: 0, bounce: 0.5 } };
        }
        
        if (opts.position) obj.position.fromArray(opts.position);
        if (opts.rotation) obj.rotation.set(opts.rotation[0] || 0, opts.rotation[1] || 0, opts.rotation[2] || 0);
        if (opts.scale) obj.scale.fromArray(opts.scale);
        
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

    checkCollision(box1, excludeObj) {
        for (let obj of this.objects) {
            if (obj === excludeObj || obj.userData.type === 'character' || obj.userData.type === 'light') continue;
            obj.updateMatrixWorld(true);
            const box2 = new THREE.Box3().setFromObject(obj);
            if (box1.intersectsBox(box2)) return true;
        }
        return false;
    }

    duplicateObject() {
        if (!this.selected || this.selected.userData.type === 'character') return;
        const obj = this.selected;
        const opts = {
            position: [obj.position.x + 1.5, obj.position.y, obj.position.z],
            rotation: [obj.rotation.x, obj.rotation.y, obj.rotation.z],
            scale: [obj.scale.x, obj.scale.y, obj.scale.z],
            material: obj.userData.material,
            color: obj.isMesh ? obj.material.color.getHex() : (obj.isLight ? obj.color.getHex() : null),
            physics: { ...obj.userData.physics }
        };
        if (obj.isLight) opts.intensity = obj.intensity;
        return this.addObject(obj.userData.type, opts);
    }

    selectObject(obj) {
        this.selected = obj;
        if (this.onSelect) this.onSelect(obj);
    }

    deleteSelected() {
        if (!this.selected || this.selected.userData.type === 'character') return;
        const idx = this.objects.indexOf(this.selected);
        if (idx !== -1) {
            this.scene.remove(this.selected);
            if (this.selected.material) this.selected.material.dispose();
            this.objects.splice(idx, 1);
            this.selectObject(null);
            if (this.onSceneChange) this.onSceneChange();
        }
    }

    clearScene() {
        this.sceneVersion++;
        this.objects.forEach(obj => {
            this.scene.remove(obj);
            if (obj.traverse) {
                obj.traverse(child => {
                    if (child.isMesh) {
                        if (child.geometry) child.geometry.dispose();
                        if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
                        else if (child.material) child.material.dispose();
                    }
                });
            } else {
                if (obj.geometry) obj.geometry.dispose();
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else if (obj.material) obj.material.dispose();
            }
        });
        this.objects = [];
        this.selectObject(null);
        localStorage.removeItem('kgtf_scene_final');
        this.addObject('cube');
        if (this.onSceneChange) this.onSceneChange();
    }

    loadCharacter(opts = {}) {
        const currentVersion = this.sceneVersion;
        const loader = new GLTFLoader();
        loader.load('https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb', (gltf) => {
            if (this.sceneVersion !== currentVersion) return;
            const model = gltf.scene;
            model.position.y = 0; 
            model.scale.set(0.7, 0.7, 0.7);
            if (opts.position) model.position.fromArray(opts.position);
            if (opts.rotation) model.rotation.set(opts.rotation[0] || 0, opts.rotation[1] || 0, opts.rotation[2] || 0);
            
            model.traverse(o => { if(o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
            const mixer = new THREE.AnimationMixer(model);
            const actions = {};
            gltf.animations.forEach(clip => { actions[clip.name] = mixer.clipAction(clip); });
            if (actions['Idle']) actions['Idle'].play();
            
            model.userData = { id: 'char_' + (this.idCounter++), type: 'character', mixer, actions, currentAction: 'Idle', material: 'n/a', physics: { enabled: false, vy: 0, bounce: 0 } };
            this.scene.add(model);
            this.objects.push(model);
            if (!opts.isLoading) {
                this.selectObject(model);
                if (this.onSceneChange) this.onSceneChange();
            }
        }, undefined, (err) => { alert('تعذر تحميل الشخصية.'); });
    }

    saveScene() {
        const data = this.objects.map(o => ({
            type: o.userData.type, material: o.userData.material,
            color: o.isMesh ? o.material.color.getHex() : (o.isLight ? o.color.getHex() : 0xffffff),
            intensity: o.isLight ? o.intensity : undefined,
            position: o.position.toArray(), rotation: [o.rotation.x, o.rotation.y, o.rotation.z], scale: o.scale.toArray(), physics: o.userData.physics
        }));
        localStorage.setItem('kgtf_scene_final', JSON.stringify(data));
        alert('تم حفظ المشهد بنجاح!');
    }

    exportScene() {
        const data = this.objects.map(o => ({
            type: o.userData.type, material: o.userData.material,
            color: o.isMesh ? o.material.color.getHex() : (o.isLight ? o.color.getHex() : 0xffffff),
            intensity: o.isLight ? o.intensity : undefined,
            position: o.position.toArray(), rotation: [o.rotation.x, o.rotation.y, o.rotation.z], scale: o.scale.toArray(), physics: o.userData.physics
        }));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'kgtf_scene.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    importScene(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                this.clearScene(); 
                this.objects = []; 
                document.getElementById('object-list').innerHTML = '';
                data.forEach(d => {
                    if (d.type === 'character') this.loadCharacter({ position: d.position, rotation: d.rotation, isLoading: true });
                    else this.addObject(d.type, d);
                });
                this.selectObject(null);
                if (this.onSceneChange) this.onSceneChange();
                alert('تم استيراد المشهد بنجاح!');
            } catch (err) {
                alert('عذراً، هذا الملف غير صالح أو تالف.');
            }
        };
        reader.readAsText(file);
    }

    loadScene() {
        const saved = localStorage.getItem('kgtf_scene_final');
        if (!saved) { this.addObject('cube'); return; }
        try {
            const data = JSON.parse(saved);
            data.forEach(d => { 
                if (d.type === 'character') this.loadCharacter({ position: d.position, rotation: d.rotation, isLoading: true });
                else this.addObject(d.type, d); 
            });
        } catch(e) { this.addObject('cube'); }
    }

    update(dt) {
        this.timeOfDay = (this.timeOfDay + dt * this.daySpeed) % 1;
        const angle = this.timeOfDay * Math.PI * 2;

        this.sun.position.x = Math.cos(angle) * 50;
        this.sun.position.y = Math.sin(angle) * 50;
        this.sun.position.z = Math.sin(angle) * 20;
        
        const sunHeight = this.sun.position.y;

        const dayColor = new THREE.Color(0x87CEEB);
        const nightColor = new THREE.Color(0x050510);
        const sunsetColor = new THREE.Color(0xff5500);

        let currentSkyColor = new THREE.Color();

        if (sunHeight > 0) {
            const t = Math.min(sunHeight / 30, 1);
            currentSkyColor.lerpColors(sunsetColor, dayColor, t);
            this.sun.intensity = t * 2.0;
            this.stars.material.opacity = 0;
            this.moon.visible = false;
        } else {
            const t = Math.min(Math.abs(sunHeight) / 30, 1);
            currentSkyColor.lerpColors(sunsetColor, nightColor, t);
            this.sun.intensity = 0;
            this.stars.material.opacity = t;
            this.moon.visible = true;
        }

        this.scene.background.copy(currentSkyColor);
        this.scene.fog.color.copy(currentSkyColor);

        this.moon.position.x = Math.cos(angle + Math.PI) * 50;
        this.moon.position.y = Math.sin(angle + Math.PI) * 50;
        this.moon.position.z = Math.sin(angle + Math.PI) * 20;

        this.stars.rotation.y += 0.01 * dt;

        const box = new THREE.Box3(), size = new THREE.Vector3();
        this.objects.forEach(o => {
            if (o.userData.mixer) o.userData.mixer.update(dt);
            const p = o.userData.physics;
            if (p && p.enabled && (o.isMesh || o.isGroup)) {
                p.vy -= 9.8 * dt; o.position.y += p.vy * dt;
                box.setFromObject(o); box.getSize(size);
                const groundLevel = size.y / 2;
                if (o.position.y < groundLevel) {
                    o.position.y = groundLevel;
                    if (Math.abs(p.vy) > 0.5) p.vy = -p.vy * p.bounce; else p.vy = 0;
                }
            }
        });
        if (!document.body.classList.contains('play-mode')) this.controls.update();
    }

    render() { this.renderer.render(this.scene, this.camera); }

    resize() {
        const c = document.getElementById('viewport-container');
        const w = c.clientWidth, h = c.clientHeight;
        this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
    }
}
