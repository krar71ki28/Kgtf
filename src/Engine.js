import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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

        this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        this.camera.position.set(8, 6, 10);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.target.set(0, 2, 0);

        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
        this.scene.add(this.hemiLight);

        this.sun = new THREE.DirectionalLight(0xfff5e6, 2.0);
        this.sun.position.set(10, 20, 10);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.width = 2048;
        this.sun.shadow.mapSize.height = 2048;
        this.scene.add(this.sun);

        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x4a6e52, roughness: 1.0 });
        this.ground = new THREE.Mesh(groundGeo, groundMat);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);

        this.grid = new THREE.GridHelper(200, 100, 0x00e5ff, 0x556677);
        this.grid.position.y = 0.05;
        this.scene.add(this.grid);

        this.objects = [];
        this.selected = null;
        this.onSelect = null;
        this.onSceneChange = null;

        this.addObject('cube');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    addObject(type) {
        let obj;
        if (type === 'cube') { 
            obj = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x00e5ff })); 
            obj.position.y = 0.5; 
        }
        else if (type === 'sphere') { 
            obj = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshStandardMaterial({ color: 0xff5577 })); 
            obj.position.y = 0.5; 
        }
        else if (type === 'tree') {
            obj = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0x5c3a21 }));
            trunk.position.y = 0.75;
            const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.8, 2, 8), new THREE.MeshStandardMaterial({ color: 0x2d5a27 }));
            leaves.position.y = 2;
            obj.add(trunk, leaves);
        }
        else if (type === 'character') { return this.loadCharacter(); }
        else if (type === 'light') { 
            obj = new THREE.PointLight(0xffaa00, 10, 15); 
            obj.position.set(0, 3, 0); 
        }
        
        if (!obj) return;
        
        if(obj.isMesh || obj.isGroup) {
            obj.traverse(c => { if(c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
        }

        obj.userData = { id: 'obj_' + Date.now(), type: type, physics: { enabled: false } };
        if(!obj.userData.physics) obj.userData.physics = { enabled: false };
        
        this.scene.add(obj);
        this.objects.push(obj);
        this.selectObject(obj);
        if (this.onSceneChange) this.onSceneChange();
    }

    loadCharacter() {
        const loader = new GLTFLoader();
        loader.load('./models/character.glb', (gltf) => {
            const model = gltf.scene;
            model.traverse(o => { if(o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
            
            model.userData = { id: 'char_' + Date.now(), type: 'character', physics: { enabled: false }, actions: {} };
            const mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach(clip => { model.userData.actions[clip.name] = mixer.clipAction(clip); });
            model.userData.mixer = mixer;
            
            const anims = Object.keys(model.userData.actions);
            if(anims.length > 0) model.userData.actions[anims[0]].play();

            this.scene.add(model); 
            this.objects.push(model);
            this.selectObject(model); 
            if (this.onSceneChange) this.onSceneChange();
        }, undefined, (err) => { 
            // Fallback Character
            const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 4, 8), new THREE.MeshStandardMaterial({color: 0x00e5ff}));
            body.position.y = 0.75; body.castShadow = true;
            body.userData = { id: 'char_' + Date.now(), type: 'character', physics: { enabled: false }, actions: {} };
            this.scene.add(body); this.objects.push(body);
            this.selectObject(body); if (this.onSceneChange) this.onSceneChange();
        });
    }

    selectObject(obj) {
        this.selected = obj;
        if (this.onSelect) this.onSelect(obj);
    }

    removeObject(obj) {
        this.scene.remove(obj);
        this.objects = this.objects.filter(o => o !== obj);
        if (this.selected === obj) this.selectObject(null);
        if (this.onSceneChange) this.onSceneChange();
    }

    toggleGrid(visible) { if(this.grid) this.grid.visible = visible; }

    update(dt) {
        this.controls.update();
        this.objects.forEach(o => {
            if(o.userData.mixer) o.userData.mixer.update(dt);
        });
    }

    render() { this.renderer.render(this.scene, this.camera); }

    resize() {
        const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
    }
}
