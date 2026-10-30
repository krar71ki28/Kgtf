import * as THREE from 'three';

export class Player {
    constructor(engine) {
        this.engine = engine;
        this.isPlaying = false;
        this.jZone = document.getElementById('joystick-zone');
        this.jKnob = document.getElementById('joystick-knob');
        this.jActive = false;
        this.jVector = new THREE.Vector2(0, 0);
        this.maxJDist = 35;
        this.bindUI();
    }

    bindUI() {
        document.getElementById('btn-play').onclick = () => {
            const p = this.engine.objects.find(o => o.userData.type === 'character');
            if (!p) { alert('أضف شخصية أولاً!'); return; }
            this.isPlaying = true;
            document.body.classList.add('play-mode');
            this.engine.camera.position.copy(p.position).add(new THREE.Vector3(0, 3, -6));
            this.engine.controls.target.copy(p.position);
            this.engine.resize();
        };

        document.getElementById('exit-play').onclick = () => {
            this.isPlaying = false;
            document.body.classList.remove('play-mode');
            this.engine.resize();
        };

        const start = (e) => { this.jActive = true; this.move(e); };
        const move = (e) => { this.move(e); };
        const end = () => { this.jActive = false; this.jKnob.style.transform = `translate(-50%, -50%)`; this.jVector.set(0,0); };

        this.jZone.addEventListener('touchstart', start, {passive: false});
        this.jZone.addEventListener('touchmove', move, {passive: false});
        this.jZone.addEventListener('touchend', end);
        this.jZone.addEventListener('mousedown', start);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);
    }

    move(e) {
        if (!this.jActive) return;
        const touch = e.touches ? e.touches[0] : e;
        const rect = this.jZone.getBoundingClientRect();
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        let dx = touch.clientX - cx, dy = touch.clientY - cy;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if (dist > this.maxJDist) { dx = (dx / dist) * this.maxJDist; dy = (dy / dist) * this.maxJDist; }
        this.jKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        this.jVector.x = dx / this.maxJDist;
        this.jVector.y = dy / this.maxJDist;
    }

    update(dt) {
        if (!this.isPlaying) return;
        const player = this.engine.objects.find(o => o.userData.type === 'character');
        if (!player) return;

        const speed = 5;
        if (this.jVector.lengthSq() > 0.01) {
            player.position.z -= this.jVector.y * speed * dt;
            player.position.x += this.jVector.x * speed * dt;
            const targetRot = Math.atan2(this.jVector.x, -this.jVector.y);
            player.rotation.y = THREE.MathUtils.lerp(player.rotation.y, targetRot, 10 * dt);

            if (player.userData.actions && player.userData.actions['Walking'] && player.userData.currentAction !== 'Walking') {
                if (player.userData.actions[player.userData.currentAction]) player.userData.actions[player.userData.currentAction].fadeOut(0.2);
                player.userData.actions['Walking'].reset().fadeIn(0.2).play();
                player.userData.currentAction = 'Walking';
            }
        } else {
            if (player.userData.actions && player.userData.actions['Idle'] && player.userData.currentAction !== 'Idle') {
                if (player.userData.actions[player.userData.currentAction]) player.userData.actions[player.userData.currentAction].fadeOut(0.2);
                player.userData.actions['Idle'].reset().fadeIn(0.2).play();
                player.userData.currentAction = 'Idle';
            }
        }

        const targetCamPos = player.position.clone().add(new THREE.Vector3(0, 3, -6).applyAxisAngle(new THREE.Vector3(0,1,0), player.rotation.y));
        this.engine.camera.position.lerp(targetCamPos, 5 * dt);
        this.engine.controls.target.lerp(player.position.clone().add(new THREE.Vector3(0, 1, 0)), 5 * dt);
    }
}
