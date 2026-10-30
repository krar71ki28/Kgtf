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
        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        
        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        const envMap = pmremGenerator.fromScene(new RoomEnvironment()).texture;
        this.scene.environment = envMap;
        this.scene.background = new THREE.Color(0x0a0a0f);

        this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        this.camera.position.set(8, 6, 10);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.target.set(0, 2, 0);
        this.controls.maxPolarAngle = Math.PI / 2.05;

        const sun = new THREE.DirectionalLight(0xffeedd, 2.0);
        sun.position.set(10, 20, 10);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.camera.left = -30; sun.shadow.camera.right = 30;
        sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -30;
        sun.shadow.bias = -0.0005;
        this.scene.add(sun);

        const groundGeo = new THREE.PlaneGeometry(100, 100);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, roughness: 0.8, metalness: 0.2 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        this.objects = [];
        this.selected = null;
        this.idCounter = 1;
        this.onSelect = null;
        this.onSceneChange = null;

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
        else if (type === 'light') { obj = new THREE.PointLight(0xffaa00, 5, 15); obj.position.set(0, 3, 0); }
        
        if (obj.isMesh) { obj.castShadow = true; obj.receiveShadow = true; }
        obj.userData = { id: 'obj_' + (this.idCounter++), type: type, material: 'default', physics: { enabled: false, vy: 0, bounce: 0.5 } };
        
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

    loadCharacter() {
        const loader = new GLTFLoader();
        loader.load('https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb', (gltf) => {
            const model = gltf.scene;
            model.position.y = 0; 
            model.scale.set(0.7, 0.7, 0.7); // تصغير الحجم ليناسب الكاميرا
            model.traverse(o => { if(o.isMesh) o.castShadow = true; });
            const mixer = new THREE.AnimationMixer(model);
            const actions = {};
            gltf.animations.forEach(clip => { actions[clip.name] = mixer.clipAction(clip); });
            if (actions['Idle']) actions['Idle'].play();
            model.userData = { id: 'char_' + (this.idCounter++), type: 'character', mixer, actions, currentAction: 'Idle', material: 'n/a', physics: { enabled: false, vy: 0, bounce: 0 } };
            this.scene.add(model);
            this.objects.push(model);
            this.selectObject(model);
            if (this.onSceneChange) this.onSceneChange();
        }, undefined, (err) => { alert('تعذر تحميل الشخصية.'); });
    }

    saveScene() {
        const data = this.objects.filter(o => o.userData.type !== 'character').map(o => ({
            type: o.userData.type, material: o.userData.material,
            color: o.isMesh ? o.material.color.getHex() : (o.isLight ? o.color.getHex() : 0xffffff),
            intensity: o.isLight ? o.intensity : undefined,
            position: o.position.toArray(), rotation: [o.rotation.x, o.rotation.y, o.rotation.z], scale: o.scale.toArray(), physics: o.userData.physics
        }));
        localStorage.setItem('kgtf_scene_final', JSON.stringify(data));
        alert('تم حفظ المشهد بنجاح!');
    }

    loadScene() {
        const saved = localStorage.getItem('kgtf_scene_final');
        if (!saved) { this.addObject('cube'); return; }
        try {
            const data = JSON.parse(saved);
            data.forEach(d => { this.addObject(d.type, d); });
        } catch(e) { this.addObject('cube'); }
    }

    update(dt) {
        const box = new THREE.Box3(), size = new THREE.Vector3();
        this.objects.forEach(o => {
            if (o.userData.mixer) o.userData.mixer.update(dt);
            const p = o.userData.physics;
            if (p && p.enabled && o.isMesh) {
                p.vy -= 9.8 * dt; o.position.y += p.vy * dt;
                box.setFromObject(o); box.getSize(size);
                const groundLevel = size.y / 2;
                if (o.position.y < groundLevel) {
                    o.position.y = groundLevel;
                    if (Math.abs(p.vy) > 0.5) p.vy = -p.vy * p.bounce; else p.vy = 0;
                }
            }
        });
        
        // لا نحدث الكاميرا الأوربت في وضع اللعب عشان ما تتصادم مع كاميرا اللاعب
        if (!document.body.classList.contains('play-mode')) {
            this.controls.update();
        }
    }

    render() { this.renderer.render(this.scene, this.camera); }

    resize() {
        const c = document.getElementById('viewport-container');
        const w = c.clientWidth, h = c.clientHeight;
        this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
    }
}
