/* Refuge preserves three navigable districts. The center is the World Gate;
 * four canonical building paintings flank it. Mobile snaps per district,
 * desktop shows the full composition. Keyboard and native touch remain usable. */
(() => {
    "use strict";
    let mounted = null, observer = null, slice = 1, drag = null, touch = null;
    const clamp = value => Math.max(0, Math.min(2, value));

    function sliceWidth() {
        return (mounted?.querySelector('.refuge-canonical-track, .town-panorama')?.clientWidth ?? 0) / 3;
    }
    function centeredOffset(index) {
        return sliceWidth() * (clamp(index) + .5) - mounted.clientWidth / 2;
    }
    function nearestSlice() {
        const width = sliceWidth();
        return width ? clamp(Math.round((mounted.scrollLeft + mounted.clientWidth / 2) / width - .5)) : 1;
    }
    function show(index, smooth = true) {
        if (!mounted?.isConnected) return;
        slice = clamp(index);
        mounted.scrollTo({left: centeredOffset(slice), behavior: smooth ? 'smooth' : 'auto'});
    }
    function onScroll() {
        if (mounted?.clientWidth) slice = nearestSlice();
    }
    function onKey(event) {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            event.preventDefault();
            show(slice + (event.key === 'ArrowRight' ? 1 : -1));
        } else if (event.key === 'Home') {
            event.preventDefault();
            show(1);
        }
    }
    function onPointerDown(event) {
        if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('button, a')) return;
        drag = {x: event.clientX, scroll: mounted.scrollLeft, slice, moved: false};
    }
    function onPointerMove(event) {
        if (!drag) return;
        const dx = event.clientX - drag.x;
        if (Math.abs(dx) > 5) drag.moved = true;
        if (drag.moved) mounted.scrollLeft = drag.scroll - dx;
    }
    function onPointerUp() {
        if (!drag) return;
        const moved = drag.moved;
        drag = null;
        if (moved) show(nearestSlice());
    }
    function onTouchStart(event) {
        if (event.touches.length !== 1 || event.target.closest('button, a')) return;
        touch = {x:event.touches[0].clientX, slice};
    }
    function onTouchEnd(event) {
        if (!touch) return;
        const prior = touch;
        touch = null;
        const moved = event.changedTouches[0]?.clientX - prior.x;
        if (Number.isFinite(moved) && Math.abs(moved) > 38) show(prior.slice + (moved < 0 ? 1 : -1));
    }
    function unmount() {
        if (!mounted) return;
        observer?.disconnect();
        mounted.removeEventListener('scroll', onScroll);
        mounted.removeEventListener('keydown', onKey);
        mounted.removeEventListener('pointerdown', onPointerDown);
        mounted.removeEventListener('pointermove', onPointerMove);
        mounted.removeEventListener('pointerup', onPointerUp);
        mounted.removeEventListener('pointercancel', onPointerUp);
        mounted.removeEventListener('touchstart', onTouchStart);
        mounted.removeEventListener('touchend', onTouchEnd);
        mounted.removeEventListener('touchcancel', onTouchCancel);
    }
    function onTouchCancel() { touch = null; }
    function mount() {
        const next = document.querySelector('.refuge-canonical-viewport, .town-panorama-viewport');
        if (!next?.isConnected || mounted === next) return;
        unmount();
        mounted = next;
        drag = touch = null;
        slice = 1;
        mounted.addEventListener('scroll', onScroll, {passive:true});
        mounted.addEventListener('keydown', onKey);
        mounted.addEventListener('pointerdown', onPointerDown);
        mounted.addEventListener('pointermove', onPointerMove);
        mounted.addEventListener('pointerup', onPointerUp);
        mounted.addEventListener('pointercancel', onPointerUp);
        mounted.addEventListener('touchstart', onTouchStart, {passive:true});
        mounted.addEventListener('touchend', onTouchEnd, {passive:true});
        mounted.addEventListener('touchcancel', onTouchCancel, {passive:true});
        observer = new ResizeObserver(() => show(slice, false));
        observer.observe(mounted);
        requestAnimationFrame(() => show(1, false));
    }
    window.wyrmforgeTown = {mount, show};
})();
