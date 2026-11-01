console.log("🚨 MEGA DEBUG LOADED 🚨");

// ننتظر تحميل الصفحة بالكامل
setTimeout(() => {
    const scene = window.engine?.scene || window.scene;
    
    if (!scene) {
        alert("❌ خطأ فادح: لم يتم العثور على المشهد (Scene). الكود لا يتصل بالمحرك!");
        return;
    }

    // 1. تغيير لون السماء إلى وردي فاقع (دليل على عمل الكود)
    scene.background = new THREE.Color(0xff00ff);
    if (scene.fog) scene.fog.color.set(0xff00ff);

    // 2. وضع كرة حمراء متوهجة ضخمة في المركز (0,0,0)
    const sphereGeo = new THREE.SphereGeometry(2, 32, 32);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
    const centerSphere = new THREE.Mesh(sphereGeo, sphereMat);
    centerSphere.position.set(0, 0, 0);
    scene.add(centerSphere);

    // 3. البحث عن أي مجسم (Mesh) وتلوينه وطباعته
    let foundObjects = [];
    scene.traverse((child) => {
        if (child.isMesh && child.name !== 'terrain') {
            child.material.color.set(0x00ff00); // تلوين المجسمات باللون الأخضر الصارخ
            foundObjects.push(`Name: ${child.name}, Y: ${child.position.y.toFixed(2)}, Scale: ${child.scale.x}x${child.scale.y}x${child.scale.z}`);
            
            // إضافة إطار أحمر حول كل مجسم
            const box = new THREE.BoxHelper(child, 0xff0000);
            scene.add(box);
        }
    });

    // 4. طباعة النتائج في شاشة سوداء فوق اللعبة
    const div = document.createElement('div');
    div.style.cssText = 'position:absolute; top:10px; left:10px; color:white; background:black; padding:10px; font-size:14px; z-index:9999; font-family:monospace; direction:ltr; text-align:left;';
    div.innerHTML = `<b>MEGA DEBUG ACTIVE</b><br>Objects Found: ${foundObjects.length}<br>${foundObjects.join('<br>')}`;
    document.body.appendChild(div);

    console.log("🔍 Found Objects:", foundObjects);
}, 2000); // ننتظر ثانيتين لضمان تحميل المحرك
