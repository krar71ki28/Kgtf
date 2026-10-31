import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const MATERIALS = {
    default:  { color: 0x00e5ff, roughness: 0.4, metalness: 0.1 },
    wood:     { color: 0x5c3a21, roughness: 0.95, metalness: 0.0 },
    metal:    { color: 0x888888, roughness: 0.2,  metalness: 0.9 },
    gold:     { color: 0xffaa00, roughness: 0.3,  metalness: 0.95 },
    glass:    { color: 0xaaddff, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.3 },
    rock:     { color: 0x666666, roughness: 0.9,  metalness: 0.2 },
    grass:    { color: 0x2d5a27, roughness: 0.9,  metalness: 0.0 }
};

export class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);
        this.scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.editorCamera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        this.editorCamera.position.set(8, 6, 10);
        this.activeCamera = this.editorCamera;

        this.controls = new OrbitControls(this.editorCamera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.target.set(0, 2, 0);

        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        this.scene.add(this.hemiLight);

        this.sun = new THREE.DirectionalLight(0xfff5e6, 2.0);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(1024, 1024);
        this.scene.add(this.sun);

        const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0x4a6e52 }));
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        this.grid = new THREE.GridHelper(200, 100, 0x00e5ff, 0x556677);
        this.grid.position.y = 0.05;
        this.scene.add(this.grid);

        this.objects = [];
        this.selected = null;
        this.idCounter = 1;
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
        let obj = null;
        if (type === 'cube') { obj = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.makeMaterial('default')); obj.position.y = 0.5; }
        else if (type === 'sphere') { obj = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), this.makeMaterial('default')); obj.position.y = 0.5; }
        else if (type === 'cylinder') { obj = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.2, 32), this.makeMaterial('default')); obj.position.y = 0.6; }
        else if (type === 'light') { obj = new THREE.PointLight(0xffaa00, 10, 15); obj.position.set(0, 3, 0); }
        else if (type === 'tree') {
            obj = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.5, 8), this.makeMaterial('wood'));
            trunk.position.y = 0.75;
            for (let i = 0; i < 3; i++) {
                const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.2 - (i * 0.3), 1.5, 8), this.makeMaterial('grass', 0x1e5631));
                leaves.position.y = 1.5 + (i * 0.7);
                obj.add(leaves);
            }
            obj.add(trunk);
        }
        else if (type === 'rock') {
            obj = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 1), this.makeMaterial('rock'));
            obj.position.y = 0.4;
        }
        else if (type === 'character') {
            obj = new THREE.Group();
            const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 4, 8), this.makeMaterial('default'));
            body.position.y = 0.75;
            const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), this.makeMaterial('default', 0xffddaa));
            head.position.y = 1.5;
            obj.add(body); obj.add(head);
            obj.userData = { type: 'character', physics: { enabled: true } };
        }

        if (!obj) return null;
        if (obj.isMesh || obj.isGroup) obj.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });

        if (!obj.userData.type) {
            obj.userData = { type: type, physics: { enabled: false, vy: 0, bounce: 0.5 } };
        }

        if (opts.position) obj.position.fromArray(opts.position);

        this.scene.add(obj);
        this.objects.push(obj);
        if (this.onSceneChange) this.onSceneChange();
        return obj;
    }

    selectObject(obj) { this.selected = obj; if (this.onSelect) this.onSelect(obj); }

    update(dt) {
        if (!document.body.classList.contains('play-mode')) this.controls.update();
    }

    render() { this.renderer.render(this.scene, this.activeCamera); }

    resize() {
        const c = document.getElementById('viewport-container');
        if (!c) return;
        this.editorCamera.aspect = c.clientWidth / c.clientHeight;
        this.editorCamera.updateProjectionMatrix();
        this.renderer.setSize(c.clientWidth, c.clientHeight, false);
    }

    saveScene() {
        const data = this.objects.map(o => ({ type: o.userData.type, position: o.position.toArray() }));
        localStorage.setItem('kgtf_scene_final', JSON.stringify(data));
    }

    loadScene() {
        const raw = localStorage.getItem('kgtf_scene_final');
        if (raw) {
            try {
                const data = JSON.parse(raw);
                data.forEach(d => this.addObject(d.type, { position: d.position }));
                return;
            } catch (e) {}
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
