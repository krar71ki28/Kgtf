import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

import { VFXManager } from './VFX.js?v=14.0.0';
import { Physics } from './Physics.js?v=14.0.0';
import { LogicManager } from './Logic.js?v=14.0.0';
import { UIManager } from './UI.js?v=14.0.0';
import { AssetManager } from './AssetManager.js?v=14.0.0';

export class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        
        this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        this.camera.position.set(6, 6, 8);

        this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); 
        
        // ✅ إضاءة Unreal السينمائية
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.6; // تعرض منخفض للتباين
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; 

        const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

        // ✅ السماء
        this.sky = new Sky();
        this.sky.scale.setScalar(450000); 
        this.scene.add(this.sky);
        
        const skyParams = {
            turbidity: 5,       
            rayleigh: 1.5,        
            mieCoefficient: 0.005,
            mieDirectionalG: 0.8,
            elevation: 25, // شمس منخفضة قليلاً لظلال أطول (مثل UE)
            azimuth: 135 
        };

        const phi = THREE.MathUtils.degToRad(90 - skyParams.elevation);
        const theta = THREE.MathUtils.degToRad(skyParams.azimuth);
        const sunPos = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);

        this.sky.material.uniforms['sunPosition'].value.copy(sunPos);
        this.sky.material.uniforms['turbidity'].value = skyParams.turbidity;
        this.sky.material.uniforms['rayleigh'].value = skyParams.rayleigh;
        this.sky.material.uniforms['mieCoefficient'].value = skyParams.mieCoefficient;
        this.sky.material.uniforms['mieDirectionalG'].value = skyParams.mieDirectionalG;

        // ✅ إضاءة محيطة منخفضة (عشان الظلال تبان قوية)
        this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x333333, 0.4);
        this.scene.add(this.hemiLight);

        // ✅ ضوء شمس قوي
        this.sun = new THREE.DirectionalLight(0xfff5e6, 3.0);
        this.sun.position.copy(sunPos).multiplyScalar(30);
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
        this.scene.add(this.sun.target);

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(new RenderPass(this.scene, this.camera));
        
        // توهج خفيف جداً
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.2, 0.5, 0.95 
        );
        this.composer.addPass(this.bloomPass);

        this.outlinePass = new OutlinePass(new THREE.Vector2(window.innerWidth, window.innerHeight), this.scene, this.camera);
        this.outlinePass.edgeStrength = 3.0;
        this.outlinePass.visibleEdgeColor.set('#ffaa00');
        this.outlinePass.hiddenEdgeColor.set('#ffaa00');
        this.composer.addPass(this.outlinePass);

        const smaaPass = new SMAAPass(window.innerWidth * this.renderer.getPixelRatio(), window.innerHeight * this.renderer.getPixelRatio());
        this.composer.addPass(smaaPass);
        this.composer.addPass(new OutputPass());

        this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
        this.orbit.target.set(0, 1, 0);
        this.orbit.enableDamping = true;
        this.orbit.maxPolarAngle = Math.PI / 2.05;

        this.setupGround();

        this.objects = [];
        this.selectedObj = null;
        this.loader = new GLTFLoader();
        this.rainSystem = null;
        this.isSnapping = false; 
        
        this.vfxManager = new VFXManager(this.scene);
        this.physics = new Physics(this);
        this.logic = new LogicManager(this);
        this.ui = new UIManager();
        this.assetManager = new AssetManager(this);
        
        this.transform = new TransformControls(this.camera, this.renderer.domElement);
        this.transform.addEventListener('dragging-changed', (e) => { this.orbit.enabled = !e.value; });
        
        this.transform.addEventListener('objectChange', () => {
            if (!this.isSnapping || !this.selectedObj) return;
            this.selectedObj.position.x = Math.round(this.selectedObj.position.x);
            this.selectedObj.position.y = Math.round(this.selectedObj.position.y);
            this.selectedObj.position.z = Math.round(this.selectedObj.position.z);
            if (this.onSelectCallback) this.onSelectCallback(this.selectedObj);
        });

        this.scene.add(this.transform);
        
        this.onSelectCallback = null;
        this.onSceneChangeCallback = null;

        window.addEventListener('resize', () => this.resize());
        this.resize();
    }

    setupGround() {
        // أرضية داكنة وواقعية مثل UE
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x2d3a2e, roughness: 0.9, metalness: 0.1 });
        const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        const grid = new THREE.GridHelper(200, 100, 0x00e5ff, 0x111111);
        grid.position.y = 0.01;
        grid.material.opacity = 0.1;
        grid.material.transparent = true;
        this.scene.add(grid);
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

    getMaterial(type, colorHex) {
        let params = { color: colorHex, envMapIntensity: 1.0 };
        if (type === 'metal') params = { color: colorHex, roughness: 0.2, metalness: 0.8, envMapIntensity: 1.5 };
        else if (type === 'wood') params = { color: colorHex, roughness: 0.9, metalness: 0.0, envMapIntensity: 0.5 };
        else if (type === 'glass') params = { color: colorHex, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.4, envMapIntensity: 2.0 };
        else if (type === 'rubber') params = { color: colorHex, roughness: 1.0, metalness: 0.0, envMapIntensity: 0.3 };
        else if (type === 'gold') params = { color: 0xffaa00, roughness: 0.2, metalness: 0.9, envMapIntensity: 2.5 };
        else params = { color: colorHex, roughness: 0.5, metalness: 0.1, envMapIntensity: 0.8 };
        
        return new THREE.MeshStandardMaterial(params);
    }

    createObject(type) {
        let group = new THREE.Group();
        group.userData.type = type;
        group.userData.physics = { vy: 0, enabled: false };
        group.userData.logic = [];
        
        if (type === 'cube') {
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.getMaterial('default', 0x00e5ff));
            mesh.position.y = 0.5; group.add(mesh);
        } else if (type === 'sphere') {
            const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 64, 64), this.getMaterial('default', 0xff5577));
            mesh.position.y = 0.5; group.add(mesh);
        } else if (type === 'tree') {
            const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.5, 16), this.getMaterial('wood', 0x5c3a21));
            trunk.position.y = 0.75;
            const leaves = new THREE.Mesh(new THREE.ConeGeometry(1, 1.5, 16), this.getMaterial('rubber', 0x2d5a27));
            leaves.position.y = 1.8;
            group.add(trunk, leaves);
        } else if (type === 'light') {
            const light = new THREE.PointLight(0xffaa00, 10, 15); light.position.y = 2;
            const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0xffaa00 })); bulb.position.y = 2;
            group.add(light, bulb);
        } else if (type === 'character') {
            group.userData.isCharacter = true;
            const tempMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 8, 16), this.getMaterial('default', 0x888888));
            tempMesh.position.y = 0.75; group.add(tempMesh);
            
            this.loader.load('models/character.glb', (gltf) => {
                group.clear(); 
                const model = gltf.scene;
                model.traverse(c => { 
                    if (c.isMesh) { 
                        c.castShadow = true; c.receiveShadow = true; 
                        if(c.material) { c.material.roughness = 0.7; c.material.metalness = 0.1; }
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

    loadGLB(file) {
        const url = URL.createObjectURL(file);
        this.loader.load(url, (gltf) => {
            URL.revokeObjectURL(url);
            const group = new THREE.Group();
            const model = gltf.scene;
            
            model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
            
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center); 
            model.position.y += (box.max.y - box.min.y) / 2; 

            group.add(model);
            group.userData = { type: 'glb', physics: { vy: 0, enabled: false }, logic: [] };
            
            if (gltf.animations && gltf.animations.length > 0) {
                group.userData.mixer = new THREE.AnimationMixer(model);
                group.userData.actions = {};
                gltf.animations.forEach(clip => { group.userData.actions[clip.name] = group.userData.mixer.clipAction(clip); });
                const firstAnim = Object.keys(group.userData.actions)[0];
                if (firstAnim) { group.userData.actions[firstAnim].play(); group.userData.currentAction = firstAnim; }
            }

            this.scene.add(group);
            this.objects.push(group);
            this.selectObject(group);
            if (this.onSceneChangeCallback) this.onSceneChangeCallback();
        }, undefined, (err) => {
            alert('فشل رفع الملف: ' + err.message);
        });
    }

    removeObject(obj) {
        if (!obj) return;
        this.scene.remove(obj);
        obj.traverse(c => {
            if (c.geometry) c.geometry.dispose();
            if (c.material) {
                if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
                else c.material.dispose();
            }
        });
        this.objects = this.objects.filter(o => o !== obj);
        this.selectObject(null);
        if (this.onSceneChangeCallback) this.onSceneChangeCallback();
    }

    duplicateObject(obj) {
        if (!obj) return null;
        if (obj.userData.isCharacter) {
            alert("لا يمكن تكرار الشخصية (GLB) حالياً لتجنب مشاكل الأنميشن.");
            return null;
        }
        const clone = obj.clone(true);
        clone.position.x += 1.5;
        clone.userData = JSON.parse(JSON.stringify(obj.userData));
        clone.userData.id = Date.now() + Math.random();
        
        this.scene.add(clone);
        this.objects.push(clone);
        this.selectObject(clone);
        if (this.onSceneChangeCallback) this.onSceneChangeCallback();
        return clone;
    }

    selectObject(obj) {
        this.selectedObj = obj;
        if (obj) {
            this.transform.attach(obj);
            this.outlinePass.selectedObjects = [obj]; 
        } else {
            this.transform.detach();
            this.outlinePass.selectedObjects = []; 
        }
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
        this.outlinePass.setSize(c.clientWidth, c.clientHeight);
    }
}
