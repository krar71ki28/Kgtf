import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export const MATERIALS = {
    default:  { color: 0x00e5ff, roughness: 0.4, metalness: 0.1 },
    wood:     { color: 0x5c3a21, roughness: 0.95, metalness: 0.0 },
    metal:    { color: 0x888888, roughness: 0.2,  metalness: 0.9 },
    gold:     { color: 0xffaa00, roughness: 0.3,  metalness: 0.95 },
    glass:    { color: 0xaaddff, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.3 },
    rock:     { color: 0x666666, roughness: 0.9,  metalness: 0.2 },
    grass:    { color: 0x2d5a27, roughness: 0.9,  metalness: 0.0 },
    rubber:   { color: 0x222222, roughness: 1.0,  metalness: 0.0 },
    marble:   { color: 0xf0f0f0, roughness: 0.2,  metalness: 0.1 },
    emissive: { color: 0x00e5ff, emissive: 0x00e5ff, emissiveIntensity: 1.0 }
};

export const BEHAVIORS = {
    rotate: { name: 'دوران', defaultParams: { speed: 1.5 }, update: (obj, params, state, dt) => { obj.rotation.y += params.speed * dt; } },
    float: { name: 'طيران', defaultParams: { amplitude: 0.5, speed: 2 }, update: (obj, params, state, dt, time) => { if (state.baseY === undefined) state.baseY = obj.position.y; obj.position.y = state.baseY + Math.sin(time * params.speed) * params.amplitude; } }
};

