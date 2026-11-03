import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);

        this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        this.camera.position.set(6, 6, 8);

        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true
        });

        this.renderer.setPixelRatio(
            Math.min(window.devicePixelRatio, 2)
        );

        this.orbit = new OrbitControls(
            this.camera,
            this.renderer.domElement
        );

        this.orbit.target.set(0, 1, 0);

        const hemiLight = new THREE.HemisphereLight(
            0xffffff,
            0x444444,
            1.0
        );

        this.scene.add(hemiLight);

        const dirLight = new THREE.DirectionalLight(
            0xffffff,
            1.5
        );

        dirLight.position.set(10, 20, 10);
        this.scene.add(dirLight);

        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(200, 200),
            new THREE.MeshStandardMaterial({
                color: 0x4a6e52
            })
        );

        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        this.loader = new GLTFLoader();
        this.objects = [];
        this.selectedObj = null;

        this.objectRemovalListeners = new Set();

        this.handleResize = () => this.resize();

        window.addEventListener(
            'resize',
            this.handleResize
        );

        this.resize();
        this.createObject('cube');
    }

    onObjectRemoved(callback) {
        if (typeof callback !== 'function') {
            return () => {};
        }

        this.objectRemovalListeners.add(callback);

        return () => {
            this.objectRemovalListeners.delete(callback);
        };
    }

    disposeObjectResources(root) {
        if (!root) return;

        const geometries = new Set();
        const materials = new Set();
        const textures = new Set();
        const skeletons = new Set();

        const collectTexture = (value) => {
            if (!value) return;

            if (value.isTexture) {
                textures.add(value);
                return;
            }

            if (Array.isArray(value)) {
                for (const item of value) {
                    collectTexture(item);
                }
            }
        };

        root.traverse((child) => {
            if (child.geometry) {
                geometries.add(child.geometry);
            }

            if (child.skeleton) {
                skeletons.add(child.skeleton);
            }

            if (!child.material) return;

            const materialList = Array.isArray(child.material)
                ? child.material
                : [child.material];

            for (const material of materialList) {
                if (!material) continue;

                materials.add(material);

                for (const value of Object.values(material)) {
                    collectTexture(value);
                }

                if (material.uniforms) {
                    for (const uniform of Object.values(
                        material.uniforms
                    )) {
                        collectTexture(uniform.value);
                    }
                }
            }
        });

        for (const texture of textures) {
            texture.dispose();
        }

        for (const material of materials) {
            material.dispose();
        }

        for (const geometry of geometries) {
            geometry.dispose();
        }

        for (const skeleton of skeletons) {
            skeleton.dispose();
        }
    }

    createObject(type) {
        let mesh;

        if (type === 'cube') {
            mesh = new THREE.Mesh(
                new THREE.BoxGeometry(1, 1, 1),
                new THREE.MeshStandardMaterial({
                    color: 0x00e5ff
                })
            );

            mesh.position.y = 0.5;

        } else if (type === 'sphere') {
            mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.5, 32, 32),
                new THREE.MeshStandardMaterial({
                    color: 0xff5577
                })
            );

            mesh.position.y = 0.5;

        } else if (type === 'character') {
            mesh = new THREE.Group();
            mesh.userData.isCharacter = true;

            const placeholder = new THREE.Mesh(
                new THREE.CapsuleGeometry(0.4, 1.2, 4, 8),
                new THREE.MeshStandardMaterial({
                    color: 0xffaa00
                })
            );

            placeholder.position.y = 1;
            mesh.add(placeholder);

            this.loader.load(
                'models/character.glb',

                (gltf) => {
                    if (mesh.userData.disposed) {
                        this.disposeObjectResources(gltf.scene);
                        return;
                    }

                    mesh.remove(placeholder);
                    this.disposeObjectResources(placeholder);

                    mesh.add(gltf.scene);
                },

                undefined,

                (error) => {
                    console.warn(
                        'KGTF Character Loading Error:',
                        error
                    );
                }
            );
        }

        if (!mesh) return null;

        mesh.userData.type = type;
        mesh.userData.disposed = false;

        this.scene.add(mesh);
        this.objects.push(mesh);

        return mesh;
    }

    removeObject(obj) {
        const index = this.objects.indexOf(obj);

        if (index === -1) return false;

        this.objects.splice(index, 1);

        this.scene.remove(obj);

        obj.userData.disposed = true;

        if (this.selectedObj === obj) {
            this.selectedObj = null;
        }

        for (const callback of this.objectRemovalListeners) {
            try {
                callback(obj);
            } catch (error) {
                console.error(
                    'KGTF Object Removal Error:',
                    error
                );
            }
        }

        this.disposeObjectResources(obj);

        return true;
    }

    clearScene() {
        const objectsToRemove = [...this.objects];

        for (const obj of objectsToRemove) {
            this.removeObject(obj);
        }

        this.selectedObj = null;
    }

    resize() {
        const container = document.getElementById(
            'viewport-container'
        );

        if (!container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        if (width <= 0 || height <= 0) return;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(
            width,
            height,
            false
        );
    }

    update(dt) {
        if (!document.body.classList.contains('play-mode')) {
            this.orbit.update();
        }
    }

    render() {
        this.renderer.render(
            this.scene,
            this.camera
        );
    }
}
