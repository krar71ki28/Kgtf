import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// ==========================================
// 1. الإعدادات الأساسية
// ==========================================
const canvas = document.getElementById('viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 40, 150);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
camera.position.set(6, 6, 8);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0, 1, 0);
orbit.enableDamping = true;
orbit.maxPolarAngle = Math.PI / 2.05;

// الإضاءة
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
const sun = new THREE.DirectionalLight(0xffffff, 1.8);
sun.position.set(10, 20, 10);
sun.castShadow = true;
sun.shadow.mapSize.width = 1024;
sun.shadow.mapSize.height = 1024;
scene.add(sun);

// الأرضية
const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x4a6e52 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(100, 100, 0x00e5ff, 0x556677);
grid.position.y = 0.01;
scene.add(grid);

// ==========================================
// 2. أداة التحريك
// ==========================================
const transform = new TransformControls(camera, renderer.domElement);
transform.addEventListener('dragging-changed', (e) => { orbit.enabled = !e.value; });
scene.add(transform);

// ==========================================
// 3. إدارة المجسمات
// ==========================================
let objects = [];
let selectedObj = null;
const loader = new GLTFLoader();

function createObject(type) {
    let group = new THREE.Group();
    group.userData.type = type;
    group.userData.physics = { vy: 0, grounded: true };
    
    if (type === 'cube') {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.4 }));
        mesh.position.y = 0.5;
        group.add(mesh);
    } else if (type === 'sphere') {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), new THREE.MeshStandardMaterial({ color: 0xff5577, roughness: 0.4 }));
        mesh.position.y = 0.5;
        group.add(mesh);
    } else if (type === 'tree') {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0x5c3a21 }));
        trunk.position.y = 0.75;
        const leaves = new THREE.Mesh(new THREE.ConeGeometry(1, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0x2d5a27 }));
        leaves.position.y = 1.8;
        group.add(trunk, leaves);
    } else if (type === 'light') {
        const light = new THREE.PointLight(0xffaa00, 15, 20);
        light.position.y = 2;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.2), new THREE.MeshBasicMaterial({ color: 0xffaa00 }));
        bulb.position.y = 2;
        group.add(light, bulb);
    } else if (type === 'character') {
        group.userData.isCharacter = true;
        const tempMesh = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 4, 8), new THREE.MeshStandardMaterial({ color: 0x888888 }));
        tempMesh.position.y = 0.75;
        group.add(tempMesh);
        
        loader.load('models/character.glb', (gltf) => {
            group.clear(); 
            const model = gltf.scene;
            model.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
            group.add(model);

            if (gltf.animations && gltf.animations.length > 0) {
                group.userData.mixer = new THREE.AnimationMixer(model);
                group.userData.actions = {};
                gltf.animations.forEach(clip => {
                    group.userData.actions[clip.name] = group.userData.mixer.clipAction(clip);
                });
                const idleKey = Object.keys(group.userData.actions).find(k => k.toLowerCase().includes('idle'));
                if (idleKey) {
                    group.userData.actions[idleKey].play();
                    group.userData.currentAction = idleKey;
                }
            }
        }, undefined, (err) => console.warn('تأكد من وجود models/character.glb'));
    }

    group.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    scene.add(group);
    objects.push(group);
    selectObject(group);
    updateOutliner();
}

function selectObject(obj) {
    selectedObj = obj;
    if (obj) transform.attach(obj);
    else transform.detach();
    updateOutliner();
    updateInspector();
}

// ==========================================
// 4. واجهة المستخدم (UI)
// ==========================================
const addMenu = document.getElementById('add-menu');
document.getElementById('btn-add-menu').addEventListener('click', (e) => { e.stopPropagation(); addMenu.classList.toggle('show'); });
document.addEventListener('click', (e) => { if (!addMenu.contains(e.target) && e.target.id !== 'btn-add-menu') addMenu.classList.remove('show'); });

document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => { createObject(btn.dataset.type); addMenu.classList.remove('show'); });
});

document.getElementById('btn-clear-scene').addEventListener('click', () => {
    objects.forEach(o => scene.remove(o)); objects = []; selectObject(null);
});

document.getElementById('btn-gizmo-translate').addEventListener('click', () => transform.setMode('translate'));
document.getElementById('btn-gizmo-rotate').addEventListener('click', () => transform.setMode('rotate'));
document.getElementById('btn-gizmo-scale').addEventListener('click', () => transform.setMode('scale'));

