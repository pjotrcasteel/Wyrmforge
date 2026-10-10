// Focus once on entry/advancement; selecting a landmark never steals manual scroll.
export function focusHunter(viewport, advance = false) {
    const marker = viewport.querySelector('[data-current="true"]');
    if (!marker) return;
    const top = Math.max(0, Math.min(viewport.scrollHeight - viewport.clientHeight,
        marker.offsetTop - viewport.clientHeight * 0.78));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (advance && !reducedMotion) {
        viewport.scrollTop = Math.min(viewport.scrollHeight - viewport.clientHeight, top + 160);
        viewport.scrollTo({ top, behavior: 'smooth' });
    } else {
        viewport.scrollTo({ top, behavior: 'instant' });
    }
}
