/* Refuge courtyard movement: local presentation only; no save or gameplay state changes.
 * Building buttons remain direct, accessible entrances. Tapping the cobbled ground,
 * arrow keys, or WASD moves the mage within the courtyard rather than a web menu. */
(() => {
    "use strict";
    let mounted = null;
    let actor = null;
    let x = 0.5, y = 0.81, targetX = 0.5, targetY = 0.81;
    let frame = 0, last = 0;
    const walkSpeed = 0.30;
    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
    const walkBounds = (horizontal, vertical) => {
        const v = clamp(vertical, 0.46, 0.91);
        const radius = v < 0.57 ? 0.19 : v < 0.72 ? 0.29 : 0.33;
        return { x: clamp(horizontal, 0.5 - radius, 0.5 + radius), y: v };
    };

    function render() {
        if (!actor?.isConnected) return;
        actor.style.left = (x * 100).toFixed(2) + '%';
        actor.style.top = (y * 100).toFixed(2) + '%';
    }

    function tick(time) {
        frame = 0;
        if (!mounted?.isConnected || !actor?.isConnected) return;
        const dt = clamp((time - (last || time)) / 1000, 0, .05);
        last = time;
        const dx = targetX - x, dy = targetY - y;
        const distance = Math.hypot(dx, dy);
        if (distance <= .003) {
            x = targetX;
            y = targetY;
            actor.classList.remove('walking');
            render();
            return;
        }
        const amount = Math.min(distance, walkSpeed * dt);
        x += dx / distance * amount;
        y += dy / distance * amount;
        actor.classList.add('walking');
        actor.classList.toggle('facing-left', dx < -0.004);
        render();
        frame = requestAnimationFrame(tick);
    }

    function goTo(horizontal, vertical) {
        const bounded = walkBounds(horizontal, vertical);
        targetX = bounded.x;
        targetY = bounded.y;
        if (!frame) {
            last = 0;
            frame = requestAnimationFrame(tick);
        }
    }

    function moveFromGround(event) {
        if (event.target.closest('button, a, input') || !mounted) return;
        const bounds = mounted.getBoundingClientRect();
        if (!bounds.width || !bounds.height) return;
        goTo((event.clientX - bounds.left) / bounds.width, (event.clientY - bounds.top) / bounds.height);
    }

    document.addEventListener('keydown', event => {
        const tag = document.activeElement?.tagName;
        if (!mounted?.isConnected || tag === 'INPUT' || tag === 'TEXTAREA' || event.altKey || event.ctrlKey) return;
        const key = event.key.toLowerCase();
        const directions = {
            arrowup: [0, -.055], w: [0, -.055],
            arrowdown: [0, .055], s: [0, .055],
            arrowleft: [-.055, 0], a: [-.055, 0],
            arrowright: [.055, 0], d: [.055, 0]
        };
        if (!Object.hasOwn(directions, key)) return;
        event.preventDefault();
        const [dx, dy] = directions[key];
        goTo(targetX + dx, targetY + dy);
    });

    function mount() {
        const next = document.querySelector('.town-viewport');
        if (!next || !next.isConnected || mounted === next) return;
        if (mounted) mounted.removeEventListener('pointerup', moveFromGround);
        if (frame) { cancelAnimationFrame(frame); frame = 0; }
        mounted = next;
        actor = next.querySelector('.town-mage');
        x = targetX = .5;
        y = targetY = .81;
        next.addEventListener('pointerup', moveFromGround);
        render();
    }

    window.wyrmforgeTown = { mount };
})();