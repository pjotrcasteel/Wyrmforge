/* One approved town painting, three horizontally navigable slices.
   Keep movement purely presentational; actual destinations are Blazor buttons. */
(() => {
    "use strict";
    let mounted = null, observer = null, slice = 1, drag = null;
    const clamp = n => Math.max(0, Math.min(2, n));

    function show(index, smooth = true) {
        if (!mounted?.isConnected) return;
        slice = clamp(index);
        mounted.scrollTo({left: mounted.clientWidth * slice, behavior: smooth ? 'smooth' : 'instant'});
    }
    function onScroll() {
        if (mounted?.clientWidth) slice = clamp(Math.round(mounted.scrollLeft / mounted.clientWidth));
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
        drag = {x: event.clientX, scroll: mounted.scrollLeft, moved: false};
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
        if (moved) show(Math.round(mounted.scrollLeft / mounted.clientWidth));
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
    }
    function mount() {
        const next = document.querySelector('.town-panorama-viewport');
        if (!next?.isConnected || mounted === next) return;
        unmount();
        mounted = next;
        drag = null;
        slice = 1;
        mounted.addEventListener('scroll', onScroll, {passive:true});
        mounted.addEventListener('keydown', onKey);
        mounted.addEventListener('pointerdown', onPointerDown);
        mounted.addEventListener('pointermove', onPointerMove);
        mounted.addEventListener('pointerup', onPointerUp);
        mounted.addEventListener('pointercancel', onPointerUp);
        observer = new ResizeObserver(() => show(slice, false));
        observer.observe(mounted);
        requestAnimationFrame(() => show(1, false));
    }
    window.wyrmforgeTown = {mount};
})();