export class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

        // إعداد الـ Renderer بدون تعقيدات
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // تقليل الحمل على الموبايل
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

        this.editorCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        this.editorCamera.position.set(8, 6, 10);
        this.activeCamera = this.editorCamera;

        // Composer مبسط (بدون SMAA لأنه يسبب مشاكل على الموبايل)
        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.activeCamera));
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.3, 0.4, 0.8);
        this.composer.addPass(this.bloomPass);
        this.composer.addPass(new OutputPass());

        const pmrem = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmrem.fromScene(new RoomEnvironment()).texture;

        this.controls = new OrbitControls(this.editorCamera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.target.set(0, 2, 0);
        this.controls.maxPolarAngle = Math.PI / 2.05;

        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        this.scene.add(this.hemiLight);

        this.sun = new THREE.DirectionalLight(0xfff5e6, 2.0);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(1024, 1024); // تقليل الجودة قليلاً لتسريع الموبايل
        this.sun.shadow.camera.left = -20; this.sun.shadow.camera.right = 20;
        this.sun.shadow.camera.top = 20; this.sun.shadow.camera.bottom = -20;
        this.scene.add(this.sun);
        this.scene.add(this.sun.target);

        const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x4a6e52, roughness: 1.0 }));
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        this.grid = new THREE.GridHelper(200, 100, 0x00e5ff, 0x556677);
        this.grid.position.y = 0.05;
        this.scene.add(this.grid);

        this.objects = [];
        this.assets = JSON.parse(localStorage.getItem('kgtf_assets') || '[]');
        this.score = 0;
        this.selected = null;
        this.idCounter = 1;
        this.onSelect = null;
        this.onSceneChange = null;
        this.totalTime = 0;
        this.isNightMode = false;
        this.isPlaying = false;
        this.rainSystem = null;

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
        let obj = null;
        if (type === 'cube') { obj = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.makeMaterial('default')); obj.position.y = 0.5; }
        else if (type === 'sphere') { obj = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), this.makeMaterial('default')); obj.position.y = 0.5; }
        else if (type === 'cylinder') { obj = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 32), this.makeMaterial('default')); obj.position.y = 0.6; }
        else if (type === 'cone') { obj = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.2, 32), this.makeMaterial('default')); obj.position.y = 0.6; }
        else if (type === 'torus') { obj = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.2, 16, 100), this.makeMaterial('default')); obj.position.y = 0.7; }
        else if (type === 'light') { obj = new THREE.PointLight(0xffaa00, 10, 15); obj.position.set(0, 3, 0); }
        else if (type === 'camera') { obj = new THREE.PerspectiveCamera(60, 1, 0.1, 1000); obj.position.set(0, 2, 5); }
        else if (type === 'tree') {
            obj = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.5, 8), this.makeMaterial('wood'));
            trunk.position.y = 0.75;
            for (let i = 0; i < 3; i++) {
                const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.2 - (i * 0.3), 1.5, 8), this.makeMaterial('grass', 0x1e5631 - (i * 0x001100)));
                leaves.position.y = 1.5 + (i * 0.7);
                obj.add(leaves);
            }
            obj.add(trunk);
        }
        else if (type === 'bush') {
            obj = new THREE.Group();
            for (let i = 0; i < 3; i++) {
                const b = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 8), this.makeMaterial('grass', 0x2d5a27));
                b.position.set((Math.random() - 0.5) * 0.4, 0.3 + i * 0.15, (Math.random() - 0.5) * 0.4);
                b.scale.y = 0.7;
                obj.add(b);
            }
        }
        else if (type === 'mountain') {
            obj = new THREE.Group();
            const main = new THREE.Mesh(new THREE.ConeGeometry(4, 5, 6), this.makeMaterial('rock', 0x666666));
            main.position.y = 2.5;
            const snow = new THREE.Mesh(new THREE.ConeGeometry(1, 1.2, 6), this.makeMaterial('default', 0xffffff));
            snow.position.y = 4.8;
            obj.add(main); obj.add(snow);
        }
        else if (type === 'building') {
            obj = new THREE.Group();
            const body = new THREE.Mesh(new THREE.BoxGeometry(3, 6, 3), this.makeMaterial('metal', 0x888888));
            body.position.y = 3;
            const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.3, 3.2), this.makeMaterial('metal', 0x444444));
            roof.position.y = 6.1;
            obj.add(body); obj.add(roof);
        }
        else if (type === 'rock') {
            obj = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 1), this.makeMaterial('rock'));
            obj.position.y = 0.4;
            obj.scale.set(1 + Math.random() * 0.5, 1 + Math.random() * 0.5, 1 + Math.random() * 0.5);
            obj.rotation.set(Math.random(), Math.random(), Math.random());
        }
        else if (type === 'vfx') return this.createFireVFX(new THREE.Vector3(0, 0.5, 0));
        else if (type === 'vfx-smoke') return this.createSmokeVFX(new THREE.Vector3(0, 0.5, 0));

        if (!obj) return null;

        if (obj.isMesh || obj.isGroup) obj.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });

        if (!obj.userData || Object.keys(obj.userData).length === 0) {
            obj.userData = {
                id: 'obj_' + (this.idCounter++),
                type, material: 'default',
                physics: { enabled: false, vy: 0, bounce: 0.5 },
                behaviors: {}, behaviorStates: {}, logic: []
            };
        }

        if (opts.position) obj.position.fromArray(opts.position);

        this.scene.add(obj);
        this.objects.push(obj);
        this.selectObject(obj);
        if (this.onSceneChange) this.onSceneChange();
        return obj;
    }

    _createPrimitiveCharacter() {
        const group = new THREE.Group();
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 4, 8), this.makeMaterial('default', 0x00e5ff));
        body.position.y = 0.75; body.castShadow = true;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), this.makeMaterial('default', 0xffddaa));
        head.position.y = 1.5; head.castShadow = true;
        group.add(body); group.add(head);
        group.userData = {
            id: 'char_' + (this.idCounter++),
            type: 'character', material: 'default',
            physics: { enabled: true, vy: 0, bounce: 0 },
            behaviors: {}, behaviorStates: {}, logic: [],
            actions: {}, currentAction: null
        };
        return group;
    }

    loadCharacter() {
        const group = this._createPrimitiveCharacter();
        this.scene.add(group);
        this.objects.push(group);
        this.selectObject(group);
        if (this.onSceneChange) this.onSceneChange();
        return group;
    }

    loadModel(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const loader = new GLTFLoader();
            loader.load(url, (gltf) => {
                URL.revokeObjectURL(url);
                const root = gltf.scene;
                root.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
                root.userData = {
                    id: 'model_' + (this.idCounter++),
                    type: 'model', material: 'default',
                    physics: { enabled: false, vy: 0, bounce: 0.5 },
                    behaviors: {}, behaviorStates: {}, logic: []
                };
                this.scene.add(root);
                this.objects.push(root);
                this.selectObject(root);
                if (this.onSceneChange) this.onSceneChange();
                resolve(root);
            }, undefined, reject);
        });
    }

    _createParticles(position, color, speed, count, size, opacity, lightColor) {
        const group = new THREE.Group();
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const velocities = [];
        for (let i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 0.4;
            positions[i * 3 + 1] = Math.random() * 0.5;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
            velocities.push({ x: (Math.random() - 0.5) * 0.2 * speed, y: (Math.random() * 1.5 + 0.5) * speed, z: (Math.random() - 0.5) * 0.2 * speed });
        }
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ color, size, transparent: true, opacity, depthWrite: false });
        const points = new THREE.Points(geometry, material);
        group.add(points);
        let light = null;
        if (lightColor) {
            light = new THREE.PointLight(lightColor, 5, 10);
            light.position.y = 0.5;
            group.add(light);
        }
        group.position.copy(position);
        group.userData = { id: 'vfx_' + (this.idCounter++), type: 'vfx', velocities, count, physics: { enabled: false }, behaviors: {}, behaviorStates: {}, light };
        this.scene.add(group); this.objects.push(group); this.selectObject(group);
        if (this.onSceneChange) this.onSceneChange();
        return group;
    }

    createFireVFX(position) { return this._createParticles(position, 0xff6600, 1.0, 50, 0.3, 0.8, 0xff6600); }
    createSmokeVFX(position) { return this._createParticles(position, 0x888888, 0.5, 40, 0.5, 0.5, null); }

    toggleGrid(visible) { if (this.grid) this.grid.visible = visible; }
    toggleNightMode(isNight) { this.isNightMode = isNight; this.scene.background.setHex(isNight ? 0x050510 : 0x87CEEB); this.scene.fog.color.setHex(isNight ? 0x050510 : 0x87CEEB); this.sun.intensity = isNight ? 0 : 2.0; }

    selectObject(obj) { this.selected = obj; if (this.onSelect) this.onSelect(obj); }

    update(dt) {
        this.totalTime += dt;
        this.objects.forEach(o => {
            if (o.userData.type === 'vfx' && o.userData.velocities) {
                const positions = o.children[0].geometry.attributes.position.array;
                for (let i = 0; i < o.userData.count; i++) {
                    positions[i * 3] += o.userData.velocities[i].x * dt;
                    positions[i * 3 + 1] += o.userData.velocities[i].y * dt;
                    positions[i * 3 + 2] += o.userData.velocities[i].z * dt;
                    if (positions[i * 3 + 1] > 1.5) {
                        positions[i * 3] = (Math.random() - 0.5) * 0.4;
                        positions[i * 3 + 1] = 0;
                        positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4;
                    }
                }
                o.children[0].geometry.attributes.position.needsUpdate = true;
                if (o.userData.light) o.userData.light.intensity = 4 + Math.random() * 2;
            }

            if (o.userData.type !== 'character' && o.userData.physics?.enabled) {
                const p = o.userData.physics;
                p.vy = (p.vy || 0) - 9.8 * dt;
                o.position.y += p.vy * dt;
                if (o.position.y <= 0) {
                    o.position.y = 0;
                    p.vy *= -(p.bounce ?? 0.5);
                    if (Math.abs(p.vy) < 0.1) p.vy = 0;
                }
            }
        });

        if (!document.body.classList.contains('play-mode')) this.controls.update();
    }

    render() { this.composer.render(); }

    resize() {
        const c = document.getElementById('viewport-container');
        if (!c) return;
        const w = c.clientWidth, h = c.clientHeight;
        this.editorCamera.aspect = w / h;
        this.editorCamera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
        this.composer.setSize(w, h);
    }

    saveScene() {
        const data = this.objects.map(o => ({
            type: o.userData.type,
            position: o.position.toArray(),
            rotation: [o.rotation.x, o.rotation.y, o.rotation.z],
            scale: o.scale.toArray()
        }));
        localStorage.setItem('kgtf_scene_final', JSON.stringify(data));
    }

    loadScene() {
        const raw = localStorage.getItem('kgtf_scene_final');
        if (raw) {
            try {
                const data = JSON.parse(raw);
                data.forEach(d => {
                    const obj = this.addObject(d.type, { position: d.position });
                    if (obj && d.rotation) obj.rotation.set(...d.rotation);
                    if (obj && d.scale) obj.scale.set(...d.scale);
                });
                return;
            } catch (e) { console.warn('loadScene:', e); }
        }
        this.addObject('cube');
    }

    clearScene() {
        this.objects.forEach(o => this.scene.remove(o));
        this.objects = [];
        this.selectObject(null);
        if (this.onSceneChange) this.onSceneChange();
    }
}
