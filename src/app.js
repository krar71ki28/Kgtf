import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';

// ==========================================
// 1. إعداد المحرك (Scene, Camera, Renderer)
// ==========================================
const canvas = document.getElementById('viewport');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);

const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
camera.position.set(5, 5, 5);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;

const orbit = new OrbitControls(camera, renderer.domElement);
orbit.target.set(0, 1, 0);
orbit.enableDamping = true;

// الإضاءة والأرضية
scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
scene.add(dirLight);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(100, 100), new THREE.MeshStandardMaterial({ color: 0x4a6e52 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const grid = new THREE.GridHelper(100, 100, 0x00e5ff, 0x556677);
grid.position.y = 0.01;
scene.add(grid);

// ==========================================
// 2. أداة التحريك (Gizmo)
// ==========================================
const transform = new TransformControls(camera, renderer.domElement);
transform.addEventListener('dragging-changed', (e) => { orbit.enabled = !e.value; });
scene.add(transform); // في إصدار r160 تضاف هكذا مباشرة

// ==========================================
// 3. إدارة المجسمات
// ==========================================
let objects = [];
let selectedObj = null;

function addObject(type) {
    let obj = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x00e5ff, roughness: 0.4 });

    if (type === 'cube') {
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
        mesh.position.y = 0.5; obj.add(mesh);
    } else if (type === 'sphere') {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 32, 32), mat);
        mesh.position.y = 0.5; obj.add(mesh);
    } else if (type === 'tree') {
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0x5c3a21 }));
        trunk.position.y = 0.75;
        const leaves = new THREE.Mesh(new THREE.ConeGeometry(1, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0x2d5a27 }));
        leaves.position.y = 1.8;
        obj.add(trunk, leaves);
    } else if (type === 'character') {
        const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.9, 4, 8), new THREE.MeshStandardMaterial({ color: 0x00e5ff }));
        body.position.y = 0.75;
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 16, 16), new THREE.MeshStandardMaterial({ color: 0xffddaa }));
        head.position.y = 1.5;
        obj.add(body, head);
        obj.userData.isCharacter = true;
    }

    obj.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
    obj.userData.type = type;
    scene.add(obj);
    objects.push(obj);
    selectObject(obj);
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
document.getElementById('btn-add-menu').addEventListener('click', (e) => {
    e.stopPropagation();
    addMenu.classList.toggle('show');
});
document.addEventListener('click', (e) => {
    if (!addMenu.contains(e.target) && e.target.id !== 'btn-add-menu') addMenu.classList.remove('show');
});

document.querySelectorAll('.add-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        addObject(btn.dataset.type);
        addMenu.classList.remove('show');
    });
});

document.getElementById('btn-clear-scene').addEventListener('click', () => {
    objects.forEach(o => scene.remove(o));
    objects = [];
    selectObject(null);
    updateOutliner();
});

document.getElementById('btn-gizmo-translate').addEventListener('click', () => transform.setMode('translate'));
document.getElementById('btn-gizmo-rotate').addEventListener('click', () => transform.setMode('rotate'));
document.getElementById('btn-gizmo-scale').addEventListener('click', () => transform.setMode('scale'));

function updateOutliner() {
    const list = document.getElementById('object-list');
    list.innerHTML = '';
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
}

document.getElementById('prop-x').addEventListener('input', (e) => { if(selectedObj) selectedObj.position.x = parseFloat(e.target.value); });
document.getElementById('prop-y').addEventListener('input', (e) => { if(selectedObj) selectedObj.position.y = parseFloat(e.target.value); });
document.getElementById('prop-z').addEventListener('input', (e) => { if(selectedObj) selectedObj.position.z = parseFloat(e.target.value); });
document.getElementById('prop-color').addEventListener('input', (e) => {
    if(selectedObj) {
        selectedObj.traverse(c => { if(c.isMesh) c.material.color.set(e.target.value); });
    }
});

// التحديد باللمس (Raycaster)
let pointerStart = { x: 0, y: 0 };
canvas.addEventListener('pointerdown', (e) => { pointerStart = { x: e.clientX, y: e.clientY }; });
canvas.addEventListener('pointerup', (e) => {
    if (transform.dragging) return;
    if (Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 5) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouse = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(objects, true);
    if (hits.length > 0) {
        let root = hits[0].object;
        while (root.parent !== scene) root = root.parent;
        selectObject(root);
    } else {
        selectObject(null);
    }
});

// ==========================================
// 5. الحفظ والتشغيل
// ==========================================
document.getElementById('btn-save').addEventListener('click', () => {
    const data = objects.map(o => ({ type: o.userData.type, pos: o.position.toArray(), color: o.children[0]?.material.color.getHex() }));
    localStorage.setItem('kgtf_scene', JSON.stringify(data));
    alert('تم حفظ المشهد');
});

function loadScene() {
    const raw = localStorage.getItem('kgtf_scene');
    if (raw) {
        try {
            JSON.parse(raw).forEach(d => {
                addObject(d.type);
                const obj = objects[objects.length - 1];
                obj.position.fromArray(d.pos);
                if(d.color) obj.traverse(c => { if(c.isMesh) c.material.color.setHex(d.color); });
            });
            return;
        } catch(e) {}
    }
    addObject('cube');
}

document.getElementById('btn-play').addEventListener('click', () => {
    const player = objects.find(o => o.userData.isCharacter);
    if (!player) { alert('أضف شخصية أولاً!'); return; }
    document.body.classList.add('play-mode');
    selectObject(null);
    // حركة بسيطة للشخصية
    let time = 0;
    function playLoop() {
        if (!document.body.classList.contains('play-mode')) return;
        time += 0.05;
        player.position.x = Math.sin(time) * 3;
        player.position.z = Math.cos(time) * 3;
        camera.position.set(player.position.x + 5, player.position.y + 5, player.position.z + 5);
        camera.lookAt(player.position);
        renderer.render(scene, camera);
        requestAnimationFrame(playLoop);
    }
    playLoop();
});

// الخروج من اللعب (بالضغط على الشاشة مرتين)
canvas.addEventListener('dblclick', () => {
    document.body.classList.remove('play-mode');
    camera.position.set(5, 5, 5);
    orbit.target.set(0, 1, 0);
});

// ==========================================
// 6. حلقة الرسم (Loop)
// ==========================================
function resize() {
    const c = document.getElementById('viewport-container');
    camera.aspect = c.clientWidth / c.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(c.clientWidth, c.clientHeight, false);
}
window.addEventListener('resize', resize);
resize();

let lastTime = performance.now();
let fpsAcc = 0, frames = 0;
const fpsEl = document.getElementById('fps');

function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    if (!document.body.classList.contains('play-mode')) {
        orbit.update();
        renderer.render(scene, camera);
    }

    fpsAcc += dt; frames++;
    if (fpsAcc >= 0.5) {
        fpsEl.innerText = Math.round(frames / fpsAcc);
        fpsAcc = 0; frames = 0;
    }
}

loadScene();
animate();