function updateOutliner() {
    const list = document.getElementById('object-list'); list.innerHTML = '';
    objects.forEach(o => {
        const div = document.createElement('div');
        div.className = 'obj-item' + (o === selectedObj ? ' selected' : '');
        div.innerText = o.userData.type;
        div.onclick = () => selectObject(o);
        list.appendChild(div);
    });
}

function updateInspector() {
    const insp = document.getElementById('inspector');
    if (!selectedObj) { insp.style.display = 'none'; return; }
    insp.style.display = 'block';
    document.getElementById('prop-x').value = selectedObj.position.x;
    document.getElementById('prop-y').value = selectedObj.position.y;
    document.getElementById('prop-z').value = selectedObj.position.z;
    let color = '#00e5ff';
    selectedObj.traverse(c => { if(c.isMesh && c.material && c.material.color) color = '#' + c.material.color.getHexString(); });
    document.getElementById('prop-color').value = color;
}

document.getElementById('prop-x').addEventListener('input', (e) => { if(selectedObj) selectedObj.position.x = parseFloat(e.target.value); });
document.getElementById('prop-y').addEventListener('input', (e) => { if(selectedObj) selectedObj.position.y = parseFloat(e.target.value); });
document.getElementById('prop-z').addEventListener('input', (e) => { if(selectedObj) selectedObj.position.z = parseFloat(e.target.value); });
document.getElementById('prop-color').addEventListener('input', (e) => { if(selectedObj) selectedObj.traverse(c => { if(c.isMesh && c.material && c.material.color) c.material.color.set(e.target.value); }); });

let pointerStart = { x: 0, y: 0 };
canvas.addEventListener('pointerdown', (e) => { pointerStart = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
    if (transform.dragging) return;
    if (Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 5) return;
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new THREE.Raycaster(); raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(objects, true);
    if (hits.length > 0) {
        let root = hits[0].object; while (root.parent !== scene) root = root.parent; selectObject(root);
    } else { selectObject(null); }
});

// ==========================================
// 5. الحفظ والتشغيل
// ==========================================
document.getElementById('btn-save').addEventListener('click', () => {
    const data = objects.map(o => {
        let color = '#00e5ff';
        o.traverse(c => { if(c.isMesh && c.material && c.material.color) color = '#' + c.material.color.getHexString(); });
        return { type: o.userData.type, pos: o.position.toArray(), color: color };
    });
    localStorage.setItem('kgtf_scene_pro', JSON.stringify(data));
    alert('تم الحفظ!');
});

function loadScene() {
    const raw = localStorage.getItem('kgtf_scene_pro');
    if (raw) {
        try {
            JSON.parse(raw).forEach(d => {
                createObject(d.type);
                const obj = objects[objects.length - 1];
                obj.position.fromArray(d.pos);
                obj.traverse(c => { if(c.isMesh && c.material && c.material.color) c.material.color.set(d.color); });
            });
            selectObject(null); return;
        } catch(e) {}
    }
    createObject('cube');
}

let isPlaying = false, playerModel = null, velocityY = 0, isGrounded = true, keys = {};

document.getElementById('btn-play').addEventListener('click', () => {
    playerModel = objects.find(o => o.userData.isCharacter);
    if (!playerModel) { alert('أضف شخصية أولاً!'); return; }
    isPlaying = true; document.body.classList.add('play-mode');
    document.getElementById('play-ui').style.display = 'block';
    selectObject(null); orbit.enabled = false;
    camera.position.set(playerModel.position.x, playerModel.position.y + 3, playerModel.position.z - 5);
});

document.getElementById('exit-play').addEventListener('click', () => {
    isPlaying = false; document.body.classList.remove('play-mode');
    document.getElementById('play-ui').style.display = 'none';
    orbit.enabled = true; camera.position.set(6, 6, 8); orbit.target.set(0, 1, 0);
    if (playerModel && playerModel.userData.mixer) {
        playerModel.userData.mixer.stopAllAction();
        const idleKey = Object.keys(playerModel.userData.actions).find(k => k.toLowerCase().includes('idle'));
        if (idleKey) playerModel.userData.actions[idleKey].play();
    }
});

window.addEventListener('keydown', (e) => { keys[e.code] = true; if (e.code === 'Space' && isPlaying && isGrounded) { velocityY = 8; isGrounded = false; } });
window.addEventListener('keyup', (e) => keys[e.code] = false);

