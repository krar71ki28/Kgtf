import * as THREE from 'three';
console.log("🚨 MEGA DEBUG LOADED 🚨");

let attempts = 0;
// ننتظر حتى يتم تحميل المشهد
const checkScene = setInterval(() => {
    attempts++;
    const scene = window.scene || (window.engine && window.engine.scene);
    
    if (scene) {
        clearInterval(checkScene);
        console.log("✅ Scene Found! Applying Debug Magic...");

        // 1. تغيير لون السماء إلى وردي فاقع
        scene.background = new THREE.Color(0xff00ff);
        if (scene.fog) scene.fog.color.set(0xff00ff);

        // 2. وضع كرة حمراء في المركز (0,0,0)
        const sphereGeo = new THREE.SphereGeometry(2, 32, 32);
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
        const centerSphere = new THREE.Mesh(sphereGeo, sphereMat);
        centerSphere.position.set(0, 0, 0);
        scene.add(centerSphere);

        // 3. البحث عن أي مجسم وتلوينه وطباعته
        let foundObjects = [];
        scene.traverse((child) => {
            if (child.isMesh && child.name !== 'terrain') {
                if (child.material) child.material.color.set(0x00ff00); 
                foundObjects.push(`Name: ${child.name}, Y: ${child.position.y.toFixed(2)}`);
                
                const box = new THREE.BoxHelper(child, 0xff0000);
                scene.add(box);
            }
        });

        // 4. طباعة النتائج في شاشة سوداء
        const div = document.createElement('div');
        div.style.cssText = 'position:absolute; top:10px; left:10px; color:white; background:black; padding:10px; font-size:14px; z-index:9999; font-family:monospace; direction:ltr; text-align:left;';
        div.innerHTML = `<b>MEGA DEBUG ACTIVE</b><br>Objects Found: ${foundObjects.length}<br>${foundObjects.join('<br>')}`;
        document.body.appendChild(div);

    } else if (attempts > 20) {
        clearInterval(checkScene);
        alert("❌ المحرك لم يكشف عن المشهد حتى الآن. تأكد من تحديث الصفحة بـ ?reset");
    }
}, 500); // يفحص كل نصف ثانية
