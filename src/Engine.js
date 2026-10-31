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

        // المطر
        const rainGeo = new THREE.BufferGeometry();
        const rainCount = 3000;
        const rainPos = new Float32Array(rainCount * 3);
        for(let i=0; i<rainCount*3; i+=3) { rainPos[i]=(Math.random()-0.5)*100; rainPos[i+1]=Math.random()*40; rainPos[i+2]=(Math.random()-0.5)*100; }
        rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPos, 3));
        this.rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xaaccff, size: 0.15, transparent: true, opacity: 0.6 }));
        this.rain.visible = false; this.scene.add(this.rain);
        this.isRaining = false;
        this.isNightMode = false;

        this.objects = [];
        this.selected = null;
        this.onSelect = null;
        this.onSceneChange = null;
        this.score = 0;

        this.addObject('cube');
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    addObject(type) {
        let obj;
        if (type === 'cube') { obj = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x00e5ff })); obj.position.y = 0.5; }
        else if (type === 'sphere') { obj = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshStandardMaterial({ color: 0xff5577 })); obj.position.y = 0.5; }
        else if (type === 'tree') {
            obj = new THREE.Group();
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0x5c3a21 }));
            trunk.position.y = 0.75;
            for(let i=0; i<3; i++) {
                const leaves = new THREE.Mesh(new THREE.ConeGeometry(1.2 - (i*0.3), 1.5, 8), new THREE.MeshStandardMaterial({ color: 0x1e5631 }));
                leaves.position.y = 1.5 + (i*0.7); obj.add(leaves);
            }
            obj.add(trunk);
        }
        else if (type === 'rock') { 
            obj = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6, 1), new THREE.MeshStandardMaterial({ color: 0x666666 })); 
            obj.position.y = 0.4; 
            obj.scale.set(1 + Math.random()*0.5, 1 + Math.random()*0.5, 1 + Math.random()*0.5); 
        }
        else if (type === 'character') { return this.loadCharacter(); }
        else if (type === 'light') { obj = new THREE.PointLight(0xffaa00, 10, 15); obj.position.set(0, 3, 0); }
        else if (type === 'camera') {
            obj = new THREE.PerspectiveCamera(60, 1, 0.1, 1000); obj.position.set(0, 3, 5);
            obj.userData = { id: 'cam_' + Date.now(), type: 'camera' };
            this.scene.add(obj); this.objects.push(obj); this.selectObject(obj); if(this.onSceneChange) this.onSceneChange(); return obj;
        }
        else if (type === 'vfx') { 
            obj = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.8 }));
            obj.position.y = 0.5;
        }

        if (!obj) return;

        if(obj.isMesh || obj.isGroup) { obj.traverse(c => { if(c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); }
        obj.userData = { id: 'obj_' + Date.now(), type: type, physics: { enabled: false }, logic: [] };
        
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
            const mixer = new THREE.AnimationMixer(model);
            const actions = {};
            gltf.animations.forEach(clip => { actions[clip.name] = mixer.clipAction(clip); });
            const anims = Object.keys(actions);
            if(anims.length > 0) actions[anims[0]].play();

            model.userData = { id: 'char_' + Date.now(), type: 'character', physics: { enabled: false }, actions, currentAction: anims[0], logic: [], mixer };
            this.scene.add(model); this.objects.push(model);
            this.selectObject(model); if (this.onSceneChange) this.onSceneChange();
        }, undefined, (err) => { 
            const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 4, 8), new THREE.MeshStandardMaterial({color: 0x00e5ff}));
            body.position.y = 0.75; body.castShadow = true;
            body.userData = { id: 'char_' + Date.now(), type: 'character', physics: { enabled: false }, actions: {}, logic: [] };
            this.scene.add(body); this.objects.push(body);
            this.selectObject(body); if (this.onSceneChange) this.onSceneChange();
        });
    }

    selectObject(obj) { this.selected = obj; if (this.onSelect) this.onSelect(obj); }
    removeObject(obj) {
        this.scene.remove(obj); this.objects = this.objects.filter(o => o !== obj);
        if (this.selected === obj) this.selectObject(null); if (this.onSceneChange) this.onSceneChange();
    }
    toggleGrid(v) { if(this.grid) this.grid.visible = v; }
    toggleRain(v) { this.isRaining = v; if(this.rain) this.rain.visible = v; }
    
    toggleNightMode(isNight) {
        this.isNightMode = isNight;
        if (isNight) {
            this.scene.background.setHex(0x050510); this.scene.fog.color.setHex(0x050510);
            this.sun.intensity = 0; this.hemiLight.intensity = 0.2;
        } else {
            this.scene.background.setHex(0x87CEEB); this.scene.fog.color.setHex(0x87CEEB);
            this.sun.intensity = 2.0; this.hemiLight.intensity = 0.8;
        }
    }

    update(dt) {
        this.controls.update();
        this.objects.forEach(o => {
            if(o.userData.mixer) o.userData.mixer.update(dt);
            if(o.userData.physics && o.userData.physics.enabled && o.isMesh) {
                o.position.y -= 9.8 * dt;
                if(o.position.y < 0.5) o.position.y = 0.5;
            }
        });
        if(this.isRaining) {
            const pos = this.rain.geometry.attributes.position.array;
            for (let i = 1; i < pos.length; i += 3) { pos[i] -= 25 * dt; if (pos[i] < 0) pos[i] = 30; }
            this.rain.geometry.attributes.position.needsUpdate = true;
        }
    }
    render() { this.renderer.render(this.scene, this.camera); }
    resize() { const w = this.canvas.clientWidth, h = this.canvas.clientHeight; this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h, false); }
}