let joyActive = false, joyDir = {x:0, y:0};
const joyZone = document.getElementById('joystick-zone'), joyKnob = document.getElementById('joystick-knob');
joyZone.addEventListener('touchstart', (e) => { e.stopPropagation(); joyActive = true; });
joyZone.addEventListener('touchmove', (e) => {
    e.stopPropagation(); if(!joyActive) return;
    const rect = joyZone.getBoundingClientRect();
    let dx = e.touches[0].clientX - (rect.left + rect.width/2), dy = e.touches[0].clientY - (rect.top + rect.height/2);
    const dist = Math.sqrt(dx*dx + dy*dy); if(dist > 40) { dx = (dx/dist)*40; dy = (dy/dist)*40; }
    joyKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    joyDir.x = dx/40; joyDir.y = dy/40;
});
joyZone.addEventListener('touchend', (e) => { e.stopPropagation(); joyActive = false; joyKnob.style.transform = `translate(-50%, -50%)`; joyDir = {x:0, y:0}; });

document.getElementById('btn-jump').addEventListener('pointerdown', (e) => { e.preventDefault(); if(isPlaying && isGrounded) { velocityY = 8; isGrounded = false; } });

// ==========================================
// 6. حلقة الرسم
// ==========================================
function resize() {
    const c = document.getElementById('viewport-container');
    camera.aspect = c.clientWidth / c.clientHeight; camera.updateProjectionMatrix();
    renderer.setSize(c.clientWidth, c.clientHeight, false);
}
window.addEventListener('resize', resize);

let lastTime = performance.now(), fpsAcc = 0, frames = 0;
const fpsEl = document.getElementById('fps');

function animate() {
    requestAnimationFrame(animate);
    const now = performance.now(); const dt = Math.min((now - lastTime) / 1000, 0.1); lastTime = now;

    objects.forEach(o => { if (o.userData.mixer) o.userData.mixer.update(dt); });

    if (!isPlaying) {
        orbit.update();
        objects.forEach(o => {
            if (o !== selectedObj && o.userData.type !== 'light' && !o.userData.isCharacter && o.position.y > 0) {
                o.userData.physics.vy -= 9.8 * dt; o.position.y += o.userData.physics.vy * dt;
                if (o.position.y <= 0) { o.position.y = 0; o.userData.physics.vy = 0; }
            }
        });
    } else if (playerModel) {
        const speed = 5; let moveX = 0, moveZ = 0;
        if (keys['KeyW'] || keys['ArrowUp']) moveZ += 1;
        if (keys['KeyS'] || keys['ArrowDown']) moveZ -= 1;
        if (keys['KeyA'] || keys['ArrowLeft']) moveX += 1;
        if (keys['KeyD'] || keys['ArrowRight']) moveX -= 1;
        if (joyActive) { moveX += joyDir.x; moveZ -= joyDir.y; }
        const isMoving = (moveX !== 0 || moveZ !== 0);

        if (isMoving) {
            const len = Math.sqrt(moveX*moveX + moveZ*moveZ);
            playerModel.position.x += (moveX/len) * speed * dt; playerModel.position.z += (moveZ/len) * speed * dt;
            const targetRot = Math.atan2(moveX, moveZ); playerModel.rotation.y += (targetRot - playerModel.rotation.y) * 10 * dt;
        }

        velocityY -= 24 * dt; playerModel.position.y += velocityY * dt;
        if (playerModel.position.y <= 0) { playerModel.position.y = 0; velocityY = 0; isGrounded = true; }

        const camTarget = playerModel.position.clone().add(new THREE.Vector3(0, 3, -5));
        camera.position.lerp(camTarget, 5 * dt);
        camera.lookAt(playerModel.position.x, playerModel.position.y + 1, playerModel.position.z);

        if (playerModel.userData.actions) {
            const actions = playerModel.userData.actions; let targetActionName = null;
            if (!isGrounded) targetActionName = Object.keys(actions).find(k => k.toLowerCase().includes('jump') || k.toLowerCase().includes('fall'));
            else if (isMoving) targetActionName = Object.keys(actions).find(k => k.toLowerCase().includes('walk') || k.toLowerCase().includes('run'));
            else targetActionName = Object.keys(actions).find(k => k.toLowerCase().includes('idle'));

            if (targetActionName && targetActionName !== playerModel.userData.currentAction) {
                const current = playerModel.userData.currentAction;
                if (current && actions[current]) actions[current].fadeOut(0.2);
                actions[targetActionName].reset().fadeIn(0.2).play();
                playerModel.userData.currentAction = targetActionName;
            }
        }
    }

    renderer.render(scene, camera);
    fpsAcc += dt; frames++; if (fpsAcc >= 0.5) { fpsEl.innerText = Math.round(frames / fpsAcc); fpsAcc = 0; frames = 0; }
}

resize(); loadScene(); animate();
